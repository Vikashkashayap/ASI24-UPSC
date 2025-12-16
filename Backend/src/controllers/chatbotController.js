import {
  sendChatMessage,
  getUserConversations,
  getConversationById,
  deleteConversation,
  clearAllConversations,
} from "../services/chatbotService.js";

/**
 * Send a message to the chatbot
 */
export const chat = async (req, res) => {
  try {
    const userId = req.user._id;
    const { message, conversationId } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message cannot be empty",
      });
    }

    const result = await sendChatMessage({
      userId,
      message: message.trim(),
      conversationId,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to process chat message",
    });
  }
};

/**
 * Get all conversations for the logged-in user
 */
export const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    const conversations = await getUserConversations(userId);

    res.json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    console.error("Get conversations error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch conversations",
    });
  }
};

/**
 * Get a specific conversation with all messages
 */
export const getConversation = async (req, res) => {
  try {
    const userId = req.user._id;
    const { conversationId } = req.params;

    const conversation = await getConversationById(userId, conversationId);

    res.json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    console.error("Get conversation error:", error);
    res.status(404).json({
      success: false,
      message: error.message || "Conversation not found",
    });
  }
};

/**
 * Delete a conversation
 */
export const removeConversation = async (req, res) => {
  try {
    const userId = req.user._id;
    const { conversationId } = req.params;

    const result = await deleteConversation(userId, conversationId);

    res.json(result);
  } catch (error) {
    console.error("Delete conversation error:", error);
    res.status(404).json({
      success: false,
      message: error.message || "Failed to delete conversation",
    });
  }
};

/**
 * Clear all conversations
 */
export const clearConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    const result = await clearAllConversations(userId);

    res.json(result);
  } catch (error) {
    console.error("Clear conversations error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to clear conversations",
    });
  }
};
