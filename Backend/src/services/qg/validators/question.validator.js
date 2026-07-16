/**
 * Structural validators for UPSC MCQs.
 */

function countNumberedItems(text) {
  return (String(text || "").match(/(?:^|\n)\s*\d+[.)]\s+\S+/g) || []).length;
}

function hasLetterAndNumberLists(text) {
  const t = String(text || "");
  const letters = (t.match(/(?:^|\n)\s*[A-D][.)]\s+\S+/gi) || []).length;
  const numbers = countNumberedItems(t);
  return letters >= 2 && numbers >= 2;
}

function optionsReferToNumberedItems(options = {}) {
  const vals = ["A", "B", "C", "D"].map((k) => String(options[k] || "")).join(" ").toLowerCase();
  return (
    /\b1\s+and\s+2\b/.test(vals) ||
    /\b1\s+only\b/.test(vals) ||
    /\b1,\s*2\b/.test(vals) ||
    /\b1-2-3/.test(vals) ||
    /\b1,\s*2,\s*3\b/.test(vals) ||
    /\b1\s+and\s+3\b/.test(vals)
  );
}

export function normalizeOptions(raw) {
  const options = { A: "", B: "", C: "", D: "" };
  if (Array.isArray(raw)) {
    ["A", "B", "C", "D"].forEach((k, i) => {
      options[k] = String(raw[i] || "").trim();
    });
  } else if (raw && typeof raw === "object") {
    for (const k of ["A", "B", "C", "D"]) {
      options[k] = String(raw[k] ?? raw[k.toLowerCase()] ?? "").trim();
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

export function isCompleteUpscStem(q) {
  const text = String(q.question || "").replace(/\\n/g, "\n").trim();
  if (text.length < 25) return false;

  const type = String(q.questionType || "").toLowerCase();
  const opts = q.options || {};
  const needsNumbers = optionsReferToNumberedItems(opts);

  const looksMatch =
    type.includes("pair") ||
    type.includes("match") ||
    /match\s+(the\s+)?following|consider the following pairs/i.test(text);
  const looksAR = type.includes("assertion") || /assertion\s*\(A\)/i.test(text);
  const looksChrono =
    type.includes("chronolog") ||
    type.includes("sequence") ||
    /arrange the following|chronological order/i.test(text);
  const looksStatement =
    type.includes("statement") ||
    /consider the following statements|which of the following statements/i.test(text);

  if (
    /^(match the following|arrange the following[\s\S]{0,80}|consider the following statements[\s\S]{0,80})\s*:?\s*$/i.test(
      text
    )
  ) {
    return false;
  }

  if (looksMatch) {
    const a = q.matchColumns?.columnA || [];
    const b = q.matchColumns?.columnB || [];
    if (a.filter((x) => String(x || "").trim()).length >= 2 && b.filter((x) => String(x || "").trim()).length >= 2) {
      return true;
    }
    return hasLetterAndNumberLists(text);
  }

  if (looksAR) {
    if (q.assertionReason?.assertion?.length >= 15 && q.assertionReason?.reason?.length >= 15) return true;
    return /assertion\s*\(A\)\s*:\s*.+\S/i.test(text) && /reason\s*\(R\)\s*:\s*.+\S/i.test(text);
  }

  if (looksChrono || looksStatement || needsNumbers) {
    return countNumberedItems(text) >= 2;
  }

  return true;
}

export function validateQuestionStructure(q) {
  const errors = [];
  if (!q || !String(q.question || "").trim()) errors.push("missing_question");

  const options = normalizeOptions(q?.options);
  const filled = ["A", "B", "C", "D"].filter((k) => options[k].length >= 1);
  if (filled.length < 4) errors.push("incomplete_options");

  const norms = filled.map((k) => options[k].toLowerCase().replace(/\s+/g, " "));
  if (new Set(norms).size !== norms.length) errors.push("duplicate_options");

  const correct = normalizeCorrectAnswer(q?.correctAnswer ?? q?.answer);
  if (!correct) errors.push("invalid_correct_answer");
  if (correct && !options[correct]) errors.push("correct_answer_empty");

  const candidate = { ...q, options, correctAnswer: correct };
  if (!isCompleteUpscStem(candidate)) errors.push("incomplete_stem");

  // Obvious distractor heuristics
  const obvious = ["all of the above", "none of the above", "cannot be determined"];
  const obviousCount = norms.filter((o) => obvious.some((x) => o === x || o.includes(x))).length;
  if (obviousCount >= 2) errors.push("weak_distractors");

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
