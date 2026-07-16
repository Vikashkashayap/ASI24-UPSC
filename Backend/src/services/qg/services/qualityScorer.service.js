/**
 * Quality scoring — context relevance, fact confidence, option/explanation quality.
 */

import { QG_CONFIG } from "../config/qg.config.js";
import {
  lockAnswerToOptions,
  checkAnswerExplanationConsistency,
  wordCount,
} from "../utils/consistency.js";

function clamp01(n) {
  if (typeof n !== "number" || Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/**
 * @param {{
 *   chunks?: object[],
 *   verification?: object,
 *   factCheck?: object,
 *   question?: object,
 *   explanation?: object|string,
 * }} input
 */
export function scoreQuestionQuality(input = {}) {
  const chunks = input.chunks || [];
  const verification = input.verification || {};
  const factCheck = input.factCheck || {};
  const question = input.question || {};
  const explanation = input.explanation;

  const simScores = chunks
    .map((c) => c.rerankScore ?? c.hybridScore ?? c.vectorScore ?? c.score)
    .filter((n) => typeof n === "number");
  const avgSim = simScores.length ? simScores.reduce((a, b) => a + b, 0) / simScores.length : 0;
  const contextRelevanceScore = clamp01(avgSim > 1 ? avgSim / 10 : avgSim);

  const factConfidenceScore = clamp01(
    typeof factCheck.factConfidence === "number"
      ? factCheck.factConfidence
      : verification.confidence ?? (factCheck.verdict === "accept" ? 0.7 : 0.3)
  );

  const options = question.options || {};
  const lengths = ["A", "B", "C", "D"].map((k) => String(options[k] || "").trim().length);
  const minLen = Math.min(...lengths);
  const maxLen = Math.max(...lengths);
  const balance = maxLen > 0 ? minLen / maxLen : 0;
  const unique = new Set(
    ["A", "B", "C", "D"].map((k) => String(options[k] || "").toLowerCase().replace(/\s+/g, " ").trim())
  ).size;
  let optionQualityScore = 0.4 * balance + 0.4 * (unique / 4);
  if (question.distractorRationale && typeof question.distractorRationale === "object") {
    optionQualityScore += 0.2;
  }
  optionQualityScore = clamp01(optionQualityScore);

  const answerLock = lockAnswerToOptions(question);
  if (!answerLock.ok) optionQualityScore = Math.min(optionQualityScore, 0.25);

  let explanationQualityScore = 0.3;
  let consistencyOk = true;
  if (explanation && typeof explanation === "object") {
    const words = wordCount(explanation.detailedExplanation);
    const minW = QG_CONFIG.quality.explanationMinWords;
    const maxW = QG_CONFIG.quality.explanationMaxWords;
    const inRange = words >= minW - 10 && words <= maxW + 20;
    const why = explanation.whyWrong || {};
    const wrongFilled = ["A", "B", "C", "D"].filter(
      (k) => k !== question.correctAnswer && String(why[k] || "").trim().length > 15
    ).length;
    const tip = String(explanation.upscLearningTip || "").length > 10;
    const consistency = checkAnswerExplanationConsistency(question, explanation);
    consistencyOk = consistency.ok;
    explanationQualityScore = clamp01(
      (inRange ? 0.45 : words > 30 ? 0.2 : 0.05) +
        Math.min(0.35, wrongFilled * 0.1) +
        (tip ? 0.15 : 0) +
        (consistencyOk ? 0.1 : 0)
    );
  } else if (String(explanation || "").length > 120) {
    explanationQualityScore = 0.55;
  }

  const verifyBoost = verification.verdict === "accept" ? 0.15 : verification.verdict === "revise" ? 0.05 : 0;
  const factBoost = factCheck.verdict === "accept" ? 0.15 : 0;

  const overallAiConfidence = clamp01(
    0.25 * contextRelevanceScore +
      0.3 * factConfidenceScore +
      0.2 * optionQualityScore +
      0.15 * explanationQualityScore +
      verifyBoost +
      factBoost
  );

  const mismatchHardFail =
    QG_CONFIG.quality.rejectOnOptionAnswerMismatch &&
    (!answerLock.ok || !consistencyOk);

  const passesThreshold =
    !mismatchHardFail &&
    overallAiConfidence >= QG_CONFIG.quality.minOverallConfidence &&
    factConfidenceScore >= QG_CONFIG.quality.minFactConfidence;

  return {
    contextRelevanceScore: round4(contextRelevanceScore),
    factConfidenceScore: round4(factConfidenceScore),
    optionQualityScore: round4(optionQualityScore),
    explanationQualityScore: round4(explanationQualityScore),
    overallAiConfidence: round4(overallAiConfidence),
    similarityScore: round4(contextRelevanceScore),
    consistencyOk,
    answerOptionOk: answerLock.ok,
    qualityProfile: QG_CONFIG.qualityProfile,
    passesThreshold,
  };
}

function round4(n) {
  return Math.round(n * 10000) / 10000;
}

export default { scoreQuestionQuality };
