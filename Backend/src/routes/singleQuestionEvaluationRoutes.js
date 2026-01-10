import express from "express";
import multer from "multer";
import { evaluateSingleQuestion } from "../controllers/singleQuestionEvaluationController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// Configure multer for memory storage (optional PDF upload)
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

// Evaluate single question (with optional PDF upload)
router.post('/evaluate', upload.single('pdf'), evaluateSingleQuestion);

export default router;

