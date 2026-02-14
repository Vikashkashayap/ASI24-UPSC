/**
 * Prelims PDF Parser Service
 * Extracts questions + options from question PDF and answer key from solution PDF
 * Supports Devanagari/Hindi - tries Kruti Dev to Unicode conversion for legacy fonts
 */

import { createRequire } from "module";
import { extractTextFromPDF } from "./pdfProcessingService.js";

const require = createRequire(import.meta.url);
let unidev;
try {
  unidev = require("unidev");
} catch (_) {
  unidev = null;
}

const OPTION_LETTERS = ["A", "B", "C", "D"];
const DEVANAGARI_RANGE = /[\u0900-\u097F]/g;

function countDevanagari(str) {
  if (!str || typeof str !== "string") return 0;
  const m = str.match(DEVANAGARI_RANGE);
  return m ? m.length : 0;
}

/** Try to convert legacy Kruti Dev / Hindi font text to Unicode Devanagari */
export function tryLegacyFontConversion(text) {
  if (!text || !unidev) return text;
  try {
    const fonts = ["Krutidev10", "ShreeDev0714", "AkrutiDevChanakya07", "Shivaji"];
    for (const font of fonts) {
      const converted = unidev(text, "hindi", font);
      if (converted && countDevanagari(converted) > countDevanagari(text)) {
        return converted;
      }
    }
  } catch (_) {}
  return text;
}

// Devanagari option letters: क ख ग घ = A B C D
const DEVANAGARI_OPTION_MAP = { "\u0915": "A", "\u0916": "B", "\u0917": "C", "\u0918": "D" };
const DEVANAGARI_OPTION_PATTERN = /[(\[]?([\u0915\u0916\u0917\u0918])[\u094D]?[)\]]\s*([\s\S]*?)(?=[(\[]?[\u0915\u0916\u0917\u0918][\u094D]?[)\]]|$)/g;

/**
 * Parse question PDF text into structured questions with options
 * Handles: Q1., 1., 1ण्, 1। (Devanagari), (A)/(a), (क)(ख)(ग)(घ)
 */
