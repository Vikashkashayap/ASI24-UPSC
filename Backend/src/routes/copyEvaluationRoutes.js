import express from "express";
import multer from "multer";
import {
  uploadAndEvaluateCopy,
  processEvaluation,
  getEvaluationById,
  getUserEvaluationHistory,
  getUserAnalytics,
  deleteEvaluation,
  getEvaluationStats,
  getEvaluationPageImage,
} from "../controllers/copyEvaluationController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { isAllowedUploadMime } from "../services/copyFileService.js";

const router = express.Router();

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (isAllowedUploadMime(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Only PDF and image files (JPEG, PNG, WebP) are allowed"
        ),
        false
      );
    }
  },
});

/** Accept `file` or legacy `pdf` field name */
const uploadMiddleware = (req, res, next) => {
  upload.fields([
    { name: "file", maxCount: 1 },
    { name: "pdf", maxCount: 1 },
  ])(req, res, (err) => {
    if (err) return next(err);
    req.file = req.files?.file?.[0] || req.files?.pdf?.[0] || null;
    next();
  });
};

router.use(authMiddleware);

router.post("/upload", uploadMiddleware, uploadAndEvaluateCopy);

router.get("/history", getUserEvaluationHistory);
router.get("/history/list", getUserEvaluationHistory);

router.get("/analytics/summary", getUserAnalytics);

router.post("/:id/process", processEvaluation);

router.get("/:id/pages/:pageNum", getEvaluationPageImage);
router.get("/:id/stats", getEvaluationStats);
router.get("/:id", getEvaluationById);

router.delete("/:id", deleteEvaluation);

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File too large",
        error: "Maximum file size is 15MB",
      });
    }
    return res.status(400).json({
      success: false,
      message: "Upload error",
      error: err.message,
    });
  }
  if (err) {
    return res.status(400).json({
      success: false,
      message: "Upload failed",
      error: err.message,
    });
  }
  next();
});

export default router;
