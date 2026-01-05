import express from "express";
import {
  generateTest,
  submitTest,
  getTest,
  getTests,
} from "../controllers/testController.js";

const router = express.Router();

// Generate new test
router.post("/generate", generateTest);

// Submit test answers
router.post("/submit/:id", submitTest);

// Get test by ID
router.get("/:id", getTest);

// Get all tests (history)
router.get("/", getTests);

export default router;

