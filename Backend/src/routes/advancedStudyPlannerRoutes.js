import express from "express";
import {
  generatePlan,
  regeneratePlan,
  getDailyTasks,
  getFullDashboard,
  completeTask,
  reorderDailyTasks,
  analyzeMock,
  getAnalytics,
  aiChat,
  refreshInsights,
  regenerateMotivationLine,
} from "../controllers/advancedStudyPlannerController.js";

const router = express.Router();

router.post("/generate-plan", generatePlan);
router.post("/regenerate-plan", regeneratePlan);
router.get("/dashboard", getFullDashboard);
router.get("/daily-tasks", getDailyTasks);
router.post("/complete-task", completeTask);
router.post("/reorder-tasks", reorderDailyTasks);
router.post("/analyze-mock", analyzeMock);
router.get("/analytics", getAnalytics);
router.post("/ai-chat", aiChat);
router.post("/refresh-insights", refreshInsights);
router.post("/regenerate-motivation", regenerateMotivationLine);

export default router;
