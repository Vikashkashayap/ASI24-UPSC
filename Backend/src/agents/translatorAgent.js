import { RunnableLambda } from "@langchain/core/runnables";
import { getTranslationModel } from "../config/openRouterModels.js";
import { openRouterChatCompletion } from "../services/openRouterClient.js";

const TRANSLATOR_SYSTEM =
  "Translate UPSC/academic text. Preserve terms, names, numbers. Spoken-audio friendly. Output translation only.";

export const translatorAgent = new RunnableLambda({
  func: async (input) => {
    const { text, sourceLanguage, targetLanguage, context = "academic" } = input || {};

    if (!text || !text.trim()) {
      throw new Error("Text cannot be empty");
    }

    if (!sourceLanguage || !targetLanguage) {
      throw new Error("Source and target languages are required");
    }

    if (sourceLanguage === targetLanguage) {
      return {
        translatedText: text,
        sourceLanguage,
        targetLanguage,
        needsTranslation: false,
      };
    }

    try {
      const model = getTranslationModel();
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        throw new Error("Missing OPENROUTER_API_KEY in environment variables");
      }

      const result = await openRouterChatCompletion({
        apiKey,
        model,
        messages: [
          { role: "system", content: TRANSLATOR_SYSTEM },
          {
            role: "user",
            content: `${sourceLanguage} → ${targetLanguage} (${context}):\n\n${text}`,
          },
        ],
        temperature: 0.2,
        maxTokens: Math.min(500, Math.max(80, text.length * 2)),
        xTitle: "Meeting Translator",
        cacheTtlSec: 86400,
        label: "meeting-translator",
      });

      const translatedText = result.content?.trim() || text;

      return {
        translatedText,
        sourceLanguage,
        targetLanguage,
        needsTranslation: true,
        originalText: text,
      };
    } catch (error) {
      console.error("Translation error:", error);
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
