/**
 * Notes PDF upload (Step 1) — store file + SourceUrl metadata.
 * Step 2 processing is triggered by the controller via syncChapterFromPdf.
 */

import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import SourceUrl from "../../models/SourceUrl.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = path.join(__dirname, "../../..");

const DEFAULT_MAX_BYTES = 50 * 1024 * 1024;
const ALLOWED_MIME = new Set(["application/pdf"]);

function getUploadRoot() {
  const configured = String(process.env.NOTES_PDF_UPLOAD_DIR || "").trim();
  if (configured) {
    return path.isAbsolute(configured) ? configured : path.join(BACKEND_ROOT, configured);
  }
  return path.join(BACKEND_ROOT, "uploads", "notes-pdfs");
}

function getMaxBytes() {
  const n = parseInt(process.env.NOTES_PDF_MAX_BYTES, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_BYTES;
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "chapter";
}

function safeFileName(originalName) {
  const base = path.basename(String(originalName || "document.pdf"));
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_");
  return cleaned.toLowerCase().endsWith(".pdf") ? cleaned : `${cleaned}.pdf`;
}

function toRelativePosix(absolutePath) {
  const rel = path.relative(BACKEND_ROOT, absolutePath);
  return rel.split(path.sep).join("/");
}

function hashBuffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Persist PDF buffer under uploads/notes-pdfs/{subject}/{uuid}-{name}.pdf
 * @returns {Promise<{ absolutePath: string, relativePath: string, fileSize: number, contentHash: string }>}
 */
export async function saveNotesPdfFile({ buffer, originalName, subject }) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error("PDF file is empty");
  }
  const maxBytes = getMaxBytes();
  if (buffer.length > maxBytes) {
    throw new Error(`PDF exceeds max size of ${Math.round(maxBytes / (1024 * 1024))}MB`);
  }

  const subjectSlug = slugify(subject);
  const dir = path.join(getUploadRoot(), subjectSlug);
  await fs.mkdir(dir, { recursive: true });

  const fileName = `${uuidv4()}-${safeFileName(originalName)}`;
  const absolutePath = path.join(dir, fileName);
  await fs.writeFile(absolutePath, buffer);

  return {
    absolutePath,
    relativePath: toRelativePosix(absolutePath),
    fileSize: buffer.length,
    contentHash: hashBuffer(buffer),
  };
}

async function removeFileIfExists(relativeOrAbsolute) {
  if (!relativeOrAbsolute) return;
  const absolute = path.isAbsolute(relativeOrAbsolute)
    ? relativeOrAbsolute
    : path.join(BACKEND_ROOT, relativeOrAbsolute);
  try {
    await fs.unlink(absolute);
  } catch {
    // ignore missing files
  }
}

function buildPdfSyntheticUrl(subject, title) {
  return `pdf://local/${slugify(subject)}/${slugify(title)}/${uuidv4()}`;
}

function serializeChapter(doc) {
  const lean = typeof doc.toObject === "function" ? doc.toObject() : doc;
  return {
    _id: lean._id,
    title: lean.title,
    subject: lean.subject,
    sourceType: lean.sourceType,
    url: lean.url,
    status: lean.status,
    topicCount: lean.topicCount || 0,
    chunkCount: lean.chunkCount || 0,
    lastSyncedAt: lean.lastSyncedAt || null,
    originalFileName: lean.originalFileName || "",
    fileSize: lean.fileSize || 0,
    mimeType: lean.mimeType || "",
    hasPdf: Boolean(lean.filePath),
    contentHash: lean.contentHash || "",
    createdAt: lean.createdAt,
    updatedAt: lean.updatedAt,
  };
}

/**
 * Upload PDF and create or update a chapter (SourceUrl). No extraction yet.
 *
 * @param {object} params
 * @param {Buffer} params.buffer
 * @param {string} params.originalName
 * @param {string} params.mimeType
 * @param {string} params.subject
 * @param {string} [params.title]
 * @param {string} [params.chapterId]
 * @param {boolean} [params.forceNew] — always create a new knowledge PDF chapter (multi-upload)
 * @param {import("mongoose").Types.ObjectId|string} [params.createdBy]
 */
export async function uploadPdfChapter({
  buffer,
  originalName,
  mimeType,
  subject,
  title,
  chapterId,
  forceNew = false,
  createdBy,
}) {
  const subjectStr = String(subject || "").trim();
  if (!subjectStr) throw new Error("subject is required");

  const mime = String(mimeType || "").trim().toLowerCase();
  if (mime && !ALLOWED_MIME.has(mime)) {
    throw new Error("Only PDF files are allowed");
  }

  const saved = await saveNotesPdfFile({
    buffer,
    originalName,
    subject: subjectStr,
  });

  const now = new Date();
  let chapter;
  let created = false;
  let previousFilePath = "";

  const titleFromFile = path
    .basename(String(originalName || "document"), path.extname(originalName || ""))
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);

  try {
    // Multi-knowledge: always add a new PDF source unless explicitly replacing chapterId
    if (chapterId && !forceNew) {
      chapter = await SourceUrl.findById(chapterId);
      if (!chapter) throw new Error("Chapter not found");
      if (String(chapter.subject).trim() !== subjectStr) {
        throw new Error("chapterId does not belong to the given subject");
      }

      previousFilePath = chapter.filePath || "";
      chapter.filePath = saved.relativePath;
      chapter.originalFileName = safeFileName(originalName);
      chapter.mimeType = mime || "application/pdf";
      chapter.fileSize = saved.fileSize;
      chapter.contentHash = saved.contentHash;
      chapter.lastSyncError = null;

      if (chapter.sourceType === "pdf") {
        if (title && String(title).trim()) chapter.title = String(title).trim();
        chapter.status = "pending";
      } else if (title && String(title).trim() && !chapter.title) {
        chapter.title = String(title).trim();
      }

      if (createdBy) chapter.createdBy = createdBy;
      await chapter.save();
    } else {
      const titleStr = String(title || titleFromFile || "Uploaded PDF").trim();
      if (!titleStr) {
        throw new Error("title is required when creating a new knowledge PDF");
      }

      chapter = await SourceUrl.create({
        title: titleStr,
        subject: subjectStr,
        sourceType: "pdf",
        url: buildPdfSyntheticUrl(subjectStr, titleStr),
        status: "pending",
        autoSync: false,
        topicCount: 0,
        chunkCount: 0,
        questionCount: 0,
        contentHash: saved.contentHash,
        filePath: saved.relativePath,
        originalFileName: safeFileName(originalName),
        mimeType: mime || "application/pdf",
        fileSize: saved.fileSize,
        createdBy: createdBy || undefined,
        lastSyncedAt: null,
        lastSyncError: null,
      });
      created = true;
    }
  } catch (err) {
    await removeFileIfExists(saved.relativePath);
    throw err;
  }

  if (previousFilePath && previousFilePath !== saved.relativePath) {
    await removeFileIfExists(previousFilePath);
  }

  console.log(
    `[notesPdfUpload] ${created ? "created" : "updated"} chapter ${chapter._id} ` +
      `(${subjectStr} / ${chapter.title}) file=${saved.relativePath} bytes=${saved.fileSize}`
  );

  return {
    created,
    chapter: serializeChapter(chapter),
    message: created
      ? "PDF added to subject knowledge base."
      : "PDF uploaded and attached to chapter.",
    uploadedAt: now.toISOString(),
  };
}

export const notesPdfUploadService = {
  uploadPdfChapter,
  saveNotesPdfFile,
  getUploadRoot,
  getMaxBytes,
};
