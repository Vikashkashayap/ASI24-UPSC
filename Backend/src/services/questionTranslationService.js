import { isSeparateHindiTranslationEnabled } from "../config/bilingualConfig.js";
import {
  translateToHindi,
  translateManyToHindi,
  translateTextsBatchToHindi,
} from "./translateToHindi.js";

const OPTION_KEYS = ["A", "B", "C", "D"];

function hasDevanagari(text) {
  return /[\u0900-\u097F]/.test(String(text || ""));
}

function fieldNeedsHindiTranslation(english, hindi) {
  const en = String(english || "").trim();
  const hi = String(hindi || "").trim();
  if (!en) return false;
  if (!hi || hi === en) return true;
  if (!hasDevanagari(hi)) return true;
  return false;
}

/** True when Hindi fields are missing or still English copies. */
export function practiceQuestionNeedsHindi(q) {
  const base = ensureEnglishBilingualFields(q);
  if (fieldNeedsHindiTranslation(base.question_en, base.question_hi)) return true;
  if (OPTION_KEYS.some((k) => fieldNeedsHindiTranslation(base.options_en[k], base.options_hi?.[k]))) {
    return true;
  }
  if (base.matchColumns?.columnA?.length) {
    const aHi = base.matchColumns.columnA_hi?.[0];
    const aEn = base.matchColumns.columnA[0];
    if (fieldNeedsHindiTranslation(aEn, aHi)) return true;
    const bEn = base.matchColumns.columnB?.[0];
    const bHi = base.matchColumns.columnB_hi?.[0];
    if (bEn && fieldNeedsHindiTranslation(bEn, bHi)) return true;
  }
  if (base.assertionReason?.assertion) {
    if (fieldNeedsHindiTranslation(base.assertionReason.assertion, base.assertionReason.assertion_hi)) {
      return true;
    }
    if (fieldNeedsHindiTranslation(base.assertionReason.reason, base.assertionReason.reason_hi)) {
      return true;
    }
  }
  return false;
}

/**
 * Code-driven Hindi for topic practice: translate each English field to Devanagari.
 * LLM generates English only; this runs after generation in the backend.
 */
function stripArLabel(text, role) {
  const re =
    role === "A"
      ? /^(?:Assertion|अभिकथन)\s*\(A\)\s*:?\s*/gi
      : /^(?:Reason|कारण)\s*\(R\)\s*:?\s*/gi;
  let out = String(text ?? "").trim();
  while (re.test(out)) out = out.replace(re, "").trim();
  return out;
}