export function parseQuestionPdfText(text) {
  if (!text || typeof text !== "string") return { questions: [], error: "Empty or invalid text" };

  const questions = [];
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Split by question number: 1. 1) 1ण् 1। 1) Q1. - digit + period/paren/Devanagari/space
  const questionSplitRegex = /(?=^\s*(?:Q\.?\s*)?\d+[.)\s\u0900-\u097F]|^\s*\d+[.)\s])/gim;
  let questionBlocks = normalized.split(questionSplitRegex).filter(Boolean);

  if (questionBlocks.length <= 1 && normalized.length > 500) {
    questionBlocks = normalized.split(/(?=\n\s*\d{1,3}[.)\s\u0964\u0901\u093D\u0900-\u097F]*)/gim).filter((b) => b.trim().length > 30);
  }
  if (questionBlocks.length <= 1 && normalized.length > 300) {
    questionBlocks = normalized.split(/(?=\n\s*\d+\.)/gim).filter((b) => b.trim().length > 20);
  }

  for (let i = 0; i < questionBlocks.length; i++) {
    const block = questionBlocks[i].trim();
    if (block.length < 15) continue;

    const qNumMatch = block.match(/^(?:Q\.?\s*)?(\d+)[.)\s\u0900-\u097F]*/);
    const content = qNumMatch ? block.slice(qNumMatch[0].length).trim() : block;

    let questionText = content;
    const options = { A: "", B: "", C: "", D: "" };

    const optionPattern = /\(([A-Da-d])\)\s*([\s\S]*?)(?=\([A-Da-d]\)|$)/gi;
    const optionMatches = [];
    let m;
    while ((m = optionPattern.exec(content)) !== null) {
      optionMatches.push({ letter: m[1].toUpperCase(), text: m[2].trim(), index: m.index });
    }

    let optList = optionMatches;
    if (optList.length < 4) {
      const altPattern = /([A-Da-d])\)\s*([\s\S]*?)(?=[A-Da-d]\)|$)/gi;
      const altMatches = [];
      while ((m = altPattern.exec(content)) !== null) {
        altMatches.push({ letter: m[1].toUpperCase(), text: m[2].trim(), index: m.index });
      }
      if (altMatches.length >= 4) optList = altMatches;
    }
    if (optList.length < 4) {
      const devOptMatches = [];
      const devRe = new RegExp(DEVANAGARI_OPTION_PATTERN.source, "g");
      while ((m = devRe.exec(content)) !== null) {
        const devChar = m[1] || "";
        const key = DEVANAGARI_OPTION_MAP[devChar] || (["A", "B", "C", "D"][devOptMatches.length]);
        devOptMatches.push({ letter: key, text: (m[2] || "").trim(), index: m.index });
      }
      if (devOptMatches.length >= 4) optList = devOptMatches;
    }
    if (optList.length < 4) {
      const semiPattern = /;\s*([\s\S]*?)(?=;\s*(?:[(\[]?[\u0915\u0916\u0917\u0918A-Da-d][)\]]?|$))/g;
      const semiParts = content.split(/;\s*/).filter((p) => p.trim().length > 5);
      if (semiParts.length >= 5) {
        questionText = semiParts[0].trim();
        OPTION_LETTERS.forEach((k, idx) => {
          if (semiParts[idx + 1]) options[k] = semiParts[idx + 1].trim();
        });
      }
    }

    if (optList.length >= 4) {
      questionText = content.slice(0, optList[0].index).trim();
      optList.slice(0, 4).forEach((opt, idx) => {
        let optText = opt.text;
        const nextOpt = optList[idx + 1];
        if (nextOpt && optText.length > 150) {
          const nextMarker = optText.search(/\s*[(\[]?[\u0915\u0916\u0917\u0918A-Da-d][)\]]?\s*/);
          if (nextMarker > 0) optText = optText.slice(0, nextMarker).trim();
        }
        if (OPTION_LETTERS.includes(opt.letter)) options[opt.letter] = optText;
      });
    } else if (!options.A && !options.B) {
      const codesMatch = content.match(/(?:Select the correct answer|Codes?:|Options?)\s*[:.]?\s*([\s\S]+)/i);
      if (codesMatch) {
        const codesSection = codesMatch[1];
        const parts = codesSection.split(/\s*\(([A-Da-d])\)\s*/gi).filter(Boolean);
        questionText = content.slice(0, content.indexOf(codesMatch[0])).trim();
        let letter = "A";
        for (let j = 0; j < parts.length && letter <= "D"; j++) {
          const part = parts[j].trim();
          if (["A", "B", "C", "D"].includes(part.toUpperCase()) && part.length <= 2) {
            letter = part.toUpperCase();
          } else if (part.length > 2) {
            options[letter] = part.replace(/\s*\([A-Da-d]\)\s*/gi, "").trim();
            letter = String.fromCharCode(letter.charCodeAt(0) + 1);
          }
        }
      }
    }

    questionText = questionText
      .replace(/\s*Select the correct answer[\s\S]*$/i, "")
      .replace(/\s*Choose the correct (?:answer|option)[\s\S]*$/i, "")
      .trim();

    if (questionText.length >= 5) {
      if (questionText.length > 1200 && !options.A && !options.B) {
        const subBlocks = questionText.split(/(?=\n\s*\d{1,3}[.)\s\u0964\u0900-\u097F]*)/).filter((b) => b.trim().length > 50);
        if (subBlocks.length > 1) {
          subBlocks.forEach((sub) => {
            const t = sub.trim();
            if (t.length >= 20) questions.push({ question: t, options: { A: "", B: "", C: "", D: "" } });
          });
        } else {
          questions.push({ question: questionText, options });
        }
      } else {
        questions.push({
          question: questionText,
          options: { A: options.A || "", B: options.B || "", C: options.C || "", D: options.D || "" },
        });
      }
    }
  }

  if (questions.length === 0) {
    const fallback = parseQuestionsFallback(normalized);
    if (fallback.length > 0) return { questions: fallback };
  }

  return { questions };
}

/**
 * Fallback parser - split by number patterns and look for any option-like structure
 */
