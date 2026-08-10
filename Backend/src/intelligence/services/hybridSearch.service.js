import DocumentChunk from "../../processing/models/DocumentChunk.js";
import KbDocument from "../../knowledge/models/KbDocument.js";
import ContentChunk from "../../models/ContentChunk.js";
import { embeddingService } from "../../services/ai/embedding.service.js";
import { qdrantService } from "../../services/ai/qdrant.service.js";
import { knowledgeQdrant } from "./qdrantKnowledge.service.js";
import { embedQuery } from "./embeddingIndex.service.js";
import { keywordRepo, searchLogRepo } from "../repositories/index.js";
import { expandSynonyms } from "../data/synonyms.js";
import { relatedConcepts } from "../data/concepts.js";
import { cacheGet, cacheSet, cacheKey } from "./searchCache.service.js";
import { aiReranker } from "../providers/placeholders.js";
import { isNonContentChunk, chunkTextOf } from "../../services/content/frontMatterFilter.js";

/** Include notes.mentorsdaily.com (ContentChunk / notes Qdrant) in hybrid search. */
const INCLUDE_WEBSITE_NOTES =
  String(process.env.INTEL_INCLUDE_WEBSITE_NOTES ?? "true").toLowerCase() !== "false";

function normalizeFilters(filters = {}) {
  const out = {};
  for (const key of [
    "subject",
    "chapter",
    "topic",
    "difficulty",
    "language",
    "source",
    "year",
    "category",
    "documentId",
  ]) {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== "") {
      out[key] = filters[key];
    }
  }
  return out;
}

function rrfFuse(semanticHits, keywordHits, { k = 60 } = {}) {
  const scores = new Map();

  semanticHits.forEach((h, idx) => {
    const id = String(h.chunkId);
    const prev = scores.get(id) || { ...h, score: 0, semanticScore: 0, keywordScore: 0 };
    prev.semanticScore = h.score || 0;
    prev.score += 1 / (k + idx + 1);
    scores.set(id, prev);
  });

  keywordHits.forEach((h, idx) => {
    const id = String(h.chunkId);
    const prev = scores.get(id) || { ...h, score: 0, semanticScore: 0, keywordScore: 0 };
    prev.keywordScore = h.score || 0;
    prev.score += 1 / (k + idx + 1);
    if (!prev.chunk && h.chunk) prev.chunk = h.chunk;
    scores.set(id, prev);
  });

  return [...scores.values()].sort((a, b) => b.score - a.score);
}

async function hydrateResults(rows) {
  const kbIds = rows
    .filter((r) => r.sourceKind !== "website_notes")
    .map((r) => r.chunkId)
    .filter(Boolean);
  const notesIds = rows
    .filter((r) => r.sourceKind === "website_notes")
    .map((r) => r.chunkId)
    .filter(Boolean);

  const [chunks, notesChunks] = await Promise.all([
    kbIds.length
      ? DocumentChunk.find({ _id: { $in: kbIds } }).lean()
      : Promise.resolve([]),
    notesIds.length
      ? ContentChunk.find({ _id: { $in: notesIds } }).lean()
      : Promise.resolve([]),
  ]);

  const byChunk = new Map(chunks.map((c) => [String(c._id), c]));
  const byNotes = new Map(notesChunks.map((c) => [String(c._id), c]));
  const docIds = [...new Set(chunks.map((c) => String(c.documentId)))];
  const docs = docIds.length
    ? await KbDocument.find({ _id: { $in: docIds } })
        .select("title sourceLabel year language difficulty storageUrl")
        .lean()
    : [];
  const byDoc = new Map(docs.map((d) => [String(d._id), d]));

  return rows.map((r) => {
    if (r.sourceKind === "website_notes") {
      const nc = byNotes.get(String(r.chunkId));
      const text = nc?.text || r.chunkText || "";
      const title = nc?.heading || r.topic || "Website notes";
      return {
        score: r.score,
        similarity: r.semanticScore ?? r.score,
        keywordScore: r.keywordScore ?? 0,
        chunk: text,
        topic: nc?.subTopic || nc?.heading || r.topic || "",
        subject: nc?.subject || r.subject || "",
        chapter: nc?.heading || r.chapter || "",
        page: nc?.page ?? r.page ?? null,
        source: "notes.mentorsdaily.com",
        sourceKind: "website_notes",
        document: {
          id: nc?.sourceUrlId || r.documentId,
          title,
          url: nc?.sourceUrl || r.sourceUrl || "https://notes.mentorsdaily.com/",
        },
        chunkId: r.chunkId,
        documentId: nc?.sourceUrlId || r.documentId,
      };
    }

    const chunk = byChunk.get(String(r.chunkId));
    const doc = chunk ? byDoc.get(String(chunk.documentId)) : null;
    return {
      score: r.score,
      similarity: r.semanticScore ?? r.score,
      keywordScore: r.keywordScore ?? 0,
      chunk: chunk?.chunkText || r.chunkText || "",
      topic: chunk?.topic || r.topic || "",
      subject: chunk?.subject || r.subject || "",
      chapter: chunk?.chapter || r.chapter || "",
      page: chunk?.page ?? r.page ?? null,
      source: doc?.sourceLabel || r.source || "",
      sourceKind: "kb_pdf",
      document: doc
        ? {
            id: doc._id,
            title: doc.title,
            year: doc.year,
            language: doc.language,
            difficulty: doc.difficulty,
            url: doc.storageUrl,
          }
        : { id: r.documentId },
      chunkId: r.chunkId,
      documentId: chunk?.documentId || r.documentId,
    };
  });
}

