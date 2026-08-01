import express from "express";
import { requireAdmin } from "../middleware/adminMiddleware.js";
import {
  adminListSubjects,
  adminCreateSubject,
  adminUpdateSubject,
  adminDeleteSubject,
  adminListChapters,
  adminCreateChapter,
  adminUpdateChapter,
  adminDeleteChapter,
  adminListNotesContent,
  adminGetNoteContent,
  adminCreateNoteContent,
  adminUpdateNoteContent,
  adminDeleteNoteContent,
  adminListPlans,
  adminCreatePlan,
  adminUpdatePlan,
  adminDeletePlan,
  adminListOrders,
  adminListPayments,
  adminListNotesUsers,
  adminNotesAnalytics,
} from "../controllers/notesCmsAdminController.js";
import {
  adminGetSubscriptions,
  adminOrdersStats,
} from "../controllers/order.controller.js";

const router = express.Router();

// Admin-only Notes Website CMS (Student Portal)
router.use(requireAdmin);

/* Analytics */
router.get("/analytics", adminNotesAnalytics);
router.get("/orders/stats", adminOrdersStats);

/* Subjects */
router.get("/subjects", adminListSubjects);
router.post("/subjects", adminCreateSubject);
router.put("/subjects/:id", adminUpdateSubject);
router.delete("/subjects/:id", adminDeleteSubject);

/* Chapters */
router.get("/chapters", adminListChapters);
router.post("/chapters", adminCreateChapter);
router.put("/chapters/:id", adminUpdateChapter);
router.delete("/chapters/:id", adminDeleteChapter);

/* Notes content */
router.get("/notes", adminListNotesContent);
router.get("/notes/:id", adminGetNoteContent);
router.post("/notes", adminCreateNoteContent);
router.put("/notes/:id", adminUpdateNoteContent);
router.delete("/notes/:id", adminDeleteNoteContent);

/* Pricing plans */
router.get("/plans", adminListPlans);
router.post("/plans", adminCreatePlan);
router.put("/plans/:id", adminUpdatePlan);
router.delete("/plans/:id", adminDeletePlan);

/* Orders, Payments & Subscriptions */
router.get("/orders", adminListOrders);
router.get("/payments", adminListPayments);
router.get("/subscriptions", adminGetSubscriptions);

/* Registered Notes users (source=notes only) */
router.get("/users", adminListNotesUsers);

export default router;
