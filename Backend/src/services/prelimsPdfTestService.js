/**
 * Prelims PDF Test Service
 * Parses UPSC-format bilingual (Hindi + English) Question PDF and Solution PDF.
 * Extracts only valid MCQ blocks (1-100), 4 options (a)(b)(c)(d), merges Hindi/English, maps answer key.
 */

import {
  extractTextFromPDFWithMetadata,
  splitTextIntoPages,
} from "./pdfProcessingService.js";

const QUESTION_NUM_RANGE = { min: 1, max: 100 };
const TOTAL_QUESTIONS_REQUIRED = 100;
const OPTION_KEYS = ["A", "B", "C", "D"];
const OPTION_LOWER = ["a", "b", "c", "d"];

/** Detect if text contains Devanagari (Hindi) */
const HINDI_REGEX = /[\u0900-\u097F]/;

/**
 * Try to fix text that was decoded with wrong encoding (e.g. UTF-8 bytes read as Latin-1).
 */
function ensureUtf8(text) {
  if (!text || typeof text !== "string") return text || "";
  if (/[\u0900-\u097F]/.test(text)) return text;
  try {
    const asLatin1 = Buffer.from(text, "latin1").toString("utf8");
    if (/[\u0900-\u097F]/.test(asLatin1)) return asLatin1;
  } catch (_) {}
  return text;
}

/**
 * Split mixed bilingual text into English and Hindi segments (Devanagari vs non-Devanagari runs).
 */
function splitEnglishHindi(text) {
  if (!text || !text.trim()) return { english: "", hindi: "" };
  const s = String(text);
  let english = "";
  let hindi = "";
  let i = 0;
  while (i < s.length) {
    let run = "";
    const isHindi = HINDI_REGEX.test(s[i]);
    while (i < s.length && HINDI_REGEX.test(s[i]) === isHindi) {
      run += s[i];
      i++;
    }
    if (run) {
      if (isHindi) hindi += run;
      else english += run;
    }
    if (i < s.length && !run) i++;
  }
  return { english: english.trim(), hindi: hindi.trim() };
}

/** Answer key pattern: "1. (a)" or "2. (b)" etc. */
const ANSWER_KEY_REGEX = /(\d+)\.\s*\(([a-d])\)/gi;

/**
 * Normalize option key to A/B/C/D
 */
function normalizeOptionKey(char) {
  const c = String(char).trim().toLowerCase();
  const idx = OPTION_LOWER.indexOf(c);
  return idx >= 0 ? OPTION_KEYS[idx] : null;
}

/**
 * Split full question PDF text into pages (by form feed or by estimated page length)
 */
function getPagesFromText(text, numPages = 1) {
  return splitTextIntoPages(text, numPages);
}

/**
 * Extract question number from start of a block (e.g. "1.", "2)", "Q.3", "45.")
 * Returns number 1-100 or null.
 */
function parseQuestionNumber(line) {
  const trimmed = line.trim();
  const match = trimmed.match(/^(?:Q\.?\s*)?(\d{1,3})[.)\s]/);
  if (!match) return null;
  const num = parseInt(match[1], 10);
  return num >= QUESTION_NUM_RANGE.min && num <= QUESTION_NUM_RANGE.max
    ? num
    : null;
}

/**
 * Find option markers: (a) (b) (c) (d), or a. b. c. d., or a) b) c) d). Returns array of { key, startIndex, endIndex } in A,B,C,D order.
 */
function findOptionMarkers(text) {
  const all = [];
  const patterns = [
    { re: /\(([a-dA-D])\)/g, len: (m) => m[0].length },
    { re: /\b([a-dA-D])\.\s+/g, len: (m) => m[0].length },
    { re: /\b([a-dA-D])\)\s+/g, len: (m) => m[0].length },
  ];
  for (const { re, len } of patterns) {
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(text)) !== null) {
      const key = normalizeOptionKey(m[1]);
      if (key) all.push({ key, startIndex: m.index, endIndex: m.index + len(m) });
    }
  }
  all.sort((a, b) => a.startIndex - b.startIndex);
  const ordered = [];
  let lastIdx = -1;
  for (const want of ["A", "B", "C", "D"]) {
    const found = all.find((x) => x.key === want && x.startIndex > lastIdx);
    if (!found) return [];
    ordered.push(found);
    lastIdx = found.startIndex;
  }
  return ordered;
}

