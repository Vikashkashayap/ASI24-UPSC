/**
 * Sync uploaded PDF chapter → topics + semantic chunks in Mongo (Step 2).
 * Does NOT generate embeddings / Qdrant (Step 3) or questions (Step 4).
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import SourceUrl from "../../models/SourceUrl.js";
import ContentTopic from "../../models/ContentTopic.js";
import ContentChunk from "../../models/ContentChunk.js";
import { notesService } from "./notes.service.js";
import { extractPdfDocument } from "./pdfExtract.service.js";
import { semanticChunkPages, SEMANTIC_CHUNK_DEFAULTS } from "./semanticChunking.service.js";
import { indexChapterInVectorDb } from "./notesVectorIndex.service.js";
import { qdrantService } from "../ai/qdrant.service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = path.join(__dirname, "../../..");

function slugify(text, index = 0) {
  const base = String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return base ? `${base}-${index}` : `topic-${index}`;
}

function resolveFilePath(relativeOrAbsolute) {
  if (!relativeOrAbsolute) return null;
  if (path.isAbsolute(relativeOrAbsolute)) return relativeOrAbsolute;
  return path.join(BACKEND_ROOT, relativeOrAbsolute);
}

function chunkingOptsFromEnv() {
  return {
    minWords: parseInt(process.env.NOTES_SEMANTIC_MIN_WORDS, 10) || SEMANTIC_CHUNK_DEFAULTS.minWords,
    maxWords: parseInt(process.env.NOTES_SEMANTIC_MAX_WORDS, 10) || SEMANTIC_CHUNK_DEFAULTS.maxWords,
    overlapWords:
      parseInt(process.env.NOTES_SEMANTIC_OVERLAP_WORDS, 10) || SEMANTIC_CHUNK_DEFAULTS.overlapWords,
    source: "pdf",
  };
}

/**
 * Remove previous PDF-sourced topics/chunks for a chapter.
 * For sourceType=pdf chapters, clears all topics (chapter is PDF-only).
 * For URL chapters with an attached PDF, clears only sourceFormat=pdf topics.
 */
async function clearPreviousPdfTopics(chapter) {
  const filter =
    chapter.sourceType === "pdf"
      ? { sourceUrlId: chapter._id }
      : { sourceUrlId: chapter._id, sourceFormat: "pdf" };

  const topics = await ContentTopic.find(filter).select("_id").lean();
  const ids = topics.map((t) => t._id);
  if (!ids.length) return 0;

  if (qdrantService.isConfigured()) {
    for (const id of ids) {
      try {
        await qdrantService.deleteNoteChunks(String(id));
      } catch (err) {
        console.warn("[notesPdfSync] qdrant delete topic failed:", err.message);
      }
    }
  }

  await ContentChunk.deleteMany({ topicId: { $in: ids } });
  await ContentTopic.deleteMany({ _id: { $in: ids } });
  return ids.length;
}

async function refreshChapterAggregates(chapterId) {
  const topics = await ContentTopic.find({ sourceUrlId: chapterId }).select("chunkCount").lean();
  const topicCount = topics.length;
  const chunkCount = topics.reduce((sum, t) => sum + (t.chunkCount || 0), 0);
  await SourceUrl.findByIdAndUpdate(chapterId, { topicCount, chunkCount });
  return { topicCount, chunkCount };
}

/**
 * Extract + topic-detect + semantic-chunk an uploaded PDF chapter.
 * @param {string} chapterId
 * @param {{ buffer?: Buffer }} [opts] — optional in-memory buffer (skips disk read)
 */
export async function syncChapterFromPdf(chapterId, opts = {}) {
  const chapter = await SourceUrl.findById(chapterId);
  if (!chapter) throw new Error("Chapter not found");
  if (!chapter.filePath && !opts.buffer) {
    throw new Error("Chapter has no uploaded PDF. Upload a PDF first.");
  }

  chapter.status = "syncing";
  chapter.lastSyncError = null;
  await chapter.save();

  try {
    let buffer = opts.buffer;
    if (!buffer) {
      const absolute = resolveFilePath(chapter.filePath);
      buffer = await fs.readFile(absolute);
    }

    console.log(`[notesPdfSync] extracting PDF for chapter ${chapter._id} (${chapter.title})`);
    const extracted = await extractPdfDocument(buffer);
    if (!extracted.fullText || extracted.fullText.length < 40) {
      throw new Error("Extracted PDF text is too short to build topics/chunks");
    }

    const chunkOpts = {
      ...chunkingOptsFromEnv(),
      fallbackTitle: chapter.title || chapter.originalFileName || "PDF Content",
    };

    const detected = semanticChunkPages(extracted.pages, chunkOpts);
    if (!detected.length) {
      throw new Error("No topics could be detected from the PDF");
    }

    const removed = await clearPreviousPdfTopics(chapter);
    if (removed) {
      console.log(`[notesPdfSync] cleared ${removed} previous PDF topic(s) for ${chapter._id}`);
    }

    let totalChunks = 0;
    const topicSummaries = [];

    for (let i = 0; i < detected.length; i += 1) {
      const t = detected[i];
      if (!t.chunks?.length) continue;

      const slug = slugify(t.name, i);
      const topic = await ContentTopic.create({
        name: t.name,
        slug,
        subject: chapter.subject,
        sourceUrlId: chapter._id,
        heading: t.heading || t.name,
        summary: t.summary || "",
        sourceUrl: chapter.url,
        sourceFormat: "pdf",
        pageStart: t.pageStart,
        pageEnd: t.pageEnd,
        chunkCount: 0,
      });

      const saved = await notesService.saveTopicChunks(
        topic._id,
        chapter._id,
        t.chunks,
        chapter.url
      );
      totalChunks += saved;
      topicSummaries.push({
        _id: topic._id,
        name: topic.name,
        chunkCount: saved,
        pageStart: t.pageStart,
        pageEnd: t.pageEnd,
      });
    }

    if (!topicSummaries.length) {
      throw new Error("PDF produced no savable chunks");
    }

    const agg = await refreshChapterAggregates(chapter._id);
    chapter.status = "synced";
    chapter.topicCount = agg.topicCount;
    chapter.chunkCount = agg.chunkCount;
    chapter.lastSyncedAt = new Date();
    chapter.lastSyncError = null;
    // Keep file contentHash from upload; optional text hash can be added later
    await chapter.save();

    let embedding = null;
    try {
      embedding = await indexChapterInVectorDb(chapter._id, { force: true });
    } catch (embedErr) {
      console.warn("[notesPdfSync] embedding index skipped/failed:", embedErr.message);
      embedding = { skipped: true, reason: embedErr.message };
    }

    console.log(
      `[notesPdfSync] chapter ${chapter._id}: ${agg.topicCount} topics, ${agg.chunkCount} chunks ` +
        `(${extracted.numPages} pages)`
    );

    return {
      chapterId: chapter._id,
      title: chapter.title,
      subject: chapter.subject,
      sourceType: chapter.sourceType,
      status: chapter.status,
      topicCount: chapter.topicCount,
      chunkCount: chapter.chunkCount,
      pageCount: extracted.numPages,
      topics: topicSummaries,
      chunking: chunkOpts,
      embedding,
    };
  } catch (err) {
    chapter.status = "failed";
    chapter.lastSyncError = err.message || String(err);
    await chapter.save();
    throw err;
  }
}

export const notesPdfSyncService = {
  syncChapterFromPdf,
};
