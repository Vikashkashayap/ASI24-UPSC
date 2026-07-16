import crypto from "crypto";
import { MongoRetriever } from "./retrievers/mongoRetriever.js";
import { notesService } from "../notes/notes.service.js";
import { embeddingService } from "./embedding.service.js";
import { qdrantService } from "./qdrant.service.js";
import { estimateTokens } from "./tokenEstimator.service.js";
import { prepareContextForBatch } from "./contextReducer.service.js";
import SourceUrl from "../../models/SourceUrl.js";
import { retrieveAndBuildContext } from "../qg/index.js";
import { QG_CONFIG } from "../qg/config/qg.config.js";

/** Final context chunks after hybrid retrieve + rerank (enterprise pipeline). */
const RAG_TOP_K =
  parseInt(process.env.NOTES_RAG_TOP_K || process.env.QG_FINAL_TOP_K || process.env.NOTES_CHUNKS_PER_BATCH, 10) ||
  QG_CONFIG.hybrid.finalTopK ||
  5;
/** Max tokens of retrieved notes in the prompt context body. */
const MAX_CONTEXT_TOKENS =
  parseInt(process.env.NOTES_BATCH_CONTEXT_TOKENS || process.env.QG_CONTEXT_MAX_TOKENS, 10) ||
  QG_CONFIG.context.maxTokens ||
  2800;
/** Subject-wide keyword search budget. */
const KEYWORD_CONTEXT_TOKENS =
  parseInt(process.env.NOTES_KEYWORD_CONTEXT_TOKENS, 10) || Math.min(MAX_CONTEXT_TOKENS, 2400);
/** Hard ceiling for full prompt (system + user) — never exceed. */
const MAX_PROMPT_TOKENS = parseInt(process.env.PRACTICE_MAX_PROMPT_TOKENS, 10) || 4500;
const CACHE_TTL_MS = parseInt(process.env.NOTES_RETRIEVAL_CACHE_MS, 10) || 10 * 60 * 1000;
const CHUNKS_PER_BATCH = RAG_TOP_K;
const USE_HYBRID_PIPELINE = process.env.QG_HYBRID_RETRIEVAL !== "false";

const RAG_QUERY_ANGLES = [
  (topic, subject) => `${subject} ${topic}`,
  (topic) => `${topic} key facts features provisions`,
  (topic) => `${topic} dates chronology timeline`,
  (topic) => `${topic} significance importance UPSC prelims`,
  (topic) => `${topic} places locations institutions`,
  (topic) => `${topic} personalities leaders committees`,
  (topic) => `${topic} causes effects impact criticism`,
  (topic) => `${topic} comparison difference articles`,
];

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

/**
 * Drop duplicate / near-duplicate chunks (same id or same text fingerprint).
 * @param {object[]} chunks
 */
export function dedupeChunks(chunks = []) {
  const seenIds = new Set();
  const seenFp = new Set();
  const out = [];
  for (const c of chunks || []) {
    if (!c?.text?.trim()) continue;
    const id = String(c._id || c.mongoChunkId || c.id || "");
    const fp = textFingerprint(c.text);
    if (id && seenIds.has(id)) continue;
    if (seenFp.has(fp)) continue;
    if (id) seenIds.add(id);
    seenFp.add(fp);
    out.push(c);
  }
  return out;
}

/**
 * RetrieverService — Qdrant (Jina embeddings) → Mongo keyword → optional live HTML fallback.
 * LLM receives only top-k relevant chunks, never the whole PDF/page.
 */
class RetrieverService {
  constructor() {
    this.mongoRetriever = new MongoRetriever();
    this.cache = new Map();
  }

  getTopK() {
    return RAG_TOP_K;
  }

  getMaxContextTokens() {
    return MAX_CONTEXT_TOKENS;
  }

  getMaxPromptTokens() {
    return MAX_PROMPT_TOKENS;
  }

