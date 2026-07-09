import { notesService } from "../services/notes/notes.service.js";
import { syncChapterFromUrl, syncTopicFromUrl, repairChapterTopicNames } from "../services/notes/notesSync.service.js";
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

    const data = catalog.map((group) => ({
      ...group,
      chapters: group.chapters.map((ch) => {
        const db = byUrl.get(ch.url.replace(/\/$/, ""));
        return {
          ...ch,
          synced: db?.status === "synced",
          status: db?.status || "not_synced",
          _id: db?._id || null,
          topicCount: db?.topicCount || 0,
          chunkCount: db?.chunkCount || 0,
          lastSyncedAt: db?.lastSyncedAt || null,
        };
      }),
    }));

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
