import express from "express";
import multer from "multer";
import {
  uploadAndEvaluateCopy,
  getEvaluationById,
  getUserEvaluationHistory,
  getUserAnalytics,
  deleteEvaluation,
  getEvaluationStats
} from "../controllers/copyEvaluationController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// Configure multer for memory storage (we'll process buffer directly)
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// All routes require authentication
router.use(authMiddleware);

// Upload and evaluate PDF
router.post('/upload', upload.single('pdf'), uploadAndEvaluateCopy);

// Get user's evaluation history (must be before /:id route)
router.get('/history/list', getUserEvaluationHistory);

// Get user analytics (must be before /:id route)
router.get('/analytics/summary', getUserAnalytics);

// Get evaluation by ID (must be after other specific routes)
router.get('/:id', getEvaluationById);

// Get specific evaluation stats
router.get('/:id/stats', getEvaluationStats);

// Delete evaluation
router.delete('/:id', deleteEvaluation);

export default router;
