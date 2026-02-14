import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  listPrelimsPdfTests,
  startPrelimsPdfTest,
  getPrelimsPdfTestAttempt,
  savePrelimsPdfTestAnswers,
  submitPrelimsPdfTest,
  getPrelimsPdfTestResult,
} from "../controllers/prelimsPdfTestController.js";

const router = express.Router();
router.use(authMiddleware);

router.get("/", listPrelimsPdfTests);
// Attempt routes first so "attempt" is not captured as testId
router.get("/attempt/:attemptId", getPrelimsPdfTestAttempt);
router.patch("/attempt/:attemptId/answers", savePrelimsPdfTestAnswers);
router.post("/attempt/:attemptId/submit", submitPrelimsPdfTest);
router.get("/attempt/:attemptId/result", getPrelimsPdfTestResult);
router.post("/:testId/start", startPrelimsPdfTest);

export default router;