export async function translatePracticeQuestionToHindi(rawQuestion) {
  const q = ensureEnglishBilingualFields(rawQuestion);
  if (q.assertionReason && typeof q.assertionReason === "object") {
    q.assertionReason = {
      ...q.assertionReason,
      assertion: stripArLabel(q.assertionReason.assertion, "A"),
      reason: stripArLabel(q.assertionReason.reason, "R"),
    };
  }
  const texts = [];
  const slots = [];

  const queue = (kind, english, key = null, index = null, hindi = null) => {
    const src = String(english ?? "").trim();
    if (!src || !fieldNeedsHindiTranslation(src, hindi)) return;
    texts.push(src);
    slots.push({ kind, key, index });
  };

  queue("question", q.question_en, null, null, q.question_hi);
  OPTION_KEYS.forEach((key) => queue("option", q.options_en[key], key, null, q.options_hi?.[key]));
  if (q.assertionReason && typeof q.assertionReason === "object") {
    queue("assertion", q.assertionReason.assertion, null, null, q.assertionReason.assertion_hi);
    queue("reason", q.assertionReason.reason, null, null, q.assertionReason.reason_hi);
  }
  if (q.matchColumns?.columnA?.length) {
    q.matchColumns.columnA.forEach((item, index) =>
      queue("matchA", item, null, index, q.matchColumns.columnA_hi?.[index])
    );
    (q.matchColumns.columnB || []).forEach((item, index) =>
      queue("matchB", item, null, index, q.matchColumns.columnB_hi?.[index])
    );
  }

  if (texts.length === 0) return q;

  const translated = await translateTextsBatchToHindi(texts);
  const out = {
    ...q,
    options_hi: { A: "", B: "", C: "", D: "" },
    question_hi: q.question_hi || "",
  };

  slots.forEach((slot, idx) => {
    const value = String(translated[idx] || texts[idx] || "").trim();
    if (!value) return;
    if (slot.kind === "question") out.question_hi = value;
    if (slot.kind === "option" && slot.key) out.options_hi[slot.key] = value;
    if (slot.kind === "assertion" || slot.kind === "reason") {
      out.assertionReason = { ...(out.assertionReason || q.assertionReason) };
      if (slot.kind === "assertion") out.assertionReason.assertion_hi = value;
      if (slot.kind === "reason") out.assertionReason.reason_hi = value;
    }
    if (slot.kind === "matchA" || slot.kind === "matchB") {
      out.matchColumns = { ...(out.matchColumns || q.matchColumns) };
      if (slot.kind === "matchA") {
        const arr = [...(out.matchColumns.columnA_hi || Array(q.matchColumns.columnA.length).fill(""))];
        arr[slot.index] = value;
        out.matchColumns.columnA_hi = arr;
      } else {
        const arr = [...(out.matchColumns.columnB_hi || Array((q.matchColumns.columnB || []).length).fill(""))];
        arr[slot.index] = value;
        out.matchColumns.columnB_hi = arr;
      }
    }
  });

  return ensureEnglishBilingualFields(out);
}

/**
 * Batch-translate all practice questions in 1–3 API calls (not per-field).
 */
export async function translatePracticeQuestionsToHindi(questions, _concurrency = 4) {
  if (!Array.isArray(questions) || questions.length === 0) return [];

  console.log(`📝 Practice Hindi (batched): ${questions.length} question(s)...`);

  const prepared = questions.map((q) => ensureEnglishBilingualFields(q));
  const allTexts = [];
  const allSlots = [];

  prepared.forEach((q, qIndex) => {
    const queue = (kind, english, key = null, index = null, hindi = null) => {
      const src = String(english ?? "").trim();
      if (!src || !fieldNeedsHindiTranslation(src, hindi)) return;
      allTexts.push(src);
      allSlots.push({ qIndex, kind, key, index });
    };

    queue("question", q.question_en, null, null, q.question_hi);
    OPTION_KEYS.forEach((key) => queue("option", q.options_en[key], key, null, q.options_hi?.[key]));
    if (q.assertionReason && typeof q.assertionReason === "object") {
      queue("assertion", q.assertionReason.assertion, null, null, q.assertionReason.assertion_hi);
      queue("reason", q.assertionReason.reason, null, null, q.assertionReason.reason_hi);
    }
    if (q.matchColumns?.columnA?.length) {
      q.matchColumns.columnA.forEach((item, index) =>
        queue("matchA", item, null, index, q.matchColumns.columnA_hi?.[index])
      );
      (q.matchColumns.columnB || []).forEach((item, index) =>
        queue("matchB", item, null, index, q.matchColumns.columnB_hi?.[index])
      );
    }
  });

  if (allTexts.length === 0) return prepared;

  const batchSize = parseInt(process.env.PRACTICE_HINDI_BATCH_SIZE, 10)
    || parseInt(process.env.HINDI_TRANSLATE_BATCH_SIZE, 10)
    || 80;
  const translatedAll = [];
  for (let i = 0; i < allTexts.length; i += batchSize) {
    const chunk = allTexts.slice(i, i + batchSize);
    const part = await translateTextsBatchToHindi(chunk, batchSize);
    translatedAll.push(...part);
  }

  const results = prepared.map((q) => ({
    ...q,
    options_hi: { A: "", B: "", C: "", D: "" },
    question_hi: q.question_hi || "",
  }));

  allSlots.forEach((slot, idx) => {
    const value = String(translatedAll[idx] || allTexts[idx] || "").trim();
    if (!value) return;
    const out = results[slot.qIndex];
    if (slot.kind === "question") out.question_hi = value;
    if (slot.kind === "option" && slot.key) out.options_hi[slot.key] = value;
    if (slot.kind === "assertion" || slot.kind === "reason") {
      out.assertionReason = { ...(out.assertionReason || prepared[slot.qIndex].assertionReason) };
      if (slot.kind === "assertion") out.assertionReason.assertion_hi = value;
      if (slot.kind === "reason") out.assertionReason.reason_hi = value;
    }
    if (slot.kind === "matchA" || slot.kind === "matchB") {
      const base = prepared[slot.qIndex].matchColumns;
      out.matchColumns = { ...(out.matchColumns || base) };
      if (slot.kind === "matchA") {
        const arr = [...(out.matchColumns.columnA_hi || Array(base.columnA.length).fill(""))];
        arr[slot.index] = value;
        out.matchColumns.columnA_hi = arr;
      } else {
        const arr = [...(out.matchColumns.columnB_hi || Array((base.columnB || []).length).fill(""))];
        arr[slot.index] = value;
        out.matchColumns.columnB_hi = arr;
      }
    }
  });

  const finalized = results.map(ensureEnglishBilingualFields);
  const withHindi = finalized.filter((q) => !practiceQuestionNeedsHindi(q)).length;
  console.log(
    `✅ Practice Hindi (batched): ${withHindi}/${finalized.length} questions, ${allTexts.length} strings in ${Math.ceil(allTexts.length / batchSize)} API call(s)`
  );
  return finalized;
}

