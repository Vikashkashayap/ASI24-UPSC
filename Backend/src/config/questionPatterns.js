/** UPSC Prelims question pattern IDs + labels (shared by notes generator & test generator). */

export const PATTERN_LABELS = {
  statement_based: "Statement-based (which are correct)",
  statement_not_correct: "Statement-based (NOT correct)",
  how_many_correct: "How many of the above statements are correct?",
  how_many_pairs: "How many of the above pairs are correctly matched?",
  pair_matching: "Pair matching / Match the following",
  assertion_reason: "Assertion–Reason",
  direct_conceptual: "Direct conceptual MCQs",
  chronology: "Chronology-based",
  sequence_arrangement: "Sequence arrangement",
  map_location: "Map/location-based",
  odd_one_out: "Odd one out",
  multi_statement_elimination: "Multi-statement elimination",
};

export const ALL_PATTERN_IDS = Object.keys(PATTERN_LABELS);

/**
 * Real UPSC CSE Prelims (PYQ) Hard mix — statements / how-many / A-R / matching.
 * Direct conceptual kept low. Soft patterns (odd one out, sequence) excluded.
 */
export const PYQ_HARD_PATTERN_IDS = [
  "statement_based",
  "statement_not_correct",
  "how_many_correct",
  "how_many_pairs",
  "multi_statement_elimination",
  "assertion_reason",
  "pair_matching",
  "chronology",
  "direct_conceptual",
];

const VALID_PATTERN_IDS = new Set(ALL_PATTERN_IDS);

export function resolveNotesPatterns(patternsToInclude = []) {
  const valid = Array.isArray(patternsToInclude)
    ? patternsToInclude.filter((id) => VALID_PATTERN_IDS.has(id))
    : [];
  return valid.length > 0 ? valid : ALL_PATTERN_IDS;
}

/** Balanced pattern mix hint for one batch (token-compact). */
export function buildBatchPatternHint(batchSize, patternsToInclude = [], batchIndex = 0) {
  const active = resolveNotesPatterns(patternsToInclude);
  const counts = new Map();

  for (let i = 0; i < batchSize; i += 1) {
    const patternId = active[(batchIndex * batchSize + i) % active.length];
    const label = PATTERN_LABELS[patternId] || patternId;
    counts.set(label, (counts.get(label) || 0) + 1);
  }

  return [...counts.entries()].map(([label, n]) => `${n}× ${label}`).join("; ");
}

export function patternLabelForQuestionType(questionType) {
  const t = String(questionType || "").toLowerCase();
  const map = {
    statement: "Statement-based",
    match: "Pair matching",
    pair: "Pair matching",
    how_many_correct: "How many statements correct",
    how_many_pairs: "How many pairs matched",
    assertion: "Assertion–Reason",
    direct: "Direct conceptual",
    chronology: "Chronology",
    map: "Map/location",
    odd_one_out: "Odd one out",
  };
  return map[t] || questionType || "MCQ";
}

/**
 * Equal-as-possible quota for a shown paper (e.g. 20Q × 8 PYQ patterns → 3/3/3/3/2/2/2/2).
 * Extra seats go to earlier patterns (statement / elimination heavy — real UPSC mix).
 */
export function buildEqualPatternQuota(total, patterns = PYQ_HARD_PATTERN_IDS) {
  const active =
    Array.isArray(patterns) && patterns.length > 0 ? [...patterns] : [...PYQ_HARD_PATTERN_IDS];
  const n = active.length;
  const quota = new Map();
  const size = Math.max(0, parseInt(total, 10) || 0);
  if (!n || size <= 0) return quota;

  if (size < n) {
    for (let i = 0; i < n; i += 1) quota.set(active[i], i < size ? 1 : 0);
    return quota;
  }

  const base = Math.floor(size / n);
  let rem = size % n;
  for (let i = 0; i < n; i += 1) {
    const extra = rem > 0 ? 1 : 0;
    if (rem > 0) rem -= 1;
    quota.set(active[i], base + extra);
  }
  return quota;
}

