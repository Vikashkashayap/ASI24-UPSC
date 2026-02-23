import express from "express";
import { createRoom, joinRoom, getRoom } from "../controllers/meetingController.js";
import { dashboardAuthMiddleware } from "../middleware/dashboardAuthMiddleware.js";

const router = express.Router();

router.post("/create", dashboardAuthMiddleware, createRoom);
router.post("/join", dashboardAuthMiddleware, joinRoom);
router.get("/:roomId", dashboardAuthMiddleware, getRoom);

export default router;

