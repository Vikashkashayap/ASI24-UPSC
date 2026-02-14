/**
 * Prelims Bilingual PDF Service
 * PDF-based UPSC Prelims test generator - NO AI.
 * Extracts exactly 100 bilingual (Hindi + English) questions from:
 * - Question PDF: alternating Hindi/English pages
 * - Solution PDF: answer key + explanation
 *
 * Uses pdf-parse for page-wise extraction.
 * Regex-based parsing only.
 */

import { extractTextFromPDFWithMetadata, extractTextFromPDF, splitTextIntoPages } from "./pdfProcessingService.js";
import { tryLegacyFontConversion } from "./prelimsPdfParserService.js";

const REQUIRED_QUESTIONS = 100;
const HINDI_REGEX = /[\u0900-\u097F]/;
const OPTION_REGEX = /\([a-d]\)\s*([\s\S]*?)(?=\([a-d]\)|$)/gis;
/** Split by question number: 1. 2. 3. (at line start or after newline) */
const QUESTION_SPLIT_REGEX = /(?:^|\n)(\d+)\.\s/g;
/** User-specified: 1. (a), 2. (c) etc */
const ANSWER_KEY_REGEX = /(\d+)\.\s*\(([a-d])\)/gi;
const OPTIONS = ["A", "B", "C", "D"];

/** Unwanted symbols at line boundaries (bullets, page noise) - preserve digits/letters */
const UNWANTED_PREFIX = /^[\s\u2022\u2023\u25E6\u2043\u2219\u00B7\u30FB\u25AA\u25CF●•·\-–—]+/g;
const UNWANTED_SUFFIX = /[\s\u2022\u2023\u25E6\u2043\u2219\u00B7\u30FB\u25AA\u25CF●•·\-–—]+$/g;

/**
 * Clean extracted text: remove extra spaces, preserve line breaks, trim unwanted symbols.
 * Does NOT store raw PDF text - returns structured clean content only.
 */
function cleanText(str) {
  if (!str || typeof str !== "string") return "";
  return str
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) =>
      line
        .replace(/\s+/g, " ")
        .replace(UNWANTED_PREFIX, "")
        .replace(UNWANTED_SUFFIX, "")
        .trim()
    )
    .filter((line) => line.length > 0)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanOptionText(str) {
  if (!str || typeof str !== "string") return "";
  return str
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\s+/g, " ")
    .replace(UNWANTED_PREFIX, "")
    .replace(UNWANTED_SUFFIX, "")
    .trim();
}

/**
 * Detect if page text is Hindi (Devanagari) or English (Latin).
 * Returns "hindi" if Devanagari char ratio >= 0.1, else "english".
 */
export function classifyPageLanguage(pageText) {
  if (!pageText || typeof pageText !== "string") return "english";
  const alphaChars = pageText.replace(/\s/g, "").split("").filter((c) => /[\u0900-\u097Fa-zA-Z]/.test(c));
  if (alphaChars.length === 0) return "english";
  const hindiCount = alphaChars.filter((c) => HINDI_REGEX.test(c)).length;
  const ratio = hindiCount / alphaChars.length;
  return ratio >= 0.1 ? "hindi" : "english";
}

/**
 * Extract questions from a single page text.
 * Split by question number. Extract options separately.
 * Clean text only - no raw PDF storage.
 */
