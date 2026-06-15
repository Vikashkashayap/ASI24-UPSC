/**
 * Bilingual MCQs: Hindi is generated at admin/test generation time and stored in DB.
 * Exam attempts must NEVER call translation APIs — only read question_hi / options_hi / explanation_hi.
 */
export function isSeparateHindiTranslationEnabled() {
  if (process.env.DISABLE_RUNTIME_HINDI_TRANSLATION === "true") return false;
  if (process.env.ENABLE_HINDI_TRANSLATION === "true") return true;
  return process.env.TEST_GEN_USE_SEPARATE_HINDI_TRANSLATION === "true";
}

/** Exam routes must not translate on read — generation-time only. */
export function isRuntimeHindiTranslationAllowed() {
  return process.env.DISABLE_RUNTIME_HINDI_TRANSLATION !== "true" && isSeparateHindiTranslationEnabled();
}
