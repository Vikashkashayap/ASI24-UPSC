import ContentChunk from "../../../models/ContentChunk.js";
import { embeddingService } from "../embedding.service.js";

/**
 * MongoDB keyword + optional embedding retriever.
 * Swap with Pinecone/Qdrant/Chroma/FAISS retriever implementing the same interface.
 */
export class MongoRetriever {
  /**
   * @param {string} topicId
   * @param {string} query
   * @param {number} topK
   * @returns {Promise<{ chunks: object[], scores: number[] }>}
   */
  async retrieve(topicId, query, topK = 12) {
    const chunks = await ContentChunk.find({ topicId })
      .sort({ order: 1 })
      .select("_id heading text order tokenCount sourceUrl")
      .lean();

    if (!chunks.length) return { chunks: [], scores: [] };

    const queryTerms = tokenize(query);
    const scored = chunks.map((chunk) => ({
      chunk,
      score: keywordScore(chunk.text, queryTerms) + keywordScore(chunk.heading || "", queryTerms) * 0.5,
    }));

    scored.sort((a, b) => b.score - a.score);

    // If embeddings available and explicitly enabled, re-rank top candidates
    if (process.env.NOTES_USE_EMBEDDINGS === "true" && embeddingService.isConfigured() && query.trim()) {
      const queryVec = await embeddingService.generateEmbedding(query, { task: "query" });
      if (queryVec) {
        const candidates = scored.slice(0, Math.min(scored.length, topK * 2));
        for (const row of candidates) {
          const vec = await embeddingService.generateEmbedding(row.chunk.text.slice(0, 2000), {
            task: "passage",
          });
          if (vec) {
            row.score += embeddingService.cosineSimilarity(queryVec, vec) * 10;
          }
        }
        candidates.sort((a, b) => b.score - a.score);
        const top = candidates.slice(0, topK);
        return {
          chunks: top.map((r) => r.chunk),
          scores: top.map((r) => r.score),
        };
      }
    }

    const top = scored.slice(0, topK);
    return {
      chunks: top.map((r) => r.chunk),
      scores: top.map((r) => r.score),
    };
  }

  /**
   * Search chunks across an entire chapter (PDF / notes SourceUrl).
   * @param {string} sourceUrlId
   * @param {string} query
   * @param {number} topK
   */
  async retrieveByChapter(sourceUrlId, query, topK = 12) {
    const chunks = await ContentChunk.find({ sourceUrlId })
      .sort({ order: 1 })
      .select("_id heading text order tokenCount sourceUrl topicId page subTopic source")
      .lean();

    if (!chunks.length) return { chunks: [], scores: [] };

    const queryTerms = tokenize(query);
    const scored = chunks.map((chunk) => ({
      chunk,
      score:
        keywordScore(chunk.text, queryTerms) +
        keywordScore(chunk.heading || "", queryTerms) * 0.6 +
        keywordScore(chunk.subTopic || "", queryTerms) * 0.8,
    }));

    scored.sort((a, b) => b.score - a.score);

    const matched = scored.filter((r) => r.score > 0);
    const pool = matched.length ? matched : [];

    if (
      process.env.NOTES_USE_EMBEDDINGS === "true" &&
      embeddingService.isConfigured() &&
      query.trim() &&
      pool.length
    ) {
      const queryVec = await embeddingService.generateEmbedding(query, { task: "query" });
      if (queryVec) {
        const candidates = pool.slice(0, Math.min(pool.length, topK * 3));
        for (const row of candidates) {
          const vec = await embeddingService.generateEmbedding(row.chunk.text.slice(0, 2000), {
            task: "passage",
          });
          if (vec) {
            row.score += embeddingService.cosineSimilarity(queryVec, vec) * 10;
          }
        }
        candidates.sort((a, b) => b.score - a.score);
        const top = candidates.slice(0, topK);
        return {
          chunks: top.map((r) => r.chunk),
          scores: top.map((r) => r.score),
        };
      }
    }

    const top = pool.slice(0, topK);
    return {
      chunks: top.map((r) => r.chunk),
      scores: top.map((r) => r.score),
    };
  }

  /**
   * Search chunks across multiple chapters (PDF + website) by sourceUrlId list.
   */
  async retrieveBySourceIds(sourceUrlIds, query, topK = 12) {
    const ids = (sourceUrlIds || []).filter(Boolean);
    if (!ids.length) return { chunks: [], scores: [] };

    const chunks = await ContentChunk.find({ sourceUrlId: { $in: ids } })
      .sort({ order: 1 })
      .select("_id heading text order tokenCount sourceUrl topicId page subTopic source sourceUrlId")
      .lean();

    if (!chunks.length) return { chunks: [], scores: [] };

    const queryTerms = tokenize(query);
    const scored = chunks.map((chunk) => ({
      chunk,
      score:
        keywordScore(chunk.text, queryTerms) +
        keywordScore(chunk.heading || "", queryTerms) * 0.6 +
        keywordScore(chunk.subTopic || "", queryTerms) * 0.8,
    }));

    scored.sort((a, b) => b.score - a.score);
    const matched = scored.filter((r) => r.score > 0);
    const top = matched.slice(0, topK);
    return {
      chunks: top.map((r) => r.chunk),
      scores: top.map((r) => r.score),
    };
  }
}

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((t) => t.length > 2);
}

function keywordScore(text, terms) {
  if (!terms.length) return 0;
  const hay = String(text || "").toLowerCase();
  let score = 0;
  for (const term of terms) {
    if (hay.includes(term)) score += 1;
  }
  return score;
}

export default MongoRetriever;
