import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  listStudentTests,
  startStudentTest,
  submitStudentTest,
  getStudentTestResult,
  listStudentAttempts,
  getAttemptForExam,
} from "../controllers/excelTestController.js";

const router = express.Router();

// ----- Student: Prelims Topper - List available tests -----
router.get(
  "/student/tests",
  authMiddleware,
  listStudentTests
);

// ----- Student: Start test (returns questions without correctAnswer) -----
router.post(
  "/student/test/start/:id",
  authMiddleware,
  startStudentTest
);

// ----- Student: Submit test -----
router.post(
  "/student/test/submit/:id",
  authMiddleware,
  submitStudentTest
);

// ----- Student: Get result by attemptId -----
router.get(
  "/student/test/result/:attemptId",
  authMiddleware,
  getStudentTestResult
);

// ----- Student: Attempt history (must be before /attempt/:id) -----
router.get(
  "/student/test/attempts",
  authMiddleware,
  listStudentAttempts
);

// ----- Student: Get in-progress attempt (for exam page) -----
router.get(
  "/student/test/attempt/:attemptId",
  authMiddleware,
  getAttemptForExam
);

export default router;
