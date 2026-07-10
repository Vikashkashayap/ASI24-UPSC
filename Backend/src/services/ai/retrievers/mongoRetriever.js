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
      const queryVec = await embeddingService.embed(query);
      if (queryVec) {
        const candidates = scored.slice(0, Math.min(scored.length, topK * 2));
        for (const row of candidates) {
          const vec = await embeddingService.embed(row.chunk.text.slice(0, 2000));
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
