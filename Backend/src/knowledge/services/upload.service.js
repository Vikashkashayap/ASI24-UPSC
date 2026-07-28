import path from "path";
import { v4 as uuidv4 } from "uuid";
import {
  documentRepo,
  uploadRepo,
  sourceRepo,
  tagRepo,
} from "../repositories/index.js";
import {
  uploadBufferToS3,
  getKnowledgePrefix,
  deleteS3Object,
  isS3Configured,
} from "./s3.service.js";
import { assertValidUploadFile, extractDocumentsFromZip, hashBuffer, safeFileName } from "./zip.service.js";
import { getExtension } from "../utils/fileValidation.js";
import { uniqueSlug } from "../utils/slugify.js";
import KbDocument from "../models/KbDocument.js";
import { normalizeMetadata } from "../validators/knowledge.validators.js";

function buildStorageKey({ subjectId, originalName }) {
  const prefix = getKnowledgePrefix();
  const date = new Date();
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const subjectPart = subjectId || "general";
  const file = `${uuidv4()}-${safeFileName(originalName)}`;
  return `${prefix}/${yyyy}/${mm}/${subjectPart}/${file}`;
}

async function resolveSourceId(meta, userId) {
  if (meta.sourceId) return meta.sourceId;
  if (meta.source) {
    const src = await sourceRepo.findOrCreateByName(meta.source, userId);
    return src?._id || null;
  }
  return null;
}

async function createDocumentFromFile({ file, meta, userId, uploadId, parentDocumentId = null }) {
  assertValidUploadFile(file);

  const checksum = hashBuffer(file.buffer);
  const ext = getExtension(file.originalname);
  const title =
    meta.title ||
    path.basename(file.originalname, ext).replace(/[_-]+/g, " ").trim() ||
    "Untitled document";

  const slug = await uniqueSlug(KbDocument, title);
  const sourceId = await resolveSourceId(meta, userId);
  if (meta.tags?.length) {
    await tagRepo.upsertMany(meta.tags, userId);
  }

  const doc = await documentRepo.create({
    title,
    slug,
    description: meta.description || "",
    subjectId: meta.subjectId,
    chapterId: meta.chapterId,
    topicId: meta.topicId,
    categoryId: meta.categoryId,
    sourceId,
    tags: meta.tags || [],
    language: meta.language || "English",
    year: meta.year,
    publication: meta.publication || "",
    sourceLabel: meta.source || "",
    difficulty: meta.difficulty || "Moderate",
    contentType: meta.contentType || "Static",
    priority: meta.priority || "Medium",
    status: "active",
    processingStatus: "Uploading",
    originalFileName: file.originalname,
    fileSize: file.size || file.buffer.length,
    mimeType: file.mimetype || "application/octet-stream",
    extension: ext,
    checksum,
    uploadedBy: userId || null,
    uploadId: uploadId || null,
    parentDocumentId,
    processingLogs: [{ level: "info", message: "Upload started" }],
  });

  try {
    if (!isS3Configured()) {
      throw new Error("AWS S3 is not configured");
    }

    const key = buildStorageKey({
      subjectId: meta.subjectId,
      originalName: file.originalname,
    });

    const uploaded = await uploadBufferToS3({
      buffer: file.buffer,
      key,
      contentType: file.mimetype,
    });

    await KbDocument.findByIdAndUpdate(doc._id, {
      $set: {
        storageKey: uploaded.key,
        storageUrl: uploaded.url,
        processingStatus: "Uploaded",
      },
      $push: {
        processingLogs: { level: "info", message: "File uploaded to S3 successfully" },
      },
    });

    // Fire-and-forget AI processing (never blocks upload response)
    if (ext !== ".zip") {
      import("../../processing/index.js")
        .then(({ maybeAutoStartProcessing }) => maybeAutoStartProcessing(doc._id))
        .catch((err) =>
          console.warn("[knowledge] auto process enqueue failed:", err?.message || err)
        );
    }

    return await documentRepo.findById(doc._id);
  } catch (err) {
    await KbDocument.findByIdAndUpdate(doc._id, {
      $set: {
        processingStatus: "Failed",
        processingError: err?.message || "Upload failed",
      },
      $push: {
        processingLogs: {
          level: "error",
          message: err?.message || "Upload failed",
        },
      },
    });
    throw err;
  }
}

/**
 * Upload one or many files (or expand ZIP) into S3 + MongoDB.
 */
