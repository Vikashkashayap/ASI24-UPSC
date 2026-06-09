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

/** Cheaper/dedicated model for admin topic-practice (50Q). Falls back to test model. */
export function getPracticeGenerationModel() {
  return (
    process.env.OPENROUTER_PRACTICE_MODEL ||
    process.env.OPENROUTER_TEST_MODEL ||
    process.env.OPENROUTER_MODEL ||
    "google/gemini-2.5-flash-lite"
  );
}

/** Model for optional batch Hindi pass after English-only practice generation. */
export function getPracticeTranslationModel() {
  return (
    process.env.OPENROUTER_PRACTICE_TRANSLATION_MODEL ||
    process.env.OPENROUTER_TRANSLATION_MODEL ||
    getPracticeGenerationModel()
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

/** Questions per API call for topic practice — larger = fewer calls, lower total prompt cost. */
export function getPracticeBatchSize() {
  return Math.max(5, Math.min(20, parseInt(process.env.PRACTICE_BATCH_SIZE, 10) || 12));
}

/** Extra questions generated before dedupe (fewer refill API calls). */
export function getMixGenerateBuffer() {
  return Math.max(8, Math.min(35, parseInt(process.env.MIX_GENERATE_BUFFER, 10) || 20));
}

/** Smaller over-generate buffer for single-topic practice (50Q). */
export function getPracticeGenerateBuffer() {
  return Math.max(3, Math.min(12, parseInt(process.env.PRACTICE_GENERATE_BUFFER, 10) || 5));
}

/** Max refill rounds for topic practice (lower = cheaper, may fail if too low). */
export function getPracticeMaxRefillBatches() {
  return Math.max(3, Math.min(15, parseInt(process.env.PRACTICE_MAX_REFILL_BATCHES, 10) || 8));
}

/**
 * English-only MCQ gen saves ~40–50% output tokens vs bilingual in one call.
 * Default true for topic practice. Set PRACTICE_GEN_ENGLISH_ONLY=false for legacy bilingual-in-one-call.
 */
export function isPracticeEnglishOnly() {
  return process.env.PRACTICE_GEN_ENGLISH_ONLY !== "false";
}

/**
 * After English-only gen, add Hindi in 1–2 cheap translation calls (not 50 separate calls).
 * Default true. Set PRACTICE_GEN_BATCH_HINDI=false for English-only tests (lowest cost).
 */
export function isPracticeBatchHindiEnabled() {
  return process.env.PRACTICE_GEN_BATCH_HINDI !== "false";
}

/** How many questions per Hindi batch translation call. */
export function getPracticeHindiBatchSize() {
  return Math.max(10, Math.min(50, parseInt(process.env.PRACTICE_HINDI_BATCH_SIZE, 10) || 25));
}

/** Output token budget for topic-practice batches (compact explanations). */
export function getMaxTokensForPracticeGeneration(questionCount) {
  const count = Math.max(1, parseInt(questionCount, 10) || 20);
  const defaultPerQ = isPracticeEnglishOnly() ? 220 : 320;
  const perQuestion = parseInt(process.env.PRACTICE_GEN_TOKENS_PER_QUESTION, 10) || defaultPerQ;
  const cap =
    parseInt(process.env.PRACTICE_MAX_OUTPUT_TOKENS, 10) ||
    parseInt(process.env.TEST_GEN_MAX_OUTPUT_TOKENS, 10) ||
    4200;
  const floor = Math.min(cap, Math.max(1400, count * perQuestion + 200));
  return Math.min(cap, floor);
}

/** Output cap for batch Hindi translation pass. */
export function getMaxTokensForPracticeHindiBatch(questionCount) {
  const count = Math.max(1, parseInt(questionCount, 10) || 25);
  const perQuestion = parseInt(process.env.PRACTICE_HINDI_TOKENS_PER_QUESTION, 10) || 260;
  const cap = parseInt(process.env.PRACTICE_MAX_OUTPUT_TOKENS, 10) || 4200;
  return Math.min(cap, Math.max(1200, count * perQuestion + 150));
}
