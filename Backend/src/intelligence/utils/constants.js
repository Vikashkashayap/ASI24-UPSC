export const INTELLIGENCE_QUEUES = {
  EMBEDDING: "intelligence-embedding",
  SYNC: "intelligence-qdrant-sync",
  RETRY: "intelligence-retry",
  DELETE: "intelligence-delete",
};

export const EMBEDDING_STATUSES = [
  "Pending",
  "Queued",
  "Generating",
  "Completed",
  "Failed",
  "Retry",
];

export function getKnowledgeCollection() {
  return (
    String(process.env.KNOWLEDGE_QDRANT_COLLECTION || "").trim() ||
    "knowledge_intelligence"
  );
}