  /**
   * RAG context for one generation batch.
   * @param {{
   *   topicId: string,
   *   batchIndex?: number,
   *   topicName?: string,
   *   subject?: string,
   *   excludeChunkIds?: string[],
   *   allowLiveFallback?: boolean,
   * }} params
   * @returns {Promise<{
   *   contextText: string,
   *   chunks: object[],
   *   source: "qdrant"|"mongo"|"stored_chunks"|"live_fallback"|"empty",
   *   tokens: number,
   *   chunkIds: string[],
   * }>}
   */
  async getContextForBatch({
    topicId,
    batchIndex = 0,
    topicName = "",
    subject = "",
    excludeChunkIds = [],
    allowLiveFallback = false,
  }) {
    const note = await notesService.getNoteByTopic(topicId);
    if (!note) {
      return { contextText: "", chunks: [], source: "empty", tokens: 0, chunkIds: [] };
    }

    const queryFn = RAG_QUERY_ANGLES[batchIndex % RAG_QUERY_ANGLES.length];
    const query = queryFn(topicName || note.topic.name, subject || note.topic.subject);

    if (USE_HYBRID_PIPELINE) {
      const built = await retrieveAndBuildContext({
        query,
        subject: subject || note.topic.subject || "",
        topic: topicName || note.topic.name || "",
        topicId,
        excludeChunkIds,
        maxTokens: MAX_CONTEXT_TOKENS,
      });

      if (built.contextText?.length >= 80) {
        return {
          contextText: built.contextText,
          chunks: built.chunks,
          source: built.source || "hybrid",
          tokens: built.tokens,
          chunkIds: built.chunkIds,
          hybrid: true,
        };
      }
    }

    let selected = await this.retrieveTopChunks({
      topicId,
      query,
      topK: RAG_TOP_K + (excludeChunkIds?.length || 0),
    });
    let source = selected._source || "mongo";

    selected = dedupeChunks(selected).filter((c) => {
      const id = String(c._id || c.mongoChunkId || "");
      return !id || !excludeChunkIds.includes(id);
    });

    // Prefer stored Mongo chunks if vector search returned nothing
    if (!selected.length && note.chunks?.length) {
      selected = dedupeChunks(
        [...note.chunks].sort((a, b) => (a.order || 0) - (b.order || 0)).slice(0, RAG_TOP_K)
      );
      const fresh = selected.filter((c) => {
        const id = String(c._id || c.mongoChunkId || "");
        return !id || !excludeChunkIds.includes(id);
      });
      selected = fresh.length ? fresh : selected.slice(0, RAG_TOP_K);
      source = "stored_chunks";
    }

    if (!selected.length) {
      const recycled = await this.retrieveTopChunks({
        topicId,
        query,
        topK: RAG_TOP_K,
      });
      selected = dedupeChunks(recycled).slice(0, RAG_TOP_K);
      source = recycled._source || source || "mongo";
      if (selected.length) {
        console.log(`[retriever] recycled ${selected.length} KB chunks for topic ${topicId} (excludes exhausted)`);
      }
    }

    if (!selected.length && allowLiveFallback) {
      const url = String(note.topic.sourceUrl || "");
      if (/^https?:\/\//i.test(url)) {
        try {
          const live = await notesService.fetchAndCleanTopicNotes(topicId);
          const prepared = prepareContextForBatch(live.cleanText, {
            batchIndex,
            targetTokens: MAX_CONTEXT_TOKENS,
          });
          if (prepared.context && prepared.context.length >= 80) {
            return {
              contextText: prepared.context,
              chunks: [],
              source: "live_fallback",
              tokens: prepared.tokens,
              chunkIds: [],
            };
          }
        } catch (err) {
          console.warn("[retriever] live fallback failed:", err.message);
        }
      }
    }

    selected = selected.slice(0, RAG_TOP_K);
    const contextText = formatChunksAsContext(selected, MAX_CONTEXT_TOKENS);
    const tokens = estimateTokens(contextText);

    return {
      contextText,
      chunks: selected,
      source: selected.length ? source : "empty",
      tokens,
      chunkIds: selected.map((c) => String(c._id || c.mongoChunkId || "")).filter(Boolean),
    };
  }