async function semanticSearch(query, filters, topK) {
  if (!embeddingService.isConfigured() || !knowledgeQdrant.isConfigured()) return [];
  const vector = await embedQuery(query);
  if (!vector) return [];
  const hits = await knowledgeQdrant.search({ vector, filters, topK });
  return hits.map((h) => ({
    chunkId: h.payload?.chunkId,
    documentId: h.payload?.documentId,
    score: h.score || 0,
    subject: h.payload?.subject,
    chapter: h.payload?.chapter,
    topic: h.payload?.topic,
    page: h.payload?.page,
    source: h.payload?.source,
    chunkText: h.payload?.chunkText,
    sourceKind: "kb_pdf",
  }));
}

/**
 * Semantic search over notes.mentorsdaily.com chunks (ContentChunk → QDRANT_COLLECTION).
 */
async function notesWebsiteSemanticSearch(query, filters, topK) {
  if (!INCLUDE_WEBSITE_NOTES) return [];
  if (!embeddingService.isConfigured() || !qdrantService.isConfigured()) return [];

  const vector = await embedQuery(query);
  if (!vector) return [];

  let hits = await qdrantService.searchChunks({
    vector,
    subject: filters.subject || undefined,
    topK,
  });

  // Subject labels may differ (KB "Indian Polity" vs notes "Polity") — retry unfiltered
  if (!hits.length && filters.subject) {
    hits = await qdrantService.searchChunks({ vector, topK });
  }

  return hits.map((h) => {
    const p = h.payload || {};
    return {
      chunkId: p.mongoChunkId || h.id,
      documentId: p.sourceUrlId || null,
      score: h.score || 0,
      subject: p.subject || "",
      chapter: p.heading || "",
      topic: p.subTopic || p.heading || "",
      page: p.page ?? null,
      source: p.source || "notes.mentorsdaily.com",
      chunkText: p.text || "",
      sourceKind: "website_notes",
      sourceUrl: p.sourceUrl || "",
    };
  });
}

async function keywordSearch(query, filters, topK) {
  const terms = expandSynonyms(query);
  const hits = await keywordRepo.searchTerms(terms, {
    subject: filters.subject,
    limit: topK,
  });
  return hits.map((h) => ({
    chunkId: h.chunkId,
    documentId: h.documentId,
    score: h.score,
    subject: h.subject,
    chapter: h.chapter,
    topic: h.topic,
    page: h.page,
  }));
}

/** Fallback when embeddings/keyword index empty — scan processed Mongo chunks. */
async function mongoTextSearch(query, filters, topK) {
  const q = String(query || "").trim();
  if (q.length < 2) return [];

  const terms = expandSynonyms(q)
    .map((t) => String(t || "").trim())
    .filter((t) => t.length >= 2)
    .slice(0, 8);

  const and = [{ isDuplicate: { $ne: true } }];
  if (filters.subject) and.push({ subject: new RegExp(escapeRegex(filters.subject), "i") });
  if (filters.chapter) and.push({ chapter: new RegExp(escapeRegex(filters.chapter), "i") });
  if (filters.topic) and.push({ topic: new RegExp(escapeRegex(filters.topic), "i") });
  if (filters.documentId) and.push({ documentId: filters.documentId });

  const or = [];
  for (const t of terms) {
    const re = new RegExp(escapeRegex(t), "i");
    or.push({ chunkText: re }, { topic: re }, { chapter: re });
  }
  if (or.length) and.push({ $or: or });

  const rows = await DocumentChunk.find({ $and: and })
    .sort({ chunkOrder: 1 })
    .limit(topK)
    .select("_id documentId subject chapter topic page chunkText")
    .lean();

  return rows.map((r, idx) => ({
    chunkId: r._id,
    documentId: r.documentId,
    score: 1 / (idx + 1),
    subject: r.subject,
    chapter: r.chapter,
    topic: r.topic,
    page: r.page,
    chunkText: r.chunkText,
  }));
}

