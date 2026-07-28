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
 * Never silently falls back to an unrelated subject.
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

  // e.g. "Medieval History" / "Ancient History" → "History"
  if (/\bhistory\b/i.test(name)) {
    const history = notesSubjects.find((s) => normalizeLabel(s) === "history");
    if (history) return history;
  }

  // e.g. "Indian Economy" → "Economy"
  if (/\beconom/i.test(name) || subjectKey === "economy") {
    const eco = notesSubjects.find((s) => /econom/i.test(s));
    if (eco) return eco;
  }

  return mapped && notesSubjects.includes(mapped) ? mapped : null;
}

/**
 * Resolve Knowledge Base subject row from syllabus handoff (by key map + fuzzy name).
 */
export function resolveKbSubjectFromSyllabus<T extends { _id: string; name: string }>(
  kbSubjects: T[],
  subjectKey: string,
  subjectName: string
): T | null {
  if (!kbSubjects.length) return null;

  const mapped = SYLLABUS_KEY_TO_NOTES_SUBJECT[String(subjectKey || "").trim()];
  if (mapped) {
    const byMap = kbSubjects.find((s) => s.name.toLowerCase() === mapped.toLowerCase());
    if (byMap) return byMap;
  }

  const name = String(subjectName || "").trim();
  if (name) {
    const exact = kbSubjects.find((s) => s.name.toLowerCase() === name.toLowerCase());
    if (exact) return exact;

    const normName = normalizeLabel(name);
    const fuzzy = kbSubjects.find((s) => {
      const ns = normalizeLabel(s.name);
      return ns === normName || normName.includes(ns) || ns.includes(normName);
    });
    if (fuzzy) return fuzzy;
  }

  if (mapped) {
    const soft = kbSubjects.find((s) => normalizeLabel(s.name).includes(normalizeLabel(mapped)));
    if (soft) return soft;
  }

  if (subjectKey === "economy" || /\beconom/i.test(name)) {
    return kbSubjects.find((s) => /econom/i.test(s.name)) || null;
  }
  if (/\bhistory\b/i.test(name) || /^(ancient|medieval|modern|postind|worldhist)$/i.test(subjectKey)) {
    return kbSubjects.find((s) => normalizeLabel(s.name) === "history") || null;
  }
  if (/geo/i.test(subjectKey) || /\bgeography\b/i.test(name)) {
    return kbSubjects.find((s) => /geograph/i.test(s.name)) || null;
  }

  return null;
}

export function isSyllabusToTopicPracticeHandoff(
  value: unknown
): value is SyllabusToTopicPracticeHandoff {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return v.fromSyllabusTargets === true && typeof v.topicKeyword === "string";
}
