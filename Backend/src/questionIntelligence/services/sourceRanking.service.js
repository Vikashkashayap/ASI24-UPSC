import { hybridSearch } from "../../intelligence/services/hybridSearch.service.js";
import { relatedConcepts } from "../../intelligence/data/concepts.js";

/**
 * Rank knowledge sources for a topic using Intelligence hybrid search.
 */
export async function rankSources({
  query,
  subject,
  topic,
  chapter,
  topK = 12,
} = {}) {
  const q =
    String(query || "").trim() ||
    [subject, topic, chapter].filter(Boolean).join(" ").trim();

  if (!q) {
    return { sources: [], concepts: [], query: "" };
  }

  const concepts = relatedConcepts(q);
  const expanded = [q, ...concepts.slice(0, 4)].join(" ");

  const result = await hybridSearch({
    query: expanded,
    filters: {
      ...(subject ? { subject } : {}),
      ...(topic ? { topic } : {}),
      ...(chapter ? { chapter } : {}),
    },
    topK,
    searchType: "hybrid",
  });

  const sources = (result.results || []).map((r, idx) => ({
    rank: idx + 1,
    chunkId: r.chunkId,
    documentId: r.documentId,
    score: r.score,
    similarity: r.similarity,
    subject: r.subject,
    chapter: r.chapter,
    topic: r.topic,
    page: r.page,
    source: r.source,
    title: r.document?.title || "",
    // Keep excerpts tight — full text is trimmed again per LLM stage
    excerpt: String(r.chunk || "").slice(0, 320),
  }));

  const maxSources = Math.min(8, sources.length);
  const contextParts = sources.slice(0, maxSources).map(
    (s, i) => `[S${i + 1}|${s.topic || s.subject || ""}|p${s.page ?? "-"}]\n${s.excerpt}`
  );
  let contextText = contextParts.join("\n\n");
  const maxContextChars = Number(process.env.QI_CONTEXT_MAX_CHARS || 4200);
  if (contextText.length > maxContextChars) {
    contextText = `${contextText.slice(0, maxContextChars - 1)}…`;
  }

  return {
    query: q,
    sources,
    concepts: result.concepts || concepts,
    contextText,
  };
}
