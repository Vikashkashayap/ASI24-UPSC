/**
 * Bilingual question storage — DB fields only at exam time (no runtime LLM).
 * Hindi is populated at admin generation; attempts read stored values.
 */

import { ensureEnglishBilingualFields } from "./questionTranslationService.js";

const OPTION_KEYS = ["A", "B", "C", "D"];

function normalizeOptionsObject(raw) {
  const options = { A: "", B: "", C: "", D: "" };
  if (!raw || typeof raw !== "object") return options;
  for (const key of OPTION_KEYS) {
    options[key] = String(raw[key] ?? "").trim();
  }
  return options;
}

function normalizeExplanationObject(raw) {
  if (!raw) return null;
  if (typeof raw === "string") {
    const s = raw.trim();
    return s ? { A: s, B: s, C: s, D: s } : null;
  }
  if (typeof raw === "object") {
    return {
      A: String(raw.A ?? "").trim(),
      B: String(raw.B ?? "").trim(),
      C: String(raw.C ?? "").trim(),
      D: String(raw.D ?? "").trim(),
    };
  }
  return null;
}

/** True when Hindi stem + all four Hindi options exist in DB. */
export function hasStoredHindiContent(q) {
  const base = ensureEnglishBilingualFields(q);
  if (!String(base.question_hi || "").trim()) return false;
  return OPTION_KEYS.every((k) => String(base.options_hi?.[k] || "").trim());
}

/** True when question only has English (needs migration or regen for real Hindi). */
export function questionNeedsHindiMigration(q) {
  return !hasStoredHindiContent(q);
}

/**
 * Normalize bilingual fields for MongoDB. Optionally copy English → Hindi as read fallback.
 * @param {object} q
 * @param {{ hindiFallback?: boolean }} opts — migration: copy EN to empty HI fields
 */
export function normalizeQuestionBilingualFields(q, { hindiFallback = false } = {}) {
  const base = ensureEnglishBilingualFields(q);
  let changed = false;

  const question_hi = String(base.question_hi || "").trim();
  const options_hi = normalizeOptionsObject(base.options_hi);
  let explanation_hi = normalizeExplanationObject(base.explanation_hi);

  let nextHi = question_hi;
  let nextOptionsHi = { ...options_hi };
  let nextExplanationHi = explanation_hi;

  if (hindiFallback) {
    if (!nextHi && base.question_en) {
      nextHi = base.question_en;
      changed = true;
    }
    for (const key of OPTION_KEYS) {
      if (!nextOptionsHi[key] && base.options_en[key]) {
        nextOptionsHi[key] = base.options_en[key];
        changed = true;
      }
    }
    if (!nextExplanationHi && base.explanation_en) {
      nextExplanationHi = normalizeExplanationObject(base.explanation_en);
      changed = true;
    }
  }

  const normalized = {
    ...base,
    question: base.question_en,
    question_en: base.question_en,
    question_hi: nextHi,
    options: base.options_en,
    options_en: base.options_en,
    options_hi: nextOptionsHi,
    explanation: base.explanation_en ?? base.explanation,
    explanation_en: base.explanation_en,
    ...(nextExplanationHi ? { explanation_hi: nextExplanationHi } : {}),
  };

  if (
    question_hi !== nextHi ||
    JSON.stringify(options_hi) !== JSON.stringify(nextOptionsHi)
  ) {
    changed = true;
  }

  return { question: normalized, changed };
}

/** Migrate one question document for storage (used by migration script). */
export function migrateQuestionBilingualFields(q, options = {}) {
  return normalizeQuestionBilingualFields(q, options);
}

/** Map stored question for API — never triggers translation. Includes flat option_* aliases. */
export function mapBilingualQuestionForClient(q, { includeAnswers = false } = {}) {
  const base = ensureEnglishBilingualFields(q);
  const options_en = normalizeOptionsObject(base.options_en);
  const options_hi = normalizeOptionsObject(base.options_hi);

  const out = {
    _id: q._id,
    question: base.question_en,
    question_en: base.question_en,
    question_hi: base.question_hi || "",
    options: options_en,
    options_en,
    options_hi,
    option_a_en: options_en.A,
    option_b_en: options_en.B,
    option_c_en: options_en.C,
    option_d_en: options_en.D,
    option_a_hi: options_hi.A,
    option_b_hi: options_hi.B,
    option_c_hi: options_hi.C,
    option_d_hi: options_hi.D,
    userAnswer: q.userAnswer ?? null,
    questionType: q.questionType,
    tableData: q.tableData ?? null,
    matchColumns: q.matchColumns ?? null,
    assertionReason: q.assertionReason ?? null,
    hasHindi: hasStoredHindiContent(base),
  };

  if (!includeAnswers) return out;

  return {
    ...out,
    correctAnswer: q.correctAnswer,
    explanation: base.explanation_en ?? q.explanation,
    explanation_en: base.explanation_en ?? q.explanation,
    explanation_hi: base.explanation_hi ?? null,
    isCorrect: q.userAnswer === q.correctAnswer,
    timeSpent: q.timeSpent ?? 0,
    eliminationLogic: q.eliminationLogic,
    conceptualSource: q.conceptualSource,
  };
}
