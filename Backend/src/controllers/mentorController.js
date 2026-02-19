import mongoose from "mongoose";
import { getMentorResponse } from "../services/mentorService.js";
import { MentorChat } from "../models/MentorChat.js";

export const mentorChat = async (req, res) => {
  try {
    const userId = req.user._id;
    const { message, sessionId, project } = req.body;

    let chatSession;
    if (sessionId) {
      chatSession = await MentorChat.findOne({
        userId,
        sessionId,
        isActive: true
      });
    }

    if (!chatSession) {
      chatSession = new MentorChat({
        userId,
        sessionId: sessionId || new mongoose.Types.ObjectId().toString(),
        title: message.slice(0, 50) || 'New chat',
        project: project || null,
        messages: []
      });
    }

    // Auto-title from first user message
    if (chatSession.messages.length === 0 && (chatSession.title === 'New chat' || !chatSession.title)) {
      chatSession.title = message.slice(0, 50) || 'New chat';
    }

    chatSession.messages.push({
      role: 'user',
      text: message,
      timestamp: new Date()
    });

    const result = await getMentorResponse({ userId, message });

    chatSession.messages.push({
      role: 'mentor',
      text: result.mentorMessage,
      timestamp: new Date()
    });

    chatSession.lastActivity = new Date();
    await chatSession.save();

    res.json({
      ...result,
      sessionId: chatSession.sessionId
    });
  } catch (error) {
    console.error("Mentor chat error:", error);
    res.status(400).json({ message: error.message });
  }
};
