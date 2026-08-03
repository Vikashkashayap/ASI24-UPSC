import express from "express";
import { requireAdmin } from "../../middleware/adminMiddleware.js";
import {
  getAiHealth,
  getAiMonitor,
  getAiAnalytics,
  getAiRouterInfo,
} from "../controllers/aiController.js";

const router = express.Router();

// Admin-only: cost analytics + health monitor
router.get("/health", ...requireAdmin, getAiHealth);
router.get("/monitor", ...requireAdmin, getAiMonitor);
router.get("/analytics", ...requireAdmin, getAiAnalytics);
router.get("/router", ...requireAdmin, getAiRouterInfo);

export default router;
