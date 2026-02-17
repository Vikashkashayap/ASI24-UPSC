/**
 * Prelims PDF Service - Extract ONLY Answer Key and Explanations
 * NO question text parsing - PDF rendered as-is via react-pdf
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

export async function extractTextFromPdf(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new Error("Invalid PDF buffer");
  const data = await pdfParse(buffer, { max: 0 });
  const text = (data.text || "").trim();
  if (!text) throw new Error("No text extracted. PDF may be scanned or corrupted.");
  return { text, numPages: data.numpages || 1 };
}

function cleanText(text) {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function stripJunk(text, maxLen = 2000) {
  if (!text || typeof text !== "string") return "";
  const junkPattern = /\s*(©\s*Copyright|Copyright:|www\.\S+|Space\s+for\s+Rough\s+Work|CSE\s+20\d{2})[\s\S]*$/i;
  return text.trim().replace(junkPattern, "").trim().replace(/\n{2,}/g, "\n").substring(0, maxLen);
}

/** Parse Answer Key PDF - Format: 1. (c) or 1 (c) */
export function parseAnswerKey(text) {
  const cleaned = cleanText(text);
  const answers = {};
  for (const line of cleaned.split(/\n/)) {
    const m = line.match(/^(\d+)\s*[.)\-:\s]*\s*\(?([a-dA-D])\)?\s*$/);
    if (m) answers[parseInt(m[1], 10)] = m[2].toUpperCase();
    const m2 = line.match(/^(\d+)\s*[.)\-:\s]+\s*([a-dA-D])\s*$/);
    if (m2 && !answers[parseInt(m2[1], 10)]) answers[parseInt(m2[1], 10)] = m2[2].toUpperCase();
  }
  return answers;
}

/** Parse Explanation PDF - Format: 1. (c)\nExplanation text */
export function parseExplanationPdf(text) {
  const cleaned = cleanText(text);
  const explanations = {};
  const blockRegex = /(?:^|\n)(\d+)[.)]\s*\(?([a-dA-D])\)?\s*\n?([\s\S]*?)(?=(?:^|\n)\d+[.)]\s|$)/gim;
  let m;
  while ((m = blockRegex.exec(cleaned)) !== null) {
    const num = parseInt(m[1], 10);
    if (num >= 1 && num <= 100) explanations[num] = stripJunk((m[3] || "").trim(), 2000);
  }
  return explanations;
}
