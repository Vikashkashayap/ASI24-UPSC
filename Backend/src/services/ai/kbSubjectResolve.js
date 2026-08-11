/**
 * Map syllabus / student subject labels → Admin KB subject names.
 * Targets use "Ancient History"; uploads are often tagged simply "History".
 */

export const KB_SUBJECT_ALIASES = {
  polity: ["Polity", "Indian Polity"],
  "indian polity": ["Polity", "Indian Polity"],
  history: [
    "History",
    "Ancient History",
    "Medieval History",
    "Modern History",
    "World History",
  ],
  "ancient history": ["History", "Ancient History"],
  ancient: ["History", "Ancient History"],
  "medieval history": ["History", "Medieval History"],
  medieval: ["History", "Medieval History"],
  "modern history": ["History", "Modern History"],
  modern: ["History", "Modern History"],
  "world history": ["History", "World History"],
  worldhist: ["History", "World History"],
  postind: ["History", "Modern History"],
  "post independence": ["History", "Modern History"],
  geography: ["Geography", "Indian Geography", "World Geography"],
  indgeo: ["Geography", "Indian Geography"],
  worldgeo: ["Geography", "World Geography"],
  "indian geography": ["Geography", "Indian Geography"],
  "world geography": ["Geography", "World Geography"],
  economy: ["Economy", "Indian Economy"],
  "indian economy": ["Economy", "Indian Economy"],
  environment: ["Environment", "Ecology", "Environment & Ecology"],
  ecology: ["Environment", "Ecology", "Environment & Ecology"],
  "science & tech": ["Science & Tech", "Science and Technology", "Science & Technology"],
  "science and technology": ["Science & Tech", "Science and Technology", "Science & Technology"],
  scitech: ["Science & Tech", "Science and Technology"],
  "art & culture": ["Art & Culture", "Art and Culture"],
  "art and culture": ["Art & Culture", "Art and Culture"],
  artculture: ["Art & Culture", "Art and Culture"],
  "current affairs": ["Current Affairs"],
  "international relations": ["International Relations"],
  ir: ["International Relations"],
  "internal security": ["Internal Security"],
  intsec: ["Internal Security"],
  society: ["Society"],
  governance: ["Governance"],
  socialjustice: ["Governance"],
  ethics: ["Ethics"],
};

/** Syllabus subjectKey → canonical KB upload subject */
export const SYLLABUS_KEY_TO_KB_SUBJECT = {
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

function escapeRegex(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeLabel(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Expand a subject label into all KB names that should match in retrieval.
 * Canonical parent (History) is listed first so filters prefer generic uploads.
 */
export function expandKbSubjectAliases(subject) {
  const raw = String(subject || "").trim();
  if (!raw) return [];

  const key = raw.toLowerCase();
  const out = [];
  const push = (name) => {
    const n = String(name || "").trim();
    if (!n) return;
    if (!out.some((x) => x.toLowerCase() === n.toLowerCase())) out.push(n);
  };

  if (KB_SUBJECT_ALIASES[key]) {
    for (const a of KB_SUBJECT_ALIASES[key]) push(a);
  } else if (/\bhistory\b/i.test(raw)) {
    for (const a of KB_SUBJECT_ALIASES.history) push(a);
  } else if (/\bgeograph/i.test(raw)) {
    for (const a of KB_SUBJECT_ALIASES.geography) push(a);
  } else if (/\beconom/i.test(raw)) {
    for (const a of KB_SUBJECT_ALIASES.economy) push(a);
  }

  push(raw);
  return out;
}

/**
 * Sync map: syllabus key/name → preferred KB subject string used for generation.
 * Prefer canonical upload labels (History, not Ancient History).
 */
export function resolveKbSubjectLabel(subjectKey, subjectName) {
  const key = String(subjectKey || "").trim().toLowerCase();
  if (SYLLABUS_KEY_TO_KB_SUBJECT[key]) return SYLLABUS_KEY_TO_KB_SUBJECT[key];

  const name = String(subjectName || "").trim();
  if (!name) return "Polity";

  const nameKey = name.toLowerCase();
  if (KB_SUBJECT_ALIASES[nameKey]?.length) {
    // Prefer first alias = canonical upload subject (History, Polity, …)
    return KB_SUBJECT_ALIASES[nameKey][0];
  }

  if (/\b(ancient|medieval|modern|world)\b.*\bhistory\b/i.test(name) || /\bhistory\b/i.test(name)) {
    return "History";
  }
  if (/\bgeograph/i.test(name)) return "Geography";
  if (/\beconom/i.test(name)) return "Economy";
  if (/\bpolit/i.test(name) || /\bconstitution/i.test(name)) return "Polity";

  const mapped = Object.values(SYLLABUS_KEY_TO_KB_SUBJECT).find(
    (s) => s.toLowerCase() === nameKey
  );
  return mapped || name;
}

/**
 * Pick best KbSubject.name from DB, preferring exact then canonical aliases with docs.
 * @param {string} subject
 * @param {{ KbSubject: import("mongoose").Model, KbDocument?: import("mongoose").Model }} deps
 */
export async function resolveKbSubjectNameFromDb(subject, deps = {}) {
  const { KbSubject, KbDocument } = deps;
  const raw = String(subject || "").trim();
  if (!raw || !KbSubject) return raw;

  const aliases = expandKbSubjectAliases(raw);

  try {
    // 1) Exact name / slug match on the requested label
    const exact = await KbSubject.findOne({
      isDeleted: { $ne: true },
      isActive: { $ne: false },
      $or: [
        { name: new RegExp(`^${escapeRegex(raw)}$`, "i") },
        { slug: new RegExp(`^${escapeRegex(raw).replace(/\s+/g, "-")}$`, "i") },
      ],
    })
      .select("name")
      .lean();

    // 2) Any alias family subjects that exist in taxonomy
    const or = aliases.flatMap((a) => [
      { name: new RegExp(`^${escapeRegex(a)}$`, "i") },
      { slug: new RegExp(`^${escapeRegex(a).replace(/\s+/g, "-")}$`, "i") },
    ]);

    const candidates = await KbSubject.find({
      isDeleted: { $ne: true },
      isActive: { $ne: false },
      $or: or,
    })
      .select("name _id")
      .lean();

    if (!candidates.length) {
      if (exact?.name) return exact.name;
      const loose = await KbSubject.findOne({
        isDeleted: { $ne: true },
        isActive: { $ne: false },
        name: new RegExp(escapeRegex(raw), "i"),
      })
        .select("name")
        .lean();
      return loose?.name || resolveKbSubjectLabel("", raw);
    }

    // Prefer subject that actually has KB documents (History with PDFs > empty Ancient History)
    if (KbDocument && candidates.length > 1) {
      const counts = await Promise.all(
        candidates.map(async (c) => {
          const n = await KbDocument.countDocuments({
            subjectId: c._id,
            isDeleted: { $ne: true },
          });
          return { name: c.name, count: n };
        })
      );
      counts.sort((a, b) => b.count - a.count);
      if (counts[0]?.count > 0) return counts[0].name;
    }

    // Prefer canonical first alias (History) when present
    for (const preferred of aliases) {
      const hit = candidates.find(
        (c) => normalizeLabel(c.name) === normalizeLabel(preferred)
      );
      if (hit) return hit.name;
    }

    if (exact?.name) return exact.name;
    return candidates[0].name;
  } catch (err) {
    console.warn("[kbSubjectResolve] resolve failed:", err.message);
    return resolveKbSubjectLabel("", raw);
  }
}

export { escapeRegex, normalizeLabel };
