/**
 * Question + option generation stage (UPSC Prelims quality).
 */

import { callStageLlm } from "../providers/llmRouter.js";
import { buildQuestionSystemPrompt, buildQuestionUserPrompt } from "../prompts/question.prompt.js";
import { ensureArray } from "../utils/jsonParse.js";
import {
  validateQuestionStructure,
  normalizeOptions,
  normalizeCorrectAnswer,
} from "../validators/question.validator.js";
import { QG_CONFIG } from "../config/qg.config.js";
import { questionFingerprint } from "./duplicateDetector.service.js";

function normalizeDifficulty(d) {
  const v = String(d || "medium").toLowerCase();
  if (v === "easy") return "easy";
  if (v === "hard") return "hard";
  if (v === "moderate") return "medium";
  return "medium";
}

function countLetterItems(text) {
  return (String(text || "").match(/(?:^|\n)\s*[A-D][.)]\s+\S+/gi) || []).length;
}

function countNumberItems(text) {
  return (String(text || "").match(/(?:^|\n)\s*\d+[.)]\s+\S+/g) || []).length;
}

function coerceItemText(x) {
  if (x == null) return "";
  if (typeof x === "string" || typeof x === "number" || typeof x === "boolean") {
    const s = String(x).trim();
    return s === "[object Object]" ? "" : s;
  }
  if (typeof x === "object") {
    for (const k of ["text", "en", "hi", "item", "statement", "content", "value", "label", "event"]) {
      if (typeof x[k] === "string" && x[k].trim() && x[k].trim() !== "[object Object]") {
        return x[k].trim();
      }
    }
  }
  return "";
}

function assembleStem(q) {
  // Prefer explicit stem aliases — models sometimes put text only in questionText/stem
  let question = String(q.question || q.question_en || q.questionText || q.stem || "")
    .replace(/\\n/g, "\n")
    .trim();
  const type = String(q.questionType || q.type || "direct_conceptual").toLowerCase();

  if (Array.isArray(q.statements) && q.statements.length >= 2 && countNumberItems(question) < 2) {
    const intro = question.split("\n")[0] || "Consider the following statements:";
    const lines = [intro.endsWith(":") ? intro : `${intro}:`];
    q.statements.forEach((s, i) => {
      const t = coerceItemText(s);
      if (t) lines.push(`${i + 1}. ${t}`);
    });
    lines.push("Which of the statements given above is/are correct?");
    question = lines.join("\n");
  }

  const columnA = (q.matchColumns?.columnA || []).map(coerceItemText).filter(Boolean);
  const columnB = (q.matchColumns?.columnB || []).map(coerceItemText).filter(Boolean);
  // Always embed lists when missing — do NOT skip just because intro says "List-I"
  if (columnA.length >= 2 && columnB.length >= 2 && (countLetterItems(question) < 2 || countNumberItems(question) < 2)) {
    const intro = question.split("\n")[0] || "Match the following:";
    const lines = [intro.endsWith(":") ? intro : `${intro}:`, "List-I"];
    columnA.forEach((item, i) => lines.push(`${String.fromCharCode(65 + i)}. ${item}`));
    lines.push("List-II");
    columnB.forEach((item, i) => lines.push(`${i + 1}. ${item}`));
    lines.push("Select the correct answer using the code given below:");
    question = lines.join("\n");
  }

  const chrono = Array.isArray(q.chronologyItems) ? q.chronologyItems : [];
  const chronoClean = chrono.map(coerceItemText).filter(Boolean);
  if (chronoClean.length >= 2 && countNumberItems(question) < 2) {
    const intro = question.split("\n")[0] || "Arrange the following in chronological order:";
    const lines = [intro.endsWith(":") ? intro : `${intro}:`];
    chronoClean.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
    lines.push("Select the correct chronological order:");
    question = lines.join("\n");
  }

  if (
    q.assertionReason?.assertion &&
    q.assertionReason?.reason &&
    !(/assertion\s*\(A\)/i.test(question) && /reason\s*\(R\)/i.test(question))
  ) {
    question = [
      `Assertion (A): ${q.assertionReason.assertion}`,
      `Reason (R): ${q.assertionReason.reason}`,
      "In the context of the above, which of the following is correct?",
    ].join("\n");
  }

  return { question, questionType: type };
}

