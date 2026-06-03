import { isSeparateHindiTranslationEnabled } from "../config/bilingualConfig.js";
import { translateToHindi, translateManyToHindi } from "./translateToHindi.js";

const OPTION_KEYS = ["A", "B", "C", "D"];

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
