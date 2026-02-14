import * as XLSX from "xlsx";
import ExcelTest from "../models/ExcelTest.js";
import ExcelTestQuestion from "../models/ExcelTestQuestion.js";

/** Column index mapping (first row = header, ignored by name). */
const COL = {
  questionText: 0,
  optionA: 1,
  optionB: 2,
  optionC: 3,
  optionD: 4,
  correctAnswer: 5,
  explanation: 6,
};

/**
 * Safe value cleaner: trim and coerce to string. Handles null, undefined, numbers, dates.
 * @param {*} value
 * @returns {string}
 */
export function cleanCell(value) {
  if (value == null || value === "") return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && !Number.isNaN(value)) return String(value).trim();
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value instanceof Date) return value.toISOString().trim();
  return String(value).trim();
}

/**
 * Parse first sheet using raw arrays. First row is treated as header (ignored for names).
 * Uses column INDEX only: [0]=questionText, [1]=optionA, [2]=optionB, [3]=optionC, [4]=optionD, [5]=correctAnswer, [6]=explanation.
 * @param {Buffer} buffer
 * @returns {{ rows: Array<Array<string>>, error?: string }}
 */
export function parseExcelFirstSheet(buffer) {
  try {
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return { rows: [], error: "No sheet found in Excel file" };
    }
    const sheet = workbook.Sheets[firstSheetName];
    const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    if (!raw || !Array.isArray(raw) || raw.length < 2) {
      return { rows: [], error: "No data rows in first sheet (need at least header + 1 row)" };
    }
    const [headerRow, ...dataRows] = raw;
    const rows = dataRows
      .map((row) => (Array.isArray(row) ? row : []))
      .map((row) => row.map((cell) => cleanCell(cell)));
    return { rows };
  } catch (err) {
    return {
      rows: [],
      error: err.message || "Failed to parse Excel file",
    };
  }
}

/**
 * Check if a data row is empty (all cells empty after trim).
 * @param {string[]} row
 * @returns {boolean}
 */
function isEmptyRow(row) {
  if (!row || row.length === 0) return true;
  return row.every((cell) => cleanCell(cell) === "");
}

/**
 * Normalize correctAnswer to A/B/C/D. Accepts letters (a,b,c,d,A-D) or numbers (1→A, 2→B, 3→C, 4→D).
 * @param {string} raw
 * @returns {string} "A" | "B" | "C" | "D" | ""
 */
function normalizeCorrectAnswer(raw) {
  const s = cleanCell(raw);
  if (!s) return "";
  const first = s.charAt(0).toUpperCase();
  if (["A", "B", "C", "D"].includes(first)) return first;
  const num = parseInt(s, 10);
  if (num >= 1 && num <= 4) return ["A", "B", "C", "D"][num - 1];
  return "";
}

/** Possible column indices where correctAnswer may appear (e.g. Col C: Ans = index 2). */
const CORRECT_ANSWER_INDICES = [5, 2, 3, 4, 6, 1, 0];

/**
 * Find first valid A/B/C/D from row, checking common column positions.
 * @param {string[]} row
 * @param {(i: number) => string} get
 * @returns {string} "A"|"B"|"C"|"D" or ""
 */
function findCorrectAnswer(row, get) {
  for (const idx of CORRECT_ANSWER_INDICES) {
    const value = normalizeCorrectAnswer(get(idx));
    if (value) return value;
  }
  return "";
}

/**
 * Map a single row array to question object by column index.
 * Indices: 0=questionText, 1=optionA, 2=optionB, 3=optionC, 4=optionD, 5=correctAnswer, 6=explanation.
 * correctAnswer is also read from index 2 (Col C: Ans) if index 5 is empty.
 * @param {string[]} row
 * @param {number} questionNumber
 */
export function rowArrayToQuestion(row, questionNumber) {
  const get = (index) => (row && row[index] !== undefined ? cleanCell(row[index]) : "");
  const correctAnswer = findCorrectAnswer(row, get);
  return {
    questionNumber,
    questionText: get(COL.questionText),
    options: [
      { key: "A", text: get(COL.optionA) },
      { key: "B", text: get(COL.optionB) },
      { key: "C", text: get(COL.optionC) },
      { key: "D", text: get(COL.optionD) },
    ],
    correctAnswer,
    explanation: get(COL.explanation),
  };
}

/**
 * Validate parsed questions. Throws only for:
 * - Less than 1 valid question
 * - Any question with fewer than 4 non-empty options
 * - Any question with missing correctAnswer (we default to "A", so this is satisfied if we have at least one valid question)
 * @param {Array<{ questionText: string, options: Array<{key: string, text: string}>, correctAnswer: string }>} questions
 * @returns {{ valid: true } | { valid: false, message: string }}
 */
export function validateParsedQuestions(questions) {
  if (!questions || questions.length === 0) {
    return { valid: false, message: "At least one valid question is required" };
  }
  const optionKeys = ["A", "B", "C", "D"];
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const nonEmptyOptions = (q.options || []).filter((o) => o && cleanCell(o.text) !== "");
    if (nonEmptyOptions.length < 4) {
      return {
        valid: false,
        message: `Question ${i + 1}: at least 4 options (A, B, C, D) are required. Found ${nonEmptyOptions.length}.`,
      };
    }
    if (!q.correctAnswer || !optionKeys.includes(q.correctAnswer)) {
      return {
        valid: false,
        message: q.correctAnswer === ""
          ? `Question ${i + 1}: correctAnswer is missing. Column index ${COL.correctAnswer + 1} must be A, B, C, or D.`
          : `Question ${i + 1}: correctAnswer must be A, B, C, or D.`,
      };
    }
  }
  return { valid: true };
}

/**
 * Create Excel test and persist questions.
 * Uses index-based parsing only; header names are ignored.
 * @param {Object} params
 * @param {string} params.title
 * @param {number} params.durationMinutes
 * @param {Date} params.startTime
 * @param {Date} params.endTime
 * @param {number} params.negativeMarking
 * @param {string} params.createdBy - admin user id
 * @param {Buffer} params.excelBuffer
 */
export async function createExcelTestFromFile({
  title,
  durationMinutes,
  startTime,
  endTime,
  negativeMarking = 0.33,
  createdBy,
  excelBuffer,
}) {
  const { rows, error } = parseExcelFirstSheet(excelBuffer);
  if (error) {
    return { success: false, message: error };
  }

  const dataRows = rows.filter((row) => !isEmptyRow(row));
  if (dataRows.length === 0) {
    return { success: false, message: "No valid question rows in Excel (all rows are empty)" };
  }

  const questions = dataRows.map((row, index) =>
    rowArrayToQuestion(row, index + 1)
  );

  const validation = validateParsedQuestions(questions);
  if (!validation.valid) {
    return { success: false, message: validation.message };
  }

  const test = new ExcelTest({
    title,
    durationMinutes,
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    negativeMarking: Number(negativeMarking) || 0.33,
    createdBy: createdBy || null,
    testType: "EXCEL_BASED",
    totalQuestions: questions.length,
  });
  await test.save();

  const questionsToInsert = questions.map((q) => ({
    testId: test._id,
    ...q,
  }));

  await ExcelTestQuestion.insertMany(questionsToInsert);

  return {
    success: true,
    data: {
      _id: test._id,
      title: test.title,
      durationMinutes: test.durationMinutes,
      startTime: test.startTime,
      endTime: test.endTime,
      negativeMarking: test.negativeMarking,
      totalQuestions: test.totalQuestions,
      createdAt: test.createdAt,
    },
  };
}