/** True when Hindi stem and all four Hindi options are present. */
export function questionHasBilingualContent(rawQuestion) {
  const q = ensureEnglishBilingualFields(rawQuestion);
  if (!String(q.question_hi || "").trim()) return false;
  return OPTION_KEYS.every((key) => String(q.options_hi?.[key] || "").trim());
}

function normalizeOptionsObject(raw) {
  const options = { A: "", B: "", C: "", D: "" };
  if (!raw || typeof raw !== "object") return options;
  for (const key of OPTION_KEYS) {
    options[key] = String(raw[key] ?? "").trim();
  }
  return options;
}

/**
 * Ensure English bilingual fields exist (backward compatible with legacy `question` / `options`).
 */
export function ensureEnglishBilingualFields(question) {
  if (!question || typeof question !== "object") return question;

  const question_en = String(question.question_en ?? question.question ?? "").trim();
  const options_en = normalizeOptionsObject(question.options_en ?? question.options);

  let explanation_en = question.explanation_en;
  if (!explanation_en) {
    if (typeof question.explanation === "object" && question.explanation !== null) {
      explanation_en = {
        A: String(question.explanation.A ?? "").trim(),
        B: String(question.explanation.B ?? "").trim(),
        C: String(question.explanation.C ?? "").trim(),
        D: String(question.explanation.D ?? "").trim(),
      };
    } else if (typeof question.explanation === "string") {
      const str = question.explanation.trim();
      explanation_en = { A: str, B: str, C: str, D: str };
    }
  }

  return {
    ...question,
    question: question_en,
    question_en,
    options: options_en,
    options_en,
    explanation: explanation_en ?? question.explanation,
    ...(explanation_en ? { explanation_en } : {}),
    ...(question.explanation_hi ? { explanation_hi: question.explanation_hi } : {}),
  };
}

/**
 * Translate one question's text, options, and explanation to Hindi.
 * Never throws — returns English fallbacks on failure.
 */
