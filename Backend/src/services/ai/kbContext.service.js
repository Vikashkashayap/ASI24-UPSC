/**
 * Practice-test context from Admin Knowledge Base (Intelligence hybrid RAG).
 * Same retrieval stack as Question Intelligence / Test Builder:
 * knowledge_intelligence Qdrant + DocumentChunk/KbDocument (+ optional website notes).
 */
import { SKIP_KB_RAG_RETRIEVAL } from "../../config/generationMode.js";
import { hybridSearch } from "../../intelligence/services/hybridSearch.service.js";
import { relatedConcepts } from "../../intelligence/data/concepts.js";
import { KbSubject } from "../../knowledge/models/KbSubject.js";
import { estimateTokens } from "./tokenEstimator.service.js";
import { isNonContentChunk, chunkTextOf } from "../content/frontMatterFilter.js";
import { filterChunksByTopic, filterChunksBySubjectEra, filterChunksBySiblingChapters } from "../qg/utils/topicRelevance.js";
import {
  narrowKbSubjectAliases,
  resolveSubjectEra,
  HISTORY_ERA_CONFIG,
  GEOGRAPHY_ERA_CONFIG,
} from "./kbSubjectResolve.js";

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

/**
 * Map syllabus / student labels → Admin KB subject names that actually exist on uploads.
 * Order matters: parent bucket ("History") first so Ancient/Medieval/World all hit the same PDFs.
 */
const SUBJECT_ALIASES = {
  polity: ["Polity", "Indian Polity"],
  "indian polity": ["Polity", "Indian Polity"],
  history: ["History", "Ancient History", "Medieval History", "Modern History", "World History"],
  "ancient history": ["History", "Ancient History"],
  "medieval history": ["History", "Medieval History"],
  "modern history": ["History", "Modern History"],
  "world history": ["History", "World History"],
  geography: ["Geography", "Indian Geography", "World Geography"],
  "indian geography": ["Geography", "Indian Geography"],
  "world geography": ["Geography", "World Geography"],
  economy: ["Economy", "Indian Economy"],
  "indian economy": ["Economy", "Indian Economy"],
  economics: ["Economy", "Indian Economy"],
  environment: ["Environment", "Ecology", "Environment & Ecology"],
  ecology: ["Environment", "Ecology", "Environment & Ecology"],
  "science & tech": ["Science & Tech", "Science and Technology", "Science & Technology"],
  "science and technology": ["Science & Tech", "Science and Technology", "Science & Technology"],
  "art & culture": ["Art & Culture", "Art and Culture"],
  "art and culture": ["Art & Culture", "Art and Culture"],
  "current affairs": ["Current Affairs"],
  "international relations": ["International Relations"],
  "internal security": ["Internal Security"],
  governance: ["Governance"],
  ethics: ["Ethics"],
  society: ["Society"],
};

