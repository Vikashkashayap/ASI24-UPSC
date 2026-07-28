/**
 * Structural validators for UPSC MCQs.
 */

import {
  countSubstantiveLetterItems,
  countSubstantiveNumberedItems,
  isCompleteUpscStem,
  isPlaceholderItemText,
} from "../../ai/stemQuality.js";

function hasLetterAndNumberLists(text) {
  return countSubstantiveLetterItems(text) >= 2 && countSubstantiveNumberedItems(text) >= 2;
}

function optionsReferToNumberedItems(options = {}) {
  const vals = ["A", "B", "C", "D"].map((k) => String(options[k] || "")).join(" ").toLowerCase();
  return (
    /\b1\s+and\s+2\b/.test(vals) ||
    /\b1\s+only\b/.test(vals) ||
    /\b1,\s*2\b/.test(vals) ||
    /\b1-2-3/.test(vals) ||
    /\b1,\s*2,\s*3\b/.test(vals) ||
    /\b1\s+and\s+3\b/.test(vals) ||
    /\b\d+\s*[-–]\s*\d+/.test(vals)
  );
}

export function normalizeOptions(raw) {
  const options = { A: "", B: "", C: "", D: "" };
  if (Array.isArray(raw)) {
    ["A", "B", "C", "D"].forEach((k, i) => {
      const s = String(raw[i] || "").trim();
      options[k] = isPlaceholderItemText(s) ? "" : s;
    });
  } else if (raw && typeof raw === "object") {
    for (const k of ["A", "B", "C", "D"]) {
      const s = String(raw[k] ?? raw[k.toLowerCase()] ?? "").trim();
      options[k] = isPlaceholderItemText(s) ? "" : s;
    }
  }
  return options;
}

export function normalizeCorrectAnswer(raw) {
  let correct = String(raw ?? "").toUpperCase().trim().charAt(0);
  if (["1", "2", "3", "4"].includes(correct)) {
    correct = ["A", "B", "C", "D"][parseInt(correct, 10) - 1];
  }
  return ["A", "B", "C", "D"].includes(correct) ? correct : null;
}

export { isCompleteUpscStem, hasLetterAndNumberLists, optionsReferToNumberedItems };

export function validateQuestionStructure(q) {
  const errors = [];
  const options = normalizeOptions(q?.options);
  const type = String(q?.questionType || "").toLowerCase();
  const stem = String(q?.question || q?.question_en || "");
  const isChrono =
    type.includes("chronolog") ||
    type.includes("sequence") ||
    /arrange the following|chronological order/i.test(stem);
  const requiredKeys = isChrono ? ["A", "B", "C"] : ["A", "B", "C", "D"];
  const filled = requiredKeys.filter((k) => options[k].length >= 1);
  if (filled.length < requiredKeys.length) errors.push("incomplete_options");

  const norms = filled.map((k) => options[k].toLowerCase().replace(/\s+/g, " "));
  if (new Set(norms).size !== norms.length) errors.push("duplicate_options");

  // Weak distractors: tiny or near-identical lengthless stubs (except code-style options)
  const codeLike = /^(?:\d+(?:\s*(?:and|,|only|[-–])\s*\d+)*.*|none of the above|all of the above)$/i;
  for (const k of filled) {
    const t = options[k];
    if (codeLike.test(t)) continue;
    if (t.split(/\s+/).filter(Boolean).length < 2 && t.length < 8) {
      errors.push("weak_option_text");
      break;
    }
  }

  const correct = normalizeCorrectAnswer(q?.correctAnswer ?? q?.answer);
  if (!correct) errors.push("missing_correct_answer");
  if (correct && !requiredKeys.includes(correct)) errors.push("correct_answer_out_of_range");
  if (correct && !options[correct]) errors.push("correct_answer_empty");

  // Chronology UI uses 3 codes; pad D so storage stays consistent
  if (isChrono && options.A && options.B && options.C && !options.D) {
    options.D = "None of the above";
  }

  const candidate = { ...q, options, correctAnswer: correct };
  if (!isCompleteUpscStem(candidate)) errors.push("incomplete_stem");

  return {
    ok: errors.length === 0,
    errors,
    options,
    correctAnswer: correct,
  };
}

export default {
  normalizeOptions,
  normalizeCorrectAnswer,
  isCompleteUpscStem,
  validateQuestionStructure,
};
