import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { optionalAuthMiddleware } from "../middleware/optionalAuthMiddleware.js";
import {
  listPublicSubjects,
  listPublicChapters,
  listPublicNotesInChapter,
  getPublicNoteContent,
  getMyNotesAccess,
  listPublicPlans,
  createSubscriptionOrder,
  verifySubscriptionOrder,
} from "../controllers/notesCmsPublicController.js";

const router = express.Router();

/**
 * Public Notes Website catalog + subscription APIs.
 * Mounted at /api/notes-portal
 * No admin panel here — all CMS is on Student Portal Admin.
 */

router.get("/subjects", listPublicSubjects);
router.get("/chapters", optionalAuthMiddleware, listPublicChapters);
router.get("/chapters/:chapterId/notes", optionalAuthMiddleware, listPublicNotesInChapter);
router.get("/content/:slugOrId", optionalAuthMiddleware, getPublicNoteContent);

router.get("/access/me", authMiddleware, getMyNotesAccess);

router.get("/plans", listPublicPlans);
router.post("/subscribe/create-order", authMiddleware, createSubscriptionOrder);
router.post("/subscribe/verify", authMiddleware, verifySubscriptionOrder);

export default router;
