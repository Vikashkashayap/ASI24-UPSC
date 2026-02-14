import express from "express";
import multer from "multer";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { adminMiddleware } from "../middleware/adminMiddleware.js";
import {
  createPrelimsTest,
  uploadPrelimsTestFromPdf,
  reparsePrelimsTestPdf,
  listPrelimsTests,
  getPrelimsTestAnalytics,
  getPrelimsTestRankList,
  exportPrelimsTestCsv,
} from "../controllers/prelimsTopperAdminController.js";
import {
  listPrelimsTests as studentListTests,
  startPrelimsTest,
  submitPrelimsTest,
  getPrelimsTestHistory,
  getPrelimsTestResult,
  getPrelimsTestRank,
  servePrelimsTestFile,
} from "../controllers/prelimsTopperStudentController.js";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"), false);
    }
  },
});

// ---------- Admin routes (auth + admin) ----------
router.post(
  "/admin/prelims-test/upload-pdf",
  authMiddleware,
  adminMiddleware,
  upload.fields([{ name: "questionPdf", maxCount: 1 }, { name: "answerKeyPdf", maxCount: 1 }]),
  uploadPrelimsTestFromPdf
);
router.post(
  "/admin/prelims-test/create",
  authMiddleware,
  adminMiddleware,
  upload.fields([{ name: "questionPdf", maxCount: 1 }, { name: "solutionPdf", maxCount: 1 }]),
  createPrelimsTest
);
router.post("/admin/prelims-test/reparse/:id", authMiddleware, adminMiddleware, reparsePrelimsTestPdf);
router.get("/admin/prelims-test/list", authMiddleware, adminMiddleware, listPrelimsTests);
router.get("/admin/prelims-test/analytics/:id", authMiddleware, adminMiddleware, getPrelimsTestAnalytics);
router.get("/admin/prelims-test/rank-list/:id", authMiddleware, adminMiddleware, getPrelimsTestRankList);
router.get("/admin/prelims-test/export/:id", authMiddleware, adminMiddleware, exportPrelimsTestCsv);

// ---------- Student routes (auth only) ----------
router.get("/student/prelims-tests", authMiddleware, studentListTests);
router.post("/student/prelims-test/start/:id", authMiddleware, startPrelimsTest);
router.post("/student/prelims-test/submit/:id", authMiddleware, submitPrelimsTest);
router.get("/student/prelims-test/history", authMiddleware, getPrelimsTestHistory);
router.get("/student/prelims-test/result/:attemptId", authMiddleware, getPrelimsTestResult);
router.get("/student/prelims-test/rank/:id", authMiddleware, getPrelimsTestRank);
router.get("/student/prelims-test/file/:testId/:type", authMiddleware, servePrelimsTestFile);

export default router;
