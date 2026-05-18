/**
 * DART – Daily Activity & Reflection Tracker
 * UPSC subject lists and student categories.
 */

export const DART_CATEGORIES = [
  { value: "full_time", label: "Full Time Aspirant" },
  { value: "working_professional", label: "Working Professional / College Student" },
] as const;

export const DART_PRELIMS_SUBJECTS = [
  "Polity",
  "Modern History",
  "Ancient History",
  "Medieval History",
  "World History",
  "Geography",
  "Indian Geography",
  "Economics",
  "Science & Tech",
  "Environment & Ecology",
  "International Relations",
  "Governance",
  "Social Justice",
  "Internal Security",
  "CSAT",
] as const;

export const DART_MAINS_SUBJECTS = [
  "Ethics",
  "Essay Writing",
  "Optional Paper",
  "Art & Culture",
  "Current Affairs",
  "Not in the List (Custom input)",
] as const;

export const DART_ALL_SUBJECTS = [
  ...DART_PRELIMS_SUBJECTS,
  ...DART_MAINS_SUBJECTS,
] as const;

export const EMOTIONAL_STATUS_OPTIONS = [
  "Good",
  "Stressed",
  "Anxious",
  "Motivated",
  "Tired",
  "Neutral",
  "Overwhelmed",
  "Confident",
] as const;

export const PHYSICAL_HEALTH_OPTIONS = [
  "Good",
  "Tired",
  "Unwell",
  "Recovering",
  "Normal",
] as const;

export type DartCategory = (typeof DART_CATEGORIES)[number]["value"];
export type DartSubject = (typeof DART_ALL_SUBJECTS)[number];
