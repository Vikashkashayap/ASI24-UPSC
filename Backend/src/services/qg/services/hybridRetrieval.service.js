/**
 * Hybrid retrieval — Vector + Keyword + Metadata filters.
 * Merges, dedupes, returns up to mergeTopK candidates for reranking.
 */

import crypto from "crypto";
import { embeddingService } from "../../ai/embedding.service.js";
import { qdrantService } from "../../ai/qdrant.service.js";
import { MongoRetriever } from "../../ai/retrievers/mongoRetriever.js";
import SourceUrl from "../../../models/SourceUrl.js";
import ContentChunk from "../../../models/ContentChunk.js";
import { QG_CONFIG } from "../config/qg.config.js";
import { retrievalCache, embeddingCache, cacheKey } from "./cache.service.js";
import { withRetry } from "../utils/retry.js";

const mongoRetriever = new MongoRetriever();

function textFingerprint(text) {
  return crypto
    .createHash("sha1")
    .update(
      String(text || "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 2000)
    )
    .digest("hex");
}

function chunkIdOf(c) {
  return String(c._id || c.mongoChunkId || c.chunkId || c.id || "");
}

function normalizeChunk(raw, source, score = 0) {
  const payload = raw.payload || raw;
  return {
    _id: payload.mongoChunkId || payload._id || raw.id || "",
    mongoChunkId: payload.mongoChunkId || String(payload._id || ""),
    heading: payload.heading || "",
    text: payload.text || raw.text || "",
    order: payload.order ?? payload.chunkNumber ?? 0,
    tokenCount: payload.tokenCount || 0,
    sourceUrl: payload.sourceUrl || "",
    page: payload.page ?? null,
    subTopic: payload.subTopic || "",
    source: payload.source || source,
    topicId: payload.topicId || "",
    sourceUrlId: payload.sourceUrlId || "",
    subject: payload.subject || "",
    book: payload.book || payload.chapter || "",
    chapter: payload.chapter || "",
    publishedAt: payload.publishedAt || payload.date || null,
    vectorScore: source === "vector" ? score : raw.vectorScore || 0,
    keywordScore: source === "keyword" ? score : raw.keywordScore || 0,
    metadataScore: source === "metadata" ? score : raw.metadataScore || 0,
    hybridScore: 0,
    retrievalSources: [source],
  };
}

function mergeById(chunks) {
  const map = new Map();
  const seenFp = new Set();

  for (const c of chunks) {
    if (!c?.text?.trim()) continue;
    const id = chunkIdOf(c);
    const fp = textFingerprint(c.text);
    if (seenFp.has(fp) && !id) continue;

    const key = id || `fp:${fp}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...c, retrievalSources: [...(c.retrievalSources || [])] });
      seenFp.add(fp);
      continue;
    }

    existing.vectorScore = Math.max(existing.vectorScore || 0, c.vectorScore || 0);
    existing.keywordScore = Math.max(existing.keywordScore || 0, c.keywordScore || 0);
    existing.metadataScore = Math.max(existing.metadataScore || 0, c.metadataScore || 0);
    for (const s of c.retrievalSources || []) {
      if (!existing.retrievalSources.includes(s)) existing.retrievalSources.push(s);
    }
    if ((c.text || "").length > (existing.text || "").length) existing.text = c.text;
  }

  return [...map.values()];
}

function computeHybridScore(c) {
  const { vectorWeight, keywordWeight, metadataWeight } = QG_CONFIG.hybrid;
  const v = Number(c.vectorScore) || 0;
  const k = Number(c.keywordScore) || 0;
  const m = Number(c.metadataScore) || 0;
  // Normalize keyword heuristically (mongo scores often 0–10+)
  const kNorm = Math.min(1, k / 8);
  const vNorm = Math.min(1, Math.max(0, v));
  const mNorm = Math.min(1, Math.max(0, m));
  return vectorWeight * vNorm + keywordWeight * kNorm + metadataWeight * mNorm;
}

async function embedQuery(query) {
  const key = cacheKey(["embed", query]);
  const cached = embeddingCache.get(key);
  if (cached) return cached;

  if (!embeddingService.isConfigured()) return null;
  const vector = await withRetry(
    () => embeddingService.generateEmbedding(query, { task: "query" }),
    { retries: QG_CONFIG.retry.retrieval, label: "qg.embed" }
  );
  if (vector) embeddingCache.set(key, vector, QG_CONFIG.cache.embeddingTtlMs);
  return vector;
}

async function vectorSearch(query, filters, topK) {
  if (!qdrantService.isConfigured() || !embeddingService.isConfigured()) return [];

  const vector = await embedQuery(query);
  if (!vector) return [];

  const searchFn =
    typeof qdrantService.searchVectors === "function"
      ? () =>
          qdrantService.searchVectors({
            vector,
            topK,
            filters: {
              subject: filters.subject,
              topicId: filters.topicId,
              sourceUrlId: filters.sourceUrlId || filters.bookId || filters.chapterId,
            },
          })
      : () =>
          qdrantService.searchChunks({
            vector,
            topK,
            subject: filters.subject,
            topicId: filters.topicId,
            sourceUrlId: filters.sourceUrlId || filters.bookId || filters.chapterId,
          });

  const hits = await withRetry(searchFn, {
    retries: QG_CONFIG.retry.retrieval,
    label: "qg.vectorSearch",
  });

  return (hits || []).map((hit) =>
    normalizeChunk(hit, "vector", typeof hit.score === "number" ? hit.score : 0)
  );
}

async function keywordSearch(query, filters, topK) {
  let chunks = [];
  let scores = [];

  if (filters.topicId) {
    const res = await mongoRetriever.retrieve(filters.topicId, query, topK);
    chunks = res.chunks || [];
    scores = res.scores || [];
  } else if (filters.sourceUrlId || filters.chapterId || filters.bookId) {
    const id = filters.sourceUrlId || filters.chapterId || filters.bookId;
    const res = await mongoRetriever.retrieveByChapter(id, query, topK);
    chunks = res.chunks || [];
    scores = res.scores || [];
  } else if (filters.subject) {
    const chapters = await SourceUrl.find({ subject: filters.subject }).select("_id").lean();
    const res = await mongoRetriever.retrieveBySourceIds(
      chapters.map((c) => c._id),
      query,
      topK
    );
    chunks = res.chunks || [];
    scores = res.scores || [];
  } else {
    return [];
  }

  return chunks.map((c, i) => {
    const n = normalizeChunk(c, "keyword", scores[i] || 0);
    n.subject = n.subject || filters.subject || "";
    return n;
  });
}

/**
 * Metadata-oriented boost: prefer chunks whose heading/subTopic/book match filters.
 */
async function metadataSearch(query, filters, topK) {
  const mongoFilter = {};
  if (filters.topicId) mongoFilter.topicId = filters.topicId;
  if (filters.sourceUrlId || filters.chapterId || filters.bookId) {
    mongoFilter.sourceUrlId = filters.sourceUrlId || filters.chapterId || filters.bookId;
  }

  // Current affairs date window
  if (filters.dateFrom || filters.dateTo) {
    // ContentChunk may not have publishedAt; filter via SourceUrl if needed
  }

  if (!Object.keys(mongoFilter).length && !filters.subject) return [];

  let q = ContentChunk.find(mongoFilter).sort({ order: 1 }).limit(Math.min(200, topK * 10));
  if (filters.subject && !mongoFilter.sourceUrlId && !mongoFilter.topicId) {
    const chapters = await SourceUrl.find({ subject: filters.subject }).select("_id title book chapter").lean();
    const ids = chapters.map((c) => c._id);
    if (!ids.length) return [];
    q = ContentChunk.find({ sourceUrlId: { $in: ids } })
      .sort({ order: 1 })
      .limit(Math.min(200, topK * 10));
  }

  const rows = await q
    .select("_id heading text order tokenCount sourceUrl topicId sourceUrlId page subTopic source")
    .lean();

  const terms = String(query || "")
    .toLowerCase()
    .split(/[^a-z0-9\u0900-\u097f]+/)
    .filter((t) => t.length > 2);

  const topicTerm = String(filters.topic || "").toLowerCase();
  const bookTerm = String(filters.book || "").toLowerCase();

  const scored = rows.map((c) => {
    const hay = `${c.heading || ""} ${c.subTopic || ""}`.toLowerCase();
    let score = 0;
    for (const t of terms) {
      if (hay.includes(t)) score += 0.15;
    }
    if (topicTerm && hay.includes(topicTerm)) score += 0.4;
    if (bookTerm && hay.includes(bookTerm)) score += 0.3;
    if (filters.subject && String(c.subject || "").toLowerCase() === String(filters.subject).toLowerCase()) {
      score += 0.2;
    }
    return { c, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored
    .filter((r) => r.score > 0)
    .slice(0, topK)
    .map((r) => normalizeChunk(r.c, "metadata", r.score));
}

/**
 * @param {{
 *   query: string,
 *   subject?: string,
 *   topic?: string,
 *   topicId?: string,
 *   sourceUrlId?: string,
 *   chapterId?: string,
 *   bookId?: string,
 *   book?: string,
 *   dateFrom?: string,
 *   dateTo?: string,
 *   excludeChunkIds?: string[],
 * }} params
 */
export async function hybridRetrieve(params = {}) {
  const query = String(params.query || "").trim();
  if (query.length < 2) {
    return { chunks: [], source: "empty", durationMs: 0, query };
  }

  const filters = {
    subject: params.subject || "",
    topic: params.topic || "",
    topicId: params.topicId || "",
    sourceUrlId: params.sourceUrlId || "",
    chapterId: params.chapterId || "",
    bookId: params.bookId || "",
    book: params.book || "",
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  };

  const cacheK = cacheKey([
    "hybrid",
    query,
    filters.subject,
    filters.topicId,
    filters.sourceUrlId || filters.chapterId,
    filters.book,
    QG_CONFIG.hybrid.mergeTopK,
  ]);
  const cached = retrievalCache.get(cacheK);
  if (cached) {
    return { ...cached, fromCache: true };
  }

  const startedAt = Date.now();
  const { vectorTopK, keywordTopK, mergeTopK } = QG_CONFIG.hybrid;

  const [vectorHits, keywordHits, metadataHits] = await Promise.all([
    vectorSearch(query, filters, vectorTopK).catch((err) => {
      console.warn("[qg.hybrid] vector:", err.message);
      return [];
    }),
    keywordSearch(query, filters, keywordTopK).catch((err) => {
      console.warn("[qg.hybrid] keyword:", err.message);
      return [];
    }),
    metadataSearch(query, filters, keywordTopK).catch((err) => {
      console.warn("[qg.hybrid] metadata:", err.message);
      return [];
    }),
  ]);

  let merged = mergeById([...vectorHits, ...keywordHits, ...metadataHits]);

  const exclude = new Set((params.excludeChunkIds || []).map(String));
  if (exclude.size) {
    merged = merged.filter((c) => !exclude.has(chunkIdOf(c)));
  }

  for (const c of merged) {
    c.hybridScore = computeHybridScore(c);
  }
  merged.sort((a, b) => (b.hybridScore || 0) - (a.hybridScore || 0));
  const chunks = merged.slice(0, mergeTopK);

  const sources = new Set();
  for (const c of chunks) for (const s of c.retrievalSources || []) sources.add(s);

  const result = {
    query,
    chunks,
    count: chunks.length,
    source: chunks.length ? [...sources].sort().join("+") : "empty",
    durationMs: Date.now() - startedAt,
    breakdown: {
      vector: vectorHits.length,
      keyword: keywordHits.length,
      metadata: metadataHits.length,
      merged: chunks.length,
    },
    fromCache: false,
  };

  retrievalCache.set(cacheK, result, QG_CONFIG.cache.retrievalTtlMs);
  return result;
}

export default { hybridRetrieve };
