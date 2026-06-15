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
import { testGenerationDedup } from "../middleware/testGenerationDedup.js";

const router = express.Router();

// Apply authentication to all test routes
router.use(authMiddleware);

// Debug middleware for test routes
router.use((req, res, next) => {
  console.log(`🧪 Test route hit: ${req.method} ${req.path}`);
  next();
});

// Test endpoint to verify routes are working
router.get("/test-connection", (req, res) => {
  res.json({
    success: true,
    message: "Test routes are mounted correctly",
    timestamp: new Date().toISOString()
  });
});

// Generate new test (dedup prevents parallel duplicate OpenRouter runs)
router.post("/generate", testGenerationDedup, generateTest);

// Generate full-length UPSC Prelims GS Paper 1 mock (100 questions); subject from admin/body
router.post("/generate-full-mock", testGenerationDedup, generateFullMockTest);

// Submit test answers
router.post("/submit/:id", submitTest);

// Get test analytics
router.get("/analytics", getTestAnalytics);

// Get pre-lims performance analysis
router.get("/prelims-performance", getPrelimsPerformance);

// Assigned topic practice (admin-assigned, student-only)
router.get("/assigned-practice", listStudentAssignedPractice);
router.get("/assigned-practice/history", listAssignedPracticeHistory);
router.post("/assigned-practice/:id/start", startAssignedPracticeAttempt);

// Get all tests (history)
router.get("/", getTests);

// Get test by ID (must come after specific routes)
router.get("/:id", getTest);

// Delete a test
router.delete("/:id", deleteTest);

export default router;

