/**
 * Explanation generation stage.
 * Forces correctAnswer lock + 50–70 word target via consistency helpers.
 */

import { callStageLlm } from "../providers/llmRouter.js";
import {
  buildExplanationSystemPrompt,
  buildExplanationUserPrompt,
  formatExplanationText,
} from "../prompts/explanation.prompt.js";
import { explanationCache, cacheKey } from "./cache.service.js";
import { QG_CONFIG } from "../config/qg.config.js";
import { fingerprintHash } from "./duplicateDetector.service.js";
import { lockExplanationToAnswer, wordCount } from "../utils/consistency.js";

/**
 * @param {{ question: object, contextText: string, meta?: object }} params
 */
export async function generateExplanationStage({ question, contextText, meta = {} } = {}) {
  const key = cacheKey([
    "explain",
    fingerprintHash(question?.question),
    question?.correctAnswer,
  ]);
  const cached = explanationCache.get(key);
  if (cached) return { ...cached, fromCache: true };

  const llm = await callStageLlm({
    stage: "explanation",
    systemPrompt: buildExplanationSystemPrompt(),
    userPrompt: buildExplanationUserPrompt({ question, context: contextText, meta }),
    maxTokens: 1800,
  });

  const structured = llm.parsed && typeof llm.parsed === "object" ? llm.parsed : null;
  if (!structured?.detailedExplanation) {
    return {
      success: false,
      error: "Explanation generation failed",
      structured: null,
      text: "",
      model: llm.model,
      durationMs: llm.durationMs,
      fromCache: false,
    };
  }

  // HARD LOCK: explanation must never disagree with verified correctAnswer
  const locked = lockExplanationToAnswer(structured, question);
  if (!locked.ok) {
    return {
      success: false,
      error: locked.reason || "Explanation consistency lock failed",
      structured: null,
      text: "",
      model: llm.model,
      durationMs: llm.durationMs,
      fromCache: false,
    };
  }

  const finalStructured = locked.structured;
  finalStructured.topic = finalStructured.topic || meta.topic || question.topic || "";
  finalStructured.book =
    finalStructured.book || meta.book || meta.chapter || question.book || "";

  const words = wordCount(finalStructured.detailedExplanation);
  const minW = QG_CONFIG.quality.explanationMinWords;
  // Allow slight under-length if still readable; reject only if far below
  if (words < Math.max(25, minW - 20)) {
    return {
      success: false,
      error: `Explanation too short (${words} words; need ~${minW}–${QG_CONFIG.quality.explanationMaxWords})`,
      structured: finalStructured,
      text: "",
      model: llm.model,
      durationMs: llm.durationMs,
      fromCache: false,
    };
  }

  const text = formatExplanationText(finalStructured, question.correctAnswer);
  const result = {
    success: true,
    structured: finalStructured,
    text,
    wordCount: words,
    model: llm.model,
    durationMs: llm.durationMs,
    fromCache: false,
  };

  explanationCache.set(key, result, QG_CONFIG.cache.verificationTtlMs);
  return result;
}

export { formatExplanationText };
export default { generateExplanationStage, formatExplanationText };
