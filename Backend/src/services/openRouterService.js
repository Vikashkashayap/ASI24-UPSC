import fetch from "node-fetch";

/**
 * OpenRouter API Service
 * Handles all API calls to OpenRouter AI models
 */

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * Call OpenRouter API with system and user prompts
 * @param {Object} params - API call parameters
 * @param {string} params.apiKey - OpenRouter API key
 * @param {string} params.model - Model name (e.g., "anthropic/claude-3.5-sonnet")
 * @param {string} params.systemPrompt - System prompt for the AI
 * @param {string} params.userPrompt - User prompt/question
 * @param {number} params.temperature - Temperature for response (default: 0.3)
 * @param {number} params.maxTokens - Maximum tokens in response (default: 2000)
 * @returns {Promise<Object>} - API response with content
 */
export const callOpenRouterAPI = async ({
  apiKey,
  model,
  systemPrompt,
  userPrompt,
  temperature = 0.3,
  maxTokens = 2000,
}) => {
  try {
    if (!apiKey) {
      throw new Error("OpenRouter API key is required");
    }

    if (!model) {
      throw new Error("Model name is required");
    }

    const response = await fetch(OPENROUTER_BASE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenRouter API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error("Invalid response format from OpenRouter API");
    }

    return {
      success: true,
      content: data.choices[0].message.content || "",
      model: data.model || model,
      usage: data.usage || {},
    };
  } catch (error) {
    console.error("OpenRouter API call failed:", error);
    return {
      success: false,
      error: error.message || "OpenRouter API call failed",
      content: "",
    };
  }
};

/**
 * Parse JSON from AI response text
 * Extracts JSON object from response even if wrapped in markdown or other text
 * @param {string} content - Raw content from AI response
 * @returns {Object|null} - Parsed JSON object or null if parsing fails
 */
export const parseJSONFromResponse = (content) => {
  try {
    // Try to find JSON object in the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (error) {
    console.error("Failed to parse JSON from response:", error);
    return null;
  }
};

/**
 * Evaluate UPSC answer using OpenRouter API
 * @param {Object} params - Evaluation parameters
 * @param {string} params.apiKey - OpenRouter API key
 * @param {string} params.model - Model name
 * @param {string} params.systemPrompt - System prompt for evaluation
 * @param {string} params.userPrompt - User prompt with question and answer
 * @returns {Promise<Object>} - Parsed evaluation result
 */
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
    temperature: 0.3, // Low temperature for consistent evaluation
    maxTokens: 2000,
  });

  if (!apiResponse.success) {
    return {
      success: false,
      error: apiResponse.error,
      data: null,
    };
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
  parseJSONFromResponse,
  evaluateAnswerWithOpenRouter,
};


