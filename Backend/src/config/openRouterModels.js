/**
 * Model routing — cheap defaults for high-volume tasks; stronger model for vision/evaluation.
 */

export function getDefaultModel() {
  return process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash";
}

/** High-volume MCQ / translation / relevance — never falls back to OPENROUTER_MODEL (vision). */
export function getCheapModel() {
  return (
    process.env.OPENROUTER_CHEAP_MODEL ||
    process.env.OPENROUTER_TEST_MODEL ||
    "google/gemini-2.5-flash-lite"
  );
}

export function getTranslationModel() {
  return (
    process.env.OPENROUTER_TRANSLATION_MODEL ||
    process.env.OPENROUTER_CHEAP_MODEL ||
    process.env.OPENROUTER_TEST_MODEL ||
    "google/gemini-2.5-flash-lite"
  );
}

/** Chat / planner / profiler — still cost-aware */
export function getChatModel() {
  return (
    process.env.OPENROUTER_CHAT_MODEL ||
    "google/gemini-2.5-flash-lite"
  );
}

/** Vision copy evaluation — flash-lite default; override with OPENROUTER_VISION_MODEL */
export function getVisionModel() {
  return (
    process.env.OPENROUTER_VISION_MODEL ||
    process.env.OPENROUTER_CHEAP_MODEL ||
    "google/gemini-2.5-flash-lite"
  );
}
