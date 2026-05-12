import express from "express";
import {
  setupStudyPlan,
  getStudyPlan,
  completeTask,
  getStudyPlanProgress,
} from "../controllers/studyPlanController.js";

const router = express.Router();

router.post("/setup", setupStudyPlan);
router.get("/", getStudyPlan);
router.get("/progress", getStudyPlanProgress);
router.patch("/tasks/:taskId/complete", completeTask);

export default router;
