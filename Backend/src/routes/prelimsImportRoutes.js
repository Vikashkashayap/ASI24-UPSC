/**
 * Prelims Import - Student routes: list tests, take test, submit, result
 */

import express from "express";
import {
  getActiveImportedTests,
  getImportedTest,
  submitImportedTest,
  getImportedResult,
} from "../controllers/prelimsImportController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/active", authMiddleware, getActiveImportedTests);
router.get("/test/:id", authMiddleware, getImportedTest);
router.post("/submit/:id", authMiddleware, submitImportedTest);
router.get("/result/:testId", authMiddleware, getImportedResult);

export default router;
