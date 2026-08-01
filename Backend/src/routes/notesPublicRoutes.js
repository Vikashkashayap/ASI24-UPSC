import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { optionalAuthMiddleware } from "../middleware/optionalAuthMiddleware.js";
import {
  registerNotesUser,
  loginNotesUser,
  getNotesMe,
} from "../controllers/notesAuthController.js";
import {
  listPublicCategories,
  listPublicNotes,
  getPublicNoteBySlugOrId,
  getMyNotePermissions,
  checkNotePermission,
} from "../controllers/notesWebsiteController.js";
import {
  createNoteOrder,
  verifyNoteOrder,
  listMyNoteOrders,
} from "../controllers/notesOrderController.js";

const router = express.Router();

/**
 * Public Notes Website APIs (no admin panel here).
 * Mounted at /api/notes
 *
 * Auth: shared users collection + JWT with Student Portal.
 * Register from Notes site → source="notes", isPremiumStudent=false
 */

// Auth (Notes Website)
router.post("/auth/register", registerNotesUser);
router.post("/auth/login", loginNotesUser);
router.get("/auth/me", authMiddleware, getNotesMe);

// Categories
router.get("/categories", listPublicCategories);

// Permissions (before /:slugOrId)
router.get("/permissions/me", authMiddleware, getMyNotePermissions);
router.get("/permissions/:noteId", authMiddleware, checkNotePermission);

// Orders (purchase premium notes)
router.post("/orders", authMiddleware, createNoteOrder);
router.post("/orders/verify", authMiddleware, verifyNoteOrder);
router.get("/orders/my", authMiddleware, listMyNoteOrders);

// Notes catalog + detail (premium content gated) — parametric last
router.get("/", optionalAuthMiddleware, listPublicNotes);
router.get("/:slugOrId", optionalAuthMiddleware, getPublicNoteBySlugOrId);

export default router;
