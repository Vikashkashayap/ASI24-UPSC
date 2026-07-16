/**
 * PDF ingest orchestrator — shares the same Knowledge Base as admin notes UI.
 * Flow: upload → extract → clean → chunk → embed → Qdrant + Mongo.
 */

import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { uploadPdfChapter } from "../../services/notes/notesPdfUpload.service.js";
import { syncChapterFromPdf } from "../../services/notes/notesPdfSync.service.js";
import {
  indexChapterInVectorDb,
  indexTopicInVectorDb,
} from "../../services/notes/notesVectorIndex.service.js";
import SourceUrl from "../../models/SourceUrl.js";
import ContentChunk from "../../models/ContentChunk.js";
import ContentTopic from "../../models/ContentTopic.js";
import { qdrantService } from "../../services/ai/qdrant.service.js";
import { embeddingService } from "../../services/ai/embedding.service.js";
import { cleanExtractedText } from "../utils/textCleaner.js";
import { ragLogger } from "../utils/logger.js";
import { withRetry } from "../utils/retry.js";
import { RAG_CONFIG } from "../config/rag.config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR =
  process.env.NOTES_PDF_UPLOAD_DIR ||
  path.join(__dirname, "../../../uploads/notes-pdfs");

/**
 * Full PDF → shared KB pipeline.
 */
export async function ingestPdfDocument(params) {
  const subject = String(params.subject || "").trim();
  if (!subject) {
    const err = new Error("subject is required");
    err.status = 400;
    throw err;
  }
  if (!params.buffer?.length) {
    const err = new Error("PDF file is required");
    err.status = 400;
    throw err;
  }

  const timer = ragLogger.timed("rag.ingestPdf");

  const uploaded = await uploadPdfChapter({
    buffer: params.buffer,
    originalName: params.originalName || "upload.pdf",
    mimeType: params.mimeType || "application/pdf",
    subject,
    title: params.title || params.originalName,
    createdBy: params.createdBy,
  });

  const chapterId = String(uploaded?.chapter?._id || uploaded?._id || "");
  if (!chapterId) {
    throw new Error("PDF upload did not return a chapter id");
  }

  let processResult = null;
  let indexResult = null;

  if (params.processNow !== false) {
    processResult = await withRetry(
      () => syncChapterFromPdf(chapterId, { buffer: params.buffer }),
      {
        retries: 2,
        label: "rag.processPdf",
      }
    );

    const metaSet = {};
    if (params.language) metaSet.contentLanguage = String(params.language);
    if (params.subtopic) metaSet.subTopic = String(params.subtopic);
    if (params.sourceBook) metaSet.source = String(params.sourceBook);
    if (Object.keys(metaSet).length) {
      await ContentChunk.updateMany({ sourceUrlId: chapterId }, { $set: metaSet });
    }

    // syncChapterFromPdf already attempts vector index; reindex if still needed
    if (embeddingService.isConfigured() && qdrantService.isConfigured()) {
      const status = processResult?.embedding?.status || processResult?.embeddingStatus;
      if (status !== "indexed") {
        indexResult = await withRetry(
          () => indexChapterInVectorDb(chapterId, { force: true }),
          { retries: RAG_CONFIG.retry.vectors, label: "rag.indexChapter" }
        );
      } else {
        indexResult = processResult.embedding;
      }
    } else {
      ragLogger.warn("rag.ingest.skipEmbed", {
        embedding: embeddingService.isConfigured(),
        qdrant: qdrantService.isConfigured(),
      });
    }
  }

  const chapter = await SourceUrl.findById(chapterId).lean();
  const durationMs = timer.end({
    chapterId,
    chunks: chapter?.chunkCount || 0,
    subject,
  });

  return {
    success: true,
    documentId: chapterId,
    chapter,
    processResult,
    indexResult,
    durationMs,
    message:
      chapter?.embeddingStatus === "indexed"
        ? "PDF ingested and indexed into shared Knowledge Base"
        : "PDF saved to Knowledge Base (embeddings pending — set JINA_API_KEY + start Qdrant)",
  };
}

