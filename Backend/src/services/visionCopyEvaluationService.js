/**
 * Vision Copy Evaluation Service
 * Sends answer copy images to OpenRouter Gemini vision model.
 */

import {
  VISION_EVALUATION_SYSTEM_PROMPT,
  buildVisionUserPrompt,
} from "../prompts/copyEvaluationPrompts.js";
import {
  callOpenRouterVisionAPI,
  parseJSONFromResponse,
} from "./openRouterService.js";

const REQUIRED_FIELDS = [
  "overallMarks",
  "maxMarks",
  "summary",
  "strengths",
  "weaknesses",
  "missingDimensions",
  "presentationFeedback",
  "contentFeedback",
  "suggestions",
  "improvedConclusion",
  "examinerFeedback",
];

/**
 * Normalize and validate AI evaluation JSON
 */
export const normalizeEvaluationResult = (raw) => {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const toArray = (val) => {
    if (Array.isArray(val)) return val.map(String).filter(Boolean);
    if (typeof val === "string" && val.trim()) return [val.trim()];
    return [];
  };

  const overallMarks = Number(raw.overallMarks);
  const maxMarks = Number(raw.maxMarks) || 15;

  if (Number.isNaN(overallMarks)) {
    return null;
  }

  const answers = Array.isArray(raw.answers)
    ? raw.answers.map((a, i) => ({
        questionNumber: String(a?.questionNumber || i + 1),
        questionText: String(a?.questionText || "").trim(),
        answerText: String(a?.answerText || "").trim(),
      })).filter((a) => a.answerText || a.questionText)
    : [];

  const extractedAnswerText = String(
    raw.extractedAnswerText ||
      answers.map((a) => a.answerText).filter(Boolean).join("\n\n") ||
      ""
  ).trim();

  const questionText = String(
    raw.questionText ||
      answers.map((a) => a.questionText).filter(Boolean).join("\n") ||
      ""
  ).trim();

  return {
    questionText,
    extractedAnswerText,
    answers,
    overallMarks: Math.min(Math.max(0, overallMarks), maxMarks),
    maxMarks,
    summary: String(raw.summary || "").trim(),
    strengths: toArray(raw.strengths),
    weaknesses: toArray(raw.weaknesses),
    missingDimensions: toArray(raw.missingDimensions),
    presentationFeedback: String(raw.presentationFeedback || "").trim(),
    contentFeedback: String(raw.contentFeedback || "").trim(),
    suggestions: toArray(raw.suggestions),
    improvedConclusion: String(raw.improvedConclusion || "").trim(),
    examinerFeedback: String(raw.examinerFeedback || "").trim(),
  };
};

/**
 * Validate normalized result has minimum content
 */
export const validateEvaluationResult = (result) => {
  if (!result) return { valid: false, error: "Empty evaluation result" };

  for (const field of REQUIRED_FIELDS) {
    if (result[field] === undefined || result[field] === null) {
      return { valid: false, error: `Missing required field: ${field}` };
    }
  }

  if (!result.summary && !result.examinerFeedback) {
    return { valid: false, error: "Evaluation lacks summary and examiner feedback" };
  }

  return { valid: true };
};

/**
 * Evaluate answer copy images via OpenRouter vision
 */
export const evaluateCopyWithVision = async ({
  pages,
  metadata = {},
  apiKey,
  model,
}) => {
  if (!apiKey) {
    return { success: false, error: "OPENROUTER_API_KEY is not configured" };
  }

  if (!pages?.length) {
    return { success: false, error: "No images to evaluate" };
  }

  const visionModel =
    model || process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash";

  const userPrompt = buildVisionUserPrompt({
    subject: metadata.subject,
    paper: metadata.paper,
    year: metadata.year,
    pageCount: pages.length,
  });

  const imageContents = pages.map((page) => ({
    type: "image_url",
    image_url: {
      url: page.dataUrl || `data:${page.mimeType};base64,${page.base64}`,
    },
  }));

  const apiResponse = await callOpenRouterVisionAPI({
    apiKey,
    model: visionModel,
    systemPrompt: VISION_EVALUATION_SYSTEM_PROMPT,
    userPrompt,
    images: imageContents,
    temperature: 0.2,
    maxTokens: 8192,
  });

  if (!apiResponse.success) {
    return {
      success: false,
      error: apiResponse.error || "Vision API call failed",
    };
  }

  const parsed = parseJSONFromResponse(apiResponse.content);
  const normalized = normalizeEvaluationResult(parsed);
  const validation = validateEvaluationResult(normalized);

  if (!validation.valid) {
    return {
      success: false,
      error: validation.error || "Failed to parse AI evaluation JSON",
      rawContent: apiResponse.content,
    };
  }

  return {
    success: true,
    data: normalized,
    model: apiResponse.model,
    usage: apiResponse.usage,
  };
};

export default {
  evaluateCopyWithVision,
  normalizeEvaluationResult,
  validateEvaluationResult,
};
