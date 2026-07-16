/**
 * Answer verification stage — second-pass accuracy gate.
 */

import { callStageLlm } from "../providers/llmRouter.js";
import {
  buildVerificationSystemPrompt,
  buildVerificationUserPrompt,
} from "../prompts/verification.prompt.js";
import { verificationCache, cacheKey } from "./cache.service.js";
import { QG_CONFIG } from "../config/qg.config.js";
import { fingerprintHash } from "./duplicateDetector.service.js";

/**
 * @param {{ question: object, contextText: string }} params
 */
export async function verifyAnswerStage({ question, contextText } = {}) {
  const key = cacheKey([
    "verify",
    fingerprintHash(question?.question),
    question?.correctAnswer,
    fingerprintHash(String(contextText || "").slice(0, 800)),
  ]);
  const cached = verificationCache.get(key);
  if (cached) return { ...cached, fromCache: true };

  const llm = await callStageLlm({
    stage: "verification",
    systemPrompt: buildVerificationSystemPrompt(),
    userPrompt: buildVerificationUserPrompt({ question, context: contextText }),
    maxTokens: 1200,
  });

  const parsed = llm.parsed || {};
  let verdict = String(parsed.verdict || "reject").toLowerCase();
  if (!["accept", "reject", "revise"].includes(verdict)) verdict = "reject";

  const result = {
    verdict,
    correctAnswer: String(parsed.correctAnswer || question?.correctAnswer || "")
      .toUpperCase()
      .slice(0, 1),
    answerMatchesMarked: Boolean(parsed.answerMatchesMarked),
    hallucinationDetected: Boolean(parsed.hallucinationDetected),
    unsupportedClaims: Array.isArray(parsed.unsupportedClaims) ? parsed.unsupportedClaims : [],
    optionIssues: Array.isArray(parsed.optionIssues) ? parsed.optionIssues : [],
    stemIssues: Array.isArray(parsed.stemIssues) ? parsed.stemIssues : [],
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
    reason: String(parsed.reason || ""),
    revisedCorrectAnswer: parsed.revisedCorrectAnswer
      ? String(parsed.revisedCorrectAnswer).toUpperCase().slice(0, 1)
      : null,
    model: llm.model,
    durationMs: llm.durationMs,
    fromCache: false,
  };

  // Auto-revise marked answer when verifier is confident
  if (
    result.verdict === "revise" &&
    result.revisedCorrectAnswer &&
    ["A", "B", "C", "D"].includes(result.revisedCorrectAnswer) &&
    result.confidence >= 0.7 &&
    !result.hallucinationDetected
  ) {
    result.verdict = "accept";
    result.correctAnswer = result.revisedCorrectAnswer;
  }

  if (result.hallucinationDetected) result.verdict = "reject";

  verificationCache.set(key, result, QG_CONFIG.cache.verificationTtlMs);
  return result;
}

export default { verifyAnswerStage };
