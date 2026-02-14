/**
 * Prelims Bilingual PDF Parser Service
 * Extracts Hindi + English questions and options from UPSC-style PDFs.
 * Supports legacy Kruti Dev font conversion.
 */

import { createRequire } from "module";
import { extractTextFromPDF, extractTextWithOCR } from "./pdfProcessingService.js";
import { tryLegacyFontConversion } from "./prelimsPdfParserService.js";

function countDevanagari(str) {
  if (!str || typeof str !== "string") return 0;
  const m = str.match(/[\u0900-\u097F]/g);
  return m ? m.length : 0;
}

const require = createRequire(import.meta.url);
const DEVANAGARI = /[\u0900-\u097F\u1CD0-\u1CFF]/;
const LATIN = /[a-zA-Z]/;

/**
 * Split mixed Hindi/English text into { hindi, english } by script detection.
 * For English-dominant (>90% Latin), put full text in english.
 * For Hindi-dominant (>90% Devanagari), put full text in hindi.
 */
export function splitBilingualText(text) {
  if (!text || typeof text !== "string") return { hindi: "", english: "" };

  const alphaChars = text.replace(/\s/g, "").split("").filter((c) => /[\u0900-\u097Fa-zA-Z]/.test(c));
  const latinCount = alphaChars.filter((c) => LATIN.test(c)).length;
  const devanagariCount = alphaChars.filter((c) => DEVANAGARI.test(c)).length;
  const totalAlpha = alphaChars.length;
  const latinRatio = totalAlpha > 0 ? latinCount / totalAlpha : 0;
  const devanagariRatio = totalAlpha > 0 ? devanagariCount / totalAlpha : 0;

  if (latinRatio >= 0.9) return { hindi: "", english: text.trim() };
  if (devanagariRatio >= 0.9) return { hindi: text.trim(), english: "" };

  const segments = [];
  let current = "";
  let currentScript = null;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const isDevanagari = DEVANAGARI.test(char);
    const isLatin = LATIN.test(char);
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

/**
 * Parse bilingual question PDF into structured questions.
 * Returns: { questions: [{ questionNumber, questionHindi, questionEnglish, options: [{ key, textHindi, textEnglish }] }], answerKey: {} }
 */
export function parseBilingualQuestionPdfText(text) {
  if (!text || typeof text !== "string") return { questions: [], answerKey: {} };

  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const questions = [];
  const OPTION_LETTERS = ["A", "B", "C", "D"];

  let questionBlocks = normalized.split(/(?=^\s*(?:Q\.?\s*)?\d+[.)\s\u0900-\u097F]|^\s*\d+[.)\s])/gim).filter(Boolean);
  if (questionBlocks.length <= 1 && normalized.length > 500) {
    questionBlocks = normalized.split(/(?=\n\s*\d{1,3}[.)\s\u0964\u0900-\u097F]*)/gim).filter((b) => b.trim().length > 30);
  }

  for (let i = 0; i < questionBlocks.length; i++) {
    const block = questionBlocks[i].trim();
    if (block.length < 15) continue;

    const qNumMatch = block.match(/^(?:Q\.?\s*)?(\d+)[.)\s\u0900-\u097F]*/);
    const questionNumber = qNumMatch ? parseInt(qNumMatch[1], 10) : i + 1;
    const content = qNumMatch ? block.slice(qNumMatch[0].length) : block;

    const optionPattern = /\(([A-Da-d])\)\s*([\s\S]*?)(?=\([A-Da-d]\)|$)/gi;
    const optionMatches = [];
    let m;
    while ((m = optionPattern.exec(content)) !== null) {
      optionMatches.push({ letter: m[1].toUpperCase(), text: m[2].trim(), index: m.index });
    }

    let altMatches = [];
    if (optionMatches.length < 4) {
      const altPattern = /([A-Da-d])\)\s*([\s\S]*?)(?=[A-Da-d]\)|$)/gi;
      let am;
      while ((am = altPattern.exec(content)) !== null) {
        altMatches.push({ letter: am[1].toUpperCase(), text: am[2].trim(), index: am.index });
      }
    }
    let devMatches = [];
    if (altMatches.length < 4) {
      const devPattern = /[(\[]?([\u0915\u0916\u0917\u0918])[\u094D]?[)\]]\s*([\s\S]*?)(?=[(\[]?[\u0915\u0916\u0917\u0918][\u094D]?[)\]]|$)/g;
      const devMap = { "\u0915": "A", "\u0916": "B", "\u0917": "C", "\u0918": "D" };
      let dm;
      while ((dm = devPattern.exec(content)) !== null) {
        devMatches.push({ letter: devMap[dm[1]] || "A", text: (dm[2] || "").trim(), index: dm.index });
      }
    }

    const optList = optionMatches.length >= 4 ? optionMatches : altMatches.length >= 4 ? altMatches : devMatches.length >= 4 ? devMatches : [];
    const firstOptIndex = optList[0] ? optList[0].index : content.length;

    let questionText = content.slice(0, firstOptIndex)
      .replace(/\s*Select the correct answer[\s\S]*$/i, "")
      .replace(/\s*Choose the correct (?:answer|option)[\s\S]*$/i, "")
      .replace(/\s*Codes?[\s\S]*$/i, "")
      .trim();

    const { hindi: questionHindi, english: questionEnglish } = splitBilingualText(questionText);
    const qText = questionHindi || questionEnglish || questionText;

    const options = [];
    if (optList.length >= 4) {
      optList.slice(0, 4).forEach((opt) => {
        let optText = opt.text;
        const nextIdx = optList.indexOf(opt) + 1;
        if (optList[nextIdx] && optText.length > 150) {
          const nextMarker = optText.search(/\s*[A-Da-d]\)\s*/);
          if (nextMarker > 0) optText = optText.slice(0, nextMarker).trim();
        }
        const { hindi: textHindi, english: textEnglish } = splitBilingualText(optText);
        options.push({
          key: opt.letter,
          textHindi: textHindi || optText,
          textEnglish: textEnglish || optText,
        });
      });
    }

    if (qText.length >= 3) {
      questions.push({
        questionNumber,
        questionHindi: questionHindi || "",
        questionEnglish: questionEnglish || "",
        options: options.length === 4 ? options : OPTION_LETTERS.map((k) => ({ key: k, textHindi: "", textEnglish: "" })),
      });
    }
  }

  return { questions };
}

