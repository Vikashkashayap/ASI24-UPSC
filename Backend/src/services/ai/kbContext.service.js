/**
 * Practice-test context from Admin Knowledge Base (Intelligence hybrid RAG).
 * Same retrieval stack as Question Intelligence / Test Builder:
 * knowledge_intelligence Qdrant + DocumentChunk/KbDocument (+ optional website notes).
 */
import { hybridSearch } from "../../intelligence/services/hybridSearch.service.js";
import { relatedConcepts } from "../../intelligence/data/concepts.js";
import { KbSubject } from "../../knowledge/models/KbSubject.js";
import { estimateTokens } from "./tokenEstimator.service.js";
import { isNonContentChunk, chunkTextOf } from "../content/frontMatterFilter.js";
import { filterChunksByTopic } from "../qg/utils/topicRelevance.js";

const QUERY_ANGLES = [
  (topic, subject) => `${subject} ${topic}`,
  (topic) => `${topic} key facts features provisions`,
  (topic) => `${topic} dates chronology timeline`,
  (topic) => `${topic} significance importance UPSC prelims`,
  (topic) => `${topic} places locations institutions`,
  (topic) => `${topic} personalities leaders committees`,
  (topic) => `${topic} causes effects impact criticism`,
  (topic) => `${topic} comparison difference articles`,
];

const SUBJECT_ALIASES = {
  polity: ["Polity", "Indian Polity"],
  history: ["History", "Ancient History", "Medieval History", "Modern History"],
  geography: ["Geography", "Indian Geography", "World Geography"],
  economy: ["Economy", "Indian Economy"],
  environment: ["Environment", "Ecology", "Environment & Ecology"],
  "science & tech": ["Science & Tech", "Science and Technology", "Science & Technology"],
  "art & culture": ["Art & Culture", "Art and Culture"],
  "current affairs": ["Current Affairs"],
};

