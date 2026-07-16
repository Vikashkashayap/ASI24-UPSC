/**
 * Enterprise UPSC Prelims Question Generation — central configuration.
 * Accuracy over speed. Never generate without retrieved context.
 *
 * Quality profiles (QG_QUALITY_PROFILE):
 *   best_pro  — highest accuracy, locked answer↔explanation, 50–70 word explain
 *   balanced  — default-ish thresholds, still consistency-locked
 *   fast      — looser gates for throughput
 *
 * Override any profile value via env (QG_MIN_OVERALL_CONFIDENCE, etc.).
 */

function envInt(key, fallback) {
  const n = parseInt(process.env[key], 10);
  return Number.isFinite(n) ? n : fallback;
}

function envFloat(key, fallback) {
  const n = parseFloat(process.env[key]);
  return Number.isFinite(n) ? n : fallback;
}

function envBool(key, fallback = false) {
  const v = process.env[key];
  if (v === undefined || v === "") return fallback;
  return String(v).toLowerCase() === "true";
}

const QUALITY_PROFILES = {
  best_pro: {
    minOverallConfidence: 0.72,
    minFactConfidence: 0.65,
    duplicateSimilarityThreshold: 0.88,
    maxRegenerateAttempts: 3,
    explanationMinWords: 50,
    explanationMaxWords: 70,
    requireAnswerExplanationLock: true,
    rejectOnOptionAnswerMismatch: true,
    genTemperature: 0.2,
    verifyTemperature: 0.05,
  },
  balanced: {
    minOverallConfidence: 0.55,
    minFactConfidence: 0.5,
    duplicateSimilarityThreshold: 0.88,
    maxRegenerateAttempts: 2,
    explanationMinWords: 50,
    explanationMaxWords: 70,
    requireAnswerExplanationLock: true,
    rejectOnOptionAnswerMismatch: true,
    genTemperature: 0.25,
    verifyTemperature: 0.05,
  },
  fast: {
    minOverallConfidence: 0.45,
    minFactConfidence: 0.4,
    duplicateSimilarityThreshold: 0.9,
    maxRegenerateAttempts: 1,
    explanationMinWords: 40,
    explanationMaxWords: 80,
    requireAnswerExplanationLock: true,
    rejectOnOptionAnswerMismatch: false,
    genTemperature: 0.3,
    verifyTemperature: 0.1,
  },
};

const profileName = String(process.env.QG_QUALITY_PROFILE || "fast")
  .toLowerCase()
  .trim();
const profile = QUALITY_PROFILES[profileName] || QUALITY_PROFILES.fast;

export const QG_CONFIG = {
  exam: process.env.RAG_EXAM || "UPSC Prelims",
  language: process.env.QG_DEFAULT_LANGUAGE || "en",

  /** Active quality profile name + resolved knobs (env overrides win). */
  qualityProfile: QUALITY_PROFILES[profileName] ? profileName : "fast",
  profiles: QUALITY_PROFILES,

  /** Hybrid retrieval: pull candidates then rerank. */
  hybrid: {
    vectorTopK: envInt("QG_VECTOR_TOP_K", 20),
    keywordTopK: envInt("QG_KEYWORD_TOP_K", 20),
    mergeTopK: envInt("QG_MERGE_TOP_K", 20),
    finalTopK: envInt("QG_FINAL_TOP_K", 5),
    vectorWeight: envFloat("QG_VECTOR_WEIGHT", 0.55),
    keywordWeight: envFloat("QG_KEYWORD_WEIGHT", 0.35),
    metadataWeight: envFloat("QG_METADATA_WEIGHT", 0.1),
  },

  /** Reranker: cohere | jina | voyage | none */
  reranker: {
    provider: (process.env.QG_RERANK_PROVIDER || "jina").toLowerCase(),
    model: process.env.QG_RERANK_MODEL || "",
    topN: envInt("QG_FINAL_TOP_K", 5),
    timeoutMs: envInt("QG_RERANK_TIMEOUT_MS", 20000),
  },

  context: {
    maxTokens: envInt("QG_CONTEXT_MAX_TOKENS", 2800),
    maxChars: envInt("QG_CONTEXT_MAX_CHARS", 12000),
  },

  generation: {
    maxQuestionsPerCall: envInt("QG_MAX_QUESTIONS_PER_CALL", 5),
    maxRegenerateAttempts: envInt("QG_MAX_REGENERATE", profile.maxRegenerateAttempts),
    temperature: envFloat("QG_GEN_TEMPERATURE", profile.genTemperature),
    verifyTemperature: envFloat("QG_VERIFY_TEMPERATURE", profile.verifyTemperature),
    /** Hard rule: never invent from open syllabus when KB is empty. */
    allowOpenKnowledge: envBool("PRACTICE_ALLOW_OPEN_KNOWLEDGE", false),
    minContextChars: envInt("QG_MIN_CONTEXT_CHARS", 120),
  },

  quality: {
    minOverallConfidence: envFloat("QG_MIN_OVERALL_CONFIDENCE", profile.minOverallConfidence),
    minFactConfidence: envFloat("QG_MIN_FACT_CONFIDENCE", profile.minFactConfidence),
    duplicateSimilarityThreshold: envFloat("QG_DUP_SIMILARITY", profile.duplicateSimilarityThreshold),
    explanationMinWords: envInt("QG_EXPLAIN_MIN_WORDS", profile.explanationMinWords),
    explanationMaxWords: envInt("QG_EXPLAIN_MAX_WORDS", profile.explanationMaxWords),
    requireAnswerExplanationLock: envBool(
      "QG_LOCK_ANSWER_EXPLANATION",
      profile.requireAnswerExplanationLock
    ),
    rejectOnOptionAnswerMismatch: envBool(
      "QG_REJECT_OPTION_ANSWER_MISMATCH",
      profile.rejectOnOptionAnswerMismatch
    ),
  },

  cache: {
    embeddingTtlMs: envInt("QG_CACHE_EMBEDDING_MS", 30 * 60 * 1000),
    retrievalTtlMs: envInt("QG_CACHE_RETRIEVAL_MS", 10 * 60 * 1000),
    questionTtlHours: envInt("QG_QUESTION_CACHE_HOURS", 168),
    verificationTtlMs: envInt("QG_CACHE_VERIFY_MS", 60 * 60 * 1000),
  },

  /**
   * Per-stage OpenRouter models (token-cheap defaults).
   * Override via QG_MODEL_* env when you want Best Pro quality.
   */
  models: {
    question:
      process.env.QG_MODEL_QUESTION ||
      process.env.OPENROUTER_PRACTICE_MODEL ||
      "google/gemini-2.5-flash-lite",
    verification:
      process.env.QG_MODEL_VERIFICATION ||
      process.env.OPENROUTER_PRACTICE_MODEL ||
      "google/gemini-2.5-flash-lite",
    explanation:
      process.env.QG_MODEL_EXPLANATION ||
      process.env.OPENROUTER_PRACTICE_MODEL ||
      "google/gemini-2.5-flash-lite",
    factCheck:
      process.env.QG_MODEL_FACTCHECK ||
      process.env.OPENROUTER_PRACTICE_MODEL ||
      "google/gemini-2.5-flash-lite",
  },

  retry: {
    llm: envInt("QG_LLM_RETRIES", 3),
    retrieval: envInt("QG_RETRIEVAL_RETRIES", 2),
    baseDelayMs: envInt("QG_RETRY_BASE_MS", 800),
  },
};

export default QG_CONFIG;