  /**
   * Chapter-scoped RAG: search PDF/notes chunks by free-text topic keyword.
   * Used when admin types a topic instead of picking list checkboxes.
   */
  async getContextForChapterQuery({
    chapterId,
    query,
    batchIndex = 0,
    subject = "",
    excludeChunkIds = [],
  }) {
    const q = String(query || "").trim();
    if (!chapterId || !q) {
      return { contextText: "", chunks: [], source: "empty", tokens: 0, chunkIds: [] };
    }

    const queryFn = RAG_QUERY_ANGLES[batchIndex % RAG_QUERY_ANGLES.length];
    const angledQuery = queryFn(q, subject || "");

    let selected = [];
    let source = "mongo";

    if (qdrantService.isConfigured() && embeddingService.isConfigured()) {
      const queryVector = await embeddingService.generateEmbedding(angledQuery, { task: "query" });
      if (queryVector) {
        const vectorHits = await qdrantService.searchChunks({
          vector: queryVector,
          sourceUrlId: String(chapterId),
          topK: RAG_TOP_K + (excludeChunkIds?.length || 0),
        });
        if (vectorHits?.length) {
          source = "qdrant";
          selected = vectorHits.map((hit) => ({
            _id: hit.payload?.mongoChunkId || hit.id,
            mongoChunkId: hit.payload?.mongoChunkId || "",
            heading: hit.payload?.heading || "",
            text: hit.payload?.text || "",
            order: hit.payload?.order || 0,
            tokenCount: hit.payload?.tokenCount || 0,
            sourceUrl: hit.payload?.sourceUrl || "",
            page: hit.payload?.page ?? null,
            subTopic: hit.payload?.subTopic || "",
            source: hit.payload?.source || "",
            topicId: hit.payload?.topicId || "",
            score: hit.score,
          }));
        }
      }
    }

    if (!selected.length) {
      source = "mongo";
      const { chunks } = await this.mongoRetriever.retrieveByChapter(
        chapterId,
        angledQuery,
        RAG_TOP_K + (excludeChunkIds?.length || 0)
      );
      selected = chunks;
    }

    selected = dedupeChunks(selected).filter((c) => {
      const id = String(c._id || c.mongoChunkId || "");
      return !id || !excludeChunkIds.includes(id);
    });

    // Recycle KB chunks when excludes exhausted — stay on knowledge base
    if (!selected.length && excludeChunkIds?.length) {
      const { chunks } = await this.mongoRetriever.retrieveByChapter(chapterId, angledQuery, RAG_TOP_K);
      selected = dedupeChunks(chunks).slice(0, RAG_TOP_K);
      source = "mongo";
      if (selected.length) console.log(`[retriever] recycled ${selected.length} chapter KB chunks`);
    }

    selected = selected.slice(0, RAG_TOP_K);
    const contextText = formatChunksAsContext(selected, MAX_CONTEXT_TOKENS);
    const tokens = estimateTokens(contextText);

    return {
      contextText,
      chunks: selected,
      source: selected.length ? source : "empty",
      tokens,
      chunkIds: selected.map((c) => String(c._id || c.mongoChunkId || "")).filter(Boolean),
      query: angledQuery,
    };
  }

  /**
   * Subject-wide RAG: search ALL PDF + website note chunks for the subject.
   * Minimizes tokens — only top-k matching chunks go to the LLM.
   */
  async getContextForSubjectQuery({
    subject,
    query,
    batchIndex = 0,
    excludeChunkIds = [],
    maxTokens = KEYWORD_CONTEXT_TOKENS,
  }) {
    const subjectStr = String(subject || "").trim();
    const q = String(query || "").trim();
    if (!subjectStr || !q) {
      return { contextText: "", chunks: [], source: "empty", tokens: 0, chunkIds: [] };
    }

    const queryFn = RAG_QUERY_ANGLES[batchIndex % RAG_QUERY_ANGLES.length];
    const angledQuery = queryFn(q, subjectStr);

    if (USE_HYBRID_PIPELINE) {
      const built = await retrieveAndBuildContext({
        query: angledQuery,
        subject: subjectStr,
        topic: q,
        excludeChunkIds,
        maxTokens,
      });
      if (built.contextText?.length >= 80) {
        return {
          contextText: built.contextText,
          chunks: built.chunks,
          source: built.source || "hybrid",
          tokens: built.tokens,
          chunkIds: built.chunkIds,
          query: angledQuery,
          scope: "subject",
          subject: subjectStr,
          hybrid: true,
        };
      }
    }

    const topK = RAG_TOP_K + (excludeChunkIds?.length || 0);
    let selected = [];
    let source = "mongo";

    if (qdrantService.isConfigured() && embeddingService.isConfigured()) {
      const queryVector = await embeddingService.generateEmbedding(angledQuery, { task: "query" });
      if (queryVector) {
        const vectorHits = await qdrantService.searchChunks({
          vector: queryVector,
          subject: subjectStr,
          topK,
        });
        if (vectorHits?.length) {
          source = "qdrant";
          selected = vectorHits.map((hit) => ({
            _id: hit.payload?.mongoChunkId || hit.id,
            mongoChunkId: hit.payload?.mongoChunkId || "",
            heading: hit.payload?.heading || "",
            text: hit.payload?.text || "",
            order: hit.payload?.order || 0,
            tokenCount: hit.payload?.tokenCount || 0,
            sourceUrl: hit.payload?.sourceUrl || "",
            page: hit.payload?.page ?? null,
            subTopic: hit.payload?.subTopic || "",
            source: hit.payload?.source || "",
            topicId: hit.payload?.topicId || "",
            sourceUrlId: hit.payload?.sourceUrlId || "",
            score: hit.score,
          }));
        }
      }
    }

    if (!selected.length) {
      source = "mongo";
      const chapters = await SourceUrl.find({ subject: subjectStr }).select("_id").lean();
      const ids = chapters.map((c) => c._id);
      const { chunks } = await this.mongoRetriever.retrieveBySourceIds(ids, angledQuery, topK);
      selected = chunks;
    }

    selected = dedupeChunks(selected).filter((c) => {
      const id = String(c._id || c.mongoChunkId || "");
      return !id || !excludeChunkIds.includes(id);
    });

    if (!selected.length && excludeChunkIds?.length) {
      const chapters = await SourceUrl.find({ subject: subjectStr }).select("_id").lean();
      const ids = chapters.map((c) => c._id);
      const { chunks } = await this.mongoRetriever.retrieveBySourceIds(ids, angledQuery, RAG_TOP_K);
      selected = dedupeChunks(chunks).slice(0, RAG_TOP_K);
      source = "mongo";
      if (selected.length) console.log(`[retriever] recycled ${selected.length} subject KB chunks`);
    }

    selected = selected.slice(0, RAG_TOP_K);
    const contextText = formatChunksAsContext(selected, maxTokens);
    const tokens = estimateTokens(contextText);

    return {
      contextText,
      chunks: selected,
      source: selected.length ? source : "empty",
      tokens,
      chunkIds: selected.map((c) => String(c._id || c.mongoChunkId || "")).filter(Boolean),
      query: angledQuery,
      scope: "subject",
      subject: subjectStr,
    };
  }

