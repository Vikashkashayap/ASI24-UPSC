/**
 * Answer ↔ option ↔ explanation consistency helpers.
 * Fixes the common failure where correctAnswer letter, option text,
 * and explanation disagree with each other.
 */

import { normalizeCorrectAnswer, normalizeOptions } from "../validators/question.validator.js";
import { QG_CONFIG } from "../config/qg.config.js";

export function wordCount(text) {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

/**
 * Detect which option letter a free-text explanation claims is correct.
 * Used by the legacy single-call notes generator.
 */
export function extractClaimedCorrectLetter(explanationText) {
  const text = String(explanationText || "");
  if (!text.trim()) return null;

  const patterns = [
    /\b(?:correct\s*answer|answer)\s*(?:is|:)\s*(?:option\s*)?([A-D])\b/i,
    /\boption\s*([A-D])\b(?:\s*\([^)]*\))?\s+is\s+(?:the\s+)?(?:correct|right)\b/i,
    /\b([A-D])\s*(?:\([^)]*\))?\s+is\s+(?:the\s+)?(?:correct|right)\s*(?:answer|option)?\b/i,
  ];

  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) {
      const letter = String(m[1]).toUpperCase();
      if (["A", "B", "C", "D"].includes(letter)) return letter;
    }
  }
  return null;
}

/**
 * Force a plain-string explanation to agree with locked correctAnswer.
 * Strips contradictory "Option X is correct" claims and prefixes the locked letter.
 */
export function lockPlainExplanationToAnswer(explanationText, question = {}) {
  const correct = normalizeCorrectAnswer(question?.correctAnswer ?? question?.answer);
  const options = normalizeOptions(question?.options || question?.options_en);
  if (!correct) {
    return { ok: false, explanation: String(explanationText || "").trim(), reason: "missing_correct_answer" };
  }

  let detail = String(explanationText || "").trim();
  detail = detail.replace(/^correct\s*answer\s*:\s*[A-D]\s*[.\-–:]?\s*/i, "").trim();

  // Remove claims that a different letter is correct
  detail = detail
    .replace(
      new RegExp(
        `\\bOption\\s+[A-D]\\b(?:\\s*\\([^)]*\\))?\\s+is\\s+(?:the\\s+)?(?:correct|right)\\b[^.]*\\.\\s*`,
        "gi"
      ),
      ""
    )
    .replace(
      new RegExp(
        `\\b(?:correct\\s*answer|answer)\\s*(?:is|:)\\s*(?:option\\s*)?[A-D]\\b[^.]*\\.\\s*`,
        "gi"
      ),
      ""
    )
    .trim();

  const optionText = String(options[correct] || "").trim();
  const lead = optionText
    ? `Option ${correct} ("${optionText}") is correct.`
    : `Option ${correct} is correct.`;

  const alreadyLeads = new RegExp(
    `^\\s*Option\\s+${correct}\\b`,
    "i"
  ).test(detail);

  if (!alreadyLeads) {
    detail = `${lead} ${detail}`.trim();
  }

  // Cap ~100 words (teaching explanation covering all options)
  const maxWords = Math.max(
    70,
    parseInt(process.env.QG_EXPLAIN_MAX_WORDS, 10) || 100
  );
  const words = detail.split(/\s+/).filter(Boolean);
  if (words.length > maxWords) {
    detail = `${words.slice(0, maxWords).join(" ").replace(/[.,;:]+$/, "")}.`;
  }

  return {
    ok: true,
    explanation: detail,
    correctAnswer: correct,
    claimedLetter: extractClaimedCorrectLetter(explanationText),
    wasRewritten: detail !== String(explanationText || "").trim(),
  };
}

/**
 * Ensure correctAnswer is a valid letter whose option text is non-empty.
 */
export function lockAnswerToOptions(question = {}) {
  const options = normalizeOptions(question.options);
  let correct = normalizeCorrectAnswer(question.correctAnswer ?? question.answer);

  if (!correct || !String(options[correct] || "").trim()) {
    return {
      ok: false,
      reason: "correct_answer_option_mismatch",
      options,
      correctAnswer: correct,
    };
  }

  return {
    ok: true,
    options,
    correctAnswer: correct,
    correctOptionText: options[correct],
  };
}

