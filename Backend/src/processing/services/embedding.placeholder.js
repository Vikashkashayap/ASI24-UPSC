/**
 * Embedding stage placeholder (legacy). Prefer intelligence engine.
 * Kept for fallback when intelligence module fails to load.
 */
export async function enqueueEmbeddingPlaceholder(processed) {
  return {
    status: "skipped",
    message: "Intelligence engine unavailable — embedding skipped",
    embeddingStatus: "skipped",
    qdrantSyncStatus: "skipped",
    processedDocumentId: processed?._id,
  };
}
