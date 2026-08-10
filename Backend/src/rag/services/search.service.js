/**
 * Semantic search over the shared Knowledge Base (Qdrant → Mongo fallback).
 * Used by POST /api/rag/search and question generation.
 */

import { embeddingService } from "../../services/ai/embedding.service.js";
import { qdrantService } from "../../services/ai/qdrant.service.js";
import { MongoRetriever } from "../../services/ai/retrievers/mongoRetriever.js";
import { RAG_CONFIG } from "../config/rag.config.js";
import { ragLogger } from "../utils/logger.js";
import { withRetry } from "../utils/retry.js";
import { isNonContentChunk, chunkTextOf } from "../../services/content/frontMatterFilter.js";
import { filterChunksByTopic } from "../../services/qg/utils/topicRelevance.js";

const mongoRetriever = new MongoRetriever();

function mapHit(hit, index) {
  const payload = hit.payload || hit || {};
  const score =
    typeof hit.score === "number"
      ? hit.score
      : typeof hit.similarity === "number"
        ? hit.similarity
        : null;

  return {
    rank: index + 1,
    score,
    chunkId: payload.mongoChunkId || payload._id || hit.id || null,
    topicId: payload.topicId || null,
    documentId: payload.sourceUrlId || null,
    subject: payload.subject || "",
    topic: payload.heading || payload.subTopic || "",
    subtopic: payload.subTopic || "",
    heading: payload.heading || "",
    text: payload.text || hit.text || "",
    page: payload.page ?? null,
    source: payload.source || "",
    sourceUrl: payload.sourceUrl || "",
    chunkIndex: payload.chunkNumber ?? payload.order ?? null,
    exam: RAG_CONFIG.exam,
    language: payload.contentLanguage || RAG_CONFIG.language,
  };
}

/**
 * @param {{
 *   query: string,
 *   topK?: number,
 *   filters?: {
 *     subject?: string,
 *     topic?: string,
 *     topicId?: string,
 *     sourceUrlId?: string,
 *     language?: string,
 *     book?: string,
 *     year?: string|number,
 *     exam?: string,
 *   }
 * }} params
 */
export async function searchKnowledgeBase({ query, topK, filters = {} } = {}) {
  const q = String(query || "").trim();
  if (q.length < 2) {
    const err = new Error("query must be at least 2 characters");
    err.status = 400;
    throw err;
  }

  const limit = Math.min(Math.max(Number(topK) || RAG_CONFIG.searchTopK, 1), 30);
  const timer = ragLogger.timed("rag.search");

  let vector = null;
  if (embeddingService.isConfigured()) {
    vector = await withRetry(() => embeddingService.generateEmbedding(q, { task: "query" }), {
      retries: RAG_CONFIG.retry.embeddings,
      label: "rag.embedQuery",
    });
  }

  let hits = [];
  let source = "empty";

  if (vector && qdrantService.isConfigured()) {
    try {
      const raw = await withRetry(
        () =>
          qdrantService.searchVectors({
            vector,
            topK: limit,
            filters: {
              subject: filters.subject,
              topicId: filters.topicId,
              sourceUrlId: filters.sourceUrlId || filters.documentId,
            },
          }),
        { retries: RAG_CONFIG.retry.vectors, label: "rag.qdrantSearch" }
      );
      hits = (raw || []).map(mapHit);
      source = "qdrant";
    } catch (err) {
      ragLogger.warn("Qdrant search failed; falling back to Mongo", {
        error: err.message,
      });
    }
  }

  if (!hits.length) {
    // Keyword fallback over Mongo chunks (same KB as admin notes)
    const subject = String(filters.subject || "").trim();
    const sourceUrlId = filters.sourceUrlId || filters.documentId;
    let mongoChunks = [];
    let scores = [];

    if (sourceUrlId) {
      const res = await mongoRetriever.retrieveByChapter(sourceUrlId, q, limit);
      mongoChunks = res.chunks || [];
      scores = res.scores || [];
    } else if (filters.topicId) {
      const res = await mongoRetriever.retrieve(filters.topicId, q, limit);
      mongoChunks = res.chunks || [];
      scores = res.scores || [];
    } else if (subject) {
      const { default: SourceUrl } = await import("../../models/SourceUrl.js");
      const chapters = await SourceUrl.find({ subject }).select("_id").lean();
      const res = await mongoRetriever.retrieveBySourceIds(
        chapters.map((c) => c._id),
        q,
        limit
      );
      mongoChunks = res.chunks || [];
      scores = res.scores || [];
    }

    hits = (mongoChunks || []).map((c, i) =>
      mapHit(
        {
          score: scores[i] ?? null,
          payload: {
            mongoChunkId: String(c._id || ""),
            topicId: String(c.topicId || ""),
            sourceUrlId: String(c.sourceUrlId || ""),
            subject: c.subject || subject,
            heading: c.heading || "",
            text: c.text || "",
            page: c.page ?? null,
            source: c.source || "notes",
            sourceUrl: c.sourceUrl || "",
            chunkNumber: c.chunkNumber ?? c.order,
            subTopic: c.subTopic || "",
            contentLanguage: c.contentLanguage || "",
          },
        },
        i
      )
    );
    source = hits.length ? "mongo" : "empty";
  }

  // Optional post-filters when payload carried them
  if (filters.language) {
    const lang = String(filters.language).toLowerCase();
    hits = hits.filter((h) => !h.language || String(h.language).toLowerCase() === lang);
  }

  hits = hits.filter(
    (h) =>
      !isNonContentChunk({
        text: chunkTextOf(h),
        heading: h.heading || h.topic,
        topic: h.topic,
        subTopic: h.subtopic,
        page: h.page,
      })
  );

  const topicFilter = String(filters.topic || "").trim();
  if (topicFilter) {
    const tf = filterChunksByTopic(
      hits.map((h) => ({
        ...h,
        text: h.text || chunkTextOf(h),
        heading: h.heading || h.topic || "",
      })),
      topicFilter
    );
    hits = tf.chunks.length ? tf.chunks : [];
  }

  const durationMs = timer.end({
    query: q.slice(0, 80),
    hits: hits.length,
    source,
    subject: filters.subject || "",
  });

  return {
    query: q,
    source,
    count: hits.length,
    durationMs,
    embeddingConfigured: embeddingService.isConfigured(),
    qdrantConfigured: qdrantService.isConfigured(),
    chunks: hits.slice(0, limit),
  };
}

export default { searchKnowledgeBase };
