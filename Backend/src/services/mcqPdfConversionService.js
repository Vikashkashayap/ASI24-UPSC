/**
 * MCQ PDF Conversion Engine - Production Ready
 * Converts Question Paper PDF + Answer Key PDF into structured MCQs in MongoDB.
 * Supports: text-based and scanned PDFs, OCR fallback (eng+hin), bilingual (Hindi/English).
 *
 * Flow:
 * 1. Extract text from Question PDF (pdf-parse or OCR)
 * 2. Parse questions: regex /^\d+\./ for question numbers, /\([a-d]\)/ for options
 * 3. Separate Hindi/English using Unicode detection
 * 4. Extract answer key from Answer Key PDF
 * 5. Map correctAnswer by question number
 * 6. Store in PrelimsQuestion collection
 */

import { extractTextFromPDF, extractTextWithOCR } from "./pdfProcessingService.js";
import { tryLegacyFontConversion } from "./prelimsPdfParserService.js";

/* ===============================
   REGEX PATTERNS
================================ */

/** Question number: 1. 2. 3. Q1. Q.1 */
export const QUESTION_NUMBER_REGEX = /^(?:Q\.?\s*)?(\d+)[.)\s\u0964\u0900-\u097F]*/im;

/** Split text into question blocks by number pattern */
export const QUESTION_SPLIT_REGEX = /(?=^\s*(?:Q\.?\s*)?\d+[.)\s\u0900-\u097F]|^\s*\d+[.)\s])/gim;

/** Options: (a) (b) (c) (d) or (A) (B) (C) (D) */
export const OPTION_REGEX = /\(([a-dA-D])\)\s*([\s\S]*?)(?=\([a-dA-D]\)|$)/gi;

/** Alternative: a) b) without paren */
export const OPTION_ALT_REGEX = /([a-dA-D])\)\s*([\s\S]*?)(?=[a-dA-D]\)|$)/gi;

/** Devanagari option markers: (क) (ख) (ग) (घ) = A B C D */
const DEVANAGARI_OPTION_MAP = { "\u0915": "A", "\u0916": "B", "\u0917": "C", "\u0918": "D" };
const DEVANAGARI_OPTION_REGEX = /[(\[]?([\u0915\u0916\u0917\u0918])[\u094D]?[)\]]\s*([\s\S]*?)(?=[(\[]?[\u0915\u0916\u0917\u0918][\u094D]?[)\]]|$)/g;

/** Answer key patterns: 1. (A), 1-A, 1. A, Q1: A */
export const ANSWER_KEY_PATTERNS = [
  /(\d+)[.)\s\-]+[\(]?([A-Da-d])[\)]?/g,
  /^(\d+)\s*[:.\-]\s*([A-Da-d])/gim,
  /Q\.?\s*(\d+)\s*[:.]\s*([A-Da-d])/gi,
];

/** Unicode ranges */
const DEVANAGARI_RANGE = /[\u0900-\u097F\u1CD0-\u1CFF]/;
const LATIN_RANGE = /[a-zA-Z]/;

const OPTION_LETTERS = ["A", "B", "C", "D"];

/* ===============================
   UNICODE / BILINGUAL HELPERS
================================ */

function countDevanagari(str) {
  if (!str || typeof str !== "string") return 0;
  const m = str.match(/[\u0900-\u097F]/g);
  return m ? m.length : 0;
}

/**
 * Split mixed Hindi/English text into { hindi, english } by script detection.
 * For English-dominant text (>80% Latin), prefer full text in english.
 * For Hindi-dominant text (>80% Devanagari), prefer full text in hindi.
 */
export function separateHindiEnglish(text) {
  if (!text || typeof text !== "string") return { hindi: "", english: "" };

  const alphaChars = text.replace(/\s/g, "").split("").filter((c) => /[\u0900-\u097Fa-zA-Z]/.test(c));
  const latinCount = alphaChars.filter((c) => LATIN_RANGE.test(c)).length;
  const devanagariCount = alphaChars.filter((c) => DEVANAGARI_RANGE.test(c)).length;
  const totalAlpha = alphaChars.length;
  const latinRatio = totalAlpha > 0 ? latinCount / totalAlpha : 0;
  const devanagariRatio = totalAlpha > 0 ? devanagariCount / totalAlpha : 0;

  if (latinRatio >= 0.9) {
    return { hindi: "", english: text.trim() };
  }
  if (devanagariRatio >= 0.9) {
    return { hindi: text.trim(), english: "" };
  }

  const segments = [];
  let current = "";
  let currentScript = null;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const isDevanagari = DEVANAGARI_RANGE.test(char);
    const isLatin = LATIN_RANGE.test(char);
    const script = isDevanagari ? "hindi" : isLatin ? "english" : null;

    if (script) {
      if (script === currentScript) {
        current += char;
      } else {
        if (current) segments.push({ script: currentScript, text: current.trim() });
        current = char;
        currentScript = script;
      }
    } else {
      if (currentScript) current += char;
    }
  }
  if (current) segments.push({ script: currentScript, text: current.trim() });

  let hindi = segments.filter((s) => s.script === "hindi").map((s) => s.text).join(" ").trim();
  let english = segments.filter((s) => s.script === "english").map((s) => s.text).join(" ").trim();

  if (latinRatio > devanagariRatio && english.length < 10 && text.trim().length > 20) {
    english = text.trim();
    hindi = "";
  } else if (devanagariRatio > latinRatio && hindi.length < 10 && text.trim().length > 20) {
    hindi = text.trim();
    english = "";
  }

  return { hindi, english };
}

