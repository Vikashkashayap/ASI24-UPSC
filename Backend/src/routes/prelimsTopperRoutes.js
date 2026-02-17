/**
 * Prelims Topper Test Routes
 * - Admin: upload PDFs, manage tests, analytics
 * - Student: get active tests, take test, submit, view results
 */

import express from "express";
import multer from "multer";
import {
  uploadAndCreateTest,
  listAdminTests,
  updateTest,
  deleteTest,
  getTestAnalytics,
} from "../controllers/prelimsTestController.js";
import {
  getActiveTests,
  getTestQuestions,
  submitTest,
  getResult,
  getMyAttempts,
} from "../controllers/prelimsAttemptController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB per file (UPSC PDFs can be large)
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"), false);
    }
  },
});

const pdfUpload = upload.fields([
  { name: "questionPdf", maxCount: 1 },
  { name: "answerKeyPdf", maxCount: 1 },
  { name: "explanationPdf", maxCount: 1 },
]);

// Public: Get active tests (within startTime-endTime) - requires auth
router.get("/active", authMiddleware, getActiveTests);

// Student: Get test questions
router.get("/test/:id", authMiddleware, getTestQuestions);

// Student: Submit test
router.post("/submit/:id", authMiddleware, submitTest);

// Student: Get result
router.get("/result/:testId", authMiddleware, getResult);

// Student: Get my attempts
router.get("/my-attempts", authMiddleware, getMyAttempts);

// Admin routes
router.get("/admin/tests", authMiddleware, requireAdmin, listAdminTests);
router.post("/admin/upload", authMiddleware, requireAdmin, pdfUpload, uploadAndCreateTest);
router.patch("/admin/tests/:id", authMiddleware, requireAdmin, updateTest);
router.delete("/admin/tests/:id", authMiddleware, requireAdmin, deleteTest);
router.get("/admin/tests/:id/analytics", authMiddleware, requireAdmin, getTestAnalytics);

export default router;
