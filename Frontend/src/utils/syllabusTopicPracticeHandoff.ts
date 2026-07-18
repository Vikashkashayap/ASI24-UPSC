/** Navigation state: Syllabus Targets → Topic Practice */
export interface SyllabusToTopicPracticeHandoff {
  fromSyllabusTargets: true;
  subjectKey: string;
  subjectName: string;
  topicKeyword: string;
  testName: string;
  moduleIds: string[];
  moduleLabels: string[];
  chapterNames: string[];
  studentIds: string[];
  /** Assignment / generation medium preference */
  medium?: "en" | "hi";
}

/** Map foundation syllabus subject keys → Notes / Knowledge Base subjects. */
const SYLLABUS_KEY_TO_NOTES_SUBJECT: Record<string, string> = {
  polity: "Polity",
  ancient: "History",
  medieval: "History",
  modern: "History",
  postind: "History",
  worldhist: "History",
  artculture: "Art & Culture",
  indgeo: "Geography",
  worldgeo: "Geography",
  economy: "Economy",
  environment: "Environment",
  ir: "International Relations",
  intsec: "Internal Security",
  society: "Society",
  governance: "Governance",
  socialjustice: "Governance",
  ethics: "Ethics",
  scitech: "Science & Tech",
};

function normalizeLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Resolve the best Notes subject for a syllabus handoff.
 * Prefers explicit key map, then exact / fuzzy name match against available notes subjects.
 */
export function resolveNotesSubjectFromSyllabus(
  notesSubjects: string[],
  subjectKey: string,
  subjectName: string
): string | null {
  if (!notesSubjects.length) return null;

  const mapped = SYLLABUS_KEY_TO_NOTES_SUBJECT[String(subjectKey || "").trim()];
  if (mapped && notesSubjects.includes(mapped)) return mapped;

  const name = String(subjectName || "").trim();
  if (!name) return mapped && notesSubjects.includes(mapped) ? mapped : null;

  const exact = notesSubjects.find((s) => s.toLowerCase() === name.toLowerCase());
  if (exact) return exact;

  const normName = normalizeLabel(name);
  const fuzzy = notesSubjects.find((s) => {
    const ns = normalizeLabel(s);
    return ns === normName || normName.includes(ns) || ns.includes(normName);
  });
  if (fuzzy) return fuzzy;

  // e.g. "Medieval History" → "History"
  if (/\bhistory\b/i.test(name)) {
    const history = notesSubjects.find((s) => normalizeLabel(s) === "history");
    if (history) return history;
  }

  return mapped && notesSubjects.includes(mapped) ? mapped : null;
}

export function isSyllabusToTopicPracticeHandoff(
  value: unknown
): value is SyllabusToTopicPracticeHandoff {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return v.fromSyllabusTargets === true && typeof v.topicKeyword === "string";
}