/* ===============================
   OPTION EXTRACTION
================================ */

function extractOptions(content) {
  const optList = [];
  let m;

  // Primary: (a) (b) (c) (d)
  const primary = new RegExp(OPTION_REGEX.source, OPTION_REGEX.flags);
  while ((m = primary.exec(content)) !== null) {
    optList.push({ letter: (m[1] || "").toUpperCase(), text: (m[2] || "").trim(), index: m.index });
  }

  if (optList.length >= 4) return optList;

  // Alternative: a) b)
  optList.length = 0;
  const alt = new RegExp(OPTION_ALT_REGEX.source, OPTION_ALT_REGEX.flags);
  while ((m = alt.exec(content)) !== null) {
    optList.push({ letter: (m[1] || "").toUpperCase(), text: (m[2] || "").trim(), index: m.index });
  }

  if (optList.length >= 4) return optList;

  // Devanagari: (क) (ख) (ग) (घ)
  optList.length = 0;
  const dev = new RegExp(DEVANAGARI_OPTION_REGEX.source, "g");
  while ((m = dev.exec(content)) !== null) {
    const key = DEVANAGARI_OPTION_MAP[m[1]] || OPTION_LETTERS[optList.length];
    optList.push({ letter: key, text: (m[2] || "").trim(), index: m.index });
  }

  return optList;
}

/* ===============================
   QUESTION PARSING
================================ */

/**
 * Parse question PDF text into structured MCQs.
 * Returns: { questions: [{ questionNumber, questionHindi, questionEnglish, options }], errors: [] }
 */
export function parseQuestionPdfText(text) {
  const result = { questions: [], errors: [] };
  if (!text || typeof text !== "string") {
    result.errors.push("Empty or invalid text");
    return result;
  }

  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  let blocks = normalized.split(QUESTION_SPLIT_REGEX).filter(Boolean);

  if (blocks.length <= 1 && normalized.length > 500) {
    blocks = normalized.split(/(?=\n\s*\d{1,3}[.)\s\u0964\u0900-\u097F]*)/gim).filter((b) => b.trim().length > 30);
  }
  if (blocks.length <= 1 && normalized.length > 300) {
    blocks = normalized.split(/(?=\n\s*\d+\.)/gim).filter((b) => b.trim().length > 20);
  }

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i].trim();
    if (block.length < 15) continue;

    const qNumMatch = block.match(QUESTION_NUMBER_REGEX);
    const questionNumber = qNumMatch ? parseInt(qNumMatch[1], 10) : i + 1;
    const content = qNumMatch ? block.slice(qNumMatch[0].length) : block;

    const optList = extractOptions(content);
    const firstOptIndex = optList[0] ? optList[0].index : content.length;

    let questionText = content
      .slice(0, firstOptIndex)
      .replace(/\s*Select the correct answer[\s\S]*$/i, "")
      .replace(/\s*Choose the correct (?:answer|option)[\s\S]*$/i, "")
      .replace(/\s*Codes?[\s\S]*$/i, "")
      .trim();

    const { hindi: questionHindi, english: questionEnglish } = separateHindiEnglish(questionText);
    const qText = questionHindi || questionEnglish || questionText;

    if (qText.length < 3) continue;

    const options = [];
    if (optList.length >= 4) {
      optList.slice(0, 4).forEach((opt) => {
        let optText = opt.text;
        if (optText.length > 200) {
          const nextMarker = optText.search(/\s*[(\[]?[\u0915\u0916\u0917\u0918A-Da-d][\u094D]?[)\]]?\s*/);
          if (nextMarker > 0) optText = optText.slice(0, nextMarker).trim();
        }
        const { hindi: textHindi, english: textEnglish } = separateHindiEnglish(optText);
        options.push({
          key: opt.letter,
          textHindi: textHindi || optText,
          textEnglish: textEnglish || optText,
        });
      });
    } else {
      OPTION_LETTERS.forEach((k) => options.push({ key: k, textHindi: "", textEnglish: "" }));
    }

    result.questions.push({
      questionNumber,
      questionHindi: questionHindi || "",
      questionEnglish: questionEnglish || "",
      options: options.length === 4 ? options : OPTION_LETTERS.map((k) => ({ key: k, textHindi: "", textEnglish: "" })),
    });
  }

  return result;
}