  /**
   * @param {{ topicId: string, query?: string, topK?: number }} params
   */
  async retrieveTopChunks({ topicId, query = "", topK = RAG_TOP_K }) {
    const cacheKey = `${topicId}::${query}::${topK}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
      return annotateSource(cached.chunks, cached.source);
    }

    let selected = [];
    let source = "mongo";

    if (qdrantService.isConfigured() && embeddingService.isConfigured()) {
      const queryVector = await embeddingService.generateEmbedding(query, { task: "query" });
      if (queryVector) {
        const vectorHits = await qdrantService.searchChunks({
          vector: queryVector,
          topicId,
          topK: Math.max(topK, RAG_TOP_K),
        });
        if (vectorHits?.length) {
          source = "qdrant";
          selected = vectorHits.map((hit) => ({
            _id: hit.payload?.mongoChunkId || hit.id,
            mongoChunkId: hit.payload?.mongoChunkId || "",
            heading: hit.payload?.heading || "",
            text: hit.payload?.text || "",
            order: hit.payload?.order || 0,
            tokenCount: hit.payload?.tokenCount || 0,
            sourceUrl: hit.payload?.sourceUrl || "",
            page: hit.payload?.page ?? null,
            subTopic: hit.payload?.subTopic || "",
            source: hit.payload?.source || "",
            score: hit.score,
          }));
        }
      }
    }

    if (!selected.length) {
      source = "mongo";
      const { chunks } = await this.mongoRetriever.retrieve(topicId, query, topK);
      selected = chunks;
    }

    const cleaned = dedupeChunks(selected).slice(0, topK);
    this.cache.set(cacheKey, {
      createdAt: Date.now(),
      chunks: cleaned,
      source,
    });
    return annotateSource(cleaned, source);
  }
}

function annotateSource(chunks, source) {
  const list = chunks || [];
  list._source = source;
  return list;
}

/** Compress chunk body — whitespace / blank lines only (no semantic rewrite). */
function compressChunkText(text) {
  return String(text || "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/** Approx truncate by words to fit an estimated token budget. */
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

/**
 * Merge top chunks into a tight CONTEXT body.
 * Short headings only; compress text; never exceed maxTokens (truncate last/first piece).
 */
function formatChunksAsContext(chunks, maxTokens) {
  const out = [];
  let used = 0;
  const seen = new Set();
  const budget = Math.max(80, maxTokens || MAX_CONTEXT_TOKENS);

  for (let i = 0; i < (chunks || []).length; i += 1) {
    const c = chunks[i];
    const body = compressChunkText(c.text);
    if (!body) continue;

    const fp = textFingerprint(body);
    if (seen.has(fp)) continue;
    seen.add(fp);

    // Minimal meta — heading only (skip SubTopic/Page noise)
    const heading = c.heading ? `# ${String(c.heading).trim().slice(0, 80)}` : "";
    let pieceBody = body;
    let piece = heading ? `${heading}\n${pieceBody}` : pieceBody;
    let tokens = estimateTokens(piece);

    if (used >= budget) break;

    if (used + tokens > budget) {
      const room = budget - used - (heading ? estimateTokens(`${heading}\n`) : 0);
      if (room < 60 && out.length > 0) break;
      pieceBody = truncateToTokenBudget(pieceBody, Math.max(60, room));
      if (!pieceBody) break;
      piece = heading ? `${heading}\n${pieceBody}` : pieceBody;
      tokens = estimateTokens(piece);
      if (tokens < 40) break;
    }

    out.push(piece);
    used += tokens;
    if (used >= budget * 0.98) break;
  }

  return out.join("\n\n");
}

export const retrieverService = new RetrieverService();
export { MAX_CONTEXT_TOKENS, CHUNKS_PER_BATCH, RAG_TOP_K, MAX_PROMPT_TOKENS, KEYWORD_CONTEXT_TOKENS };
export default retrieverService;
