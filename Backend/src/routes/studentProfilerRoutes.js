import express from "express";
import { generateStudyPlan } from "../controllers/studentProfilerController.js";
import { dashboardAuthMiddleware } from "../middleware/dashboardAuthMiddleware.js";

const router = express.Router();

/**
 * POST /api/agents/student-profiler
 * Generate personalized study plan
 * 
 * Request body:
 * {
 *   "targetYear": "2026",
 *   "dailyHours": 6,
 *   "weakSubjects": ["Polity", "Economy"],
 *   "examStage": "Prelims",
 *   "currentDate": "2024-01-15"
 * }
 */
router.post("/", dashboardAuthMiddleware, generateStudyPlan);

export default router;

