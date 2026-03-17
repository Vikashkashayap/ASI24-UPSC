/**
 * Test Generator constants – single source of truth for subjects and exam types.
 */

export const SUBJECTS = [
  "Polity",
  "History",
  "Geography",
  "Economy",
  "Environment",
  "Science & Tech",
  "Art & Culture",
  "Current Affairs",
  "CSAT",
] as const;

export type SubjectType = (typeof SUBJECTS)[number];

/** GS subjects (cannot be mixed with CSAT) */
export const GS_SUBJECTS = [
  "Polity",
  "History",
  "Geography",
  "Economy",
  "Environment",
  "Science & Tech",
  "Art & Culture",
  "Current Affairs",
] as const;

export const CSAT_CATEGORIES = [
  "Quantitative Aptitude",
  "Logical Reasoning",
  "Reading Comprehension",
  "Data Interpretation",
] as const;

export type ExamType = "GS" | "CSAT";

/** UPSC Prelims question patterns for mock scheduling (patterns to include). */
export const PRELIM_MOCK_PATTERNS = [
  { id: "statement_based", label: "Statement-based questions" },
  { id: "statement_not_correct", label: "Statement-based (NOT correct)" },
  { id: "pair_matching", label: "Pair matching questions" },
  { id: "assertion_reason", label: "Assertion–Reason questions" },
  { id: "direct_conceptual", label: "Direct conceptual MCQs" },
  { id: "chronology", label: "Chronology-based questions" },
  { id: "sequence_arrangement", label: "Sequence arrangement questions" },
  { id: "map_location", label: "Map/location-based questions" },
  { id: "odd_one_out", label: "Odd one out questions" },
  { id: "multi_statement_elimination", label: "Multi-statement elimination questions" },
] as const;

export type PrelimMockPatternId = (typeof PRELIM_MOCK_PATTERNS)[number]["id"];

export const QUESTION_COUNTS = [5, 10, 20] as const;
export const DIFFICULTY_LEVELS = ["Easy", "Moderate", "Hard"] as const;