/**
 * Force explanation to agree with the verified correctAnswer.
 * Rebuilds whyWrong so the correct letter is never explained as "wrong".
 */
export function lockExplanationToAnswer(structured, question) {
  const locked = { ...(structured && typeof structured === "object" ? structured : {}) };
  const correct = normalizeCorrectAnswer(question?.correctAnswer ?? question?.answer);
  const options = normalizeOptions(question?.options);

  if (!correct) return { ok: false, structured: locked, reason: "missing_correct_answer" };

  locked.correctAnswer = correct;

  const why = { ...(locked.whyWrong || {}) };
  for (const k of ["A", "B", "C", "D"]) {
    if (k === correct) {
      why[k] = "";
    } else if (!String(why[k] || "").trim()) {
      why[k] = `Option ${k} ("${String(options[k] || "").slice(0, 80)}") is incorrect as per the retrieved context.`;
    }
  }
  locked.whyWrong = why;

  // Strip contradictory lead-ins / wrong-letter claims (keep locked letter; re-add below)
  let detail = String(locked.detailedExplanation || "").trim();
  detail = detail.replace(/^correct\s*answer\s*:\s*[A-D]\s*[.\-–:]?\s*/i, "").trim();
  // Remove "Option X is correct/right" only when X ≠ locked answer
  detail = detail
    .replace(
      new RegExp(
        `\\bOption\\s+(?![${correct}])[A-D]\\b(?:\\s*\\([^)]*\\))?\\s+is\\s+(?:the\\s+)?(?:correct|right)\\b[^.]*\\.\\s*`,
        "gi"
      ),
      ""
    )
    .trim();

  const optionText = String(options[correct] || "").trim();
  // Do NOT use /i with bare letter A — it matches English article "a"
  if (!new RegExp(`\\bOption\\s+${correct}\\b`).test(detail) && optionText) {
    detail = `Option ${correct} ("${optionText}") is correct. ${detail}`.trim();
  } else if (!new RegExp(`\\bOption\\s+${correct}\\b`).test(detail)) {
    detail = `Option ${correct} is correct. ${detail}`.trim();
  }

  locked.detailedExplanation = detail;

  const words = wordCount(detail);
  const minW = QG_CONFIG.quality.explanationMinWords;
  const maxW = QG_CONFIG.quality.explanationMaxWords;
  const withinRange = words >= minW && words <= maxW + 15; // small slack for lock prefix

  return {
    ok: true,
    structured: locked,
    wordCount: words,
    withinRange,
    correctAnswer: correct,
  };
}

/**
 * Pipeline gate: reject if answer letter / option / explanation still disagree.
 */
export function checkAnswerExplanationConsistency(question, explanation) {
  const lock = lockAnswerToOptions(question);
  if (!lock.ok) {
    return { ok: false, reason: lock.reason };
  }

  if (!QG_CONFIG.quality.requireAnswerExplanationLock) {
    return { ok: true, correctAnswer: lock.correctAnswer };
  }

  const expAns = normalizeCorrectAnswer(
    explanation?.correctAnswer ?? (typeof explanation === "object" ? explanation.correctAnswer : null)
  );

  if (expAns && expAns !== lock.correctAnswer) {
    return {
      ok: false,
      reason: "explanation_answer_mismatch",
      questionAnswer: lock.correctAnswer,
      explanationAnswer: expAns,
    };
  }

  const why = explanation?.whyWrong || {};
  if (String(why[lock.correctAnswer] || "").trim().length > 20) {
    // Correct option explained as wrong — inconsistency
    return {
      ok: false,
      reason: "correct_option_marked_wrong_in_explanation",
      correctAnswer: lock.correctAnswer,
    };
  }

  return { ok: true, correctAnswer: lock.correctAnswer };
}

export default {
  wordCount,
  extractClaimedCorrectLetter,
  lockPlainExplanationToAnswer,
  lockAnswerToOptions,
  lockExplanationToAnswer,
  checkAnswerExplanationConsistency,
};