export async function enrichQuestionWithHindi(rawQuestion) {
  const question = ensureEnglishBilingualFields(rawQuestion);

  if (!isSeparateHindiTranslationEnabled()) {
    return {
      ...question,
      question_hi: question.question_hi || "",
      options_hi: normalizeOptionsObject(question.options_hi ?? question.options_en),
    };
  }

  try {
    const [question_hi, optionValues] = await Promise.all([
      question.question_hi
        ? Promise.resolve(question.question_hi)
        : translateToHindi(question.question_en),
      question.options_hi?.A
        ? Promise.resolve(OPTION_KEYS.map((k) => question.options_hi[k] || question.options_en[k]))
        : translateManyToHindi(OPTION_KEYS.map((k) => question.options_en[k])),
    ]);

    const options_hi = {};
    OPTION_KEYS.forEach((key, idx) => {
      options_hi[key] = optionValues[idx] || question.options_en[key] || "";
    });

    let explanation_hi = question.explanation_hi;
    if (!explanation_hi && question.explanation_en) {
      const explKeys = OPTION_KEYS.filter((k) => question.explanation_en[k]);
      const translatedExpl = await translateManyToHindi(explKeys.map((k) => question.explanation_en[k]));
      explanation_hi = { A: "", B: "", C: "", D: "" };
      explKeys.forEach((key, idx) => {
        explanation_hi[key] = translatedExpl[idx] || question.explanation_en[key] || "";
      });
    }

    return {
      ...question,
      question_hi: question_hi || question.question_en,
      options_hi,
      ...(explanation_hi ? { explanation_hi } : {}),
    };
  } catch (error) {
    console.error("enrichQuestionWithHindi failed:", error.message);
    return {
      ...question,
      question_hi: question.question_hi || question.question_en,
      options_hi: normalizeOptionsObject(question.options_hi ?? question.options_en),
    };
  }
}

/**
 * Translate an array of questions with limited concurrency.
 */
export async function enrichQuestionsWithHindi(questions, concurrency = 4) {
  if (!isSeparateHindiTranslationEnabled()) {
    return (questions || []).map(ensureEnglishBilingualFields);
  }
  if (!Array.isArray(questions) || questions.length === 0) return [];

  const poolSize = Math.max(1, Math.min(concurrency, questions.length));
  const results = new Array(questions.length);
  let cursor = 0;

  async function worker() {
    while (cursor < questions.length) {
      const index = cursor;
      cursor += 1;
      try {
        results[index] = await enrichQuestionWithHindi(questions[index]);
      } catch (err) {
        console.error(`enrichQuestionsWithHindi item ${index}:`, err.message);
        results[index] = ensureEnglishBilingualFields(questions[index]);
      }
    }
  }

  await Promise.all(Array.from({ length: poolSize }, () => worker()));
  console.log(`✅ Hindi translation applied to ${results.length} question(s)`);
  return results;
}

/**
 * Pick bilingual fields for MongoDB subdocument storage.
 */
export function pickBilingualQuestionFields(q) {
  const base = ensureEnglishBilingualFields(q);
  return {
    question: base.question_en,
    question_en: base.question_en,
    question_hi: base.question_hi || "",
    options: base.options_en,
    options_en: base.options_en,
    options_hi: normalizeOptionsObject(base.options_hi),
    correctAnswer: base.correctAnswer,
    explanation: base.explanation ?? base.explanation_en ?? "No explanation provided.",
    explanation_en: base.explanation_en,
    explanation_hi: base.explanation_hi,
    userAnswer: base.userAnswer ?? null,
    timeSpent: base.timeSpent ?? 0,
    questionType: base.questionType,
    tableData: base.tableData,
    matchColumns: base.matchColumns,
    assertionReason: base.assertionReason,
    eliminationLogic: base.eliminationLogic,
    conceptualSource: base.conceptualSource,
    difficulty: base.difficulty,
    subject: base.subject,
    questionId: base.questionId,
  };
}
