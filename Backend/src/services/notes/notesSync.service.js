import fetch from "node-fetch";
import SourceUrl from "../../models/SourceUrl.js";
import ContentTopic from "../../models/ContentTopic.js";
import { notesService } from "./notes.service.js";
import { htmlToMarkdown } from "./htmlCleaner.js";
import { splitIntoChunks } from "./chunking.service.js";
import ContentChunk from "../../models/ContentChunk.js";
import crypto from "crypto";
import { getCatalogChapters } from "../../config/notesCatalog.js";
import { indexTopicInVectorDb, indexChapterInVectorDb } from "./notesVectorIndex.service.js";
import {
  extractTopicsFromChapterPage,
  extractTitleFromTopicPageHtml,
  resolveTopicName,
} from "./notesHtmlParser.js";
import { qdrantService } from "../ai/qdrant.service.js";

// re-export for callers that imported from this module
export { indexTopicInVectorDb, indexChapterInVectorDb };

async function removeStaleTopics(chapterId, keepTopicIds) {
  const keep = new Set((keepTopicIds || []).map((id) => String(id)));
  const stale = await ContentTopic.find({ sourceUrlId: chapterId }).select("_id").lean();
  const toRemove = stale.filter((t) => !keep.has(String(t._id)));
  if (!toRemove.length) return 0;

  const ids = toRemove.map((t) => t._id);
  if (qdrantService.isConfigured()) {
    for (const id of ids) {
      try {
        await qdrantService.deleteNoteChunks(String(id));
      } catch (err) {
        console.warn("[notesSync] qdrant delete stale topic failed:", err.message);
      }
    }
  }
  await ContentChunk.deleteMany({ topicId: { $in: ids } });
  await ContentTopic.deleteMany({ _id: { $in: ids } });
  return ids.length;
}

/**
 * Fetch a notes page and extract main article text.
 * @param {string} url
 * @returns {Promise<{ text: string, html: string }>}
 */
async function fetchPageContent(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "MentorsDaily-NotesSync/1.0" },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  }
  const html = await response.text();

  const mainMatch =
    html.match(/<main[\s\S]*?<\/main>/i) ||
    html.match(/<article[\s\S]*?<\/article>/i);
  const body = mainMatch ? mainMatch[0] : html;
  return { text: htmlToMarkdown(body), html };
}

function slugify(text, index = 0) {
  const base = String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return base ? `${base}-${index}` : `topic-${index}`;
}

function hashContent(text) {
  return crypto.createHash("sha256").update(String(text || "")).digest("hex");
}

function catalogTitleForUrl(url, subject, fallbackTitle) {
  if (fallbackTitle && !/^[a-z0-9-]+$/.test(fallbackTitle)) return fallbackTitle;
  const chapters = getCatalogChapters(subject);
  const match = chapters.find((c) => c.url.replace(/\/$/, "") === String(url).replace(/\/$/, ""));
  return match?.title || fallbackTitle || url.split("/").pop();
}

/**
 * Sync a chapter URL from notes.mentorsdaily.com into MongoDB.
 * Re-fetches EVERY topic under the chapter (e.g. all 24 Indian Economy topics).
 * @param {{
 *   url: string,
 *   subject: string,
 *   title?: string,
 *   createdBy?: unknown,
 *   chunking?: { minWords?: number, maxWords?: number, overlapWords?: number },
 *   onProgress?: (info: { topicIndex: number, topicTotal: number, topicTitle?: string, topicUrl?: string }) => void
 * }} params
 */
