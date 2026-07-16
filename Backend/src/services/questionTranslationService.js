import { isSeparateHindiTranslationEnabled } from "../config/bilingualConfig.js";
import { translateToHindi, translateManyToHindi } from "./translateToHindi.js";
import { assertOpenRouterAllowed } from "../middleware/examAiGuard.js";

const OPTION_KEYS = ["A", "B", "C", "D"];

function countLetterListItems(text) {
  return (String(text || "").match(/(?:^|\n)\s*[A-D][.)]\s+\S+/gi) || []).length;
}

function countNumberedListItems(text) {
  return (String(text || "").match(/(?:^|\n)\s*\d+[.)]\s+\S+/g) || []).length;
}

function cleanList(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map((x) => String(x || "").trim()).filter(Boolean);
}

/**
 * Rebuild a full UPSC stem from structured fields when the LLM left only an intro
 * (or empty text) while matchColumns / statements / chronology / A-R exist.
 * Prevents blank exam UI when options like "A-4, B-1…" still render.
 */
export function ensureFullQuestionStem(rawQuestion) {
  if (!rawQuestion || typeof rawQuestion !== "object") return rawQuestion;

  const plain =
    typeof rawQuestion.toObject === "function" ? rawQuestion.toObject() : { ...rawQuestion };

  let question_en = String(
    plain.question_en ?? plain.question ?? plain.questionText ?? plain.stem ?? ""
  )
    .replace(/\\n/g, "\n")
    .trim();

  const matchColumns = plain.matchColumns;
  const columnA = cleanList(matchColumns?.columnA);
  const columnB = cleanList(matchColumns?.columnB);
  if (
    columnA.length >= 2 &&
    columnB.length >= 2 &&
    (countLetterListItems(question_en) < 2 || countNumberedListItems(question_en) < 2)
  ) {
    const intro = (question_en.split("\n")[0] || "Match the following:").trim();
    const lines = [intro.endsWith(":") ? intro : `${intro}:`, "List-I"];
    columnA.forEach((item, i) => lines.push(`${String.fromCharCode(65 + i)}. ${item}`));
    lines.push("List-II");
    columnB.forEach((item, i) => lines.push(`${i + 1}. ${item}`));
    lines.push("Select the correct answer using the code given below:");
    question_en = lines.join("\n");
  }

  const statements = cleanList(plain.statements);
  if (statements.length >= 2 && countNumberedListItems(question_en) < 2) {
    const intro = (question_en.split("\n")[0] || "Consider the following statements:").trim();
    const lines = [intro.endsWith(":") ? intro : `${intro}:`];
    statements.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
    lines.push("Which of the statements given above is/are correct?");
    question_en = lines.join("\n");
  }

  const chronologyItems = cleanList(plain.chronologyItems || plain.items || plain.events);
  if (chronologyItems.length >= 2 && countNumberedListItems(question_en) < 2) {
    const intro = (
      question_en.split("\n")[0] || "Arrange the following in chronological order:"
    ).trim();
    const lines = [intro.endsWith(":") ? intro : `${intro}:`];
    chronologyItems.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
    lines.push("Select the correct chronological order:");
    question_en = lines.join("\n");
  }

  const ar = plain.assertionReason;
  if (
    ar?.assertion &&
    ar?.reason &&
    !(/assertion\s*\(A\)/i.test(question_en) && /reason\s*\(R\)/i.test(question_en))
  ) {
    question_en = [
      `Assertion (A): ${String(ar.assertion).trim()}`,
      `Reason (R): ${String(ar.reason).trim()}`,
      "In the context of the above, which of the following is correct?",
    ].join("\n");
  }

  let question_hi = String(plain.question_hi || "")
    .replace(/\\n/g, "\n")
    .trim();
  const mcHi = plain.matchColumns_hi;
  const columnAHi = cleanList(mcHi?.columnA);
  const columnBHi = cleanList(mcHi?.columnB);
  if (
    columnAHi.length >= 2 &&
    columnBHi.length >= 2 &&
    (countLetterListItems(question_hi) < 2 || countNumberedListItems(question_hi) < 2)
  ) {
    const intro = (question_hi.split("\n")[0] || "निम्नलिखित का मिलान कीजिए:").trim();
    const lines = [intro.endsWith(":") ? intro : `${intro}:`, "सूची-I"];
    columnAHi.forEach((item, i) => lines.push(`${String.fromCharCode(65 + i)}. ${item}`));
    lines.push("सूची-II");
    columnBHi.forEach((item, i) => lines.push(`${i + 1}. ${item}`));
    lines.push("नीचे दिए गए कूट का प्रयोग कर सही उत्तर चुनिए:");
    question_hi = lines.join("\n");
  }

  return {
    ...plain,
    question: question_en,
    question_en,
    question_hi,
  };
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
 * Uses toObject() for Mongoose subdocuments — spread alone drops question_hi / options_hi.
 */
export function ensureEnglishBilingualFields(question) {
  if (!question || typeof question !== "object") return question;

  const plain = ensureFullQuestionStem(
    typeof question.toObject === "function" ? question.toObject() : { ...question }
  );

  const question_en = String(plain.question_en ?? plain.question ?? "").trim();
  const question_hi = String(plain.question_hi ?? "").trim();
  const options_en = normalizeOptionsObject(plain.options_en ?? plain.options);
  const options_hi = normalizeOptionsObject(plain.options_hi);

  let explanation_en = plain.explanation_en;
  if (!explanation_en) {
    if (typeof plain.explanation === "object" && plain.explanation !== null) {
      explanation_en = {
        A: String(plain.explanation.A ?? "").trim(),
        B: String(plain.explanation.B ?? "").trim(),
        C: String(plain.explanation.C ?? "").trim(),
        D: String(plain.explanation.D ?? "").trim(),
      };
    } else if (typeof plain.explanation === "string") {
      const str = plain.explanation.trim();
      explanation_en = { A: str, B: str, C: str, D: str };
    }
  }

  return {
    ...plain,
    question: question_en,
    question_en,
    question_hi,
    options: options_en,
    options_en,
    options_hi,
    explanation: explanation_en ?? plain.explanation,
    ...(explanation_en ? { explanation_en } : {}),
    ...(plain.explanation_hi ? { explanation_hi: plain.explanation_hi } : {}),
  };
}

/**
 * Translate one question's text, options, and explanation to Hindi.
 * Never throws — returns English fallbacks on failure.
 */
export async function enrichQuestionWithHindi(rawQuestion) {
  assertOpenRouterAllowed("enrichQuestionWithHindi");
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
 * Hindi must already be on the question (generation time) — no runtime translation.
 */
export function pickBilingualQuestionFields(q) {
  const base = ensureEnglishBilingualFields(q);
  return {
    question: base.question_en,
    question_en: base.question_en,
    question_hi: String(base.question_hi || "").trim(),
    options: base.options_en,
    options_en: base.options_en,
    options_hi: normalizeOptionsObject(base.options_hi),
    correctAnswer: base.correctAnswer,
    explanation: base.explanation ?? base.explanation_en ?? "No explanation provided.",
    explanation_en: base.explanation_en,
    explanation_hi: base.explanation_hi ?? undefined,
    userAnswer: base.userAnswer ?? null,
    timeSpent: base.timeSpent ?? 0,
    questionType: base.questionType,
    tableData: base.tableData,
    matchColumns: base.matchColumns,
    matchColumns_hi: base.matchColumns_hi ?? undefined,
    assertionReason: base.assertionReason,
    eliminationLogic: base.eliminationLogic,
    conceptualSource: base.conceptualSource,
    difficulty: base.difficulty,
    subject: base.subject,
    questionId: base.questionId,
  };
}
