/**
 * Re-rank hybrid candidates → Top N context chunks.
 */

import { QG_CONFIG } from "../config/qg.config.js";
import { rerankDocuments, isRerankerConfigured } from "../providers/reranker.provider.js";

/**
 * @param {{ query: string, chunks: object[], topN?: number }} params
 */
export async function rerankChunks({ query, chunks = [], topN } = {}) {
  const n = topN || QG_CONFIG.hybrid.finalTopK;
  if (!chunks.length) return { chunks: [], provider: "none", durationMs: 0 };

  const startedAt = Date.now();

  // Already small and sorted by hybrid score — still try cross-encoder when configured
  if (!isRerankerConfigured()) {
    const sorted = [...chunks].sort((a, b) => (b.hybridScore || 0) - (a.hybridScore || 0));
    return {
      chunks: sorted.slice(0, n).map((c, i) => ({
        ...c,
        rerankScore: c.hybridScore || 0,
        rerankRank: i + 1,
      })),
      provider: "hybrid_passthrough",
      durationMs: Date.now() - startedAt,
    };
  }

  const documents = chunks.map((c) => {
    const heading = c.heading ? `${c.heading}\n` : "";
    return `${heading}${String(c.text || "").slice(0, 4000)}`;
  });

  const ranked = await rerankDocuments({ query, documents, topN: n });
  const out = [];
  for (let i = 0; i < ranked.length; i += 1) {
    const row = ranked[i];
    const chunk = chunks[row.index];
    if (!chunk) continue;
    out.push({
      ...chunk,
      rerankScore: row.relevanceScore,
      rerankRank: i + 1,
    });
  }

  // If provider returned nothing usable, fall back to hybrid order
  if (!out.length) {
    const sorted = [...chunks].sort((a, b) => (b.hybridScore || 0) - (a.hybridScore || 0));
    return {
      chunks: sorted.slice(0, n),
      provider: "hybrid_fallback",
      durationMs: Date.now() - startedAt,
    };
  }

  return {
    chunks: out.slice(0, n),
    provider: QG_CONFIG.reranker.provider,
    durationMs: Date.now() - startedAt,
  };
}

export default { rerankChunks };
