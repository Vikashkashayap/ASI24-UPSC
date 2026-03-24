import express from "express";
import {
  setupStudyPlan,
  getStudyPlan,
  completeTask,
  getStudyPlanProgress,
  postExplainStudyPlan,
  patchPlannerTestResult,
  postSkipPlannerTest,
} from "../controllers/studyPlanController.js";

const router = express.Router();

router.post("/setup", setupStudyPlan);
router.get("/", getStudyPlan);
router.get("/progress", getStudyPlanProgress);
router.post("/explain", postExplainStudyPlan);
router.patch("/tasks/:taskId/complete", completeTask);
router.patch("/tasks/:taskId/test-result", patchPlannerTestResult);
router.post("/tasks/:taskId/skip-test", postSkipPlannerTest);

export default router;
