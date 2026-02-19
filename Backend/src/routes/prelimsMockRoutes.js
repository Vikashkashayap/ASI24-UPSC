import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { listLivePrelimsMocks, startPrelimsMockAttempt } from "../controllers/prelimsMockController.js";

const router = express.Router();

// Health check (no auth) - GET /api/prelims-mock/health
router.get("/health", (req, res) => res.json({ ok: true, service: "prelims-mock" }));

// Apply auth to all routes below (student must be logged in)
router.use(authMiddleware);

// List live mocks: GET /api/prelims-mock or GET /api/prelims-mock/
router.get("/", listLivePrelimsMocks);
router.get("", listLivePrelimsMocks);
// Start attempt: POST /api/prelims-mock/:id/start
router.post("/:id/start", startPrelimsMockAttempt);

export default router;
