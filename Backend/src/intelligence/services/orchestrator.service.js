import { embeddingService } from "../../services/ai/embedding.service.js";
import { knowledgeQdrant } from "./qdrantKnowledge.service.js";
import { embeddingRepo, syncLogRepo, searchLogRepo } from "../repositories/index.js";
import { enqueueDocumentIndexing, enqueueRetryFailed } from "../workers/index.js";
import { getIntelligenceQueueMode } from "../queues/queueManager.js";
import { indexProcessedDocument } from "./embeddingIndex.service.js";
import { processedDocRepo } from "../../processing/repositories/index.js";

/**
 * Called from processing embedding stage — real indexing (replaces placeholder).
 */
export async function runIntelligenceForProcessed(processed) {
  const job = await enqueueDocumentIndexing({
    processedDocumentId: processed._id,
    documentId: processed.documentId,
  });
  return {
    status: "queued",
    message: "Knowledge intelligence embedding + Qdrant sync queued",
    embeddingStatus: "queued",
    qdrantSyncStatus: "queued",
    job,
  };
}

export async function getIntelligenceDashboard({ page = 1, limit = 20, status } = {}) {
  const filter = {};
  if (status) filter.status = status;
  const [items, total] = await embeddingRepo.list(filter, { page, limit });
  const stats = await embeddingRepo.stats();
  const qdrant = await knowledgeQdrant.health();
  const failed = await embeddingRepo.findFailed(10);
  const syncLogs = await syncLogRepo.list({}, 15);

  return {
    stats,
    qdrant,
    embedding: {
      configured: embeddingService.isConfigured(),
      provider: embeddingService.getProviderLabel?.() || embeddingService.getProvider(),
      model: embeddingService.getModelName(),
      dimension: embeddingService.getDimension(),
    },
    queueMode: getIntelligenceQueueMode(),
    items,
    failed,
    syncLogs,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function reindexDocument(documentId) {
  const processed = await processedDocRepo.findByDocumentId(documentId);
  if (!processed) {
    const err = new Error("Processed document not found — run processing engine first");
    err.statusCode = 404;
    throw err;
  }
  return enqueueDocumentIndexing({
    processedDocumentId: processed._id,
    documentId,
  });
}

export async function retryFailed(documentId) {
  return enqueueRetryFailed(documentId);
}

export async function syncNow(processedDocumentId) {
  return indexProcessedDocument(processedDocumentId);
}

export async function getSearchHistory(userId, limit = 50) {
  return searchLogRepo.history(userId, limit);
}
