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

export const QUESTION_COUNTS = [5, 10, 20] as const;
export const DIFFICULTY_LEVELS = ["Easy", "Moderate", "Hard"] as const;
