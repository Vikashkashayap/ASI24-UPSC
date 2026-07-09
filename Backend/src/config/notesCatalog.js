/**
 * Complete UPSC notes catalog — mirrors notes.mentorsdaily.com sidebar structure.
 * Each subject lists ALL chapter pages (like History → Ancient, Medieval, Modern, World).
 */

export const NOTES_BASE_URL = "https://notes.mentorsdaily.com";

/** @type {{ gsPaper: string, subject: string, chapters: { title: string, slug: string, topicCount?: number }[] }[]} */
export const UPSC_NOTES_CATALOG = [
  {
    gsPaper: "GS Paper 1",
    subject: "History",
    chapters: [
      { title: "Ancient History", slug: "ancient-history", topicCount: 12 },
      { title: "Medieval History", slug: "medieval-history", topicCount: 8 },
      { title: "Modern History", slug: "modern-history", topicCount: 19 },
      { title: "World History", slug: "world-history", topicCount: 18 },
    ],
  },
  {
    gsPaper: "GS Paper 1",
    subject: "Geography",
    chapters: [
      { title: "Indian Geography", slug: "geography", topicCount: 7 },
      { title: "World Geography", slug: "world-geography", topicCount: 14 },
    ],
  },
  {
    gsPaper: "GS Paper 1",
    subject: "Art & Culture",
    chapters: [{ title: "Art & Culture", slug: "art-culture", topicCount: 5 }],
  },
  {
    gsPaper: "GS Paper 1",
    subject: "Society",
    chapters: [{ title: "Indian Society", slug: "society", topicCount: 8 }],
  },
  {
    gsPaper: "GS Paper 2",
    subject: "Polity",
    chapters: [{ title: "Indian Polity & Constitution", slug: "indian-polity", topicCount: 38 }],
  },
  {
    gsPaper: "GS Paper 2",
    subject: "Governance",
    chapters: [{ title: "Governance & Social Justice", slug: "governance", topicCount: 16 }],
  },
  {
    gsPaper: "GS Paper 2",
    subject: "International Relations",
    chapters: [{ title: "International Relations", slug: "international-relations", topicCount: 4 }],
  },
  {
    gsPaper: "GS Paper 3",
    subject: "Economy",
    chapters: [{ title: "Indian Economy", slug: "economy", topicCount: 22 }],
  },
  {
    gsPaper: "GS Paper 3",
    subject: "Environment",
    chapters: [{ title: "Environment & Ecology", slug: "environment", topicCount: 6 }],
  },
  {
    gsPaper: "GS Paper 3",
    subject: "Science & Tech",
    chapters: [{ title: "Science & Technology", slug: "science-technology", topicCount: 5 }],
  },
  {
    gsPaper: "GS Paper 3",
    subject: "Internal Security",
    chapters: [{ title: "Internal Security", slug: "internal-security", topicCount: 13 }],
  },
  {
    gsPaper: "GS Paper 3",
    subject: "Disaster Management",
    chapters: [{ title: "Disaster Management", slug: "disaster-management", topicCount: 9 }],
  },
  {
    gsPaper: "GS Paper 4",
    subject: "Ethics",
    chapters: [{ title: "Ethics (GS-4)", slug: "ethics", topicCount: 49 }],
  },
  {
    gsPaper: "Extras",
    subject: "Current Affairs",
    chapters: [{ title: "Current Affairs Monthly", slug: "current-affairs", topicCount: 7 }],
  },
];

/** Flat list of all subjects. */
export function getAllCatalogSubjects() {
  const seen = new Set();
  const out = [];
  for (const row of UPSC_NOTES_CATALOG) {
    if (!seen.has(row.subject)) {
      seen.add(row.subject);
      out.push(row.subject);
    }
  }
  return out;
}

/** Total chapter count across catalog. */
export function getTotalChapterCount() {
  return UPSC_NOTES_CATALOG.reduce((sum, row) => sum + row.chapters.length, 0);
}

/** Chapters for a subject from catalog. */
export function getCatalogChapters(subject) {
  const subjectStr = String(subject || "").trim();
  const rows = UPSC_NOTES_CATALOG.filter((r) => r.subject === subjectStr);
  return rows.flatMap((r) =>
    r.chapters.map((c) => ({
      title: c.title,
      slug: c.slug,
      url: `${NOTES_BASE_URL}/${c.slug}`,
      subject: r.subject,
      gsPaper: r.gsPaper,
      expectedTopicCount: c.topicCount || 0,
    }))
  );
}

/** Full catalog with GS paper grouping. */
export function getFullCatalog() {
  return UPSC_NOTES_CATALOG.map((row) => ({
    gsPaper: row.gsPaper,
    subject: row.subject,
    chapters: row.chapters.map((c) => ({
      title: c.title,
      slug: c.slug,
      url: `${NOTES_BASE_URL}/${c.slug}`,
      expectedTopicCount: c.topicCount || 0,
    })),
  }));
}

export default {
  NOTES_BASE_URL,
  UPSC_NOTES_CATALOG,
  getAllCatalogSubjects,
  getTotalChapterCount,
  getCatalogChapters,
  getFullCatalog,
};
