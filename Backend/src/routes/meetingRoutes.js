import express from "express";
import { createRoom, joinRoom, getRoom } from "../controllers/meetingController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/create", authMiddleware, createRoom);
router.post("/join", authMiddleware, joinRoom);
router.get("/:roomId", authMiddleware, getRoom);

export default router;

