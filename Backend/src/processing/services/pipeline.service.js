/**
 * Pipeline stage runners — each stage is independently restartable.
 */

import fs from "fs/promises";
import path from "path";
import os from "os";
import KbDocument from "../../knowledge/models/KbDocument.js";
import KbSubject from "../../knowledge/models/KbSubject.js";
import KbChapter from "../../knowledge/models/KbChapter.js";
import { downloadBufferFromS3 } from "../../knowledge/services/s3.service.js";
import {
  processedDocRepo,
  pageRepo,
  sectionRepo,
  chunkRepo,
  questionRepo,
  logRepo,
  errorRepo,
} from "../repositories/index.js";
import { QUEUE_NAMES } from "../utils/constants.js";
import { enqueue } from "../queues/queueManager.js";
import { extractLocalPdf, detectScannedPdf, extractPlainText } from "./pdfExtract.service.js";
import { cleanPages } from "./cleaning.service.js";
import { detectSections } from "./sectionDetect.service.js";
import {
  extractQuestionsFromSections,
  extractQuestionsFromText,
  persistQuestions,
} from "./questionExtract.service.js";
import { buildMetadataResult } from "./metadata.service.js";
import { generateChunks, persistChunks } from "./chunking.service.js";
import { detectDocumentDuplicate } from "./duplicate.service.js";
import { enqueueEmbeddingPlaceholder } from "./embedding.placeholder.js";
import { runIntelligenceForProcessed } from "../../intelligence/index.js";
import { isLlamaParseConfigured, parseWithLlamaParse } from "../providers/llamaParse.provider.js";
import { isMistralOcrConfigured, ocrWithMistral } from "../providers/mistralOcr.provider.js";
import { wordCount } from "../utils/helpers.js";

async function withStageLog({
  processed,
  stage,
  workerName,
  queueName,
  jobId,
  fn,
}) {
  const log = await logRepo.start({
    processedDocumentId: processed._id,
    documentId: processed.documentId,
    stage,
    workerName,
    queueName,
    jobId,
  });
  try {
    const result = await fn();
    await logRepo.complete(log._id, {
      message: `${workerName} completed`,
      meta: result?.meta || {},
    });
    return result;
  } catch (err) {
    await logRepo.fail(log._id, err?.message || "Stage failed");
    await errorRepo.create({
      processedDocumentId: processed._id,
      documentId: processed.documentId,
      stage,
      workerName,
      queueName,
      jobId,
      errorMessage: err?.message || "Stage failed",
      stack: err?.stack || null,
      retryable: true,
    });
    throw err;
  }
}

async function syncKbStatus(documentId, patch) {
  await KbDocument.findByIdAndUpdate(documentId, {
    $set: patch,
    ...(patch.processingLogsPush
      ? {}
      : {}),
  });
  if (patch._log) {
    await KbDocument.findByIdAndUpdate(documentId, {
      $push: { processingLogs: patch._log },
      $unset: {},
    });
  }
}

async function loadBuffer(processed) {
  if (processed.tempFilePath) {
    try {
      return await fs.readFile(processed.tempFilePath);
    } catch {
      // fall through to S3
    }
  }
  if (!processed.storageKey) throw new Error("Document has no storageKey");
  const { buffer } = await downloadBufferFromS3(processed.storageKey);
  return buffer;
}