function parseQuestionsFromPageText(pageText, language) {
  const questions = [];
  const normalized = (pageText || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
  if (!normalized) return questions;

  const parts = normalized.split(QUESTION_SPLIT_REGEX);
  for (let i = 1; i < parts.length; i += 2) {
    const qNum = parseInt(parts[i], 10);
    const block = (parts[i + 1] || "").trim();
    if (isNaN(qNum) || qNum < 1 || qNum > REQUIRED_QUESTIONS || block.length < 10) continue;

    const firstOptMatch = block.match(/\([a-d]\)/i);
    const firstOptIndex = firstOptMatch ? firstOptMatch.index : block.length;
    let rawQuestionText = block
      .slice(0, firstOptIndex)
      .replace(/\s*Select the correct answer[\s\S]*$/i, "")
      .replace(/\s*Choose the correct (?:answer|option)[\s\S]*$/i, "")
      .trim();

    const questionText = cleanText(rawQuestionText);

    const optMatches = [...block.matchAll(OPTION_REGEX)];
    const opts = {};
    optMatches.slice(0, 4).forEach((m, idx) => {
      const letter = OPTIONS[idx];
      if (letter) opts[letter] = cleanOptionText(m[1] || "");
    });

    questions.push({
      questionNumber: qNum,
      questionText,
      options: {
        A: opts.A || "",
        B: opts.B || "",
        C: opts.C || "",
        D: opts.D || "",
      },
      language,
    });
  }
  return questions;
}

/**
 * Merge Hindi and English question data by questionNumber.
 * Returns structured object (no raw PDF text):
 * { questionNumber, questionText: { hindi, english }, options: [{ key, hindi, english }, ...] }
 */
function mergeHindiEnglish(hindiQuestions, englishQuestions) {
  const byNum = new Map();
  hindiQuestions.forEach((q) => {
    byNum.set(q.questionNumber, {
      questionNumber: q.questionNumber,
      questionText: { hindi: cleanText(q.questionText), english: "" },
      options: [
        { key: "A", hindi: cleanOptionText(q.options.A), english: "" },
        { key: "B", hindi: cleanOptionText(q.options.B), english: "" },
        { key: "C", hindi: cleanOptionText(q.options.C), english: "" },
        { key: "D", hindi: cleanOptionText(q.options.D), english: "" },
      ],
    });
  });
  englishQuestions.forEach((q) => {
    const existing = byNum.get(q.questionNumber);
    if (existing) {
      existing.questionText.english = cleanText(q.questionText || "");
      existing.options[0].english = cleanOptionText(q.options.A);
      existing.options[1].english = cleanOptionText(q.options.B);
      existing.options[2].english = cleanOptionText(q.options.C);
      existing.options[3].english = cleanOptionText(q.options.D);
    } else {
      byNum.set(q.questionNumber, {
        questionNumber: q.questionNumber,
        questionText: { hindi: "", english: cleanText(q.questionText || "") },
        options: [
          { key: "A", hindi: "", english: cleanOptionText(q.options.A) },
          { key: "B", hindi: "", english: cleanOptionText(q.options.B) },
          { key: "C", hindi: "", english: cleanOptionText(q.options.C) },
          { key: "D", hindi: "", english: cleanOptionText(q.options.D) },
        ],
      });
    }
  });

  return [...byNum.values()].sort((a, b) => a.questionNumber - b.questionNumber);
}

/**
 * Parse Solution PDF: answer key + explanations.
 * Answer key: /(\d+)\.\s*\(([a-d])\)/g
 * Explanation: text after answer until next "N. (x)" pattern.
 */
function parseSolutionPdfText(text, totalQuestions = REQUIRED_QUESTIONS) {
  const answerKey = {};
  const explanations = {};
  if (!text || typeof text !== "string") return { answerKey, explanations };

  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const answerMatches = [...normalized.matchAll(ANSWER_KEY_REGEX)];

  answerMatches.forEach((m) => {
    const qNum = parseInt(m[1], 10);
    const ans = (m[2] || "").toUpperCase();
    const idx = qNum - 1;
    if (idx >= 0 && idx < totalQuestions && OPTIONS.includes(ans)) {
      answerKey[String(idx)] = ans;
    }
  });

  for (let i = 0; i < answerMatches.length; i++) {
    const m = answerMatches[i];
    const qNum = parseInt(m[1], 10);
    const startIdx = m.index + m[0].length;
    const nextMatch = answerMatches[i + 1];
    const endIdx = nextMatch ? nextMatch.index : normalized.length;
    const rawExpl = normalized.slice(startIdx, endIdx);
    const expl = cleanText(rawExpl);
    if (expl.length > 5) {
      explanations[String(qNum - 1)] = expl.slice(0, 3000);
    }
  }

  return { answerKey, explanations };
}

/**
 * Main: Parse bilingual Question PDF + Solution PDF.
 * - Extracts page-wise
 * - Separates Hindi and English pages
 * - Parses exactly 100 questions (throws if < 100)
 * - Merges by questionNumber
 * - Maps answer key and explanations
 */
export async function parseBilingualPdfPipeline(questionPdfBuffer, solutionPdfBuffer) {
  const result = {
    success: false,
    questions: [],
    answerKey: {},
    errors: [],
  };

  if (!questionPdfBuffer || !Buffer.isBuffer(questionPdfBuffer)) {
    result.errors.push("Invalid question PDF buffer");
    return result;
  }

  try {
    let meta = await extractTextFromPDFWithMetadata(questionPdfBuffer);
    let fullText = meta.text || "";
    let numPages = meta.numpages || 1;

    if (!meta.success || !fullText?.trim()) {
      result.errors.push(meta.error || "No text extracted from question PDF");
      return result;
    }

    if (numPages >= 2 && fullText.trim().length < 500) {
      try {
        const ocrText = await extractTextFromPDF(questionPdfBuffer);
        if (ocrText?.trim() && ocrText.length > fullText.length) {
          fullText = ocrText;
        }
      } catch (_) {}
    }

    const pages = splitTextIntoPages(fullText, numPages);
    if (pages.length === 0) {
      result.errors.push("Could not split PDF into pages");
      return result;
    }

    // Try legacy font conversion for Hindi
    const devanagariCount = (fullText.match(/[\u0900-\u097F]/g) || []).length;
    if (devanagariCount > 0) {
      const converted = tryLegacyFontConversion(fullText);
      if ((converted.match(/[\u0900-\u097F]/g) || []).length > devanagariCount) {
        fullText = converted;
        const convertedPages = splitTextIntoPages(fullText, numPages);
        if (convertedPages.length === pages.length) {
          for (let i = 0; i < pages.length; i++) {
            pages[i] = convertedPages[i];
          }
        }
      }
    }

    const hindiQuestions = [];
    const englishQuestions = [];

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const text = (page && page.text) || (typeof page === "string" ? page : "");
      if (!text.trim()) continue;

      const lang = classifyPageLanguage(text);
      const qs = parseQuestionsFromPageText(text, lang);
      if (lang === "hindi") {
        hindiQuestions.push(...qs);
      } else {
        englishQuestions.push(...qs);
      }
    }

    const merged = mergeHindiEnglish(hindiQuestions, englishQuestions);

    if (merged.length < REQUIRED_QUESTIONS) {
      result.errors.push(
        `Expected exactly ${REQUIRED_QUESTIONS} questions. Found ${merged.length}. Check PDF structure (alternating Hindi/English pages, question numbers 1–100, options (a)(b)(c)(d)).`
      );
      return result;
    }

    // Take first REQUIRED_QUESTIONS, ensure sequential 1..100
    const ordered = merged
      .filter((q) => q.questionNumber >= 1 && q.questionNumber <= REQUIRED_QUESTIONS)
      .slice(0, REQUIRED_QUESTIONS);

    if (ordered.length < REQUIRED_QUESTIONS) {
      result.errors.push(
        `Expected exactly ${REQUIRED_QUESTIONS} questions. Got ${ordered.length} valid.`
      );
      return result;
    }

    // Reindex to 1..100 for consistency
    const reindexed = ordered.map((q, idx) => ({
      questionNumber: idx + 1,
      questionText: q.questionText,
      options: q.options,
    }));

    result.answerKey = {};
    let explanations = {};

    if (solutionPdfBuffer && Buffer.isBuffer(solutionPdfBuffer)) {
      try {
        const solMeta = await extractTextFromPDFWithMetadata(solutionPdfBuffer);
        if (solMeta.success && solMeta.text?.trim()) {
          let solText = solMeta.text;
          const solConverted = tryLegacyFontConversion(solText);
          if ((solConverted.match(/[\u0900-\u097F]/g) || []).length >= (solText.match(/[\u0900-\u097F]/g) || []).length) {
            solText = solConverted;
          }
          const { answerKey: key, explanations: expl } = parseSolutionPdfText(solText, REQUIRED_QUESTIONS);
          result.answerKey = key;
          explanations = expl;
        }
      } catch (e) {
        result.errors.push(`Solution PDF parse: ${e.message}`);
      }
    }

    result.questions = reindexed.map((q, idx) => {
      const ans = result.answerKey[String(idx)] || result.answerKey[String(q.questionNumber - 1)] || "A";
      result.answerKey[String(idx)] = ans.toUpperCase();
      const opts = Array.isArray(q.options) ? q.options : [];
      return {
        questionNumber: q.questionNumber,
        questionText: { hindi: q.questionText?.hindi || "", english: q.questionText?.english || "" },
        questionHindi: q.questionText?.hindi || "",
        questionEnglish: q.questionText?.english || "",
        options: (opts.length === 4 ? opts : OPTIONS.map((k) => ({ key: k, hindi: "", english: "" }))).map((o) => ({
          key: o.key,
          hindi: o.hindi || "",
          english: o.english || "",
          textHindi: o.hindi || "",
          textEnglish: o.english || "",
        })),
        correctAnswer: ans.toUpperCase(),
        explanation: (explanations[String(idx)] || explanations[String(q.questionNumber - 1)] || "").trim(),
      };
    });

    result.success = true;
    return result;
  } catch (err) {
    console.error("parseBilingualPdfPipeline error:", err);
    result.errors.push(err.message || "PDF parsing failed");
    return result;
  }
}