function escapeRegex(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Map student subject label → best matching KbSubject.name (if present).
 */
async function resolveKbSubjectName(subject) {
  const raw = String(subject || "").trim();
  if (!raw) return "";

  const aliases = SUBJECT_ALIASES[raw.toLowerCase()] || [raw];
  const or = aliases.flatMap((a) => [
    { name: new RegExp(`^${escapeRegex(a)}$`, "i") },
    { slug: new RegExp(`^${escapeRegex(a).replace(/\s+/g, "-")}$`, "i") },
  ]);

  try {
    const hit = await KbSubject.findOne({
      isDeleted: { $ne: true },
      isActive: { $ne: false },
      $or: or,
    })
      .select("name")
      .lean();
    if (hit?.name) return hit.name;

    // Loose contains (e.g. "Polity" ↔ "Indian Polity")
    const loose = await KbSubject.findOne({
      isDeleted: { $ne: true },
      isActive: { $ne: false },
      name: new RegExp(escapeRegex(raw), "i"),
    })
      .select("name")
      .lean();
    if (loose?.name) return loose.name;
  } catch (err) {
    console.warn("[kbContext] KbSubject resolve failed:", err.message);
  }

  return raw;
}

function truncateToTokenBudget(text, maxTokens) {
  const raw = String(text || "").trim();
  if (!raw || maxTokens <= 0) return "";
  if (estimateTokens(raw) <= maxTokens) return raw;
  const words = raw.split(/\s+/).filter(Boolean);
  let keep = Math.max(40, Math.floor(maxTokens / 1.3));
  let out = words.slice(0, keep).join(" ");
  while (keep > 40 && estimateTokens(out) > maxTokens) {
    keep = Math.floor(keep * 0.85);
    out = words.slice(0, keep).join(" ");
  }
  return out.trim();
}

function buildContextFromResults(results, maxTokens) {
  const out = [];
  let used = 0;
  const budget = Math.max(80, maxTokens || 2400);
  const seen = new Set();

  for (const r of results) {
    const id = String(r.chunkId || "");
    const text = String(r.chunk || "").trim();
    if (!text || text.length < 40) continue;
    const fp = text.slice(0, 120).toLowerCase();
    if (seen.has(fp)) continue;
    seen.add(fp);

    const label = [r.document?.title || r.title, r.topic || r.subject, r.page != null ? `p${r.page}` : ""]
      .filter(Boolean)
      .join(" · ");
    const heading = label ? `[${label}]` : "";
    let piece = text;
    let tokens = estimateTokens(piece);
    if (used + tokens > budget) {
      const room = budget - used - (heading ? estimateTokens(`${heading}\n`) : 0);
      if (room < 40) break;
      piece = truncateToTokenBudget(piece, room);
      tokens = estimateTokens(piece);
    }
    out.push(heading ? `${heading}\n${piece}` : piece);
    used += tokens + (heading ? estimateTokens(`${heading}\n`) : 0);
    if (used >= budget) break;
  }

  return out.join("\n\n");
}

/**
 * Retrieve Admin KB (+ website notes) context for student Practice Test generation.
 *
 * @param {{
 *   subject: string,
 *   topic: string,
 *   batchIndex?: number,
 *   excludeChunkIds?: string[],
 *   maxTokens?: number,
 *   topK?: number,
 * }} params
 */
export async function getContextForPractice({
  subject,
  topic,
  batchIndex = 0,
  excludeChunkIds = [],
  maxTokens,
  topK,
} = {}) {
  const subjectRaw = String(subject || "").trim();
  const topicQuery = String(topic || "").trim();
  if (!subjectRaw || !topicQuery) {
    return { contextText: "", chunks: [], source: "empty", tokens: 0, chunkIds: [], query: "" };
  }

  const kbSubject = await resolveKbSubjectName(subjectRaw);
  const angleFn = QUERY_ANGLES[Math.abs(batchIndex) % QUERY_ANGLES.length];
  const angledQuery = angleFn(topicQuery, kbSubject || subjectRaw);
  const concepts = relatedConcepts(angledQuery);
  const expanded = [angledQuery, ...concepts.slice(0, 3)].join(" ");

  const fetchK =
    Number(topK) ||
    Number(process.env.PRELIMS_KB_TOP_K || 14) ||
    14;
  const exclude = new Set((excludeChunkIds || []).map(String).filter(Boolean));
  // Over-fetch so we can drop already-used chunks across batches
  const requestK = fetchK + Math.min(exclude.size, 20);

  const tokenBudget =
    Number(maxTokens) ||
    Number(process.env.PRELIMS_KB_CONTEXT_TOKENS || 2400) ||
    2400;

  // Free-text student topic → query only (not exact payload topic filter).
  // Subject filter uses resolved KbSubject name; hybridSearch already soft-retries.
  let result = await hybridSearch({
    query: expanded,
    filters: {
      ...(kbSubject ? { subject: kbSubject } : {}),
    },
    topK: requestK,
    searchType: "hybrid",
  });

  let rows = (result.results || []).filter((r) => {
    const id = String(r.chunkId || "");
    if (!id || exclude.has(id)) return false;
    return !isNonContentChunk({
      text: chunkTextOf(r),
      heading: r.topic || r.chapter,
      topic: r.topic,
      chapter: r.chapter,
      page: r.page,
    });
  });

  const applyTopicFilter = (list) => {
    const mapped = (list || []).map((r) => ({
      ...r,
      text: chunkTextOf(r),
      heading: r.topic || r.chapter || "",
    }));
    const tf = filterChunksByTopic(mapped, topicQuery);
    if (tf.chunks.length) return tf.chunks;
    if (tf.dropped > 0) return [];
    return mapped;
  };

  rows = applyTopicFilter(rows);

  // If subject filter was too strict, retry unfiltered (semantic still keyed on topic query)
  if (!rows.length && kbSubject) {
    result = await hybridSearch({
      query: expanded,
      filters: {},
      topK: requestK,
      searchType: "hybrid",
    });
    rows = (result.results || []).filter((r) => {
      const id = String(r.chunkId || "");
      if (!id || exclude.has(id)) return false;
      return !isNonContentChunk({
        text: chunkTextOf(r),
        heading: r.topic || r.chapter,
        topic: r.topic,
        chapter: r.chapter,
        page: r.page,
      });
    });
    rows = applyTopicFilter(rows);
  }

  rows = rows.slice(0, fetchK);
  const contextText = buildContextFromResults(
    rows.map((r) => ({ ...r, chunk: chunkTextOf(r) })),
    tokenBudget
  );
  const tokens = estimateTokens(contextText);
  const chunkIds = rows.map((r) => String(r.chunkId)).filter(Boolean);

  const hasKbPdf = rows.some((r) => r.sourceKind !== "website_notes" && r.documentId);
  const hasNotes = rows.some((r) => r.sourceKind === "website_notes");
  let source = "empty";
  if (contextText.length >= 80) {
    if (hasKbPdf && hasNotes) source = "knowledge_intelligence+notes";
    else if (hasKbPdf) source = "knowledge_intelligence";
    else if (hasNotes) source = "website_notes";
    else source = "knowledge_hybrid";
  }

  return {
    contextText,
    chunks: rows.map((r) => ({
      _id: r.chunkId,
      text: chunkTextOf(r),
      subject: r.subject,
      topic: r.topic,
      heading: r.document?.title || r.topic || "",
      score: r.score,
      sourceKind: r.sourceKind,
    })),
    source,
    tokens,
    chunkIds,
    query: angledQuery,
    scope: "subject",
    subject: kbSubject || subjectRaw,
    hybrid: true,
    concepts: result.concepts || concepts,
  };
}

export default { getContextForPractice };
