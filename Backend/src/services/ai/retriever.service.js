import { MongoRetriever } from "./retrievers/mongoRetriever.js";
import { notesService } from "../notes/notes.service.js";
import { embeddingService } from "./embedding.service.js";
import { qdrantService } from "./qdrant.service.js";

const MAX_CONTEXT_TOKENS = parseInt(process.env.NOTES_BATCH_CONTEXT_TOKENS, 10) || 1100;
const CHUNKS_PER_BATCH = parseInt(process.env.NOTES_CHUNKS_PER_BATCH, 10) || 5;
const CACHE_TTL_MS = parseInt(process.env.NOTES_RETRIEVAL_CACHE_MS, 10) || 10 * 60 * 1000;

const RAG_QUERY_ANGLES = [
  (topic, subject) => `${subject} ${topic}`,
  (topic) => `${topic} key facts features`,
  (topic) => `${topic} dates chronology timeline`,
  (topic) => `${topic} significance importance UPSC`,
  (topic) => `${topic} places locations geography`,
  (topic) => `${topic} personalities leaders`,
  (topic) => `${topic} causes effects impact`,
  (topic) => `${topic} comparison difference`,
];

/**
 * RetrieverService — facade over vector / keyword retrievers.
 * Business logic depends on this class, not a specific vector DB.
 */
class RetrieverService {
  constructor() {
    this.mongoRetriever = new MongoRetriever();
    this.cache = new Map();
  }

  /**
   * RAG context for one generation batch — keyword retrieval + small chunk subset (low tokens).
   * @param {{ topicId: string, batchIndex?: number, topicName?: string, subject?: string }} params
   */
  async getContextForBatch({ topicId, batchIndex = 0, topicName = "", subject = "" }) {
    const note = await notesService.getNoteByTopic(topicId);
    if (!note?.chunks?.length) return "";
    const queryFn = RAG_QUERY_ANGLES[batchIndex % RAG_QUERY_ANGLES.length];
    const query = queryFn(topicName, subject);
    const selected = await this.retrieveTopChunks({ topicId, query, topK: CHUNKS_PER_BATCH });
    return formatChunksAsContext(selected, MAX_CONTEXT_TOKENS);
  }

  /**
   * Split chunks into slices for batched generation (saves tokens — each API call gets a subset).
   * @param {{ topicId: string, batchCount?: number }} params
   */
  async retrieveTopChunks({ topicId, query = "", topK = CHUNKS_PER_BATCH }) {
    const cacheKey = `${topicId}::${query}::${topK}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
      return cached.chunks;
    }

    let selected = [];
    if (qdrantService.isConfigured() && embeddingService.isConfigured()) {
      const queryVector = await embeddingService.embed(query);
      if (queryVector) {
        const vectorHits = await qdrantService.searchChunks({ vector: queryVector, topicId, topK });
        selected = vectorHits.map((hit) => ({
          _id: hit.id,
          heading: hit.payload?.heading || "",
          text: hit.payload?.text || "",
          order: hit.payload?.order || 0,
          tokenCount: hit.payload?.tokenCount || 0,
          sourceUrl: hit.payload?.sourceUrl || "",
        }));
      }
    }

    if (!selected.length) {
      const { chunks } = await this.mongoRetriever.retrieve(topicId, query, topK);
      selected = chunks;
    }

    this.cache.set(cacheKey, {
      createdAt: Date.now(),
      chunks: selected.slice(0, topK),
    });
    return selected.slice(0, topK);
  }
}

function formatChunksAsContext(chunks, maxTokens) {
  const out = [];
  let used = 0;
  for (let i = 0; i < (chunks || []).length; i += 1) {
    const c = chunks[i];
    const tokens = c.tokenCount || Math.ceil(String(c.text || "").split(/\s+/).length * 1.3);
    if (used >= maxTokens) break;
    if (used + tokens > maxTokens && out.length > 0) break;
    const heading = c.heading ? `# ${c.heading}` : `# Chunk ${i + 1}`;
    out.push(`${heading}\n${c.text}`);
    used += tokens;
  }
  return out.join("\n\n");
}

export const retrieverService = new RetrieverService();
export { MAX_CONTEXT_TOKENS, CHUNKS_PER_BATCH };
export default retrieverService;
