import express from "express";
import {
  generatePlan,
  regeneratePlan,
  generateSmartPlan,
  getDailyTasks,
  getDailyPlan,
  getFullDashboard,
  completeTask,
  completeTopicHandler,
  reorderDailyTasks,
  analyzeMock,
  getAnalytics,
  aiChat,
  refreshInsights,
  regenerateMotivationLine,
  practiceStart,
  getRevisionTasks,
  getReadinessScore,
} from "../controllers/advancedStudyPlannerController.js";

const router = express.Router();

router.post("/generate-plan", generatePlan);
router.post("/generate-smart-plan", generateSmartPlan);
router.post("/regenerate-plan", regeneratePlan);
router.get("/dashboard", getFullDashboard);
router.get("/daily-tasks", getDailyTasks);
router.get("/daily-plan", getDailyPlan);
router.post("/complete-task", completeTask);
router.post("/complete-topic", completeTopicHandler);
router.post("/practice-start", practiceStart);
router.get("/revision-tasks", getRevisionTasks);
router.get("/readiness-score", getReadinessScore);
router.post("/reorder-tasks", reorderDailyTasks);
router.post("/analyze-mock", analyzeMock);
router.get("/analytics", getAnalytics);
router.post("/ai-chat", aiChat);
router.post("/refresh-insights", refreshInsights);
router.post("/regenerate-motivation", regenerateMotivationLine);

export default router;
