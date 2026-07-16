/**
 * Fact verification stage — explanation vs retrieved context.
 */

import { callStageLlm } from "../providers/llmRouter.js";
import {
  buildFactCheckSystemPrompt,
  buildFactCheckUserPrompt,
} from "../prompts/factCheck.prompt.js";

/**
 * @param {{ question: object, explanation: object|string, contextText: string }} params
 */
export async function factCheckStage({ question, explanation, contextText } = {}) {
  const llm = await callStageLlm({
    stage: "factCheck",
    systemPrompt: buildFactCheckSystemPrompt(),
    userPrompt: buildFactCheckUserPrompt({ question, explanation, context: contextText }),
    maxTokens: 1200,
  });

  const parsed = llm.parsed || {};
  let verdict = String(parsed.verdict || "reject").toLowerCase();
  if (verdict !== "accept" && verdict !== "reject") verdict = "reject";

  const factConfidence =
    typeof parsed.factConfidence === "number" ? parsed.factConfidence : verdict === "accept" ? 0.7 : 0.2;

  // Reject when auditor flags answer-letter mismatch with locked question answer
  if (parsed.answerLetterConsistent === false) {
    verdict = "reject";
  }

  const expAns = String(
    (explanation && typeof explanation === "object" && explanation.correctAnswer) || ""
  )
    .toUpperCase()
    .slice(0, 1);
  const qAns = String(question?.correctAnswer || "")
    .toUpperCase()
    .slice(0, 1);
  if (expAns && qAns && expAns !== qAns) {
    verdict = "reject";
  }

  return {
    verdict,
    unsupportedClaims: Array.isArray(parsed.unsupportedClaims) ? parsed.unsupportedClaims : [],
    supportedClaims: Array.isArray(parsed.supportedClaims) ? parsed.supportedClaims : [],
    answerLetterConsistent: parsed.answerLetterConsistent !== false && !(expAns && qAns && expAns !== qAns),
    factConfidence,
    reason: String(parsed.reason || ""),
    model: llm.model,
    durationMs: llm.durationMs,
  };
}

export default { factCheckStage };