function parseQuestionsFallback(text) {
  const questions = [];
  const chunks = text.split(/(?=\n\s*\d{1,3}[.)\s\u0964\u0900-\u097F]*)|(?:\n\s*){3,}/gim).filter((b) => b.trim().length > 40);

  for (const chunk of chunks) {
    const block = chunk.trim();
    if (block.length < 25) continue;

    const optionRegex = /\(([A-Da-d])\)\s*([\s\S]*?)(?=\([A-Da-d]\)|$)/gi;
    const opts = [];
    let match;
    while ((match = optionRegex.exec(block)) !== null) {
      opts.push({ letter: match[1].toUpperCase(), text: match[2].trim() });
    }
    if (opts.length < 4) {
      const devRe = /[(\[]?([\u0915\u0916\u0917\u0918])[\u094D]?[)\]]\s*([\s\S]*?)(?=[(\[]?[\u0915\u0916\u0917\u0918][\u094D]?[)\]]|$)/g;
      opts.length = 0;
      while ((match = devRe.exec(block)) !== null) {
        const key = DEVANAGARI_OPTION_MAP[match[1]] || ["A", "B", "C", "D"][opts.length];
        opts.push({ letter: key, text: (match[2] || "").trim() });
      }
    }

    if (opts.length >= 4) {
      const firstOptMatch = block.match(/\([A-Da-d]\)|[(\[]?[\u0915\u0916\u0917\u0918][\u094D]?[)\]]/i);
      const firstOptIndex = firstOptMatch ? firstOptMatch.index : block.length;
      let questionText = block.slice(0, firstOptIndex).replace(/^(?:Q\.?\s*)?\d+[.)\s\u0900-\u097F]*/, "").trim();
      if (questionText.length >= 5) {
        questions.push({
          question: questionText,
          options: {
            A: opts[0]?.text || "",
            B: opts[1]?.text || "",
            C: opts[2]?.text || "",
            D: opts[3]?.text || "",
          },
        });
      }
    }
  }
  return questions;
}

/**
 * Parse solution PDF text to extract answer key
 * Formats: "1. (A)", "1-A", "1. A", "Answer Key: 1-A 2-B ...", "1 (a)" etc.
 */
export function parseSolutionPdfText(text, totalQuestions = 100) {
  const answerKey = {};
  if (!text || typeof text !== "string") return answerKey;

  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Pattern 1: "1. (A)" or "1. A" or "1-A" or "1 (a)"
  const patterns = [
    /(\d+)[.)\s\-]+[\(]?([A-Da-d])[\)]?/g,
    /^(\d+)\s*[:.\-]\s*([A-Da-d])/gim,
    /Q\.?\s*(\d+)\s*[:.]\s*([A-Da-d])/gi,
  ];

  for (const regex of patterns) {
    let m;
    const re = new RegExp(regex.source, regex.flags);
    while ((m = re.exec(normalized)) !== null) {
      const idx = parseInt(m[1], 10) - 1; // 0-based index
      const ans = (m[2] || "").toUpperCase();
      if (idx >= 0 && idx < totalQuestions && ["A", "B", "C", "D"].includes(ans)) {
        answerKey[String(idx)] = ans;
      }
    }
  }

  return answerKey;
}

/**
 * Main: extract and parse question PDF
 */
export async function extractAndParseQuestionPdf(pdfBuffer) {
  try {
    let text = await extractTextFromPDF(pdfBuffer);
    const converted = tryLegacyFontConversion(text);
    if (countDevanagari(converted) > countDevanagari(text)) {
      text = converted;
    }
    const { questions, error } = parseQuestionPdfText(text);
    if (error) return { success: false, error, questions: [] };
    return { success: true, questions, rawTextLength: text?.length || 0 };
  } catch (err) {
    console.error("extractAndParseQuestionPdf error:", err);
    return { success: false, error: err.message || "Failed to parse question PDF", questions: [] };
  }
}

/**
 * Main: extract and parse solution PDF for answer key
 */
export async function extractAndParseSolutionPdf(pdfBuffer, totalQuestions = 100) {
  try {
    const text = await extractTextFromPDF(pdfBuffer);
    const answerKey = parseSolutionPdfText(text, totalQuestions);
    return { success: true, answerKey, rawTextLength: text?.length || 0 };
  } catch (err) {
    console.error("extractAndParseSolutionPdf error:", err);
    return { success: false, error: err.message || "Failed to parse solution PDF", answerKey: {} };
  }
}
