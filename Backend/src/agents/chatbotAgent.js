import { RunnableLambda } from "@langchain/core/runnables";
import fetch from "node-fetch";

/**
 * General purpose chatbot agent powered by OpenRouter
 * Supports ChatGPT, Gemini, and other models
 */
export const chatbotAgent = new RunnableLambda({
  func: async (input) => {
    const { message, conversationHistory = [] } = input || {};

    if (!message || !message.trim()) {
      throw new Error("Message cannot be empty");
    }

    // System prompt for general chatbot
    const systemPrompt = `You are a helpful, friendly, and knowledgeable AI assistant. 
You can answer questions on various topics, help with problems, provide explanations, and have conversations.
Be conversational, clear, and helpful. You can respond in both English and Hindi (Hinglish) based on user preference.
Keep your responses concise but informative.`;

    try {
      // Get model from environment or use default
      const model = process.env.OPENROUTER_MODEL || "openai/gpt-3.5-turbo";
      const apiKey = process.env.OPENROUTER_API_KEY;

      if (!apiKey) {
        throw new Error("Missing OPENROUTER_API_KEY in environment variables");
      }

      // Build messages array with conversation history
      const messages = [
        { role: "system", content: systemPrompt }
      ];

      // Add conversation history (last 10 messages to avoid token limits)
      const recentHistory = conversationHistory.slice(-10);
      recentHistory.forEach((msg) => {
        messages.push({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.content,
        });
      });

      // Add current user message
      messages.push({
        role: "user",
        content: message.trim(),
      });

      // Call OpenRouter API
      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": process.env.FRONTEND_URL || "http://localhost:5173",
            "X-Title": "AI Chatbot",
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.7,
            max_tokens: 1000,
          }),
        }
      );

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(
          `OpenRouter API error: ${response.status} ${response.statusText}`,
          errorBody
        );

        if (response.status === 429) {
          throw new Error("Rate limit reached. Please try again in a moment.");
        } else if (response.status === 401) {
          throw new Error("Invalid API key. Please check your configuration.");
        } else {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
      }

      const data = await response.json();
      const aiReply = data?.choices?.[0]?.message?.content?.trim();

      if (!aiReply) {
        throw new Error("No response received from AI model");
      }

      return {
        reply: aiReply,
        model: model,
        success: true,
      };
    } catch (error) {
      console.error("Chatbot Agent Error:", error.message);
      
      // Return fallback response
      return {
        reply: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
        error: error.message,
        success: false,
      };
    }
  },
});