function escapeRegex(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function aliasListForSubject(subject) {
  const raw = String(subject || "").trim();
  if (!raw) return [];
  const lower = raw.toLowerCase();

  if (SUBJECT_ALIASES[lower]) return [...SUBJECT_ALIASES[lower]];

  // Longest alias key contained in label (e.g. "Ancient History" → "ancient history")
  let bestKey = "";
  for (const key of Object.keys(SUBJECT_ALIASES)) {
    if (lower.includes(key) && key.length > bestKey.length) bestKey = key;
  }
  if (bestKey) return [...SUBJECT_ALIASES[bestKey]];

  return [raw];
}

/**
 * Map student / syllabus subject label → best matching KbSubject.name (if present).
 * "Ancient History" → "History" when only generic History PDFs exist in KB.
 */
async function resolveKbSubjectName(subject) {
  const raw = String(subject || "").trim();
  if (!raw) return "";

  const aliases = aliasListForSubject(raw);
  if (!aliases.some((a) => a.toLowerCase() === raw.toLowerCase())) {
    aliases.push(raw);
  }

  try {
    // Prefer parent bucket first (History before Ancient History)
    for (const a of aliases) {
      const hit = await KbSubject.findOne({
        isDeleted: { $ne: true },
        isActive: { $ne: false },
        $or: [
          { name: new RegExp(`^${escapeRegex(a)}$`, "i") },
          { slug: new RegExp(`^${escapeRegex(a).replace(/\s+/g, "-")}$`, "i") },
        ],
      })
        .select("name")
        .lean();
      if (hit?.name) return hit.name;
    }

    // Loose: KbSubject name contained in label (History ⊂ "Ancient History")
    const candidates = await KbSubject.find({
      isDeleted: { $ne: true },
      isActive: { $ne: false },
    })
      .select("name")
      .lean();
    const lower = raw.toLowerCase();
    const reverse = (candidates || [])
      .filter((s) => {
        const n = String(s.name || "").toLowerCase();
        return n.length >= 4 && (lower.includes(n) || n.includes(lower));
      })
      .sort((a, b) => String(b.name).length - String(a.name).length);
    if (reverse[0]?.name) return reverse[0].name;

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

  // Fall back to parent alias even if KbSubject row missing (chunk.subject may still be "History")
  return aliases[0] || raw;
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
 *   subjectKey?: string,
 *   subjectName?: string,
 *   topic: string,
 *   siblingTopics?: string[],
 *   batchIndex?: number,
 *   excludeChunkIds?: string[],
 *   maxTokens?: number,
 *   topK?: number,
 *   strictTopic?: boolean,
 * }} params
 */
export async function getContextForPractice({
  subject,
  subjectKey,
  subjectName,
  topic,
  siblingTopics = [],
  batchIndex = 0,
  excludeChunkIds = [],
  maxTokens,
  topK,
  strictTopic = true,
} = {}) {
  if (SKIP_KB_RAG_RETRIEVAL) {
    return {
      contextText: "",
      chunks: [],
      source: "skipped_llm_only",
      tokens: 0,
      chunkIds: [],
      query: String(topic || "").trim(),
    };
  }

  const subjectRaw = String(subject || "").trim();
  const syllabusLabel = String(subjectName || subjectRaw).trim();
  const topicQuery = String(topic || "").trim();
  if (!subjectRaw || !topicQuery) {
    return { contextText: "", chunks: [], source: "empty", tokens: 0, chunkIds: [], query: "" };
  }

  const kbSubject = await resolveKbSubjectName(subjectRaw);
  // Era-narrow aliases: Ancient History → ["History","Ancient History"] NOT full History family
  const subjectAliases = narrowKbSubjectAliases(subjectKey, syllabusLabel);
  const era = resolveSubjectEra(subjectKey, syllabusLabel);
  const eraLabel =
    (era && HISTORY_ERA_CONFIG[era]?.label) ||
    (era && GEOGRAPHY_ERA_CONFIG[era]?.label) ||
    syllabusLabel;
  const scope = { subjectKey, subjectName: syllabusLabel };

  // Keep syllabus era in the query even when KB filter is generic (History)
  const querySubject =
    eraLabel && kbSubject && eraLabel.toLowerCase() !== kbSubject.toLowerCase()
      ? `${kbSubject} ${eraLabel}`
      : kbSubject || subjectRaw;
  const angleFn = QUERY_ANGLES[Math.abs(batchIndex) % QUERY_ANGLES.length];
  const angledQuery = angleFn(topicQuery, querySubject);
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

  const applyTopicFilter = (list, { strict = strictTopic } = {}) => {
    const mapped = (list || []).map((r) => ({
      ...r,
      text: chunkTextOf(r),
      heading: r.topic || r.chapter || "",
    }));
    const eraFiltered = filterChunksBySubjectEra(mapped, scope);
    const sibFiltered = filterChunksBySiblingChapters(
      eraFiltered.chunks,
      topicQuery,
      siblingTopics
    );
    if (sibFiltered.dropped > 0) {
      console.log(
        `[kbContext] sibling-chapter filter: dropped ${sibFiltered.dropped} chunk(s) for "${topicQuery}"`
      );
    }
    const afterSib = sibFiltered.chunks;
    const tf = filterChunksByTopic(afterSib, topicQuery, { strict });
    if (tf.chunks.length) return tf.chunks;
    if (tf.dropped > 0 || eraFiltered.dropped > 0 || sibFiltered.dropped > 0) return [];
    return afterSib;
  };

  // Pass era-narrow subject aliases; topic is handled via semantic query + post-filter
  let result = await hybridSearch({
    query: expanded,
    filters: {
      ...(kbSubject
        ? {
            subject: kbSubject,
            subjectAliases: subjectAliases.length ? subjectAliases : [kbSubject],
          }
        : {}),
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

  rows = applyTopicFilter(rows, { strict: true });

  // Retry without topic Qdrant filter — still subject + era bounded (never fully unfiltered)
  if (!rows.length && kbSubject) {
    result = await hybridSearch({
      query: expanded,
      filters: {
        subject: kbSubject,
        subjectAliases: subjectAliases.length ? subjectAliases : [kbSubject],
      },
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
    rows = applyTopicFilter(rows, { strict: false });
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
    scope: era || "subject",
    subject: kbSubject || subjectRaw,
    subjectKey: subjectKey || "",
    subjectName: syllabusLabel,
    era: era || null,
    hybrid: true,
    concepts: result.concepts || concepts,
  };
}

export default { getContextForPractice };
