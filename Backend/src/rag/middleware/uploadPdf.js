/**
 * Multer PDF upload — validated, size-limited, admin RAG ingestion.
 */

import multer from "multer";
import { RAG_CONFIG } from "../config/rag.config.js";

const storage = multer.memoryStorage();

export const ragPdfUpload = multer({
  storage,
  limits: { fileSize: RAG_CONFIG.maxUploadBytes },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype === "application/pdf" ||
      String(file.originalname || "").toLowerCase().endsWith(".pdf");
    if (!ok) {
      cb(new Error("Only PDF files are allowed"), false);
      return;
    }
    cb(null, true);
  },
}).fields([
  { name: "file", maxCount: 1 },
  { name: "files", maxCount: 10 },
  { name: "pdf", maxCount: 1 },
]);

export function pickUploadedPdfs(req) {
  const files = [
    ...(req.files?.file || []),
    ...(req.files?.files || []),
    ...(req.files?.pdf || []),
  ];
  if (req.file) files.push(req.file);
  return files;
}

export default ragPdfUpload;
