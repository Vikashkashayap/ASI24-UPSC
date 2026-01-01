import { RunnableLambda } from "@langchain/core/runnables";
import fetch from "node-fetch";

/**
 * Translator Agent for real-time speech-to-speech translation
 * Uses LangChain + OpenRouter for text translation
 * Optimized for UPSC/academic terminology preservation
 */
export const translatorAgent = new RunnableLambda({
  func: async (input) => {
    const { text, sourceLanguage, targetLanguage, context = "academic" } = input || {};

    if (!text || !text.trim()) {
      throw new Error("Text cannot be empty");
    }

    if (!sourceLanguage || !targetLanguage) {
      throw new Error("Source and target languages are required");
    }

    // If languages are the same, return original text
    if (sourceLanguage === targetLanguage) {
      return {
        translatedText: text,
        sourceLanguage,
        targetLanguage,
        needsTranslation: false,
      };
    }

    try {
      const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
      const apiKey = process.env.OPENROUTER_API_KEY;

      if (!apiKey) {
        throw new Error("Missing OPENROUTER_API_KEY in environment variables");
      }

      // System prompt optimized for UPSC/academic translation
      const systemPrompt = `You are a professional translator specializing in academic and UPSC (Union Public Service Commission) content.
Your task is to translate text while preserving:
- Technical terminology (especially UPSC-specific terms)
- Academic precision
- Formal tone appropriate for educational content
- Proper names, dates, and numbers

Translate from ${sourceLanguage} to ${targetLanguage}.
Keep the translation concise and natural for spoken audio.
Do not add explanations or notes, only provide the translated text.`;

      const messages = [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Translate the following text from ${sourceLanguage} to ${targetLanguage}:\n\n${text}`,
        },
      ];

      // Call OpenRouter API
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": process.env.FRONTEND_URL || "http://localhost:5173",
          "X-Title": "Meeting Translator",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.3, // Lower temperature for more consistent translations
          max_tokens: 500, // Keep translations concise for real-time audio
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const translatedText = data.choices?.[0]?.message?.content?.trim() || text;

      return {
        translatedText,
        sourceLanguage,
        targetLanguage,
        needsTranslation: true,
        originalText: text,
      };
    } catch (error) {
      console.error("Translation error:", error);
      // Fallback: return original text if translation fails
      return {
        translatedText: text,
        sourceLanguage,
        targetLanguage,
        needsTranslation: false,
        error: error.message,
      };
    }
  },
});

