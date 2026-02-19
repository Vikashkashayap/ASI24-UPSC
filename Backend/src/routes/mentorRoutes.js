import express from "express";
import { mentorChat } from "../controllers/mentorController.js";
import {
  getChatHistory,
  saveChatMessage,
  clearChatHistory,
  listChats,
  getChat,
  createChat,
  updateChat,
  deleteChat,
  listProjects
} from "../controllers/mentorChatHistoryController.js";

const router = express.Router();

router.post("/chat", mentorChat);

// Chat history (backward compat)
router.get("/chat-history", getChatHistory);
router.post("/chat-history/message", saveChatMessage);
router.delete("/chat-history", clearChatHistory);

// Multiple chats & projects (ChatGPT-style)
router.get("/chats", listChats);
router.get("/chats/:sessionId", getChat);
router.post("/chats", createChat);
router.patch("/chats/:sessionId", updateChat);
router.delete("/chats/:sessionId", deleteChat);
router.get("/projects", listProjects);

export default router;
