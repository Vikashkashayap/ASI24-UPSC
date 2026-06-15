import { openRouterChatCompletion } from "./openRouterClient.js";

/**
 * Call OpenRouter API with system and user prompts
 */
export const callOpenRouterAPI = async ({
  apiKey,
  model,
  systemPrompt,
  userPrompt,
  temperature = 0.3,
  maxTokens = 2000,
  xTitle = "UPSC Mentor",
  cacheTtlSec,
  cacheKey,
  label,
}) => {
  try {
    if (!apiKey || apiKey === "") {
      throw new Error("OpenRouter API key is required and cannot be empty. Please check your .env file.");
    }
    if (!model) {
      throw new Error("Model name is required");
    }

    const result = await openRouterChatCompletion({
      apiKey,
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature,
      maxTokens,
      xTitle,
      cacheTtlSec,
      cacheKey,
      label,
    });

    return {
      success: true,
      content: result.content || "",
      model: result.model,
      usage: result.usage || {},
      cached: result.cached,
    };
  } catch (error) {
    console.error("❌ OpenRouter API call failed:", error.message);
    return {
      success: false,
      error: error.message || "OpenRouter API call failed",
      content: "",
    };
  }
};

export const parseJSONFromResponse = (content) => {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON object found in response");
      return null;
    }

    let jsonString = jsonMatch[0];
    jsonString = jsonString.replace(/("(?:[^"\\]|\\.)*")/g, (match) => {
      return match.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
    });
    jsonString = jsonString.replace(/[\x00-\x1F\x7F]/g, "");
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Failed to parse JSON from response:", error.message);
    return null;
  }
};

export const callOpenRouterVisionAPI = async ({
  apiKey,
  model,
  systemPrompt,
  userPrompt,
  images = [],
  temperature = 0.2,
  maxTokens = 4096,
  label = "vision-eval",
}) => {
  try {
    if (!apiKey || apiKey === "") {
      throw new Error("OpenRouter API key is required. Please set OPENROUTER_API_KEY in .env");
    }
    if (!model) throw new Error("Model name is required");
    if (!images.length) throw new Error("At least one image is required for vision evaluation");

    const userContent = [{ type: "text", text: userPrompt }, ...images];

    const result = await openRouterChatCompletion({
      apiKey,
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      temperature,
      maxTokens,
      xTitle: "UPSC Mentor - Copy Evaluation",
      cacheTtlSec: 0,
      label,
    });

    return {
      success: true,
      content: result.content || "",
      model: result.model,
      usage: result.usage || {},
    };
  } catch (error) {
    console.error("❌ OpenRouter Vision API failed:", error.message);
    return {
      success: false,
      error: error.message || "OpenRouter vision API call failed",
      content: "",
    };
  }
};

export const evaluateAnswerWithOpenRouter = async ({
  apiKey,
  model,
  systemPrompt,
  userPrompt,
}) => {
  const apiResponse = await callOpenRouterAPI({
    apiKey,
    model,
    systemPrompt,
    userPrompt,
    temperature: 0.3,
    maxTokens: 1800,
    xTitle: "UPSC Mentor - Copy Evaluation",
    cacheTtlSec: 0,
    label: "copy-eval",
  });

  if (!apiResponse.success) {
    return { success: false, error: apiResponse.error, data: null };
  }

  const parsedData = parseJSONFromResponse(apiResponse.content);
  if (!parsedData) {
    return {
      success: false,
      error: "Failed to parse JSON from API response",
      data: null,
      rawContent: apiResponse.content,
    };
  }

  return {
    success: true,
    data: parsedData,
    rawContent: apiResponse.content,
    model: apiResponse.model,
    usage: apiResponse.usage,
  };
};

export default {
  callOpenRouterAPI,
  callOpenRouterVisionAPI,
  parseJSONFromResponse,
  evaluateAnswerWithOpenRouter,
};