export async function listDocuments({ subject, page = 1, limit = 50 } = {}) {
  const filter = {};
  if (subject) filter.subject = subject;
  const skip = (Math.max(page, 1) - 1) * limit;
  const [items, total] = await Promise.all([
    SourceUrl.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    SourceUrl.countDocuments(filter),
  ]);
  return { items, total, page: Number(page), limit: Number(limit) };
}

export async function deleteDocument(documentId) {
  const chapter = await SourceUrl.findById(documentId);
  if (!chapter) {
    const err = new Error("Document not found");
    err.status = 404;
    throw err;
  }

  const topicIds = await ContentTopic.find({ sourceUrlId: documentId }).distinct("_id");
  await ContentChunk.deleteMany({ sourceUrlId: documentId });
  await ContentTopic.deleteMany({ sourceUrlId: documentId });

  if (qdrantService.isConfigured()) {
    try {
      await qdrantService.deleteChapterChunks(String(documentId));
    } catch (err) {
      ragLogger.warn("rag.delete.qdrant", { error: err.message });
    }
  }

  if (chapter.filePath) {
    try {
      const abs = path.isAbsolute(chapter.filePath)
        ? chapter.filePath
        : path.join(process.cwd(), chapter.filePath);
      await fs.unlink(abs).catch(() => null);
    } catch {
      /* ignore missing file */
    }
  }

  await SourceUrl.findByIdAndDelete(documentId);
  ragLogger.info("rag.document.deleted", { documentId, topics: topicIds.length });
  return { deleted: true, documentId };
}

export async function reindexDocument(documentId, { force = true } = {}) {
  return withRetry(() => indexChapterInVectorDb(documentId, { force }), {
    retries: RAG_CONFIG.retry.vectors,
    label: "rag.reindex",
  });
}

export async function reindexTopic(topicId, { force = true } = {}) {
  return withRetry(() => indexTopicInVectorDb(topicId, { force }), {
    retries: RAG_CONFIG.retry.vectors,
    label: "rag.reindexTopic",
  });
}

export async function deleteChunk(chunkId) {
  const chunk = await ContentChunk.findById(chunkId);
  if (!chunk) {
    const err = new Error("Chunk not found");
    err.status = 404;
    throw err;
  }
  if (qdrantService.isConfigured()) {
    try {
      await qdrantService.deleteVector(String(chunkId));
    } catch (err) {
      ragLogger.warn("rag.deleteChunk.qdrant", { error: err.message });
    }
  }
  await ContentChunk.findByIdAndDelete(chunkId);
  await ContentTopic.findByIdAndUpdate(chunk.topicId, { $inc: { chunkCount: -1 } });
  await SourceUrl.findByIdAndUpdate(chunk.sourceUrlId, { $inc: { chunkCount: -1 } });
  return { deleted: true, chunkId };
}

export async function rebuildEmbeddings({ subject } = {}) {
  const filter = subject ? { subject } : {};
  const chapters = await SourceUrl.find(filter).select("_id title subject").lean();
  const results = [];
  for (const ch of chapters) {
    try {
      const r = await indexChapterInVectorDb(String(ch._id), { force: true });
      results.push({ documentId: String(ch._id), title: ch.title, ...r });
    } catch (err) {
      results.push({ documentId: String(ch._id), title: ch.title, error: err.message });
    }
  }
  return { rebuilt: results.length, results };
}

export async function collectionStats() {
  const [documents, chunks, topics, qdrant, embedding] = await Promise.all([
    SourceUrl.countDocuments(),
    ContentChunk.countDocuments(),
    ContentTopic.countDocuments(),
    qdrantService.health(),
    Promise.resolve({
      configured: embeddingService.isConfigured(),
      provider: embeddingService.getProviderLabel(),
      model: embeddingService.getModelName(),
      dimension: embeddingService.getDimension(),
    }),
  ]);

  return {
    documents,
    chunks,
    topics,
    collection: RAG_CONFIG.collection,
    qdrant,
    embedding,
  };
}

export { cleanExtractedText, UPLOAD_DIR };
export default {
  ingestPdfDocument,
  listDocuments,
  deleteDocument,
  reindexDocument,
  reindexTopic,
  deleteChunk,
  rebuildEmbeddings,
  collectionStats,
};
