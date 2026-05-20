/**
 * Copy File Service
 * Converts PDF pages to images and normalizes image uploads for vision evaluation.
 * No OCR — images are sent directly to the vision model.
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { pdf as pdfToImg } from "pdf-to-img";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMP_UPLOAD_DIR = path.join(__dirname, "../../uploads/temp");

const ALLOWED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const MAX_PAGES = 15;
const PDF_RENDER_SCALE = 2;

/**
 * Ensure temp upload directory exists
 */
export const ensureTempDir = async () => {
  await fs.mkdir(TEMP_UPLOAD_DIR, { recursive: true });
};

/**
 * Save multer buffer to temp file
 */
export const saveTempFile = async (buffer, originalName) => {
  await ensureTempDir();
  const safeName = (originalName || "upload").replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = path.join(TEMP_UPLOAD_DIR, `${Date.now()}-${safeName}`);
  await fs.writeFile(filePath, buffer);
  return filePath;
};

/**
 * Remove temp file (best-effort)
 */
export const removeTempFile = async (filePath) => {
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch {
    // ignore
  }
};

/**
 * Convert image buffer to base64 page objects
 */
export const imageBufferToPages = (buffer, mimeType, originalName) => {
  const base64 = buffer.toString("base64");
  const mime = mimeType || "image/jpeg";
  return [
    {
      pageNumber: 1,
      mimeType: mime,
      base64,
      buffer,
      dataUrl: `data:${mime};base64,${base64}`,
      source: originalName || "image",
    },
  ];
};

/**
 * Render PDF buffer pages to PNG base64 images via pdf-to-img (NodeCanvasFactory).
 * Avoids pdfjs-dist v5 + node-canvas "Image or Canvas expected" regression.
 */
export const pdfBufferToImages = async (buffer, options = {}) => {
  const maxPages = options.maxPages ?? MAX_PAGES;
  const scale = options.scale ?? PDF_RENDER_SCALE;

  const doc = await pdfToImg(buffer, { scale });
  const totalPages = doc.length;
  const numPages = Math.min(totalPages, maxPages);
  const pages = [];

  const { createCanvas, loadImage } = await import("canvas");

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const pngBuffer = await doc.getPage(pageNum);
    const img = await loadImage(pngBuffer);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const jpegBuffer = canvas.toBuffer("image/jpeg", { quality: 0.82 });
    const base64 = jpegBuffer.toString("base64");

    pages.push({
      pageNumber: pageNum,
      mimeType: "image/jpeg",
      base64,
      buffer: jpegBuffer,
      dataUrl: `data:image/jpeg;base64,${base64}`,
      source: `page-${pageNum}`,
    });
  }

  return {
    pages,
    totalPages,
    processedPages: numPages,
    truncated: totalPages > maxPages,
  };
};

/**
 * Process uploaded file (PDF or image) into vision-ready page images
 */
export const processUploadToImages = async (file) => {
  if (!file?.buffer?.length) {
    throw new Error("INVALID_FILE: Uploaded file is empty or missing");
  }

  const { buffer, mimetype, originalname } = file;

  if (mimetype === "application/pdf") {
    const header = buffer.slice(0, 4).toString();
    if (header !== "%PDF") {
      throw new Error("INVALID_FILE: File does not appear to be a valid PDF");
    }
    const result = await pdfBufferToImages(buffer);
    if (!result.pages.length) {
      throw new Error("PDF_CONVERSION_FAILED: No pages could be rendered from the PDF");
    }
    return {
      fileType: "pdf",
      fileName: originalname,
      fileSize: buffer.length,
      pages: result.pages,
      totalPages: result.totalPages,
      processedPages: result.processedPages,
      truncated: result.truncated,
    };
  }

  if (ALLOWED_IMAGE_MIMES.has(mimetype)) {
    return {
      fileType: "image",
      fileName: originalname,
      fileSize: buffer.length,
      pages: imageBufferToPages(buffer, mimetype, originalname),
      totalPages: 1,
      processedPages: 1,
      truncated: false,
    };
  }

  throw new Error(
    "INVALID_FILE: Only PDF and image files (JPEG, PNG, WebP) are supported"
  );
};

export const isAllowedUploadMime = (mimetype) =>
  mimetype === "application/pdf" || ALLOWED_IMAGE_MIMES.has(mimetype);

export default {
  ensureTempDir,
  saveTempFile,
  removeTempFile,
  imageBufferToPages,
  pdfBufferToImages,
  processUploadToImages,
  isAllowedUploadMime,
};
