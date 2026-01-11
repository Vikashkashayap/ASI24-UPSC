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
    // Validate API key - use directly like other working agents
    if (!apiKey || apiKey === "") {
      throw new Error("OpenRouter API key is required and cannot be empty. Please check your .env file.");
    }

    if (!model) {
      throw new Error("Model name is required");
    }

    // Debug: Log API key status (first 15 chars only for security)
    const maskedKey = apiKey.substring(0, 15) + "...";
    console.log("🔑 Using API key:", maskedKey);
    console.log("🤖 Using model:", model);
    console.log("🌐 Base URL:", OPENROUTER_BASE_URL);

    // OpenRouter requires HTTP-Referer and X-Title headers (exact values as per requirements)
    // Use API key directly without trimming, same as working agents
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "http://localhost:5173",
      "X-Title": "UPSC Mentor - Prelims Test Generator",
    };

    console.log("📤 Request headers:");
    console.log("   Authorization:", `Bearer ${apiKey.substring(0, 15)}...`);
    console.log("   HTTP-Referer:", "http://localhost:5173");
    console.log("   X-Title:", "UPSC Mentor - Prelims Test Generator");

    const requestBody = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
    };

    console.log("📤 Request body (summary):");
    console.log("   Model:", model);
    console.log("   Messages count:", requestBody.messages.length);
    console.log("   Temperature:", temperature);
    console.log("   Max tokens:", maxTokens);

    const response = await fetch(OPENROUTER_BASE_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    console.log("📥 Response status:", response.status, response.statusText);
    console.log("📥 Response headers:", Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ OpenRouter API Error Response:");
      console.error("   Status:", response.status, response.statusText);
      console.error("   Response body:", errorText);
      
      let errorMessage = `OpenRouter API error: ${response.status} ${response.statusText}`;
      
      // Parse error response for better error messages
      try {
        const errorData = JSON.parse(errorText);
        console.error("   Parsed error data:", JSON.stringify(errorData, null, 2));
        
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        } else if (errorData.error) {
          errorMessage = JSON.stringify(errorData.error);
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        console.error("   Could not parse error response as JSON, using raw text");
        errorMessage = errorText || errorMessage;
      }

      // Provide helpful error messages for common issues
      if (response.status === 401) {
        if (errorMessage.includes("User not found") || errorMessage.includes("401") || errorMessage.includes("Unauthorized")) {
          errorMessage = "Invalid OpenRouter API key. Please check your OPENROUTER_API_KEY in .env file. Make sure it's a valid key from https://openrouter.ai/keys";
        }
      } else if (response.status === 400) {
        if (errorMessage.includes("model")) {
          errorMessage = `Invalid model name: ${model}. Please check OPENROUTER_MODEL in .env file.`;
        }
      }

      console.error("=".repeat(60));
      throw new Error(errorMessage);
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error("❌ Invalid response format from OpenRouter API");
      console.error("   Response data:", JSON.stringify(data, null, 2));
      throw new Error("Invalid response format from OpenRouter API");
    }

    console.log("✅ OpenRouter API call successful");
    console.log("   Response model:", data.model || model);
    console.log("   Usage:", JSON.stringify(data.usage || {}));
    console.log("=".repeat(60));

    return {
      success: true,
      content: data.choices[0].message.content || "",
      model: data.model || model,
      usage: data.usage || {},
    };
  } catch (error) {
    console.error("=".repeat(60));
    console.error("❌ OpenRouter API call FAILED");
    console.error("   Error message:", error.message);
    console.error("   Error stack:", error.stack);
    console.error("=".repeat(60));
    
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
    // First, try to find JSON object in the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON object found in response");
      return null;
    }

    let jsonString = jsonMatch[0];

    // Clean control characters that might break JSON parsing
    // Remove unescaped control characters from within string literals
    jsonString = jsonString.replace(/("(?:[^"\\]|\\.)*")/g, (match) => {
      // For each string literal, remove control characters except \n, \t, \r
      return match.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    });

    // Also clean any remaining control characters outside strings (though this shouldn't happen in valid JSON)
    jsonString = jsonString.replace(/[\x00-\x1F\x7F]/g, '');

    // Try to parse the cleaned JSON
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Failed to parse JSON from response:", error);
    console.error("Raw content length:", content.length);
    // Log a portion of the problematic content for debugging
    const startPos = Math.max(0, 2300);
    const endPos = Math.min(content.length, 2400);
    console.error("Content around error position:", content.substring(startPos, endPos));
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


