/**
 * Bilingual MCQs: Hindi is generated in the same OpenRouter call as English (test generator flow).
 * Separate per-field Hindi translation API is OFF unless explicitly enabled.
 */
export function isSeparateHindiTranslationEnabled() {
  if (process.env.ENABLE_HINDI_TRANSLATION === "true") return true;
  return process.env.TEST_GEN_USE_SEPARATE_HINDI_TRANSLATION === "true";
}