/**
 * Parse answer key PDF text.
 * Returns: { "0": "A", "1": "B", ... } (0-based index)
 */
export function parseAnswerKeyPdfText(text, totalQuestions = 100) {
  const answerKey = {};
  if (!text || typeof text !== "string") return answerKey;

  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (const regex of ANSWER_KEY_PATTERNS) {
    const re = new RegExp(regex.source, regex.flags);
    let m;
    while ((m = re.exec(normalized)) !== null) {
      const idx = parseInt(m[1], 10) - 1;
      const ans = (m[2] || "").toUpperCase();
      if (idx >= 0 && idx < totalQuestions && OPTION_LETTERS.includes(ans)) {
        answerKey[String(idx)] = ans;
      }
    }
  }
  return answerKey;
}

/* ===============================
   MAIN CONVERSION PIPELINE
================================ */

/**
 * Full pipeline: Extract text (with OCR fallback) -> Parse questions -> Parse answer key.
 * @param {Buffer} questionPdfBuffer
 * @param {Buffer|null} answerKeyPdfBuffer
 * @returns {Promise<{success, questions, answerKey, rawTextLength, usedOCR, errors}>}
 */
export async function convertPdfToMcq(questionPdfBuffer, answerKeyPdfBuffer = null) {
  const result = {
    success: false,
    questions: [],
    answerKey: {},
    rawTextLength: 0,
    usedOCR: false,
    errors: [],
  };

  if (!questionPdfBuffer || !Buffer.isBuffer(questionPdfBuffer)) {
    result.errors.push("Invalid question PDF buffer");
    return result;
  }

  let text = "";

  try {
    // Step 1: Extract text (text-based first, OCR fallback for scanned)
    try {
      text = await extractTextFromPDF(questionPdfBuffer);
    } catch (extractErr) {
      if (
        extractErr.message?.includes("no text") ||
        extractErr.message?.includes("image-only") ||
        extractErr.message?.includes("scanned")
      ) {
        result.usedOCR = true;
        const ocrResult = await extractTextWithOCR(questionPdfBuffer);
        if (ocrResult.success && ocrResult.text?.trim()) {
          text = ocrResult.text.trim();
        } else {
          result.errors.push(ocrResult.error || "OCR failed to extract text");
          return result;
        }
      } else {
        throw extractErr;
      }
    }

    result.rawTextLength = text?.length || 0;

    // Step 2: Legacy font conversion ONLY for PDFs that already have significant Hindi/Devanagari.
    // Skip for English-only PDFs so we don't convert Latin to garbled Devanagari.
    const alphaChars = (text || "").replace(/\s/g, "").split("").filter((c) => /[\u0900-\u097Fa-zA-Z]/.test(c));
    const totalAlpha = alphaChars.length;
    const devanagariCount = alphaChars.filter((c) => DEVANAGARI_RANGE.test(c)).length;
    const devanagariRatio = totalAlpha > 0 ? devanagariCount / totalAlpha : 0;
    if (devanagariRatio >= 0.1) {
      const converted = tryLegacyFontConversion(text);
      if (countDevanagari(converted) > countDevanagari(text)) {
        text = converted;
      }
    }

    // Step 3: Parse questions
    const parseResult = parseQuestionPdfText(text);
    result.questions = parseResult.questions;
    if (parseResult.errors?.length) result.errors.push(...parseResult.errors);

    if (result.questions.length === 0) {
      result.errors.push("No questions extracted. Check PDF format (question numbers like 1. 2. 3., options (a) (b) (c) (d)).");
      return result;
    }

    const totalQuestions = result.questions.length;

    // Step 4: Parse answer key PDF
    if (answerKeyPdfBuffer && Buffer.isBuffer(answerKeyPdfBuffer)) {
      try {
        let keyText = await extractTextFromPDF(answerKeyPdfBuffer);
        const keyConverted = tryLegacyFontConversion(keyText);
        if (countDevanagari(keyConverted) > countDevanagari(keyText)) keyText = keyConverted;
        result.answerKey = parseAnswerKeyPdfText(keyText, totalQuestions);
      } catch (keyErr) {
        result.errors.push(`Answer key parse: ${keyErr.message}`);
      }
    }

    // Step 5: Map correctAnswer to each question
    result.questions = result.questions.map((q, idx) => ({
      ...q,
      correctAnswer:
        result.answerKey[String(idx)] ||
        result.answerKey[String(q.questionNumber - 1)] ||
        OPTION_LETTERS[0],
    }));

    // Update answerKey to match question indices for DB
    const finalAnswerKey = {};
    result.questions.forEach((q, idx) => {
      finalAnswerKey[String(idx)] = (q.correctAnswer || "A").toUpperCase();
    });
    result.answerKey = finalAnswerKey;
    result.success = true;
  } catch (err) {
    console.error("convertPdfToMcq error:", err);
    result.errors.push(err.message || "PDF conversion failed");
  }

  return result;
}
