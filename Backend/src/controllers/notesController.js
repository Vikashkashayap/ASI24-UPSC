import { notesService } from "../services/notes/notes.service.js";
import { syncChapterFromUrl, syncTopicFromUrl, repairChapterTopicNames } from "../services/notes/notesSync.service.js";
import { uploadPdfChapter } from "../services/notes/notesPdfUpload.service.js";
import { syncChapterFromPdf } from "../services/notes/notesPdfSync.service.js";
import { indexChapterInVectorDb, indexTopicInVectorDb } from "../services/notes/notesVectorIndex.service.js";
import {
  startWebsiteNotesSyncBackground,
  getWebsiteNotesSyncStatus,
} from "../services/notes/syncAllWebsiteNotes.service.js";
import { promoteAllSyncedWebsiteNotesToKb } from "../services/notes/promoteWebsiteNotesToKb.service.js";
import { embeddingService } from "../services/ai/embedding.service.js";
import { qdrantService } from "../services/ai/qdrant.service.js";
import { retrieverService } from "../services/ai/retriever.service.js";
import { getFullCatalog } from "../config/notesCatalog.js";
import SourceUrl from "../models/SourceUrl.js";

/**
 * GET /api/admin/notes/catalog — full UPSC catalog with sync status
 */
export const getNotesCatalog = async (_req, res) => {
  try {
    const catalog = getFullCatalog();
    const synced = await SourceUrl.find({})
      .select("url subject status topicCount chunkCount lastSyncedAt title")
      .lean();
    const byUrl = new Map(synced.map((c) => [c.url.replace(/\/$/, ""), c]));

    const data = catalog.map((group) => {
      const chapters = group.chapters.map((ch) => {
        const db = byUrl.get(ch.url.replace(/\/$/, ""));
        return {
          ...ch,
          expectedTopicCount: ch.expectedTopicCount || 0,
          synced: db?.status === "synced",
          status: db?.status || "not_synced",
          _id: db?._id || null,
          topicCount: db?.topicCount || 0,
          chunkCount: db?.chunkCount || 0,
          lastSyncedAt: db?.lastSyncedAt || null,
        };
      });
      return {
        ...group,
        chapters,
        topicCount: chapters.reduce(
          (sum, c) => sum + (c.expectedTopicCount || c.topicCount || 0),
          0
        ),
        chapterCount: chapters.length,
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error("getNotesCatalog:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to load catalog" });
  }
};

/**
 * POST /api/admin/notes/sync-by-slug
 * Body: { slug, subject, title? } — sync using known catalog slug
 */
export const syncNotesBySlug = async (req, res) => {
  try {
    const { slug, subject, title } = req.body || {};
    const slugStr = String(slug || "").trim();
    const subjectStr = String(subject || "").trim();
    if (!slugStr || !subjectStr) {
      return res.status(400).json({ success: false, message: "slug and subject are required" });
    }
    const url = `https://notes.mentorsdaily.com/${slugStr}`;
    const adminId = req.user?._id ?? req.user?.id;
    const result = await syncChapterFromUrl({ url, subject: subjectStr, title, createdBy: adminId });
    res.status(201).json({
      success: true,
      message: `Synced ${result.topicCount} topics (${result.chunkCount} chunks).`,
      data: result,
    });
  } catch (error) {
    console.error("syncNotesBySlug:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to sync" });
  }
};

/**
 * POST /api/admin/notes/repair-chapter/:chapterId — fix topic names without full re-sync
 */
export const repairNotesChapter = async (req, res) => {
  try {
    const { chapterId } = req.params;
    const result = await repairChapterTopicNames(chapterId);
    res.json({
      success: true,
      message: `Fixed ${result.fixed} of ${result.total} topic names.`,
      data: result,
    });
  } catch (error) {
    console.error("repairNotesChapter:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to repair topic names" });
  }
};
export const listNotesSubjects = async (_req, res) => {
  try {
    const subjects = await notesService.getSubjects();
    res.json({ success: true, data: subjects });
  } catch (error) {
    console.error("listNotesSubjects:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to load subjects" });
  }
};

/**
 * GET /api/admin/notes/chapters?subject=History
 */
export const listNotesChapters = async (req, res) => {
  try {
    const subject = String(req.query.subject || "").trim();
    if (!subject) {
      return res.status(400).json({ success: false, message: "subject query param is required" });
    }
    const chapters = await notesService.getChapters(subject);
    res.json({ success: true, data: chapters });
  } catch (error) {
    console.error("listNotesChapters:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to load chapters" });
  }
};

