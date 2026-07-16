/**
 * Central RAG configuration — Knowledge Base ↔ Topic Practice shared store.
 * Collection defaults to notes_chunks so existing admin KB stays compatible.
 */

export const RAG_CONFIG = {
  collection: process.env.QDRANT_COLLECTION || "notes_chunks",
  /** Alternate name from product docs; env wins. */
  legacyCollectionAlias: "upsc_prelims",
  vectorSize:
    parseInt(process.env.QDRANT_VECTOR_SIZE || process.env.EMBEDDING_DIMENSION, 10) || 1024,
  embeddingProvider: process.env.EMBEDDING_PROVIDER || "jina",
  embeddingModel: process.env.JINA_MODEL || process.env.EMBEDDING_MODEL || "jina-embeddings-v4",
  exam: process.env.RAG_EXAM || "UPSC Prelims",
  language: process.env.RAG_DEFAULT_LANGUAGE || "en",

  chunkMinWords: parseInt(process.env.PRACTICE_CHUNK_MIN_WORDS, 10) || 500,
  chunkMaxWords: parseInt(process.env.PRACTICE_CHUNK_MAX_WORDS, 10) || 800,
  chunkOverlapWords: parseInt(process.env.PRACTICE_CHUNK_OVERLAP_WORDS, 10) || 100,

  searchTopK: parseInt(process.env.RAG_SEARCH_TOP_K || process.env.QG_MERGE_TOP_K, 10) || 20,
  generateTopK: parseInt(process.env.NOTES_RAG_TOP_K || process.env.QG_FINAL_TOP_K, 10) || 5,
  maxUploadBytes: parseInt(process.env.RAG_MAX_UPLOAD_BYTES, 10) || 50 * 1024 * 1024,

  retry: {
    embeddings: parseInt(process.env.RAG_EMBED_RETRIES, 10) || 3,
    vectors: parseInt(process.env.RAG_VECTOR_RETRIES, 10) || 3,
    llm: parseInt(process.env.RAG_LLM_RETRIES, 10) || 3,
    baseDelayMs: parseInt(process.env.RAG_RETRY_BASE_MS, 10) || 800,
  },

  cacheTtlHours: parseInt(process.env.RAG_QUESTION_CACHE_HOURS, 10) || 168,
  allowOpenKnowledge: process.env.PRACTICE_ALLOW_OPEN_KNOWLEDGE === "true",
};

export default RAG_CONFIG;