export function normalizeGeneratedQuestion(raw, meta = {}) {
  const options = normalizeOptions(raw?.options);
  const correctAnswer = normalizeCorrectAnswer(raw?.correctAnswer ?? raw?.answer);
  const assembled = assembleStem(raw || {});
  const difficulty = normalizeDifficulty(raw?.difficulty || meta.difficulty);

  const candidate = {
    question: assembled.question,
    question_en: assembled.question,
    options,
    options_en: { ...options },
    correctAnswer,
    answer: correctAnswer,
    questionType: assembled.questionType,
    difficulty,
    statements: Array.isArray(raw?.statements) ? raw.statements : undefined,
    chronologyItems: Array.isArray(raw?.chronologyItems) ? raw.chronologyItems : undefined,
    matchColumns: raw?.matchColumns || undefined,
    assertionReason: raw?.assertionReason || undefined,
    sourceSpan: String(raw?.sourceSpan || raw?.sourceParagraph || "").trim().slice(0, 220),
    conceptualSource: String(raw?.sourceSpan || "").trim().slice(0, 180),
    sourceParagraph: String(raw?.sourceSpan || "").trim().slice(0, 180),
    distractorRationale: raw?.distractorRationale || undefined,
    subject: meta.subject || "",
    chapter: meta.chapter || "",
    topic: meta.topic || "",
    book: meta.book || "",
    exam: meta.exam || QG_CONFIG.exam,
    language: meta.language || QG_CONFIG.language,
    explanation: "",
    explanation_en: "",
  };

  const validation = validateQuestionStructure(candidate);
  if (!validation.ok) return null;

  candidate.options = validation.options;
  candidate.options_en = { ...validation.options };
  candidate.correctAnswer = validation.correctAnswer;
  candidate.answer = validation.correctAnswer;
  return candidate;
}

/**
 * @param {{
 *   contextText: string,
 *   count?: number,
 *   topic?: string,
 *   subject?: string,
 *   chapter?: string,
 *   book?: string,
 *   difficulty?: string,
 *   patternsToInclude?: string[],
 *   existingFingerprints?: string[],
 * }} params
 */
export async function generateQuestionsStage(params = {}) {
  const contextText = String(params.contextText || "").trim();
  if (contextText.length < QG_CONFIG.generation.minContextChars) {
    return {
      success: false,
      error: "Insufficient context for grounded generation",
      questions: [],
      durationMs: 0,
    };
  }

  const count = Math.min(
    QG_CONFIG.generation.maxQuestionsPerCall,
    Math.max(1, Number(params.count) || 1)
  );

  const llm = await callStageLlm({
    stage: "question",
    systemPrompt: buildQuestionSystemPrompt(),
    userPrompt: buildQuestionUserPrompt({
      context: contextText,
      topic: params.topic,
      subject: params.subject,
      chapter: params.chapter,
      book: params.book,
      difficulty: params.difficulty,
      questionCount: count,
      patternsToInclude: params.patternsToInclude,
      existingFingerprints: params.existingFingerprints,
    }),
    maxTokens: Math.min(5000, 700 * count + 400),
  });

  const meta = {
    subject: params.subject || "",
    topic: params.topic || "",
    chapter: params.chapter || "",
    book: params.book || "",
    difficulty: params.difficulty || "medium",
    exam: QG_CONFIG.exam,
    language: QG_CONFIG.language,
  };

  const questions = ensureArray(llm.parsed)
    .map((q) => normalizeGeneratedQuestion(q, meta))
    .filter(Boolean)
    .slice(0, count);

  return {
    success: questions.length > 0,
    questions,
    model: llm.model,
    usage: llm.usage,
    durationMs: llm.durationMs,
    fingerprints: questions.map((q) => questionFingerprint(q.question)),
  };
}

export default { generateQuestionsStage, normalizeGeneratedQuestion };
