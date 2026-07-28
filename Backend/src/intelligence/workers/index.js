import { INTELLIGENCE_QUEUES } from "../utils/constants.js";
import { registerIntelligenceHandler, enqueueIntelligence } from "../queues/queueManager.js";
import {
  indexProcessedDocument,
  deleteDocumentVectors,
  retryFailedEmbeddings,
} from "../services/embeddingIndex.service.js";
import { processedDocRepo } from "../../processing/repositories/index.js";
import KbDocument from "../../knowledge/models/KbDocument.js";

async function runEmbedJob(data) {
  const { processedDocumentId, documentId } = data;
  const result = await indexProcessedDocument(processedDocumentId);

  const status = result.skipped
    ? "skipped"
    : result.ok
      ? "completed"
      : "failed";

  if (processedDocumentId) {
    await processedDocRepo.update(processedDocumentId, {
      embeddingStatus: status === "completed" ? "completed" : status === "skipped" ? "skipped" : "failed",
      qdrantSyncStatus: status === "completed" ? "completed" : status === "skipped" ? "skipped" : "failed",
    });
  }
  if (documentId) {
    await KbDocument.findByIdAndUpdate(documentId, {
      $set: {
        embeddingStatus: status === "completed" ? "completed" : status === "skipped" ? "skipped" : "failed",
      },
      $push: {
        processingLogs: {
          level: result.ok ? "info" : "warn",
          message: result.skipped
            ? `Intelligence skipped: ${result.reason}`
            : `Intelligence indexed ${result.indexed || 0} chunks (failed ${result.failed || 0})`,
        },
      },
    });
  }
  return result;
}

export function registerIntelligenceWorkers() {
  registerIntelligenceHandler(INTELLIGENCE_QUEUES.EMBEDDING, async (data) => runEmbedJob(data));

  registerIntelligenceHandler(INTELLIGENCE_QUEUES.SYNC, async (data) => {
    if (data.processedDocumentId) return runEmbedJob(data);
    return { ok: false, message: "processedDocumentId required" };
  });

  registerIntelligenceHandler(INTELLIGENCE_QUEUES.RETRY, async (data) => {
    return retryFailedEmbeddings({
      documentId: data.documentId,
      limit: data.limit || 50,
    });
  });

  registerIntelligenceHandler(INTELLIGENCE_QUEUES.DELETE, async (data) => {
    if (!data.documentId) throw new Error("documentId required");
    await deleteDocumentVectors(data.documentId);
    return { ok: true };
  });
}

export async function enqueueDocumentIndexing({ processedDocumentId, documentId }) {
  return enqueueIntelligence(INTELLIGENCE_QUEUES.EMBEDDING, {
    processedDocumentId: String(processedDocumentId),
    documentId: documentId ? String(documentId) : undefined,
  });
}

export async function enqueueRetryFailed(documentId) {
  return enqueueIntelligence(INTELLIGENCE_QUEUES.RETRY, {
    documentId: documentId ? String(documentId) : undefined,
  });
}

export async function enqueueDeleteVectors(documentId) {
  return enqueueIntelligence(INTELLIGENCE_QUEUES.DELETE, {
    documentId: String(documentId),
  });
}
