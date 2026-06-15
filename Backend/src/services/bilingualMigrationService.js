/**
 * One-time Hindi backfill for questions already in MongoDB.
 * Used ONLY by migration scripts — never during exam attempts.
 */
import { runInMigrationBatchContext } from "../middleware/examAiGuard.js";
import {
  ensureEnglishBilingualFields,
  pickBilingualQuestionFields,
} from "./questionTranslationService.js";
import { hasStoredHindiContent } from "./bilingualQuestionStorage.js";

const OPTION_KEYS = ["A", "B", "C", "D"];

function getTranslationModel() {
  return (
    process.env.OPENROUTER_TRANSLATION_MODEL ||
    process.env.OPENROUTER_CHEAP_MODEL ||
    "google/gemini-2.5-flash-lite"
  );
}

async function batchTranslateStrings(texts, apiKey) {
  const { translateTextsBatchToHindi } = await import("./hindiBatchTranslate.js");
  return translateTextsBatchToHindi(texts, { apiKey, model: getTranslationModel() });
}

/**
 * Translate missing Hindi fields for one question (skips if already complete).
 */
export async function translateQuestionHindiOnce(rawQuestion, { apiKey }) {
  const base = ensureEnglishBilingualFields(rawQuestion);
  if (hasStoredHindiContent(base)) {
    return { question: pickBilingualQuestionFields(base), translated: false };
  }

  const texts = [];
  const slots = [];

  const queue = (kind, english, key = null) => {
    const src = String(english ?? "").trim();
    if (!src) return;
    texts.push(src);
    slots.push({ kind, key });
  };

  if (!String(base.question_hi || "").trim()) {
    queue("question", base.question_en);
  }
  OPTION_KEYS.forEach((key) => {
    if (!String(base.options_hi?.[key] || "").trim()) {
      queue("option", base.options_en[key], key);
    }
  });

  const explEn = base.explanation_en;
  if (explEn && typeof explEn === "object" && !base.explanation_hi) {
    OPTION_KEYS.forEach((key) => {
      if (explEn[key]) queue("explanation", explEn[key], key);
    });
  }

  if (texts.length === 0) {
    return { question: pickBilingualQuestionFields(base), translated: false };
  }

  const translated = await batchTranslateStrings(texts, apiKey);

  const out = {
    ...base,
    options_hi: { ...(base.options_hi || { A: "", B: "", C: "", D: "" }) },
    question_hi: base.question_hi || "",
  };

  slots.forEach((slot, idx) => {
    const value = String(translated[idx] || texts[idx] || "").trim();
    if (!value) return;
    if (slot.kind === "question") out.question_hi = value;
    if (slot.kind === "option" && slot.key) out.options_hi[slot.key] = value;
    if (slot.kind === "explanation" && slot.key) {
      out.explanation_hi = { ...(out.explanation_hi || { A: "", B: "", C: "", D: "" }) };
      out.explanation_hi[slot.key] = value;
    }
  });

  return { question: pickBilingualQuestionFields(out), translated: true };
}

/**
 * Run migration translate with guard bypass.
 */
export async function migrateQuestionsWithHindiOnce(questions, { apiKey }) {
  return runInMigrationBatchContext(async () => {
    const results = [];
    let translated = 0;
    for (const q of questions) {
      const plain = typeof q?.toObject === "function" ? q.toObject() : { ...q };
      const { question, translated: did } = await translateQuestionHindiOnce(plain, { apiKey });
      if (did) translated += 1;
      results.push(question);
    }
    return { questions: results, translated };
  });
}