export async function syncChapterFromUrl({
  url,
  subject,
  title,
  createdBy,
  chunking,
  onProgress,
}) {
  const chapterUrl = String(url || "").trim().replace(/\/$/, "");
  const subjectStr = String(subject || "").trim();
  if (!chapterUrl || !subjectStr) {
    throw new Error("url and subject are required");
  }
  const chunkOpts = {
    ...(chunking?.minWords != null ? { minWords: Number(chunking.minWords) } : {}),
    ...(chunking?.maxWords != null ? { maxWords: Number(chunking.maxWords) } : {}),
    ...(chunking?.overlapWords != null ? { overlapWords: Number(chunking.overlapWords) } : {}),
  };

  let chapter = await SourceUrl.findOne({ url: chapterUrl });
  const resolvedTitle =
    title || catalogTitleForUrl(chapterUrl, subjectStr, chapterUrl.split("/").pop());

  if (!chapter) {
    chapter = new SourceUrl({
      url: chapterUrl,
      subject: subjectStr,
      title: resolvedTitle,
      sourceType: "url",
      status: "syncing",
      createdBy,
    });
  } else {
    chapter.status = "syncing";
    chapter.subject = subjectStr;
    chapter.title = resolvedTitle;
  }
  await chapter.save();

  try {
    const response = await fetch(chapterUrl, {
      headers: { "User-Agent": "MentorsDaily-NotesSync/1.0" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const chapterHtml = await response.text();

    const topicLinks = extractTopicsFromChapterPage(chapterHtml, chapterUrl);
    if (!topicLinks.length) {
      throw new Error("No topics found on chapter page. Check the URL.");
    }

    let totalChunks = 0;
    const keptTopicIds = [];

    for (let i = 0; i < topicLinks.length; i += 1) {
      const { url: topicUrl, slug, title: cardTitle } = topicLinks[i];
      if (typeof onProgress === "function") {
        onProgress({
          topicIndex: i + 1,
          topicTotal: topicLinks.length,
          topicTitle: cardTitle || slug,
          topicUrl,
        });
      }

      const { text: pageText, html: topicHtml } = await fetchPageContent(topicUrl);
      if (!pageText || pageText.length < 80) continue;

      const name = resolveTopicName({
        cardTitle,
        pageHtml: topicHtml,
        slug,
      });

      let topic = await ContentTopic.findOne({
        $or: [{ sourceUrlId: chapter._id, slug }, { sourceUrl: topicUrl }],
      });

      if (!topic) {
        topic = new ContentTopic({
          name,
          slug: slugify(slug, i),
          subject: subjectStr,
          sourceUrlId: chapter._id,
          heading: name,
          summary: pageText.slice(0, 400),
          sourceUrl: topicUrl,
        });
      } else {
        topic.name = name;
        topic.heading = name;
        topic.summary = pageText.slice(0, 400);
        topic.sourceUrl = topicUrl;
        topic.sourceUrlId = chapter._id;
        topic.subject = subjectStr;
      }
      await topic.save();
      keptTopicIds.push(topic._id);

      const chunks = splitIntoChunks(pageText, { heading: name, ...chunkOpts });
      const saved = await notesService.saveTopicChunks(
        topic._id,
        chapter._id,
        chunks,
        topicUrl
      );
      totalChunks += saved;
    }

    const removed = await removeStaleTopics(chapter._id, keptTopicIds);
    if (removed) {
      console.log(
        `[notesSync] removed ${removed} stale topic(s) from ${subjectStr}/${resolvedTitle}`
      );
    }

    chapter.status = "synced";
    chapter.topicCount = keptTopicIds.length;
    chapter.chunkCount = totalChunks;
    chapter.lastSyncedAt = new Date();
    chapter.lastSyncError = null;
    chapter.contentHash = hashContent(chapterHtml);
    await chapter.save();

    let embedding = null;
    try {
      embedding = await indexChapterInVectorDb(chapter._id, { force: true });
    } catch (embedErr) {
      console.warn("[notesSync] embedding index skipped/failed:", embedErr.message);
      embedding = { skipped: true, reason: embedErr.message };
    }

    return {
      chapterId: chapter._id,
      title: chapter.title,
      subject: chapter.subject,
      url: chapter.url,
      topicCount: chapter.topicCount,
      chunkCount: chapter.chunkCount,
      status: chapter.status,
      embedding,
      removedTopics: removed,
    };
  } catch (err) {
    chapter.status = "failed";
    chapter.lastSyncError = err.message;
    await chapter.save();
    throw err;
  }
}

/**
 * Re-sync a single topic by URL — preserves/fixes topic name from page title.
 */
export async function syncTopicFromUrl({ topicId, topicUrl }) {
  const topic = await ContentTopic.findById(topicId);
  if (!topic) throw new Error("Topic not found");

  const url = topicUrl || topic.sourceUrl;
  const { text: pageText, html: topicHtml } = await fetchPageContent(url);

  const resolvedName =
    extractTitleFromTopicPageHtml(topicHtml) ||
    (topic.name && !/^(why |on this page|untitled)/i.test(topic.name) ? topic.name : null);

  if (resolvedName) {
    topic.name = resolvedName;
    topic.heading = resolvedName;
  }

  const chunks = splitIntoChunks(pageText, { heading: topic.name });
  const saved = await notesService.saveTopicChunks(topic._id, topic.sourceUrlId, chunks, url);
  const embedding = await indexTopicInVectorDb(topic._id, { force: true });

  topic.summary = pageText.slice(0, 400);
  topic.chunkCount = saved;
  await topic.save();

  const chapter = await SourceUrl.findById(topic.sourceUrlId);
  if (chapter) {
    const agg = await ContentChunk.aggregate([
      { $match: { sourceUrlId: chapter._id } },
      { $group: { _id: "$topicId", count: { $sum: 1 } } },
    ]);
    chapter.chunkCount = agg.reduce((sum, row) => sum + row.count, 0);
    chapter.lastSyncedAt = new Date();
    await chapter.save();
  }

  return { topicId: topic._id, name: topic.name, chunkCount: saved, embedding };
}

/**
 * Fast repair: fix topic names from chapter hub cards (no content re-download).
 */
export async function repairChapterTopicNames(chapterId) {
  const chapter = await SourceUrl.findById(chapterId);
  if (!chapter) throw new Error("Chapter not found");

  const response = await fetch(chapter.url, {
    headers: { "User-Agent": "MentorsDaily-NotesSync/1.0" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const html = await response.text();

  const catalog = extractTopicsFromChapterPage(html, chapter.url);
  const byUrl = new Map(catalog.map((t) => [t.url.replace(/\/$/, ""), t.title]));

  const topics = await ContentTopic.find({ sourceUrlId: chapter._id });
  let fixed = 0;

  for (const topic of topics) {
    const key = String(topic.sourceUrl || "").replace(/\/$/, "");
    const newName = byUrl.get(key);
    if (newName && newName !== topic.name) {
      topic.name = newName;
      topic.heading = newName;
      await topic.save();
      fixed += 1;
    }
  }

  return { chapterId: chapter._id, fixed, total: topics.length };
}

export default { syncChapterFromUrl, syncTopicFromUrl, repairChapterTopicNames };
