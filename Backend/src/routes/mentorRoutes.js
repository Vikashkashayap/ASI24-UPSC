import express from "express";
import { mentorChat } from "../controllers/mentorController.js";
import {
  getChatHistory,
  saveChatMessage,
  clearChatHistory
} from "../controllers/mentorChatHistoryController.js";

const router = express.Router();

router.post("/chat", mentorChat);

// Chat history routes
router.get("/chat-history", getChatHistory);
router.post("/chat-history/message", saveChatMessage);
router.delete("/chat-history", clearChatHistory);

export default router;