function stemTextOf(q) {
  return String(q?.question_en || q?.question || q?.question_hi || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Infer real UPSC pattern from stem / structured fields when LLM mislabels questionType.
 */
export function inferPatternFromQuestion(q) {
  if (!q || typeof q !== "object") return "direct_conceptual";
  const stem = stemTextOf(q);
  const opts = q.options_en || q.options || {};
  const optBlob = ["A", "B", "C", "D"].map((k) => String(opts[k] || "")).join(" ");

  const hasAR =
    Boolean(q.assertionReason?.assertion && q.assertionReason?.reason) ||
    /assertion\s*\(\s*a\s*\)|reason\s*\(\s*r\s*\)|अभिकथन|कारण/i.test(stem);
  if (hasAR) return "assertion_reason";

  const hasMatch =
    (Array.isArray(q.matchColumns?.columnA) &&
      q.matchColumns.columnA.filter((x) => String(x || "").trim()).length >= 2) ||
    /list[\s-]*i\b|match the following|su?melit|सुमेलित|which of the following pairs/i.test(stem);
  if (
    /how many of the (above )?pairs|how many pairs are correctly matched/i.test(stem) ||
    (hasMatch && /how many of the/i.test(stem) && /pair/i.test(stem))
  ) {
    return "how_many_pairs";
  }
  if (hasMatch) return "pair_matching";

  const hasChronoStruct =
    Array.isArray(q.chronologyItems) &&
    q.chronologyItems.filter((x) => String(x || "").trim()).length >= 2;
  if (
    hasChronoStruct ||
    /\bchronolog|in the (correct |right )?order|arrange the following|सही कालक्रम|सही क्रम/i.test(stem)
  ) {
    if (/sequence|arrangement|arrange the following.*(steps|process|stages)/i.test(stem)) {
      return "sequence_arrangement";
    }
    return "chronology";
  }
  if (/sequence arrangement|correct sequence|arrange.*(steps|process|stages)/i.test(stem)) {
    return "sequence_arrangement";
  }

  const numbered =
    (Array.isArray(q.statements) &&
      q.statements.filter((s) => String(s || "").trim().length >= 12).length >= 2) ||
    /(?:^|\n)\s*(?:\(?[1-5]\)?[.)])/m.test(stem) ||
    /\b[1-5]\.\s+\S/.test(stem);

  const elimOpts = /only\b|none of the above|all (of )?the above|how many of the/i.test(optBlob);
  if (numbered && (/how many of the (above|statements)|which of the statements/i.test(stem) || elimOpts)) {
    if (/not correct|incorrect|is\/are not/i.test(stem)) return "statement_not_correct";
    if (/how many of the (above )?(statements|given above)|how many of the above are correct/i.test(stem)) {
      return "how_many_correct";
    }
    if (/how many|1 and 2 only|1, 2 and 3/i.test(optBlob) || /how many of the/i.test(stem)) {
      return "multi_statement_elimination";
    }
  }
  if (numbered) {
    if (/not correct|incorrect|is\/are not\b/i.test(stem)) return "statement_not_correct";
    return "statement_based";
  }

  if (/map|located|tributary|passes through|lies in|latitude|longitude/i.test(stem)) {
    return "map_location";
  }
  if (/odd one out|does not belong/i.test(stem)) return "odd_one_out";

  const declared = String(q.questionType || q.type || "")
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (VALID_PATTERN_IDS.has(declared)) return declared;
  return "direct_conceptual";
}

/** Fix questionType labels + force Hard difficulty for chapter / PYQ papers. */
export function retagQuestionsToPyqPatterns(questions, { forceHard = true } = {}) {
  return (Array.isArray(questions) ? questions : []).map((q) => {
    const questionType = inferPatternFromQuestion(q);
    return {
      ...q,
      questionType,
      type: questionType,
      ...(forceHard ? { difficulty: "Hard" } : {}),
    };
  });
}
