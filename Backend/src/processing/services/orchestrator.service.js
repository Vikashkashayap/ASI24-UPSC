import KbDocument from "../../knowledge/models/KbDocument.js";
import { processedDocRepo } from "../repositories/index.js";
import { enqueue, getQueueMode, getQueueCounts } from "../queues/queueManager.js";
import { QUEUE_NAMES } from "../utils/constants.js";
import { pingRedis } from "../queues/connection.js";
import { logRepo, errorRepo, questionRepo, chunkRepo } from "../repositories/index.js";
import { isLlamaParseConfigured } from "../providers/llamaParse.provider.js";
import { isMistralOcrConfigured } from "../providers/mistralOcr.provider.js";

function autoStartEnabled() {
  const v = String(process.env.PROCESSING_AUTO_START ?? "true").toLowerCase();
  return v !== "false" && v !== "0";
}

/**
 * Create/reset ProcessedDocument and enqueue upload-processing.
 * Safe to call from upload flow — never blocks long.
 */
export async function startProcessing(documentId, { force = false } = {}) {
  const kb = await KbDocument.findOne({ _id: documentId, isDeleted: false });
  if (!kb) {
    const err = new Error("Document not found");
    err.statusCode = 404;
    throw err;
  }
  if (!kb.storageKey && !kb.storageUrl) {
    const err = new Error("Document has no S3 file to process");
    err.statusCode = 400;
    throw err;
  }

  let processed = await processedDocRepo.findByDocumentId(documentId);

  if (processed && processed.status === "running" && !force) {
    return {
      processed,
      enqueued: false,
      message: "Processing already running",
    };
  }

  if (processed && (force || processed.status === "failed" || processed.status === "completed")) {
    await processedDocRepo.update(processed._id, {
      stage: "Queued",
      progress: 5,
      status: "queued",
      lastError: null,
      completedAt: null,
      failedAt: null,
      startedAt: new Date(),
      pageCount: 0,
      sectionCount: 0,
      chunkCount: 0,
      questionCount: 0,
      isDuplicate: false,
      duplicateOf: null,
    });
    processed = await processedDocRepo.findById(processed._id);
  }

  if (!processed) {
    processed = await processedDocRepo.create({
      documentId: kb._id,
      title: kb.title,
      checksum: kb.checksum || "",
      mimeType: kb.mimeType || "",
      extension: kb.extension || "",
      storageKey: kb.storageKey || "",
      storageUrl: kb.storageUrl || "",
      subjectId: kb.subjectId || null,
      chapterId: kb.chapterId || null,
      topicId: kb.topicId || null,
      categoryId: kb.categoryId || null,
      stage: "Queued",
      progress: 5,
      status: "queued",
      startedAt: new Date(),
    });
  }

  await KbDocument.findByIdAndUpdate(kb._id, {
    $set: {
      processingStatus: "Queued",
      processingError: null,
      processingStartedAt: new Date(),
    },
    $push: {
      processingLogs: { level: "info", message: "Queued for AI processing engine" },
    },
  });

  const job = await enqueue(QUEUE_NAMES.UPLOAD, {
    processedDocumentId: String(processed._id),
    documentId: String(kb._id),
  });

  await processedDocRepo.update(processed._id, {
    currentJobId: job.id,
    currentQueue: QUEUE_NAMES.UPLOAD,
  });

  return { processed, job, enqueued: true };
}

export async function maybeAutoStartProcessing(documentId) {
  if (!autoStartEnabled()) return null;
  try {
    return await startProcessing(documentId);
  } catch (err) {
    console.warn("[processing] auto-start failed:", err?.message || err);
    return null;
  }
}

export async function retryProcessing(documentId, { fromStage } = {}) {
  const processed = await processedDocRepo.findByDocumentId(documentId);
  if (!processed) {
    return startProcessing(documentId, { force: true });
  }
  if ((processed.retryCount || 0) >= (processed.maxRetries || 3)) {
    const err = new Error("Max retries exceeded");
    err.statusCode = 400;
    throw err;
  }

  const job = await enqueue(QUEUE_NAMES.RETRY, {
    processedDocumentId: String(processed._id),
    fromStage: fromStage || processed.stage || "Queued",
  });

  return { processed, job, enqueued: true };
}

export async function getProcessingStatus(documentId) {
  const processed = await processedDocRepo.findByDocumentId(documentId);
  if (!processed) {
    return { found: false, documentId };
  }
  const [questions, chunks] = await Promise.all([
    questionRepo.countByProcessed(processed._id),
    chunkRepo.countByProcessed(processed._id),
  ]);
  return {
    found: true,
    documentId,
    processedDocumentId: processed._id,
    stage: processed.stage,
    progress: processed.progress,
    status: processed.status,
    isScanned: processed.isScanned,
    pageCount: processed.pageCount,
    sectionCount: processed.sectionCount,
    chunkCount: processed.chunkCount || chunks,
    questionCount: processed.questionCount || questions,
    documentKind: processed.documentKind,
    detectedSubject: processed.detectedSubject,
    detectedChapter: processed.detectedChapter,
    detectedTopics: processed.detectedTopics,
    isDuplicate: processed.isDuplicate,
    lastError: processed.lastError,
    retryCount: processed.retryCount,
    embeddingStatus: processed.embeddingStatus,
    ocrProvider: processed.ocrProvider,
    parserProvider: processed.parserProvider,
    startedAt: processed.startedAt,
    completedAt: processed.completedAt,
    currentQueue: processed.currentQueue,
    currentJobId: processed.currentJobId,
  };
}

export async function getProcessingLogs(documentId) {
  return logRepo.listByDocument(documentId);
}

export async function getProcessingErrors(documentId) {
  return errorRepo.listByDocument(documentId);
}

export async function getProcessingDashboard({ page = 1, limit = 20, status } = {}) {
  const filter = {};
  if (status) filter.status = status;
  const [items, total] = await processedDocRepo.list(filter, { page, limit });
  const stats = await processedDocRepo.stats();
  const queues = await getQueueCounts();
  const redis = await pingRedis();

  return {
    stats,
    queues,
    mode: getQueueMode(),
    redis,
    providers: {
      llamaParse: isLlamaParseConfigured(),
      mistralOcr: isMistralOcrConfigured(),
    },
    items,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
