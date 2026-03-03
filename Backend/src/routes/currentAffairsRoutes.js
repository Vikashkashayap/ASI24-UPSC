import express from "express";
import {
  listCurrentAffairs,
  getCurrentAffairBySlug,
  toggleCurrentAffair,
  runCurrentAffairsJob,
  generateMcqs,
  adminList,
} from "../controllers/currentAffairsController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";
import { requireActiveSubscription } from "../middleware/subscriptionMiddleware.js";

const router = express.Router();

// List today's active (with optional query filters)
router.get("/", listCurrentAffairs);

// Generate 2 Prelims MCQs for an article (must be before /:slug)
router.get("/mcqs/:id", requireActiveSubscription, generateMcqs);

// Single by slug (SEO-friendly)
router.get("/:slug", getCurrentAffairBySlug);

// Admin-only: toggle isActive
router.patch("/:id", authMiddleware, requireAdmin, toggleCurrentAffair);

// Admin sub-router: run job, list all (mount at /api/admin/current-affairs)
const adminRouter = express.Router();
adminRouter.use(authMiddleware, requireAdmin);
adminRouter.post("/run-now", runCurrentAffairsJob);
adminRouter.get("/list", adminList);

export { adminRouter as currentAffairsAdminRouter };
export default router;
