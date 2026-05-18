/**
 * Prelims Import PDF Service
 * Extract English questions only from UPSC question paper PDF using pdf-parse.
 * Fallback: pdfjs-dist if pdf-parse returns no text (some PDFs work with one but not the other).
 * No AI. Hindi text removed.
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const SCANNED_PDF_MESSAGE =
  "No text could be extracted from this PDF. It may be scanned (image-only) or use a format we cannot read. Please use a PDF with selectable text, or convert scanned PDFs using an OCR tool (e.g. Adobe Acrobat, online OCR) and upload again.";

/**
 * Extract text using pdfjs-dist (Mozilla PDF.js). Used as fallback when pdf-parse returns empty.
 */
async function extractWithPdfJs(buffer) {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(buffer);
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const parts = [];
  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = (content.items || [])
      .map((item) => (item && typeof item.str === "string" ? item.str : ""))
      .join(" ");
    parts.push(pageText);
  }
  const text = parts.join("\n").trim();
  return { text, numPages };
}

export async function extractTextFromPdf(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error("Invalid PDF buffer");
  }

  let text = "";
  let numPages = 1;

  try {
    const data = await pdfParse(buffer, { max: 0 });
    text = (data.text || "").trim();
    numPages = data.numpages || 1;
  } catch (e) {
    // pdf-parse failed; try fallback below (text stays "")
  }

  if (!text) {
    try {
      const result = await extractWithPdfJs(buffer);
      text = (result.text || "").trim();
      numPages = result.numPages || 1;
    } catch (e) {
      console.warn("[Prelims Import] pdfjs-dist fallback failed:", e?.message || e);
    }
  }

  if (!text) {
    throw new Error(SCANNED_PDF_MESSAGE);
  }

  return { text, numPages };
}

/**
 * Clean text: remove \r, replace \u00a0 with space, normalize spaces (preserve newlines)
 */
function cleanText(text) {
  return text
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\s+\n/g, "\n")
    .trim();
}

/**
 * Remove Devanagari (Hindi) characters
 */
function removeHindi(text) {
  return text.replace(/[\u0900-\u097F]+/g, "");
}

/**
 * Junk patterns: copyright, URLs, rough work, CSE/PTS metadata, Hindi remnants.
 * Used to truncate option/question text at first occurrence so next-page content is not shown.
 */
const JUNK_PATTERN = /\s*(©|Copyright|www\.\S+|Space\s+for\s+Rough\s+Work|PTS\s*\(\s*GS\s*\)|CSE\s+20\d{2}|\(\d+\s*-\s*[A-Da-d]\s*\)|VsLV|IkekU|nextias\.com)[\s\S]*/i;

/**
 * Clean a single option or question text: remove Hindi, strip junk from middle/end, normalize spaces.
 */
function stripJunkFromText(str) {
  if (!str || typeof str !== "string") return "";
  let s = removeHindi(str);
  const junkIndex = s.search(JUNK_PATTERN);
  if (junkIndex !== -1) {
    s = s.substring(0, junkIndex);
  }
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

/**
 * Extract option text between (a) and (b), (b) and (c), etc.
 * Cleans each option to remove copyright/Hindi/junk.
 */
function extractOptions(block) {
  const options = { A: "", B: "", C: "", D: "" };
  const optionRegex = /\(([a-d])\)\s*([\s\S]*?)(?=\([a-d]\)|$)/gi;
  let m;
  const parts = [];
  while ((m = optionRegex.exec(block)) !== null) {
    const letter = (m[1] || "").toUpperCase();
    let text = (m[2] || "").trim().replace(/\s+/g, " ").trim();
    text = stripJunkFromText(text);
    if (letter && ["A", "B", "C", "D"].includes(letter)) {
      parts.push({ letter, text });
    }
  }
  parts.forEach(({ letter, text }) => {
    options[letter] = text;
  });
  return options;
}

/**
 * Split block into question stem (before first option) and options.
 * Block format: "1. In the ... (a) ... (b) ... (c) ... (d) ..."
 */
function parseQuestionBlock(block, questionNumber) {
  const optionStart = block.search(/\([a-d]\)/i);
  if (optionStart === -1) {
    return null;
  }
  let questionText = block.substring(0, optionStart).trim();
  const optionsBlock = block.substring(optionStart);
  questionText = questionText.replace(/^\d+\.\s*/, "").trim();
  questionText = stripJunkFromText(questionText);

  const options = extractOptions(optionsBlock);
  return {
    questionNumber,
    questionText,
    options,
  };
}

/**
 * Extract English questions using block regex.
 * Pattern: number. (In the|With reference to|Consider the|Which of the) ... (d) ... until next question or end
 */
export function extractEnglishQuestions(rawText) {
  const cleaned = cleanText(rawText);
  const noHindi = removeHindi(cleaned);
  const normalized = noHindi.replace(/\n{2,}/g, "\n").trim();

  const blockRegex =
    /\n?\d+\.\s+(In the|With reference to|Consider the|Which of the)[\s\S]*?\(d\)[\s\S]*?(?=\n\d+\.|$)/gi;

  const blocks = [];
  let m;
  while ((m = blockRegex.exec(normalized)) !== null) {
    blocks.push(m[0].trim());
  }

  const questions = [];
  for (let i = 0; i < blocks.length; i++) {
    const parsed = parseQuestionBlock(blocks[i], i + 1);
    if (parsed && parsed.questionText) {
      questions.push(parsed);
    }
  }

  return questions;
}

/**
 * Parse answer key PDF - format: 1. (c) or 1 (c) etc.
 */
export function parseAnswerKey(text) {
  const cleaned = cleanText(text);
  const answers = {};
  const lines = cleaned.split(/\n/);
  for (const line of lines) {
    const m = line.match(/^(\d+)\s*[.)\-:\s]*\s*\(?([a-dA-D])\)?\s*$/);
    if (m) {
      answers[parseInt(m[1], 10)] = m[2].toUpperCase();
    }
    const m2 = line.match(/^(\d+)\s*[.)\-:\s]+\s*([a-dA-D])\s*$/);
    if (m2 && !answers[parseInt(m2[1], 10)]) {
      answers[parseInt(m2[1], 10)] = m2[2].toUpperCase();
    }
  }
  return answers;
}
