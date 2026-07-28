/** UPSC Prelims pattern heuristics (no LLM). */

const PATTERNS = [
  {
    id: "assertion_reason",
    label: "Assertion-Reason",
    test: (t) => /assertion|reason|a\s*is\s*true|both.*correct/i.test(t),
  },
  {
    id: "matching",
    label: "Matching List",
    test: (t) => /match\s+(the\s+)?following|list\s*[-–]?\s*i|codes?\s*:/i.test(t),
  },
  {
    id: "multi_statement",
    label: "Multi-statement",
    test: (t) =>
      /which\s+of\s+the\s+following\s+statements?|consider\s+the\s+following/i.test(t) &&
      /\b(1|2|3)\b/.test(t),
  },
  {
    id: "chronology",
    label: "Chronology",
    test: (t) => /chronolog|correct\s+sequence|arrange.*order/i.test(t),
  },
  {
    id: "pair",
    label: "Incorrect/Correct Pair",
    test: (t) => /which.*pair|incorrectly\s+matched|correctly\s+matched/i.test(t),
  },
  {
    id: "factual",
    label: "Factual Direct",
    test: () => true, // fallback
  },
];

export function detectPattern(questionText) {
  const t = String(questionText || "");
  for (const p of PATTERNS) {
    if (p.id === "factual") continue;
    if (p.test(t)) return { id: p.id, label: p.label };
  }
  return { id: "factual", label: "Factual Direct" };
}

export function analyzePatterns(questions = []) {
  const counts = {};
  const detailed = questions.map((q) => {
    const text = q.questionText || q.question || q.question_en || "";
    const pattern = detectPattern(text);
    counts[pattern.id] = (counts[pattern.id] || 0) + 1;
    return { ...q, pattern: pattern.id, patternLabel: pattern.label };
  });
  return { counts, questions: detailed };
}

export function preferredPatternsForTopic(topic = "") {
  const t = topic.toLowerCase();
  if (/history|ancient|medieval|modern/.test(t)) return ["chronology", "factual", "matching"];
  if (/polity|constitution|parliament/.test(t)) return ["multi_statement", "assertion_reason", "factual"];
  if (/economy|gdp|inflation|budget/.test(t)) return ["factual", "multi_statement"];
  if (/environment|climate|biodiversity/.test(t)) return ["multi_statement", "pair", "factual"];
  if (/geography|monsoon|river/.test(t)) return ["factual", "matching", "multi_statement"];
  return ["factual", "multi_statement", "assertion_reason"];
}