/**
 * GET /api/admin/notes/topics?chapterId=...
 */
export const listNotesTopics = async (req, res) => {
  try {
    const chapterId = String(req.query.chapterId || "").trim();
    if (!chapterId) {
      return res.status(400).json({ success: false, message: "chapterId query param is required" });
    }
    const topics = await notesService.getTopics(chapterId);
    res.json({ success: true, data: topics });
  } catch (error) {
    console.error("listNotesTopics:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to load topics" });
  }
};

/**
 * GET /api/admin/notes/topics/:topicId/preview
 */
export const previewNotesTopic = async (req, res) => {
  try {
    const { topicId } = req.params;
    const note = await notesService.getNoteByTopic(topicId);
    if (!note) {
      return res.status(404).json({ success: false, message: "Topic not found" });
    }
    res.json({
      success: true,
      data: {
        topic: note.topic,
        chapter: note.chapter,
        chunkCount: note.chunks.length,
        preview: note.fullText.slice(0, 2000),
        sourceUrl: note.topic.sourceUrl,
      },
    });
  } catch (error) {
    console.error("previewNotesTopic:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to load notes preview" });
  }
};

/**
 * POST /api/admin/notes/sync-chapter
 * Body: { url, subject, title? }
 */
export const syncNotesChapter = async (req, res) => {
  try {
    const { url, subject, title } = req.body || {};
    const adminId = req.user?._id ?? req.user?.id;
    const result = await syncChapterFromUrl({ url, subject, title, createdBy: adminId });
    res.status(201).json({
      success: true,
      message: `Synced ${result.topicCount} topics (${result.chunkCount} chunks) from notes.`,
      data: result,
    });
  } catch (error) {
    console.error("syncNotesChapter:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to sync chapter" });
  }
};

/**
 * POST /api/admin/notes/sync-topic/:topicId
 */
export const syncNotesTopic = async (req, res) => {
  try {
    const { topicId } = req.params;
    const result = await syncTopicFromUrl({ topicId, topicUrl: req.body?.url });
    res.json({
      success: true,
      message: `Re-synced topic (${result.chunkCount} chunks).`,
      data: result,
    });
  } catch (error) {
    console.error("syncNotesTopic:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to sync topic" });
  }
};

/**
 * POST /api/admin/notes/upload-pdf
 * multipart: file | files[] (PDF) + fields: subject, title?, chapterId?, forceNew?, skipProcess?
 * Supports multiple PDFs for subject knowledge base (PDF + website searchable together).
 */
export const uploadNotesPdf = async (req, res) => {
  try {
    const fileList = [];
    if (req.file?.buffer?.length) fileList.push(req.file);
    if (Array.isArray(req.files)) {
      for (const f of req.files) {
        if (f?.buffer?.length) fileList.push(f);
      }
    } else if (req.files && typeof req.files === "object") {
      for (const key of ["file", "files"]) {
        const rows = req.files[key];
        if (Array.isArray(rows)) {
          for (const f of rows) {
            if (f?.buffer?.length) fileList.push(f);
          }
        } else if (rows?.buffer?.length) {
          fileList.push(rows);
        }
      }
    }

    if (!fileList.length) {
      return res.status(400).json({
        success: false,
        message: "PDF file(s) required (field name: file or files)",
      });
    }

    const subject = String(req.body?.subject || "").trim();
    const title = String(req.body?.title || "").trim();
    const chapterId = String(req.body?.chapterId || "").trim() || undefined;
    const skipProcess = String(req.body?.skipProcess || "").toLowerCase() === "true";
    const forceNew =
      String(req.body?.forceNew || "").toLowerCase() === "true" ||
      fileList.length > 1 ||
      String(req.body?.addToKnowledge || "").toLowerCase() === "true";
    const adminId = req.user?._id ?? req.user?.id;

    if (!subject) {
      return res.status(400).json({ success: false, message: "subject is required" });
    }
    if (!forceNew && !chapterId && !title) {
      return res.status(400).json({
        success: false,
        message: "title is required when uploading a new PDF chapter (or pass chapterId / forceNew)",
      });
    }

    const results = [];
    for (const file of fileList) {
      const uploadResult = await uploadPdfChapter({
        buffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
        subject,
        title: title || undefined,
        chapterId: forceNew ? undefined : chapterId,
        forceNew,
        createdBy: adminId,
      });

      if (skipProcess) {
        results.push({ chapter: uploadResult.chapter, processed: false });
        continue;
      }

      const processed = await syncChapterFromPdf(uploadResult.chapter._id, {
        buffer: file.buffer,
      });
      results.push({
        chapter: {
          ...uploadResult.chapter,
          status: processed.status,
          topicCount: processed.topicCount,
          chunkCount: processed.chunkCount,
          lastSyncedAt: new Date().toISOString(),
        },
        processed: true,
        pageCount: processed.pageCount,
        topics: processed.topics,
        embedding: processed.embedding || null,
      });
    }

    const totalTopics = results.reduce((s, r) => s + (r.chapter?.topicCount || 0), 0);
    const totalChunks = results.reduce((s, r) => s + (r.chapter?.chunkCount || 0), 0);

    res.status(201).json({
      success: true,
      message:
        results.length > 1
          ? `Uploaded ${results.length} PDFs to knowledge base (${totalTopics} topics, ${totalChunks} chunks). Topic search uses PDF + website notes.`
          : `PDF uploaded and processed: ${totalTopics} topics, ${totalChunks} semantic chunks.`,
      data: {
        count: results.length,
        chapters: results.map((r) => r.chapter),
        chapter: results[0]?.chapter,
        results,
        processed: !skipProcess,
      },
    });
  } catch (error) {
    console.error("uploadNotesPdf:", error);
    const msg = error.message || "Failed to upload PDF";
    const status =
      /required|Only PDF|exceeds max|not found|does not belong|scanned|too short|No topics|Invalid PDF/i.test(
        msg
      )
        ? 400
        : 500;
    res.status(status).json({ success: false, message: msg });
  }
};

