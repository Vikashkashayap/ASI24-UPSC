/**
 * TokenEstimator — cheap local token estimates before calling Gemini/OpenRouter.
 * Uses ~1.3 tokens per word (English/UPSC notes heuristic).
 */

export function countWords(text = "") {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

/**
 * @param {string} text
 * @returns {number}
 */
export function estimateTokens(text = "") {
  const words = countWords(text);
  if (!words) return 0;
  return Math.ceil(words * 1.3);
}

/**
 * @param {string} text
 * @returns {{ words: number, tokens: number, chars: number }}
 */
export function estimateTextStats(text = "") {
  const str = String(text || "");
  const words = countWords(str);
  return {
    words,
    tokens: words ? Math.ceil(words * 1.3) : 0,
    chars: str.length,
  };
}

/**
 * Estimate full request size (system + user) and expected output.
 * @param {{ systemPrompt?: string, userPrompt?: string, questionCount?: number }} opts
 */
export function estimateRequestTokens(opts = {}) {
  const systemTokens = estimateTokens(opts.systemPrompt || "");
  const userTokens = estimateTokens(opts.userPrompt || "");
  const inputTokens = systemTokens + userTokens;
  const questionCount = Math.max(1, parseInt(opts.questionCount, 10) || 10);
  // Compact UPSC MCQ JSON ≈ 90–110 tokens each with 2-line explanation
  const outputTokens = questionCount * 100 + 50;
  return {
    systemTokens,
    userTokens,
    inputTokens,
    outputTokens,
    questionCount,
  };
}

/**
 * Print estimated tokens before the API call (Rule 9).
 */
export function logTokenEstimates(label, estimates) {
  const tag = label ? ` [${label}]` : "";
  console.log(
    `📊 Estimated Input Tokens${tag}: ${estimates.inputTokens} | Estimated Output Tokens: ${estimates.outputTokens}`
  );
}

export const tokenEstimator = {
  estimateTokens,
  estimateTextStats,
  estimateRequestTokens,
  logTokenEstimates,
  countWords,
};

export default tokenEstimator;