/**
 * Parse answer key PDF - formats: 1. (c), 2. (a), 1-c, 2-a
 */
export function parseAnswerKeyPdfText(text, totalQuestions = 100) {
  const answerKey = {};
  if (!text || typeof text !== "string") return answerKey;

  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const patterns = [
    /(\d+)[.)\s\-]+[\(]?([A-Da-d])[\)]?/g,
    /^(\d+)\s*[:.\-]\s*([A-Da-d])/gim,
    /Q\.?\s*(\d+)\s*[:.]\s*([A-Da-d])/gi,
  ];

  for (const regex of patterns) {
    const re = new RegExp(regex.source, regex.flags);
    let m;
    while ((m = re.exec(normalized)) !== null) {
      const idx = parseInt(m[1], 10) - 1;
      const ans = (m[2] || "").toUpperCase();
      if (idx >= 0 && idx < totalQuestions && ["A", "B", "C", "D"].includes(ans)) {
        answerKey[String(idx)] = ans;
      }
    }
  }
  return answerKey;
}

/**
 * Main: Parse question PDF + answer key PDF into bilingual questions with correct answers.
 * Uses OCR fallback when extractTextFromPDF throws (e.g. image-only PDF where OCR failed internally).
 */
export async function extractAndParseBilingualPdfs(questionPdfBuffer, answerKeyPdfBuffer) {
  try {
    let text = "";
    try {
      text = await extractTextFromPDF(questionPdfBuffer);
    } catch (extractErr) {
      if (
        extractErr.message?.includes("OCR") ||
        extractErr.message?.includes("no text") ||
        extractErr.message?.includes("image-only")
      ) {
        const ocrResult = await extractTextWithOCR(questionPdfBuffer);
        if (ocrResult.success && ocrResult.text?.trim()) {
          text = ocrResult.text.trim();
        } else {
          return {
            success: false,
            error:
              "Could not extract text from this PDF. If it's scanned, use a clearer copy or a PDF with selectable text.",
            questions: [],
            answerKey: {},
          };
        }
      } else {
        throw extractErr;
      }
    }
    if (!text || !text.trim()) {
      return {
        success: false,
        error: "No text found in the PDF. Use a text-based PDF or a clearer scan.",
        questions: [],
        answerKey: {},
      };
    }
    // Only run legacy font conversion when PDF already has significant Hindi (avoid garbling English PDFs)
    const alphaChars = (text || "").replace(/\s/g, "").split("").filter((c) => /[\u0900-\u097Fa-zA-Z]/.test(c));
    const totalAlpha = alphaChars.length;
    const devanagariCount = alphaChars.filter((c) => DEVANAGARI.test(c)).length;
    const devanagariRatio = totalAlpha > 0 ? devanagariCount / totalAlpha : 0;
    if (devanagariRatio >= 0.1) {
      const converted = tryLegacyFontConversion(text);
      if (countDevanagari(converted) > countDevanagari(text)) {
        text = converted;
      }
    }

    const { questions } = parseBilingualQuestionPdfText(text);
    const totalQuestions = questions.length || 100;

    let answerKey = {};
    if (answerKeyPdfBuffer) {
      try {
        const keyText = await extractTextFromPDF(answerKeyPdfBuffer);
        answerKey = parseAnswerKeyPdfText(keyText, totalQuestions);
      } catch (e) {
        console.warn("Answer key PDF parse failed:", e.message);
      }
    }

    const questionsWithAnswers = questions.map((q, idx) => ({
      ...q,
      correctAnswer: answerKey[String(idx)] || answerKey[String(q.questionNumber - 1)] || "A",
    }));

    return {
      success: true,
      questions: questionsWithAnswers,
      answerKey,
      rawTextLength: text?.length || 0,
    };
  } catch (err) {
    console.error("extractAndParseBilingualPdfs error:", err);
    return {
      success: false,
      error: err.message || "Failed to parse PDFs",
      questions: [],
      answerKey: {},
    };
  }
}