/**
 * POST /api/admin/notes/process-pdf/:chapterId
 * Re-run extract → topics → semantic chunks for an already-uploaded PDF.
 */
export const processNotesPdf = async (req, res) => {
  try {
    const { chapterId } = req.params;
    if (!chapterId) {
      return res.status(400).json({ success: false, message: "chapterId is required" });
    }

    const processed = await syncChapterFromPdf(chapterId);
    res.json({
      success: true,
      message: `Processed PDF: ${processed.topicCount} topics, ${processed.chunkCount} semantic chunks.`,
      data: processed,
    });
  } catch (error) {
    console.error("processNotesPdf:", error);
    const msg = error.message || "Failed to process PDF";
    const status =
      /not found|no uploaded PDF|scanned|too short|No topics|Invalid PDF/i.test(msg) ? 400 : 500;
    res.status(status).json({ success: false, message: msg });
  }
};

/**
 * POST /api/admin/notes/reindex/:chapterId
 * Sync / re-index embeddings into Qdrant (hash-gated unless force=true).
 * Body/query: { force?: boolean }
 */
export const reindexNotesChapter = async (req, res) => {
  try {
    const { chapterId } = req.params;
    const force =
      String(req.body?.force ?? req.query?.force ?? "").toLowerCase() === "true" ||
      req.body?.force === true;

    if (!chapterId) {
      return res.status(400).json({ success: false, message: "chapterId is required" });
    }

    const result = await indexChapterInVectorDb(chapterId, { force });
    res.json({
      success: true,
      message: result.skipped
        ? result.reason || "Reindex skipped"
        : `Indexed ${result.indexed} chunks across ${result.topics} topics (${result.model}).`,
      data: result,
    });
  } catch (error) {
    console.error("reindexNotesChapter:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to reindex chapter" });
  }
};

/**
 * POST /api/admin/notes/reindex-topic/:topicId
 */
export const reindexNotesTopic = async (req, res) => {
  try {
    const { topicId } = req.params;
    const force =
      String(req.body?.force ?? req.query?.force ?? "true").toLowerCase() !== "false";

    if (!topicId) {
      return res.status(400).json({ success: false, message: "topicId is required" });
    }

    const result = await indexTopicInVectorDb(topicId, { force });
    res.json({
      success: true,
      message: result.skipped
        ? result.reason || "Topic reindex skipped"
        : `Indexed ${result.indexed} chunks for topic.`,
      data: result,
    });
  } catch (error) {
    console.error("reindexNotesTopic:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to reindex topic" });
  }
};

/**
 * GET /api/admin/notes/vector-health — embedding + Qdrant + QG pipeline dashboard
 */
