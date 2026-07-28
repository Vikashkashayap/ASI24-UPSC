import crypto from "crypto";
import path from "path";
import AdmZip from "adm-zip";
import {
  getExtension,
  isExtractableDocExt,
  validateKnowledgeFile,
  getMaxFileBytes,
} from "../utils/fileValidation.js";

export function hashBuffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function safeFileName(originalName) {
  const base = path.basename(String(originalName || "document"));
  return base.replace(/[^a-zA-Z0-9._-]/g, "_");
}

/**
 * Expand a ZIP into individual document file entries (pdf/docx/txt/md).
 */
export function extractDocumentsFromZip(zipBuffer) {
  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries();
  const files = [];
  const maxBytes = getMaxFileBytes();

  for (const entry of entries) {
    if (entry.isDirectory) continue;
    const name = entry.entryName.split("/").pop() || entry.entryName;
    if (name.startsWith(".") || name.startsWith("__MACOSX")) continue;

    const ext = getExtension(name);
    if (!isExtractableDocExt(ext)) continue;

    const data = entry.getData();
    if (!data?.length) continue;
    if (data.length > maxBytes) {
      files.push({
        skipped: true,
        originalname: name,
        reason: `File inside ZIP exceeds max size`,
      });
      continue;
    }

    const mime =
      ext === ".pdf"
        ? "application/pdf"
        : ext === ".docx"
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : ext === ".md"
            ? "text/markdown"
            : "text/plain";

    files.push({
      skipped: false,
      originalname: name,
      mimetype: mime,
      size: data.length,
      buffer: data,
    });
  }

  return files;
}

export function assertValidUploadFile(file) {
  const result = validateKnowledgeFile({
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    buffer: file.buffer,
  });
  if (!result.ok) {
    const err = new Error(result.message);
    err.statusCode = 400;
    throw err;
  }
}
