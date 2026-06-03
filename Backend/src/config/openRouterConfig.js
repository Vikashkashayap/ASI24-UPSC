/**
 * OpenRouter model selection for test / prelims MCQ generation.
 * Uses a separate env var so copy-evaluation can keep a stronger vision model.
 */
export function getTestGenerationModel() {
  return (
    process.env.OPENROUTER_TEST_MODEL ||
    process.env.OPENROUTER_MODEL ||
    "google/gemini-2.5-flash-lite"
  );
}

/** Output token budget per prelims batch (bilingual Q+options, compact EN explanation). */
export function getMaxTokensForTestGeneration(questionCount) {
  const count = Math.max(1, parseInt(questionCount, 10) || 20);
  const perQuestion = parseInt(process.env.TEST_GEN_TOKENS_PER_QUESTION, 10) || 420;
  const cap = parseInt(process.env.TEST_GEN_MAX_OUTPUT_TOKENS, 10) || 5500;
  const floor = Math.min(cap, Math.max(1800, count * perQuestion + 300));
  return Math.min(cap, floor);
}

/** Questions per API call for admin Prelims Mock (GS Mix, subject, PYQ, CSAT). */
export function getMixBatchSize() {
  return Math.max(5, Math.min(20, parseInt(process.env.MIX_BATCH_SIZE, 10) || 10));
}

/** Extra questions generated before dedupe (fewer refill API calls). */
export function getMixGenerateBuffer() {
  return Math.max(8, Math.min(35, parseInt(process.env.MIX_GENERATE_BUFFER, 10) || 20));
}
