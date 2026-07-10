/** UPSC Prelims question pattern IDs + labels (shared by notes generator & test generator). */

export const PATTERN_LABELS = {
  statement_based: "Statement-based (which are correct)",
  statement_not_correct: "Statement-based (NOT correct)",
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
    assertion: "Assertion–Reason",
    direct: "Direct conceptual",
    chronology: "Chronology",
    map: "Map/location",
    odd_one_out: "Odd one out",
  };
  return map[t] || questionType || "MCQ";
}
