import express from "express";
import {
  chat,
  getConversations,
  getConversation,
  removeConversation,
  clearConversations,
} from "../controllers/chatbotController.js";

const router = express.Router();

// Send a message to chatbot
router.post("/chat", chat);

// Get all conversations for user
router.get("/conversations", getConversations);

// Get specific conversation
router.get("/conversations/:conversationId", getConversation);

// Delete a conversation
router.delete("/conversations/:conversationId", removeConversation);

// Clear all conversations
router.delete("/conversations", clearConversations);

export default router;
