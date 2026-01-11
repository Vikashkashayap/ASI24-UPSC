import mongoose from "mongoose";
import { MentorChat } from "../models/MentorChat.js";

// Get active chat session for a user
export const getChatHistory = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get the most recent active chat session
    const chatSession = await MentorChat.findOne({
      userId,
      isActive: true
    }).sort({ lastActivity: -1 });

    if (!chatSession) {
      return res.json({
        sessionId: null,
        messages: []
      });
    }

    res.json({
      sessionId: chatSession.sessionId,
      messages: chatSession.messages
    });
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.status(500).json({ message: "Failed to fetch chat history" });
  }
};

// Save a new message to chat history
export const saveChatMessage = async (req, res) => {
  try {
    const userId = req.user._id;
    const { sessionId, role, text } = req.body;

    if (!role || !text) {
      return res.status(400).json({ message: "Role and text are required" });
    }

    if (!['user', 'mentor'].includes(role)) {
      return res.status(400).json({ message: "Invalid role. Must be 'user' or 'mentor'" });
    }

    let chatSession;

    if (sessionId) {
      // Find existing session
      chatSession = await MentorChat.findOne({
        userId,
        sessionId,
        isActive: true
      });
    }

    if (!chatSession) {
      // Create new session if none exists
      chatSession = new MentorChat({
        userId,
        sessionId: sessionId || new mongoose.Types.ObjectId().toString(),
        messages: []
      });
    }

    // Add new message
    chatSession.messages.push({
      role,
      text,
      timestamp: new Date()
    });

    chatSession.lastActivity = new Date();
    await chatSession.save();

    res.json({
      sessionId: chatSession.sessionId,
      messageId: chatSession.messages[chatSession.messages.length - 1]._id
    });
  } catch (error) {
    console.error("Error saving chat message:", error);
    res.status(500).json({ message: "Failed to save chat message" });
  }
};

// Clear chat history (mark as inactive)
export const clearChatHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { sessionId } = req.body;

    const updateQuery = sessionId
      ? { userId, sessionId, isActive: true }
      : { userId, isActive: true };

    await MentorChat.updateMany(updateQuery, {
      isActive: false,
      lastActivity: new Date()
    });

    res.json({ message: "Chat history cleared successfully" });
  } catch (error) {
    console.error("Error clearing chat history:", error);
    res.status(500).json({ message: "Failed to clear chat history" });
  }
};
