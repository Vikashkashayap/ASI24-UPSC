const DEFAULT_MAX_BYTES = 100 * 1024 * 1024;
const DEFAULT_ZIP_MAX_BYTES = 500 * 1024 * 1024;

export const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".docx",
  ".txt",
  ".md",
  ".zip",
]);

export const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
  "text/markdown",
  "application/zip",
  "application/x-zip-compressed",
  "application/octet-stream",
]);

export function getMaxFileBytes() {
  const n = parseInt(process.env.KNOWLEDGE_MAX_FILE_BYTES, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_BYTES;
}

export function getMaxZipBytes() {
  const n = parseInt(process.env.KNOWLEDGE_MAX_ZIP_BYTES, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_ZIP_MAX_BYTES;
}

export function getExtension(filename = "") {
  const idx = String(filename).lastIndexOf(".");
  if (idx < 0) return "";
  return String(filename).slice(idx).toLowerCase();
}

/**
 * Validate a single uploaded file buffer + metadata.
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function validateKnowledgeFile({ originalname, mimetype, size, buffer }) {
  const ext = getExtension(originalname);
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      ok: false,
      message: `Invalid file type "${ext}". Allowed: pdf, docx, txt, md, zip`,
    };
  }

  const isZip = ext === ".zip";
  const maxBytes = isZip ? getMaxZipBytes() : getMaxFileBytes();
  const fileSize = size ?? buffer?.length ?? 0;

  if (!fileSize || fileSize <= 0) {
    return { ok: false, message: "File is empty" };
  }
  if (fileSize > maxBytes) {
    const mb = Math.round(maxBytes / (1024 * 1024));
    return { ok: false, message: `File exceeds maximum size of ${mb}MB` };
  }

  if (mimetype && !ALLOWED_MIME_TYPES.has(mimetype)) {
    // Allow octet-stream when extension is valid (Windows uploads)
    if (mimetype !== "application/octet-stream") {
      return {
        ok: false,
        message: `Unsupported MIME type: ${mimetype}`,
      };
    }
  }

  return { ok: true };
}

export function isExtractableDocExt(ext) {
  return [".pdf", ".docx", ".txt", ".md"].includes(ext);
}
