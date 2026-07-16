/**
 * RAG HTTP controllers — shared Knowledge Base APIs for search + question gen + admin.
 */

import {
  ingestPdfDocument,
  listDocuments,
  deleteDocument,
  reindexDocument,
  deleteChunk,
  rebuildEmbeddings,
  collectionStats,
} from "../services/ingest.service.js";
import { searchKnowledgeBase } from "../services/search.service.js";
import { generateQuestionsFromRag } from "../services/questionGen.service.js";
import { ensureSubjectsSeeded } from "../models/Subject.js";
import { pickUploadedPdfs } from "../middleware/uploadPdf.js";
import { getRagJob } from "../queues/ragQueue.js";
import { ragLogger } from "../utils/logger.js";
import { embeddingService } from "../../services/ai/embedding.service.js";
import { qdrantService } from "../../services/ai/qdrant.service.js";

function sendError(res, err) {
  const status = err.status || err.statusCode || 500;
  ragLogger.error("rag.http.error", { message: err.message, status });
  return res.status(status).json({
    success: false,
    message: err.message || "RAG request failed",
  });
}

/** POST /api/rag/search */
export async function searchRag(req, res) {
  try {
    const {
      query,
      topK,
      subject,
      topic,
      topicId,
      documentId,
      sourceUrlId,
      language,
      book,
      year,
      exam,
      filters,
    } = req.body || {};

    const result = await searchKnowledgeBase({
      query,
      topK,
      filters: {
        subject: subject || filters?.subject,
        topic: topic || filters?.topic,
        topicId: topicId || filters?.topicId,
        documentId: documentId || filters?.documentId,
        sourceUrlId: sourceUrlId || filters?.sourceUrlId,
        language: language || filters?.language,
        book: book || filters?.book,
        year: year || filters?.year,
        exam: exam || filters?.exam,
      },
    });

    res.json({ success: true, data: result });
  } catch (err) {
    sendError(res, err);
  }
}

/** POST /api/rag/generate-questions */
export async function generateRagQuestions(req, res) {
  try {
    const { topic, subject, difficulty, count, force, filters } = req.body || {};
    const result = await generateQuestionsFromRag({
      topic,
      subject,
      difficulty,
      count,
      force,
      filters,
      createdBy: req.user?._id,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    sendError(res, err);
  }
}

/** GET /api/rag/health | /api/rag/stats */
export async function ragHealth(req, res) {
  try {
    const [{ getSystemHealth }, stats] = await Promise.all([
      import("../../services/health.service.js"),
      collectionStats().catch(() => null),
    ]);
    const health = await getSystemHealth();
    res.json({
      success: true,
      data: {
        ...health,
        collection: stats,
      },
    });
  } catch (err) {
    sendError(res, err);
  }
}

/** GET /api/rag/subjects */
export async function listRagSubjects(_req, res) {
  try {
    const subjects = await ensureSubjectsSeeded();
    res.json({ success: true, data: subjects });
  } catch (err) {
    sendError(res, err);
  }
}

/** POST /api/rag/admin/upload-pdf  OR  POST /api/admin/upload-pdf */
export async function uploadPdf(req, res) {
  try {
    const files = pickUploadedPdfs(req);
    if (!files.length) {
      return res.status(400).json({ success: false, message: "PDF file is required" });
    }

    const subject = String(req.body.subject || "").trim();
    const title = String(req.body.title || "").trim();

    const results = [];
    for (const file of files) {
      const result = await ingestPdfDocument({
        buffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
        subject,
        title: title || file.originalname,
        topic: req.body.topic,
        subtopic: req.body.subtopic,
        sourceBook: req.body.sourceBook || req.body.book,
        chapter: req.body.chapter,
        language: req.body.language,
        year: req.body.year,
        createdBy: req.user?._id,
      });
      results.push(result);
    }

    res.status(201).json({
      success: true,
      message: results[0]?.message || "PDF uploaded",
      data: {
        count: results.length,
        documentId: results[0]?.documentId,
        chapter: results[0]?.chapter,
        results,
      },
    });
  } catch (err) {
    sendError(res, err);
  }
}

/** GET /api/rag/admin/documents */
export async function listDocs(req, res) {
  try {
    const data = await listDocuments({
      subject: req.query.subject,
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json({ success: true, data });
  } catch (err) {
    sendError(res, err);
  }
}

/** DELETE /api/rag/admin/documents/:id */
export async function removeDocument(req, res) {
  try {
    const data = await deleteDocument(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    sendError(res, err);
  }
}

/** POST /api/rag/admin/reindex/:id */
export async function reindexDoc(req, res) {
  try {
    const force = req.body?.force !== false;
    const data = await reindexDocument(req.params.id, { force });
    res.json({ success: true, data });
  } catch (err) {
    sendError(res, err);
  }
}

/** DELETE /api/rag/admin/chunks/:id */
export async function removeChunk(req, res) {
  try {
    const data = await deleteChunk(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    sendError(res, err);
  }
}

/** POST /api/rag/admin/rebuild-embeddings */
export async function rebuildAll(req, res) {
  try {
    const data = await rebuildEmbeddings({ subject: req.body?.subject });
    res.json({ success: true, data });
  } catch (err) {
    sendError(res, err);
  }
}

/** GET /api/rag/admin/collection-stats */
export async function stats(req, res) {
  return ragHealth(req, res);
}

/** POST /api/rag/admin/search-preview — same as search, admin-named */
export async function searchPreview(req, res) {
  return searchRag(req, res);
}

/** GET /api/rag/admin/vector-health */
export async function vectorHealth(_req, res) {
  try {
    const [{ getSystemHealth }, qdrant] = await Promise.all([
      import("../../services/health.service.js"),
      qdrantService.health(),
    ]);
    const system = await getSystemHealth();
    res.json({
      success: true,
      data: {
        embedding: {
          configured: embeddingService.isConfigured(),
          provider: embeddingService.getProviderLabel(),
          providerId: embeddingService.getProvider(),
          model: embeddingService.getModelName(),
          dimension: embeddingService.getDimension(),
          status: system.embedding,
        },
        qdrant: {
          ...qdrant,
          status: system.qdrant,
        },
        mongodb: system.mongodb,
        llm: system.llm,
        reranker: system.reranker,
        models: system.models,
        pipeline: system.pipeline,
      },
    });
  } catch (err) {
    sendError(res, err);
  }
}

/** GET /api/rag/admin/jobs/:id */
export async function jobStatus(req, res) {
  const job = getRagJob(req.params.id);
  if (!job) {
    return res.status(404).json({ success: false, message: "Job not found" });
  }
  res.json({ success: true, data: job });
}

export default {
  searchRag,
  generateRagQuestions,
  ragHealth,
  listRagSubjects,
  uploadPdf,
  listDocs,
  removeDocument,
  reindexDoc,
  removeChunk,
  rebuildAll,
  stats,
  searchPreview,
  vectorHealth,
  jobStatus,
};