/**
 * Extract option text between current option marker and next marker or end.
 */
function getOptionText(text, startIndex, nextStartIndex) {
  const slice = nextStartIndex != null
    ? text.slice(startIndex, nextStartIndex)
    : text.slice(startIndex);
  const cleaned = slice
    .replace(/^\([a-dA-D]\)\s*/i, "")
    .replace(/^[a-dA-D][.)]\s*/i, "")
    .replace(/\s*\(\s*\)\s*$/, "")
    .trim();
  return cleaned;
}

/**
 * Parse one block of text into a single MCQ (question stem + 4 options).
 * Block must start with question number 1-100 and contain exactly 4 options (a)(b)(c)(d).
 */
function parseOneMcqBlock(blockText, defaultQuestionNum = null) {
  const trimmedBlock = blockText.trim();
  const lines = trimmedBlock.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const firstLine = lines[0] || "";
  let questionNum = parseQuestionNumber(firstLine) ?? parseQuestionNumber(trimmedBlock.slice(0, 50)) ?? defaultQuestionNum;
  if (questionNum == null || questionNum < 1 || questionNum > 100) return null;

  const optionMarkers = findOptionMarkers(trimmedBlock);
  if (optionMarkers.length !== 4) return null;

  const questionStemEnd = optionMarkers[0].startIndex;
  let questionStem = trimmedBlock.slice(0, questionStemEnd).trim();
  questionStem = questionStem.replace(/^(?:Q\.?\s*)?\d{1,3}[.)]\s*/i, "").trim();

  const options = [];
  for (let i = 0; i < 4; i++) {
    const nextStart = i < 3 ? optionMarkers[i + 1].startIndex : null;
    const optText = getOptionText(trimmedBlock, optionMarkers[i].startIndex, nextStart);
    options.push({
      key: optionMarkers[i].key,
      text: optText,
    });
  }

  return {
    questionNumber: questionNum,
    questionText: questionStem,
    options,
  };
}

/**
 * Split page text into potential MCQ blocks (by question number start 1-100).
 * Supports: start of text, newline(s), or double-newline before "1." / "1)" / "Q.1".
 */
function splitPageIntoMcqBlocks(pageText) {
  const indices = [];
  const questionStartRegex = /(?:^|[\r\n]+)\s*(?:Q\.?\s*)?(\d{1,3})[.)]\s/g;
  let match;
  while ((match = questionStartRegex.exec(pageText)) !== null) {
    const num = parseInt(match[1], 10);
    if (num >= QUESTION_NUM_RANGE.min && num <= QUESTION_NUM_RANGE.max) {
      indices.push({ index: match.index, num });
    }
  }
  const blocks = [];
  for (let i = 0; i < indices.length; i++) {
    const start = indices[i].index;
    const end = i + 1 < indices.length ? indices[i + 1].index : pageText.length;
    const block = pageText.slice(start, end).trim();
    if (block.length > 15) blocks.push(block);
  }
  return blocks;
}

/**
 * Extract all valid MCQ blocks from question PDF text (page-wise).
 * Splits mixed Hindi/English text into separate fields and merges by question number.
 */
function extractAndMergeMcqs(pages) {
  const byNumber = new Map();

  for (const page of pages) {
    const blocks = splitPageIntoMcqBlocks(page.text);
    for (const block of blocks) {
      const mcq = parseOneMcqBlock(block);
      if (!mcq) continue;

      const questionText = splitEnglishHindi(mcq.questionText);
      const options = mcq.options.map((opt) => ({
        key: opt.key,
        ...splitEnglishHindi(opt.text),
      }));

      if (byNumber.has(mcq.questionNumber)) {
        const existing = byNumber.get(mcq.questionNumber);
        if (!existing.questionText.english && questionText.english)
          existing.questionText.english = questionText.english;
        if (!existing.questionText.hindi && questionText.hindi)
          existing.questionText.hindi = questionText.hindi;
        existing.options.forEach((o, i) => {
          const no = options[i];
          if (no && !o.english && no.english) o.english = no.english;
          if (no && !o.hindi && no.hindi) o.hindi = no.hindi;
        });
      } else {
        byNumber.set(mcq.questionNumber, {
          questionNumber: mcq.questionNumber,
          questionText,
          options,
        });
      }
    }
  }

  return Array.from(byNumber.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, v]) => v);
}

