import express from "express";
import { listLivePrelimsMocks, startPrelimsMockAttempt } from "../controllers/prelimsMockController.js";

const router = express.Router();

// Health check is mounted at GET /api/prelims-mock/health in server.js (no auth).
// All routes here are protected by requireActiveSubscription in server.js.

// List live mocks: GET /api/prelims-mock or GET /api/prelims-mock/
router.get("/", listLivePrelimsMocks);
router.get("", listLivePrelimsMocks);
// Start attempt: POST /api/prelims-mock/:id/start
router.post("/:id/start", startPrelimsMockAttempt);

export default router;
