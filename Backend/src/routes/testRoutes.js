import express from "express";
import {
  generateTest,
  generateFullMockTest,
  submitTest,
  getTest,
  getTests,
  getTestAnalytics,
  getPrelimsPerformance,
  deleteTest,
} from "../controllers/testController.js";
import {
  listStudentAssignedPractice,
  listAssignedPracticeHistory,
  startAssignedPracticeAttempt,
} from "../controllers/assignedPracticeController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { examAttemptGuard } from "../middleware/examAiGuard.js";
import { testGenerationDedup } from "../middleware/testGenerationDedup.js";

const router = express.Router();

router.use(authMiddleware);

router.use((req, res, next) => {
  console.log(`🧪 Test route hit: ${req.method} ${req.path}`);
  next();
});

router.get("/test-connection", (req, res) => {
  res.json({
    success: true,
    message: "Test routes are mounted correctly",
    timestamp: new Date().toISOString(),
  });
});

// Generation routes — AI allowed (not wrapped in examAttemptGuard)
router.post("/generate", testGenerationDedup, generateTest);
router.post("/generate-full-mock", generateFullMockTest);

// Exam attempt routes — zero AI tokens (DB bilingual fields only)
router.post("/submit/:id", examAttemptGuard, submitTest);
router.get("/assigned-practice", examAttemptGuard, listStudentAssignedPractice);
router.get("/assigned-practice/history", examAttemptGuard, listAssignedPracticeHistory);
router.post("/assigned-practice/:id/start", examAttemptGuard, startAssignedPracticeAttempt);
router.get("/:id", examAttemptGuard, getTest);

// Read-only / history — no translation, guard optional but safe
router.get("/analytics", getTestAnalytics);
router.get("/prelims-performance", getPrelimsPerformance);
router.get("/", getTests);
router.delete("/:id", deleteTest);

export default router;