async function saveTemp(buffer, processedId) {
  const dir = path.join(os.tmpdir(), "mentorsdaily-processing");
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${processedId}.bin`);
  await fs.writeFile(filePath, buffer);
  return filePath;
}

export async function runUploadStage(data, ctx) {
  const processed = await processedDocRepo.findById(data.processedDocumentId);
  if (!processed) throw new Error("ProcessedDocument not found");

  await processedDocRepo.setStage(processed._id, "Downloading", {
    status: "running",
    currentQueue: QUEUE_NAMES.UPLOAD,
    currentJobId: ctx.jobId,
    startedAt: processed.startedAt || new Date(),
  });
  await syncKbStatus(processed.documentId, {
    processingStatus: "Processing",
    processingStartedAt: new Date(),
    ocrStatus: "pending",
    parserStatus: "pending",
  });

  await withStageLog({
    processed,
    stage: "Downloading",
    workerName: "UploadWorker",
    queueName: QUEUE_NAMES.UPLOAD,
    jobId: ctx.jobId,
    fn: async () => {
      const buffer = await loadBuffer(processed);
      const tempFilePath = await saveTemp(buffer, processed._id);
      await processedDocRepo.update(processed._id, { tempFilePath });

      // Quick text probe for scanned detection (PDF only)
      const ext = String(processed.extension || "").toLowerCase();
      let isScanned = false;
      if (ext === ".pdf") {
        const probe = await extractLocalPdf(buffer);
        isScanned = detectScannedPdf(probe);
        await processedDocRepo.update(processed._id, { isScanned, pageCount: probe.numPages || probe.pages?.length || 0 });
      }

      if (isScanned) {
        await processedDocRepo.setStage(processed._id, "OCR", {
          currentQueue: QUEUE_NAMES.OCR,
          ocrProvider: isMistralOcrConfigured() ? "mistral" : "pending-local",
        });
        await syncKbStatus(processed.documentId, { ocrStatus: "queued" });
        await enqueue(QUEUE_NAMES.OCR, { processedDocumentId: String(processed._id) });
      } else {
        await enqueue(QUEUE_NAMES.PDF, { processedDocumentId: String(processed._id) });
      }
      return { meta: { bytes: buffer.length, isScanned } };
    },
  });
}

export async function runOcrStage(data, ctx) {
  const processed = await processedDocRepo.findById(data.processedDocumentId);
  if (!processed) throw new Error("ProcessedDocument not found");

  await processedDocRepo.setStage(processed._id, "OCR", {
    status: "running",
    currentQueue: QUEUE_NAMES.OCR,
    currentJobId: ctx.jobId,
  });
  await syncKbStatus(processed.documentId, { ocrStatus: "running" });

  await withStageLog({
    processed,
    stage: "OCR",
    workerName: "OcrWorker",
    queueName: QUEUE_NAMES.OCR,
    jobId: ctx.jobId,
    fn: async () => {
      const buffer = await loadBuffer(processed);
      let extraction;
      let provider = "none";

      if (isMistralOcrConfigured()) {
        extraction = await ocrWithMistral(buffer, processed.mimeType || "application/pdf");
        provider = "mistral-ocr";
      } else {
        extraction = await extractLocalPdf(buffer);
        provider = "local-fallback";
      }

      const dir = path.join(os.tmpdir(), "mentorsdaily-processing");
      await fs.mkdir(dir, { recursive: true });
      const tempPath = path.join(dir, `${processed._id}-ocr.json`);
      await fs.writeFile(tempPath, JSON.stringify(extraction));

      await pageRepo.deleteByProcessed(processed._id);
      await pageRepo.insertMany(
        (extraction.pages || []).map((p) => ({
          processedDocumentId: processed._id,
          documentId: processed.documentId,
          pageNumber: p.pageNumber,
          rawText: p.text || "",
          cleanedText: "",
          charCount: String(p.text || "").length,
          wordCount: wordCount(p.text || ""),
          ocrUsed: true,
          imagesMetadata: p.imagesMetadata || [],
        }))
      );

      await processedDocRepo.update(processed._id, {
        ocrProvider: provider,
        pageCount: extraction.pages?.length || 0,
      });

      await syncKbStatus(processed.documentId, { ocrStatus: "completed" });
      await enqueue(QUEUE_NAMES.PDF, {
        processedDocumentId: String(processed._id),
        ocrJsonPath: tempPath,
      });
      return { meta: { provider, pages: extraction.pages?.length || 0 } };
    },
  });
}

export async function runPdfStage(data, ctx) {
  const processed = await processedDocRepo.findById(data.processedDocumentId);
  if (!processed) throw new Error("ProcessedDocument not found");

  await processedDocRepo.setStage(processed._id, "Parsing", {
    status: "running",
    currentQueue: QUEUE_NAMES.PDF,
    currentJobId: ctx.jobId,
  });
  await syncKbStatus(processed.documentId, { parserStatus: "running" });

  let pages = [];
  let fullText = "";
  let parserProvider = "local";

  await withStageLog({
    processed,
    stage: "Parsing",
    workerName: "PdfWorker",
    queueName: QUEUE_NAMES.PDF,
    jobId: ctx.jobId,
    fn: async () => {
      if (data.ocrJsonPath) {
        const raw = await fs.readFile(data.ocrJsonPath, "utf8");
        const extraction = JSON.parse(raw);
        pages = extraction.pages || [];
        fullText = extraction.fullText || pages.map((p) => p.text).join("\n\n");
        parserProvider = extraction.provider || "ocr";
      } else {
        const buffer = await loadBuffer(processed);
        const ext = String(processed.extension || "").toLowerCase();

        if (ext === ".pdf") {
          if (isLlamaParseConfigured() && process.env.PROCESSING_PREFER_LLAMAPARSE === "true") {
            try {
              const llama = await parseWithLlamaParse(buffer, processed.title || "doc.pdf");
              pages = llama.pages;
              fullText = llama.fullText;
              parserProvider = "llamaparse";
            } catch (err) {
              console.warn("[processing] LlamaParse failed, local fallback:", err?.message);
              const local = await extractLocalPdf(buffer);
              pages = local.pages;
              fullText = local.fullText;
              parserProvider = local.provider;
            }
          } else {
            const local = await extractLocalPdf(buffer);
            pages = local.pages;
            fullText = local.fullText;
            parserProvider = local.provider;
          }
        } else if ([".txt", ".md"].includes(ext)) {
          const local = await extractPlainText(buffer, ext);
          pages = local.pages;
          fullText = local.fullText;
          parserProvider = "plaintext";
        } else if (ext === ".docx") {
          // Minimal: treat as binary-extracted utf8 best-effort (full docx XML parse later)
          const local = await extractPlainText(buffer, ext);
          pages = local.pages;
          fullText = local.fullText;
          parserProvider = "docx-plaintext-fallback";
        } else {
          throw new Error(`Unsupported extension for parsing: ${ext}`);
        }
      }

      await processedDocRepo.update(processed._id, {
        parserProvider,
        pageCount: pages.length,
      });
      return { meta: { parserProvider, pages: pages.length } };
    },
  });

  // Cleaning
  await processedDocRepo.setStage(processed._id, "Cleaning");
  const cleaned = await withStageLog({
    processed,
    stage: "Cleaning",
    workerName: "PdfWorker",
    queueName: QUEUE_NAMES.PDF,
    jobId: ctx.jobId,
    fn: async () => {
      const cleanedPages = cleanPages(pages);
      await pageRepo.deleteByProcessed(processed._id);
      await pageRepo.insertMany(
        cleanedPages.map((p) => ({
          processedDocumentId: processed._id,
          documentId: processed.documentId,
          pageNumber: p.pageNumber,
          rawText: p.rawText || "",
          cleanedText: p.cleanedText || p.text || "",
          charCount: String(p.cleanedText || "").length,
          wordCount: wordCount(p.cleanedText || ""),
          ocrUsed: Boolean(processed.isScanned),
          headings: p.headings || [],
          footnotes: p.footnotes || [],
          references: p.references || [],
          tables: p.tables || [],
          imagesMetadata: p.imagesMetadata || [],
        }))
      );
      fullText = cleanedPages.map((p) => p.cleanedText).join("\n\n");
      return { cleanedPages, meta: { pages: cleanedPages.length } };
    },
  });

  // Sections
  await processedDocRepo.setStage(processed._id, "Detecting Sections");
  const sections = await withStageLog({
    processed,
    stage: "Detecting Sections",
    workerName: "PdfWorker",
    queueName: QUEUE_NAMES.PDF,
    jobId: ctx.jobId,
    fn: async () => {
      const secs = detectSections(cleaned.cleanedPages);
      await sectionRepo.deleteByProcessed(processed._id);
      if (secs.length) {
        await sectionRepo.insertMany(
          secs.map((s) => ({
            processedDocumentId: processed._id,
            documentId: processed.documentId,
            pageNumber: s.pageNumber,
            sectionType: s.sectionType,
            order: s.order,
            text: s.text,
            headingLevel: s.headingLevel,
            topic: s.topic || "",
            metadata: s.metadata || {},
          }))
        );
      }
      await processedDocRepo.update(processed._id, { sectionCount: secs.length });
      return { sections: secs, meta: { sections: secs.length } };
    },
  });

  await syncKbStatus(processed.documentId, { parserStatus: "completed" });

  // Next: questions → metadata → chunk → embedding (sequential via queues)
  await enqueue(QUEUE_NAMES.QUESTION, {
    processedDocumentId: String(processed._id),
  });

  await processedDocRepo.update(processed._id, {
    parserProvider,
  });
}

export async function runQuestionStage(data, ctx) {
  const processed = await processedDocRepo.findById(data.processedDocumentId);
  if (!processed) throw new Error("ProcessedDocument not found");

  await processedDocRepo.setStage(processed._id, "Extracting Questions", {
    status: "running",
    currentQueue: QUEUE_NAMES.QUESTION,
    currentJobId: ctx.jobId,
  });
  await syncKbStatus(processed.documentId, { questionExtractionStatus: "running" });

  await withStageLog({
    processed,
    stage: "Extracting Questions",
    workerName: "QuestionWorker",
    queueName: QUEUE_NAMES.QUESTION,
    jobId: ctx.jobId,
    fn: async () => {
      const sections = await sectionRepo.findByProcessed(processed._id);
      let questions = extractQuestionsFromSections(sections);
      if (!questions.length) {
        const pages = await pageRepo.findByProcessed(processed._id);
        const fullText = pages.map((p) => p.cleanedText || p.rawText).join("\n");
        questions = extractQuestionsFromText(fullText);
      }

      await questionRepo.deleteByProcessed(processed._id);
      const result = await persistQuestions({
        questions,
        processedDocumentId: processed._id,
        documentId: processed.documentId,
        subject: processed.detectedSubject,
        chapter: processed.detectedChapter,
      });

      await processedDocRepo.update(processed._id, {
        questionCount: result.saved,
      });
      await syncKbStatus(processed.documentId, {
        questionExtractionStatus: "completed",
      });

      await enqueue(QUEUE_NAMES.METADATA, { processedDocumentId: String(processed._id) });
      return { meta: result };
    },
  });
}

export async function runMetadataStage(data, ctx) {
  const processed = await processedDocRepo.findById(data.processedDocumentId);
  if (!processed) throw new Error("ProcessedDocument not found");

  await processedDocRepo.setStage(processed._id, "Metadata", {
    currentQueue: QUEUE_NAMES.METADATA,
    currentJobId: ctx.jobId,
  });
  await syncKbStatus(processed.documentId, { metadataExtractionStatus: "running" });

  await withStageLog({
    processed,
    stage: "Metadata",
    workerName: "MetadataWorker",
    queueName: QUEUE_NAMES.METADATA,
    jobId: ctx.jobId,
    fn: async () => {
      const kb = await KbDocument.findById(processed.documentId).lean();
      const sections = await sectionRepo.findByProcessed(processed._id);
      const pages = await pageRepo.findByProcessed(processed._id);
      const fullText = pages.map((p) => p.cleanedText || "").join("\n");
      const qCount = await questionRepo.countByProcessed(processed._id);

      let subjectName = "";
      let chapterName = "";
      if (kb?.subjectId) {
        const s = await KbSubject.findById(kb.subjectId).lean();
        subjectName = s?.name || "";
      }
      if (kb?.chapterId) {
        const c = await KbChapter.findById(kb.chapterId).lean();
        chapterName = c?.name || "";
      }

      const meta = buildMetadataResult({
        fullText,
        sections,
        questions: Array.from({ length: qCount }),
        documentHints: {
          subjectId: kb?.subjectId || null,
          chapterId: kb?.chapterId || null,
          topicId: kb?.topicId || null,
          categoryId: kb?.categoryId || null,
          subjectName,
          chapterName,
        },
      });

      const dup = await detectDocumentDuplicate({
        checksum: processed.checksum || kb?.checksum,
        title: processed.title || kb?.title,
        excludeProcessedId: processed._id,
      });

      await processedDocRepo.update(processed._id, {
        ...meta,
        isDuplicate: dup.isDuplicate,
        duplicateOf: dup.duplicateOf,
      });
      await syncKbStatus(processed.documentId, {
        metadataExtractionStatus: "completed",
        topicExtractionStatus: "completed",
        duplicateDetectionStatus: "completed",
      });

      await enqueue(QUEUE_NAMES.CHUNK, { processedDocumentId: String(processed._id) });
      return { meta: { ...meta, duplicate: dup } };
    },
  });
}

export async function runChunkStage(data, ctx) {
  const processed = await processedDocRepo.findById(data.processedDocumentId);
  if (!processed) throw new Error("ProcessedDocument not found");

  await processedDocRepo.setStage(processed._id, "Chunking", {
    status: "running",
    currentQueue: QUEUE_NAMES.CHUNK,
    currentJobId: ctx.jobId,
  });

  await withStageLog({
    processed,
    stage: "Chunking",
    workerName: "ChunkWorker",
    queueName: QUEUE_NAMES.CHUNK,
    jobId: ctx.jobId,
    fn: async () => {
      const sections = await sectionRepo.findByProcessed(processed._id);
      const chunks = generateChunks(sections, {
        subject: processed.detectedSubject,
        chapter: processed.detectedChapter,
      });
      await chunkRepo.deleteByProcessed(processed._id);
      const result = await persistChunks({
        chunks,
        processedDocumentId: processed._id,
        documentId: processed.documentId,
      });
      await processedDocRepo.update(processed._id, { chunkCount: result.saved });
      await enqueue(QUEUE_NAMES.EMBEDDING, {
        processedDocumentId: String(processed._id),
      });
      return { meta: result };
    },
  });
}

export async function runEmbeddingStage(data, ctx) {
  const processed = await processedDocRepo.findById(data.processedDocumentId);
  if (!processed) throw new Error("ProcessedDocument not found");

  await withStageLog({
    processed,
    stage: "Completed",
    workerName: "EmbeddingWorker",
    queueName: QUEUE_NAMES.EMBEDDING,
    jobId: ctx.jobId,
    fn: async () => {
      let intel;
      try {
        intel = await runIntelligenceForProcessed(processed);
      } catch (err) {
        console.warn("[processing] intelligence enqueue failed, using placeholder:", err?.message);
        intel = await enqueueEmbeddingPlaceholder(processed);
      }

      const embeddingStatus = intel?.embeddingStatus || "queued";
      const qdrantSyncStatus = intel?.qdrantSyncStatus || "queued";

      await processedDocRepo.setStage(processed._id, "Completed", {
        status: "completed",
        progress: 100,
        completedAt: new Date(),
        currentQueue: null,
        currentJobId: null,
        embeddingStatus,
        qdrantSyncStatus,
        lastError: null,
      });
      await syncKbStatus(processed.documentId, {
        processingStatus: "Completed",
        processingCompletedAt: new Date(),
        processingError: null,
        embeddingStatus,
      });

      if (processed.tempFilePath) {
        await fs.unlink(processed.tempFilePath).catch(() => {});
      }
      return { meta: intel };
    },
  });
}

export async function runFailedStage(data, ctx) {
  const processed = await processedDocRepo.findById(data.processedDocumentId);
  if (!processed) return;
  await processedDocRepo.setStage(processed._id, "Failed", {
    status: "failed",
    failedAt: new Date(),
    lastError: data.errorMessage || "Processing failed",
    currentQueue: QUEUE_NAMES.FAILED,
    currentJobId: ctx.jobId,
  });
  await syncKbStatus(processed.documentId, {
    processingStatus: "Failed",
    processingError: data.errorMessage || "Processing failed",
  });
  await logRepo.start({
    processedDocumentId: processed._id,
    documentId: processed.documentId,
    stage: "Failed",
    workerName: "FailedWorker",
    queueName: QUEUE_NAMES.FAILED,
    jobId: ctx.jobId,
    message: data.errorMessage || "Failed",
  });
}

export async function runRetryStage(data, ctx) {
  const processed = await processedDocRepo.findById(data.processedDocumentId);
  if (!processed) throw new Error("ProcessedDocument not found");

  await errorRepo.resolveForDocument(processed._id);
  await processedDocRepo.setStage(processed._id, "Retry", {
    status: "retrying",
    retryCount: (processed.retryCount || 0) + 1,
    lastError: null,
    currentQueue: QUEUE_NAMES.RETRY,
    currentJobId: ctx.jobId,
  });
  await syncKbStatus(processed.documentId, {
    processingStatus: "Queued",
    processingError: null,
  });

  const fromStage = data.fromStage || "Queued";
  // Independent restart: jump back to appropriate queue
  if (fromStage === "OCR") {
    await enqueue(QUEUE_NAMES.OCR, { processedDocumentId: String(processed._id) });
  } else if (["Parsing", "Cleaning", "Detecting Sections"].includes(fromStage)) {
    await enqueue(QUEUE_NAMES.PDF, { processedDocumentId: String(processed._id) });
  } else if (fromStage === "Extracting Questions") {
    await enqueue(QUEUE_NAMES.QUESTION, { processedDocumentId: String(processed._id) });
  } else if (fromStage === "Chunking") {
    await enqueue(QUEUE_NAMES.CHUNK, { processedDocumentId: String(processed._id) });
  } else if (fromStage === "Metadata") {
    await enqueue(QUEUE_NAMES.METADATA, { processedDocumentId: String(processed._id) });
  } else {
    await enqueue(QUEUE_NAMES.UPLOAD, { processedDocumentId: String(processed._id) });
  }
}
