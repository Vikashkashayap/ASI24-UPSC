import { Conversation } from "../models/Conversation.js";
import { chatbotAgent } from "../agents/chatbotAgent.js";

/**
 * Get or create a conversation for the user
 */
export const getOrCreateConversation = async (userId, conversationId = null) => {
  if (conversationId) {
    const conversation = await Conversation.findOne({
      _id: conversationId,
      userId,
      isActive: true,
    });
    if (conversation) return conversation;
  }

  // Create new conversation
  const newConversation = await Conversation.create({
    userId,
    title: "New Chat",
    messages: [],
  });

  return newConversation;
};

/**
 * Send message and get chatbot response
 */
export const sendChatMessage = async ({ userId, message, conversationId }) => {
  // Get or create conversation
  const conversation = await getOrCreateConversation(userId, conversationId);

  // Get conversation history
  const conversationHistory = conversation.messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  // Call chatbot agent
  const result = await chatbotAgent.invoke({
    message,
    conversationHistory,
  });

  // Save user message
  conversation.messages.push({
    role: "user",
    content: message,
    timestamp: new Date(),
  });

  // Save assistant response
  conversation.messages.push({
    role: "assistant",
    content: result.reply,
    timestamp: new Date(),
  });

  // Update conversation title from first message if it's a new conversation
  if (conversation.messages.length === 2) {
    // First exchange
    const titlePreview = message.substring(0, 50) + (message.length > 50 ? "..." : "");
    conversation.title = titlePreview;
  }

  await conversation.save();

  return {
    conversationId: conversation._id,
    reply: result.reply,
    model: result.model,
    success: result.success,
    timestamp: new Date(),
  };
};

/**
 * Get all conversations for a user
 */
export const getUserConversations = async (userId) => {
  const conversations = await Conversation.find({
    userId,
    isActive: true,
  })
    .sort({ updatedAt: -1 })
    .select("_id title createdAt updatedAt")
    .limit(50);

  return conversations;
};

/**
 * Get conversation by ID with all messages
 */
export const getConversationById = async (userId, conversationId) => {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    userId,
    isActive: true,
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  return conversation;
};

/**
 * Delete (archive) a conversation
 */
export const deleteConversation = async (userId, conversationId) => {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    userId,
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  conversation.isActive = false;
  await conversation.save();

  return { success: true, message: "Conversation deleted" };
};

/**
 * Clear all conversations for a user
 */
export const clearAllConversations = async (userId) => {
  await Conversation.updateMany(
    { userId, isActive: true },
    { isActive: false }
  );

  return { success: true, message: "All conversations cleared" };
};
