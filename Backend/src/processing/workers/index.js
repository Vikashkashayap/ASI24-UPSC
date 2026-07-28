import { QUEUE_NAMES } from "../utils/constants.js";
import { registerHandler, enqueue } from "../queues/queueManager.js";
import {
  runUploadStage,
  runOcrStage,
  runPdfStage,
  runQuestionStage,
  runMetadataStage,
  runChunkStage,
  runEmbeddingStage,
  runFailedStage,
  runRetryStage,
} from "../services/pipeline.service.js";
import { processedDocRepo } from "../repositories/index.js";

function wrap(stageRunner, queueName) {
  return async (data, ctx) => {
    try {
      await stageRunner(data, ctx);
    } catch (err) {
      console.error(`[processing] ${queueName} error:`, err?.message || err);
      try {
        await enqueue(QUEUE_NAMES.FAILED, {
          processedDocumentId: data.processedDocumentId,
          errorMessage: err?.message || "Worker failed",
          fromQueue: queueName,
        });
      } catch (e) {
        // last resort direct update
        if (data.processedDocumentId) {
          await processedDocRepo.setStage(data.processedDocumentId, "Failed", {
            status: "failed",
            lastError: err?.message || "Worker failed",
            failedAt: new Date(),
          });
        }
      }
      throw err;
    }
  };
}

export function registerAllWorkers() {
  registerHandler(QUEUE_NAMES.UPLOAD, wrap(runUploadStage, QUEUE_NAMES.UPLOAD));
  registerHandler(QUEUE_NAMES.OCR, wrap(runOcrStage, QUEUE_NAMES.OCR));
  registerHandler(QUEUE_NAMES.PDF, wrap(runPdfStage, QUEUE_NAMES.PDF));
  registerHandler(QUEUE_NAMES.QUESTION, wrap(runQuestionStage, QUEUE_NAMES.QUESTION));
  registerHandler(QUEUE_NAMES.METADATA, wrap(runMetadataStage, QUEUE_NAMES.METADATA));
  registerHandler(QUEUE_NAMES.CHUNK, wrap(runChunkStage, QUEUE_NAMES.CHUNK));
  registerHandler(QUEUE_NAMES.EMBEDDING, wrap(runEmbeddingStage, QUEUE_NAMES.EMBEDDING));
  registerHandler(QUEUE_NAMES.FAILED, wrap(runFailedStage, QUEUE_NAMES.FAILED));
  registerHandler(QUEUE_NAMES.RETRY, wrap(runRetryStage, QUEUE_NAMES.RETRY));
}