export const notesVectorHealth = async (_req, res) => {
  try {
    const [{ getSystemHealth }, qdrant] = await Promise.all([
      import("../services/health.service.js"),
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
  } catch (error) {
    console.error("notesVectorHealth:", error);
    res.status(500).json({ success: false, message: error.message || "Health check failed" });
  }
};

/**
 * GET /api/admin/notes/search-chunks?subject=&q=&chapterId=
 * Preview chunk matches for a typed topic keyword across PDF + website knowledge.
 * Prefer subject-wide search (all PDFs + synced notes under that subject).
 */
export const searchNotesChunks = async (req, res) => {
  try {
    const subject = String(req.query.subject || "").trim();
    const chapterId = String(req.query.chapterId || "").trim();
    const q = String(req.query.q || "").trim();
    if (q.length < 2) {
      return res.status(400).json({
        success: false,
        message: "q (min 2 chars) is required",
      });
    }
    if (!subject && !chapterId) {
      return res.status(400).json({
        success: false,
        message: "subject or chapterId is required",
      });
    }

    const result = subject
      ? await retrieverService.getContextForSubjectQuery({
          subject,
          query: q,
          batchIndex: 0,
        })
      : await retrieverService.getContextForChapterQuery({
          chapterId,
          query: q,
          batchIndex: 0,
        });

    res.json({
      success: true,
      data: {
        query: q,
        subject: subject || null,
        chapterId: chapterId || null,
        scope: subject ? "subject" : "chapter",
        matchedChunks: result.chunks?.length || 0,
        source: result.source,
        tokens: result.tokens || 0,
        preview: (result.chunks || []).slice(0, 3).map((c) => ({
          heading: c.heading || "",
          page: c.page ?? null,
          source: c.source || "",
          excerpt: String(c.text || "").slice(0, 180),
        })),
      },
    });
  } catch (error) {
    console.error("searchNotesChunks:", error);
    res.status(500).json({ success: false, message: error.message || "Search failed" });
  }
};

/**
 * DELETE /api/admin/notes/chapters/:chapterId — remove an uploaded PDF knowledge source
 */
export const deleteNotesChapter = async (req, res) => {
  try {
    const { chapterId } = req.params;
    const result = await notesService.deletePdfChapter(chapterId);
    res.json({
      success: true,
      message: `Removed PDF "${result.title}" from knowledge base.`,
      data: result,
    });
  } catch (error) {
    console.error("deleteNotesChapter:", error);
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message || "Failed to remove PDF" });
  }
};

/**
 * POST /api/admin/notes/sync-all-website
 * Background sync + embed of notes.mentorsdaily.com catalog.
 * Body: {
 *   subjects?: string[],
 *   force?: boolean,           // re-fetch updated notes (skip cache)
 *   chunking?: { minWords?, maxWords?, overlapWords? }
 * }
 */
export const syncAllWebsiteNotes = async (req, res) => {
  try {
    const subjects = Array.isArray(req.body?.subjects) ? req.body.subjects : undefined;
    const force = Boolean(req.body?.force);
    const chunking =
      req.body?.chunking && typeof req.body.chunking === "object"
        ? req.body.chunking
        : undefined;
    const adminId = req.user?._id ?? req.user?.id;
    const started = startWebsiteNotesSyncBackground({
      subjects,
      force,
      chunking,
      createdBy: adminId,
    });
    const scope =
      subjects?.length > 0 ? `subjects: ${subjects.join(", ")}` : "all subjects";
    res.status(202).json({
      success: true,
      message: force
        ? `Re-syncing updated notes (${scope}) in background (chunk + embed).`
        : `Syncing notes.mentorsdaily.com (${scope}) in background (chunk + embed).`,
      data: started,
    });
  } catch (error) {
    console.error("syncAllWebsiteNotes:", error);
    const status = error.statusCode || 500;
    res.status(status).json({
      success: false,
      message: error.message || "Failed to start website notes sync",
    });
  }
};

/**
 * GET /api/admin/notes/sync-all-website/status
 */
export const getSyncAllWebsiteNotesStatus = async (_req, res) => {
  try {
    res.json({ success: true, data: getWebsiteNotesSyncStatus() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || "Failed to get status" });
  }
};

/**
 * POST /api/admin/notes/promote-to-kb
 * Promote already-synced website chapters into Knowledge Base documents.
 */
export const promoteWebsiteNotesToKb = async (req, res) => {
  try {
    const adminId = req.user?._id ?? req.user?.id;
    const data = await promoteAllSyncedWebsiteNotesToKb({ userId: adminId });
    res.json({
      success: true,
      message: `Promoted ${data.ok}/${data.total} website chapters into Knowledge Base`,
      data,
    });
  } catch (error) {
    console.error("promoteWebsiteNotesToKb:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to promote website notes to KB",
    });
  }
};
