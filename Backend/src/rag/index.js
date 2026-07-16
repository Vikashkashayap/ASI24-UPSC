/**
 * Production RAG module — shared Knowledge Base for MentorsDaily UPSC Prelims.
 *
 * Data model (already used by Admin → Knowledge Base UI):
 *   Subject (string) → SourceUrl (Document) → ContentTopic → ContentChunk → Qdrant
 *
 * Topic Practice pulls from the SAME store via retriever / batchGenerator.
 */

export { default as ragRoutes } from "./routes/ragRoutes.js";
export { RAG_CONFIG } from "./config/rag.config.js";
export { searchKnowledgeBase } from "./services/search.service.js";
export { generateQuestionsFromRag } from "./services/questionGen.service.js";
export {
  ingestPdfDocument,
  listDocuments,
  deleteDocument,
  reindexDocument,
  collectionStats,
} from "./services/ingest.service.js";
