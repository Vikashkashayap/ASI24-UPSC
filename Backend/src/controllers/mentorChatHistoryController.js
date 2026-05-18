import mongoose from "mongoose";
import { MentorChat } from "../models/MentorChat.js";

// Get active chat session for a user (single most recent – backward compat)
export const getChatHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const chatSession = await MentorChat.findOne({
      userId,
      isActive: true
    }).sort({ lastActivity: -1 });

    if (!chatSession) {
      return res.json({ sessionId: null, messages: [] });
    }
    res.json({
      sessionId: chatSession.sessionId,
      title: chatSession.title,
      project: chatSession.project,
      messages: chatSession.messages
    });
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.status(500).json({ message: "Failed to fetch chat history" });
  }
};

// List all chats for user (for sidebar)
export const listChats = async (req, res) => {
  try {
    const userId = req.user._id;
    const { project } = req.query;
    const filter = { userId, isActive: true };
    if (project) filter.project = project;
    const chats = await MentorChat.find(filter)
      .sort({ lastActivity: -1 })
      .select('sessionId title project lastActivity')
      .lean();
    res.json({ chats });
  } catch (error) {
    console.error("Error listing chats:", error);
    res.status(500).json({ message: "Failed to list chats" });
  }
};

// Get one chat by sessionId (messages + title, project)
export const getChat = async (req, res) => {
  try {
    const userId = req.user._id;
    const { sessionId } = req.params;
    const chat = await MentorChat.findOne({
      userId,
      sessionId,
      isActive: true
    }).lean();
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }
    res.json({
      sessionId: chat.sessionId,
      title: chat.title,
      project: chat.project,
      messages: chat.messages
    });
  } catch (error) {
    console.error("Error fetching chat:", error);
    res.status(500).json({ message: "Failed to fetch chat" });
  }
};

// Create new empty chat (optional title, project)
export const createChat = async (req, res) => {
  try {
    const userId = req.user._id;
    const { title, project } = req.body || {};
    const sessionId = new mongoose.Types.ObjectId().toString();
    const chat = new MentorChat({
      userId,
      sessionId,
      title: title || 'New chat',
      project: project || null,
      messages: []
    });
    await chat.save();
    res.status(201).json({
      sessionId: chat.sessionId,
      title: chat.title,
      project: chat.project,
      lastActivity: chat.lastActivity
    });
  } catch (error) {
    console.error("Error creating chat:", error);
    res.status(500).json({ message: "Failed to create chat" });
  }
};

// Update chat (title, project)
export const updateChat = async (req, res) => {
  try {
    const userId = req.user._id;
    const { sessionId } = req.params;
    const { title, project } = req.body || {};
    const chat = await MentorChat.findOne({ userId, sessionId, isActive: true });
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }
    if (title !== undefined) chat.title = title;
    if (project !== undefined) chat.project = project;
    await chat.save();
    res.json({
      sessionId: chat.sessionId,
      title: chat.title,
      project: chat.project
    });
  } catch (error) {
    console.error("Error updating chat:", error);
    res.status(500).json({ message: "Failed to update chat" });
  }
};

// Delete chat (set isActive: false)
export const deleteChat = async (req, res) => {
  try {
    const userId = req.user._id;
    const { sessionId } = req.params;
    const result = await MentorChat.updateOne(
      { userId, sessionId, isActive: true },
      { isActive: false, lastActivity: new Date() }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Chat not found" });
    }
    res.json({ message: "Chat deleted" });
  } catch (error) {
    console.error("Error deleting chat:", error);
    res.status(500).json({ message: "Failed to delete chat" });
  }
};

// List distinct project names for user
export const listProjects = async (req, res) => {
  try {
    const userId = req.user._id;
    const projects = await MentorChat.distinct('project', {
      userId,
      isActive: true,
      project: { $exists: true, $ne: null, $ne: '' }
    });
    res.json({ projects: projects.filter(Boolean).sort() });
  } catch (error) {
    console.error("Error listing projects:", error);
    res.status(500).json({ message: "Failed to list projects" });
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