export async function uploadKnowledgeFiles({ files, rawMeta, userId }) {
  const meta = normalizeMetadata(rawMeta || {});
  const inputFiles = Array.isArray(files) ? files : [files];
  if (!inputFiles.length) {
    const err = new Error("No files provided");
    err.statusCode = 400;
    throw err;
  }

  const uploadType =
    inputFiles.length === 1 && getExtension(inputFiles[0].originalname) === ".zip"
      ? "zip"
      : inputFiles.length > 1
        ? "bulk"
        : "single";

  const upload = await uploadRepo.create({
    uploadType,
    status: "uploading",
    totalFiles: inputFiles.length,
    totalBytes: inputFiles.reduce((s, f) => s + (f.size || f.buffer?.length || 0), 0),
    metadata: meta,
    uploadedBy: userId || null,
    files: inputFiles.map((f) => ({
      originalName: f.originalname,
      mimeType: f.mimetype,
      fileSize: f.size || f.buffer?.length || 0,
      status: "pending",
    })),
  });

  const documents = [];
  const errors = [];
  let completed = 0;
  let failed = 0;

  for (let i = 0; i < inputFiles.length; i += 1) {
    const file = inputFiles[i];
    try {
      assertValidUploadFile(file);
      const ext = getExtension(file.originalname);

      if (ext === ".zip") {
        const extracted = extractDocumentsFromZip(file.buffer);
        const usable = extracted.filter((e) => !e.skipped);
        const skipped = extracted.filter((e) => e.skipped);

        for (const sk of skipped) {
          errors.push({ file: sk.originalname, message: sk.reason });
        }

        if (!usable.length) {
          throw new Error("ZIP contained no supported documents (pdf, docx, txt, md)");
        }

        // Parent ZIP document record
        const zipDoc = await createDocumentFromFile({
          file,
          meta: { ...meta, title: meta.title || file.originalname },
          userId,
          uploadId: upload._id,
        });
        documents.push(zipDoc);

        for (const inner of usable) {
          const child = await createDocumentFromFile({
            file: inner,
            meta: {
              ...meta,
              title: path.basename(inner.originalname, getExtension(inner.originalname)),
            },
            userId,
            uploadId: upload._id,
            parentDocumentId: zipDoc._id,
          });
          documents.push(child);
          completed += 1;
        }
      } else {
        const doc = await createDocumentFromFile({
          file,
          meta: {
            ...meta,
            title:
              inputFiles.length === 1 && meta.title
                ? meta.title
                : meta.title || undefined,
          },
          userId,
          uploadId: upload._id,
        });
        documents.push(doc);
        completed += 1;
      }

      if (upload.files[i]) {
        upload.files[i].status = "uploaded";
        upload.files[i].progress = 100;
        upload.files[i].documentId = documents[documents.length - 1]?._id;
      }
    } catch (err) {
      failed += 1;
      errors.push({ file: file.originalname, message: err?.message || "Upload failed" });
      if (upload.files[i]) {
        upload.files[i].status = "failed";
        upload.files[i].error = err?.message || "Upload failed";
      }
    }
  }

  upload.completedFiles = completed;
  upload.failedFiles = failed;
  upload.status =
    failed === 0 ? "uploaded" : completed === 0 ? "failed" : "partial";
  upload.error = errors.length ? errors.map((e) => `${e.file}: ${e.message}`).join("; ") : null;
  await upload.save();

  return {
    upload,
    documents,
    errors,
  };
}

export async function retryDocumentUpload(documentId) {
  const doc = await documentRepo.findById(documentId);
  if (!doc) {
    const err = new Error("Document not found");
    err.statusCode = 404;
    throw err;
  }
  if (!doc.storageUrl && !doc.storageKey) {
    const err = new Error(
      "Original file buffer is not available for retry. Please re-upload the file."
    );
    err.statusCode = 400;
    throw err;
  }

  // Mark as Uploaded again if object already exists in S3
  await KbDocument.findByIdAndUpdate(doc._id, {
    $set: {
      processingStatus: "Uploaded",
      processingError: null,
    },
    $push: {
      processingLogs: { level: "info", message: "Retry: marked as Uploaded (file already in S3)" },
    },
  });
  return documentRepo.findById(documentId);
}

export async function removeDocument(documentId, { hardDeleteS3 = true } = {}) {
  const doc = await KbDocument.findOne({ _id: documentId, isDeleted: false });
  if (!doc) {
    const err = new Error("Document not found");
    err.statusCode = 404;
    throw err;
  }
  if (hardDeleteS3 && doc.storageKey) {
    try {
      await deleteS3Object(doc.storageKey);
    } catch (err) {
      console.warn("[knowledge] S3 delete failed:", err?.message || err);
    }
  }
  return documentRepo.softDelete(documentId);
}