/**
 * Parse solution PDF and extract answer key: Map<questionNumber, correctAnswer>
 */
export async function parseSolutionPdf(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error("Invalid solution PDF buffer");
  }
  const result = await extractTextFromPDFWithMetadata(buffer);
  if (!result.success) {
    throw new Error(result.error || "Failed to parse solution PDF");
  }
  const text = (result.text || "").replace(/\s+/g, " ").trim();
  const answers = new Map();
  let m;
  const re = new RegExp(ANSWER_KEY_REGEX.source, "gi");
  while ((m = re.exec(text)) !== null) {
    const num = parseInt(m[1], 10);
    if (num >= 1 && num <= 100) {
      const key = normalizeOptionKey(m[2]);
      if (key) answers.set(num, key);
    }
  }
  return answers;
}

/**
 * Parse question PDF: extract text page-wise, extract only valid MCQs (1-100, 4 options), separate Hindi/English, merge by question number.
 */
export async function parseQuestionPdfToMcqs(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error("Invalid question PDF buffer");
  }
  const result = await extractTextFromPDFWithMetadata(buffer);
  if (!result.success) {
    throw new Error(result.error || "Failed to parse question PDF");
  }
  let text = result.text || "";
  text = ensureUtf8(text);
  const numPages = result.numPages ?? result.numpages ?? 1;
  const pages = getPagesFromText(text, numPages);
  const mcqs = extractAndMergeMcqs(pages);
  return mcqs;
}

/**
 * Build structured payload for PrelimsPdfTest: merge question PDF MCQs with solution PDF answer key.
 * Uses all question numbers that have BOTH a valid MCQ and an answer (1–100 allowed). If none, throws.
 */
export async function buildPrelimsPdfTestPayload(
  questionPdfBuffer,
  solutionPdfBuffer,
  meta = {}
) {
  const [mcqs, answerMap] = await Promise.all([
    parseQuestionPdfToMcqs(questionPdfBuffer),
    parseSolutionPdf(solutionPdfBuffer),
  ]);

  const byNum = new Map(mcqs.map((m) => [m.questionNumber, m]));

  const validNums = [];
  for (let n = 1; n <= QUESTION_NUM_RANGE.max; n++) {
    if (byNum.has(n) && answerMap.has(n)) validNums.push(n);
  }

  if (validNums.length === 0) {
    throw new Error(
      `No valid questions with answer key found. Extracted ${mcqs.length} MCQs and ${answerMap.size} answers from PDFs. Ensure question PDF has MCQs (1–100 with (a)(b)(c)(d)) and solution PDF has lines like "1. (a)".`
    );
  }

  const questions = [];
  for (let i = 0; i < validNums.length; i++) {
    const n = validNums[i];
    const mcq = byNum.get(n);
    const correctAnswer = answerMap.get(n);
    if (mcq.options.length !== 4) continue;
    questions.push({
      questionNumber: i + 1,
      questionText: {
        english: mcq.questionText.english || "",
        hindi: mcq.questionText.hindi || "",
      },
      options: mcq.options.map((o) => ({
        key: o.key,
        english: o.english || "",
        hindi: o.hindi || "",
      })),
      correctAnswer,
      explanation: "",
    });
  }

  if (questions.length === 0) {
    throw new Error(
      `No questions with 4 options found. Extracted ${mcqs.length} MCQs. Check that each block has (a)(b)(c)(d) options.`
    );
  }

  return {
    title: meta.title || "PDF Prelims Test",
    duration: meta.duration ?? 120,
    negativeMarking: meta.negativeMarking ?? 0.66,
    startTime: meta.startTime ? new Date(meta.startTime) : new Date(),
    endTime: meta.endTime ? new Date(meta.endTime) : new Date(Date.now() + 24 * 60 * 60 * 1000),
    totalQuestions: questions.length,
    questions,
  };
}
