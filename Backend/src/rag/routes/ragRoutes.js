/**
 * RAG routes — common Knowledge Base for Topic Practice + admin tools.
 *
 * Public (auth):   POST /search, POST /generate-questions, GET /health, GET /subjects
 * Admin:           upload / list / delete / reindex / rebuild / stats / search-preview
 */

import express from "express";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { requireAdmin } from "../../middleware/adminMiddleware.js";
import { ragPdfUpload } from "../middleware/uploadPdf.js";
import {
  searchRag,
  generateRagQuestions,
  ragHealth,
  listRagSubjects,
  uploadPdf,
  listDocs,
  removeDocument,
  reindexDoc,
  removeChunk,
  rebuildAll,
  stats,
  searchPreview,
  vectorHealth,
  jobStatus,
} from "../controllers/ragController.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/health", ragHealth);
router.get("/stats", ragHealth);
router.get("/subjects", listRagSubjects);
router.post("/search", searchRag);
router.post("/generate-questions", generateRagQuestions);

// Admin-only Knowledge Base management
const adminRouter = express.Router();
adminRouter.use(...requireAdmin);
adminRouter.post("/upload-pdf", ragPdfUpload, uploadPdf);
adminRouter.get("/documents", listDocs);
adminRouter.delete("/documents/:id", removeDocument);
adminRouter.post("/reindex/:id", reindexDoc);
adminRouter.delete("/chunks/:id", removeChunk);
adminRouter.post("/rebuild-embeddings", rebuildAll);
adminRouter.get("/collection-stats", stats);
adminRouter.post("/search-preview", searchPreview);
adminRouter.get("/vector-health", vectorHealth);
adminRouter.get("/jobs/:id", jobStatus);

router.use("/admin", adminRouter);

export default router;
