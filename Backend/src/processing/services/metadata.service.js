/**
 * Subject / chapter / topic metadata detection from content + document hints.
 */

const SUBJECT_KEYWORDS = [
  { name: "History", keys: ["ancient", "medieval", "modern india", "gupta", "mughal", "freedom struggle"] },
  { name: "Polity", keys: ["constitution", "parliament", "fundamental rights", "supreme court", "article "] },
  { name: "Geography", keys: ["monsoon", "climate", "river", "soil", "plateau", "latitude"] },
  { name: "Economy", keys: ["gdp", "inflation", "rbi", "fiscal", "budget", "monetary"] },
  { name: "Environment", keys: ["biodiversity", "climate change", "pollution", "wildlife", "cop "] },
  { name: "Science", keys: ["physics", "chemistry", "biology", "isro", "technology"] },
  { name: "International Relations", keys: ["united nations", "bilateral", "geopolitics", "nato", "g20"] },
  { name: "Ethics", keys: ["integrity", "aptitude", "probity", "emotional intelligence"] },
  { name: "Current Affairs", keys: ["recently", "in news", "cabinet approved", "launched in"] },
];

export function detectDocumentKind(sections, questions) {
  const qCount = questions?.length || 0;
  const noteSections = (sections || []).filter((s) =>
    ["heading", "subheading", "paragraph"].includes(s.sectionType)
  ).length;
  if (qCount >= 3 && noteSections < qCount) return "pyq";
  if (qCount >= 1 && noteSections >= 3) return "mixed";
  if (noteSections >= 1) return "notes";
  return "unknown";
}

export function detectSubjectFromText(text, fallback = "") {
  const lower = String(text || "").toLowerCase();
  let best = { name: fallback || "", score: 0 };
  for (const s of SUBJECT_KEYWORDS) {
    let score = 0;
    for (const k of s.keys) {
      if (lower.includes(k)) score += 1;
    }
    if (score > best.score) best = { name: s.name, score };
  }
  return best.name || fallback || "";
}

export function detectChapterTopic(sections) {
  const headings = (sections || []).filter((s) =>
    ["title", "heading", "subheading"].includes(s.sectionType)
  );
  const chapter = headings[0]?.text || "";
  const topics = [
    ...new Set(
      headings
        .slice(1, 8)
        .map((h) => h.text)
        .filter(Boolean)
    ),
  ];
  return { chapter, topics };
}

export function buildMetadataResult({
  fullText,
  sections,
  questions,
  documentHints = {},
}) {
  const documentKind = detectDocumentKind(sections, questions);
  const detectedSubject =
    documentHints.subjectName ||
    detectSubjectFromText(fullText, documentHints.fallbackSubject || "");
  const { chapter, topics } = detectChapterTopic(sections);

  return {
    documentKind,
    detectedSubject,
    detectedChapter: documentHints.chapterName || chapter,
    detectedTopics: topics,
    subjectId: documentHints.subjectId || null,
    chapterId: documentHints.chapterId || null,
    topicId: documentHints.topicId || null,
    categoryId: documentHints.categoryId || null,
  };
}