function escapeRegex(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function filterSearchResults(results) {
  return (results || []).filter(
    (r) =>
      !isNonContentChunk({
        text: chunkTextOf(r),
        heading: r.topic || r.chapter,
        topic: r.topic,
        chapter: r.chapter,
        page: r.page,
      })
  );
}

/**
 * Hybrid = keyword + semantic + RRF fusion + rerank placeholder.
 */
export async function hybridSearch({
  query,
  filters = {},
  topK = 10,
  searchType = "hybrid",
  userId = null,
} = {}) {
  const started = Date.now();
  const f = normalizeFilters(filters);
  const key = cacheKey(["search", searchType, query, JSON.stringify(f), topK]);
  const cached = await cacheGet(key);
  if (cached) {
    const filteredCached = filterSearchResults(cached);
    await searchLogRepo.create({
      userId,
      query,
      searchType,
      filters: f,
      resultCount: filteredCached.length,
      topScore: filteredCached[0]?.score ?? null,
      latencyMs: Date.now() - started,
      cached: true,
    });
    return { results: filteredCached, cached: true, concepts: relatedConcepts(query) };
  }

  let semanticHits = [];
  let keywordHits = [];
  let notesHits = [];

  if (searchType === "keyword") {
    keywordHits = await keywordSearch(query, f, topK * 2);
  } else if (searchType === "semantic" || searchType === "similar") {
    [semanticHits, notesHits] = await Promise.all([
      semanticSearch(query, f, topK * 2),
      notesWebsiteSemanticSearch(query, f, topK * 2),
    ]);
  } else if (searchType === "notes") {
    notesHits = await notesWebsiteSemanticSearch(query, f, topK * 2);
  } else {
    [semanticHits, keywordHits, notesHits] = await Promise.all([
      semanticSearch(query, f, topK * 2),
      keywordSearch(query, f, topK * 2),
      notesWebsiteSemanticSearch(query, f, topK * 2),
    ]);
  }

  // Fuse PDF knowledge + website notes + keyword (RRF)
  let fused = rrfFuse(
    [...semanticHits, ...notesHits],
    keywordHits
  ).slice(0, topK * 2);

  // When vector/keyword indexes are empty (e.g. embedding provider down), use Mongo chunks
  if (!fused.length) {
    let mongoHits = await mongoTextSearch(query, f, topK * 2);
    // Retry without subject/topic filters if too strict (chunks may lack taxonomy labels)
    if (!mongoHits.length && (f.subject || f.topic || f.chapter)) {
      mongoHits = await mongoTextSearch(query, {}, topK * 2);
    }
    fused = mongoHits.map((h) => ({
      ...h,
      semanticScore: 0,
      keywordScore: h.score,
    }));
  }

  fused = await aiReranker.rerank(query, fused);
  fused = fused.slice(0, topK);

  const results = filterSearchResults(await hydrateResults(fused));
  await cacheSet(key, results);

  await searchLogRepo.create({
    userId,
    query,
    searchType,
    filters: f,
    resultCount: results.length,
    topScore: results[0]?.score ?? null,
    latencyMs: Date.now() - started,
    cached: false,
  });

  return {
    results,
    cached: false,
    concepts: relatedConcepts(query),
    synonyms: expandSynonyms(query).slice(0, 12),
  };
}

export async function searchTopic(body, userId) {
  return hybridSearch({
    ...body,
    query: body.query || body.topic,
    filters: { ...body.filters, topic: body.topic || body.filters?.topic },
    searchType: "topic",
    userId,
  });
}

export async function searchQuestion(body, userId) {
  return hybridSearch({
    ...body,
    searchType: "question",
    userId,
  });
}

export async function searchConcept(body, userId) {
  const concepts = relatedConcepts(body.query);
  const expandedQuery = [body.query, ...concepts].join(" ");
  const result = await hybridSearch({
    ...body,
    query: expandedQuery,
    searchType: "concept",
    userId,
  });
  return { ...result, concepts };
}

export async function searchSimilar(body, userId) {
  return hybridSearch({
    ...body,
    searchType: "similar",
    userId,
  });
}

export async function searchNotes(body, userId) {
  return hybridSearch({
    ...body,
    searchType: "notes",
    userId,
  });
}
