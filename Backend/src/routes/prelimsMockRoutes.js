import express from "express";
import { listLivePrelimsMocks, startPrelimsMockAttempt } from "../controllers/prelimsMockController.js";
import { examAttemptGuard } from "../middleware/examAiGuard.js";

const router = express.Router();

router.get("/", listLivePrelimsMocks);
router.get("", listLivePrelimsMocks);
router.post("/:id/start", examAttemptGuard, startPrelimsMockAttempt);

export default router;
