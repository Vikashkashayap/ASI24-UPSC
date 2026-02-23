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
import { dashboardAuthMiddleware } from "../middleware/dashboardAuthMiddleware.js";

const router = express.Router();

router.get("/active", dashboardAuthMiddleware, getActiveImportedTests);
router.get("/test/:id", dashboardAuthMiddleware, getImportedTest);
router.post("/submit/:id", dashboardAuthMiddleware, submitImportedTest);
router.get("/result/:testId", dashboardAuthMiddleware, getImportedResult);

export default router;
