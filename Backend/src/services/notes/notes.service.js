import fetch from "node-fetch";
import SourceUrl from "../../models/SourceUrl.js";
import ContentTopic from "../../models/ContentTopic.js";
import ContentChunk from "../../models/ContentChunk.js";
import { htmlToMarkdown, cleanHtml, htmlToEducationalText } from "./htmlCleaner.js";
import { splitIntoChunks, estimateTokenCount } from "./chunking.service.js";
import { getAllCatalogSubjects, getCatalogChapters } from "../../config/notesCatalog.js";

const FETCH_HEADERS = { "User-Agent": "MentorsDaily-NotesSync/1.0" };
// Soft cap only — ContextReducer enforces ~1200 token budget at generation time
const MAX_PROMPT_CHARS = parseInt(process.env.NOTES_MAX_PROMPT_CHARS, 10) || 12000;

/**
 * Fetch raw HTML from a notes.mentorsdaily.com topic URL.
 * @param {string} url
 * @returns {Promise<{ html: string, bodyHtml: string }>}
 */
export async function fetchTopicHtmlFromUrl(url) {
  const topicUrl = String(url || "").trim();
  if (!topicUrl) throw new Error("Topic URL is required");

  const response = await fetch(topicUrl, { headers: FETCH_HEADERS });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${topicUrl}: HTTP ${response.status}`);
  }
  const html = await response.text();
  const mainMatch =
    html.match(/<main[\s\S]*?<\/main>/i) || html.match(/<article[\s\S]*?<\/article>/i);
  const bodyHtml = mainMatch ? mainMatch[0] : html;
  return { html, bodyHtml };
}

/**
 * Truncate cleaned notes for LLM context (token safety).
 * @param {string} text
 * @param {number} [maxChars]
 */
export function truncateNotesForPrompt(text, maxChars = MAX_PROMPT_CHARS) {
  const str = String(text || "").trim();
  if (str.length <= maxChars) return str;
  return `${str.slice(0, maxChars)}\n\n[Content truncated for token limit — use only the text above]`;
}

/**
 * NotesService — read structured notes from MongoDB (synced from notes.mentorsdaily.com).
 */
class NotesService {
  /** @returns {Promise<string[]>} — all UPSC subjects from catalog */
  async getSubjects() {
    return getAllCatalogSubjects();
  }

  /**
   * Chapters for a subject — catalog entries merged with DB sync status.
   * @param {string} subject
   * @returns {Promise<object[]>}
   */
  async getChapters(subject) {
    const subjectStr = String(subject || "").trim();
    if (!subjectStr) return [];

    const catalogChapters = getCatalogChapters(subjectStr);
    const synced = await SourceUrl.find({ subject: subjectStr })
      .select(
        "_id title subject url sourceType topicCount chunkCount status lastSyncedAt filePath originalFileName fileSize mimeType embeddingStatus embeddingModel embeddingsIndexedAt"
      )
      .lean();

    const byUrl = new Map(synced.map((c) => [c.url.replace(/\/$/, ""), c]));
    const usedIds = new Set();

    const mapDbChapter = (db, extras = {}) => ({
      _id: db._id,
      title: extras.title || db.title,
      subject: subjectStr,
      url: db.url,
      slug: extras.slug ?? null,
      gsPaper: extras.gsPaper ?? null,
      sourceType: db.sourceType || "url",
      topicCount: db.topicCount || 0,
      expectedTopicCount: extras.expectedTopicCount,
      chunkCount: db.chunkCount || 0,
      status: db.status,
      synced: db.status === "synced",
      lastSyncedAt: db.lastSyncedAt,
      hasPdf: Boolean(db.filePath),
      originalFileName: db.originalFileName || "",
      fileSize: db.fileSize || 0,
      embeddingStatus: db.embeddingStatus || "pending",
      embeddingModel: db.embeddingModel || "",
      embeddingsIndexedAt: db.embeddingsIndexedAt || null,
    });

    const catalogRows = catalogChapters.map((cat) => {
      const db = byUrl.get(cat.url.replace(/\/$/, ""));
      if (db) {
        usedIds.add(String(db._id));
        return mapDbChapter(db, {
          title: cat.title || db.title,
          slug: cat.slug,
          gsPaper: cat.gsPaper,
          expectedTopicCount: cat.expectedTopicCount,
        });
      }
      return {
        _id: null,
        title: cat.title,
        subject: subjectStr,
        url: cat.url,
        slug: cat.slug,
        gsPaper: cat.gsPaper,
        sourceType: "url",
        topicCount: 0,
        expectedTopicCount: cat.expectedTopicCount,
        chunkCount: 0,
        status: "not_synced",
        synced: false,
        lastSyncedAt: null,
        hasPdf: false,
        originalFileName: "",
        fileSize: 0,
        embeddingStatus: "pending",
        embeddingModel: "",
        embeddingsIndexedAt: null,
      };
    });

    // PDF-only (or other DB) chapters not present in the static notes catalog
    const extraRows = synced
      .filter((db) => !usedIds.has(String(db._id)))
      .map((db) => mapDbChapter(db, {}));

    return [...catalogRows, ...extraRows];
  }

  /**
   * @param {string} chapterId — SourceUrl _id
   * @returns {Promise<object[]>}
   */
  async getTopics(chapterId) {
    if (!chapterId) return [];

    const topics = await ContentTopic.find({ sourceUrlId: chapterId })
      .sort({ name: 1 })
      .select("_id name slug subject sourceUrlId heading summary chunkCount sourceUrl sourceFormat pageStart pageEnd")
      .lean();

    return topics.map((t) => ({
      _id: t._id,
      name: t.name,
      slug: t.slug,
      subject: t.subject,
      chapterId: t.sourceUrlId,
      heading: t.heading || t.name,
      summary: t.summary || "",
      chunkCount: t.chunkCount || 0,
      sourceUrl: t.sourceUrl || "",
      sourceFormat: t.sourceFormat || "web",
      pageStart: t.pageStart ?? null,
      pageEnd: t.pageEnd ?? null,
    }));
  }

  /**
   * @param {string} topicId
   * @returns {Promise<{ topic: object, chapter: object|null, chunks: object[], fullText: string }|null>}
   */
  async getNoteByTopic(topicId) {
    if (!topicId) return null;

    const topic = await ContentTopic.findById(topicId).lean();
    if (!topic) return null;

    const chapter = await SourceUrl.findById(topic.sourceUrlId).lean();
    const chunks = await ContentChunk.find({ topicId })
      .sort({ order: 1 })
      .select("_id heading text order tokenCount sourceUrl")
      .lean();

    const fullText = chunks.map((c) => c.text).join("\n\n").trim();

    return {
      topic: {
        _id: topic._id,
        name: topic.name,
        slug: topic.slug,
        subject: topic.subject,
        heading: topic.heading || topic.name,
        summary: topic.summary || "",
        sourceUrl: topic.sourceUrl || "",
        chapterId: topic.sourceUrlId,
      },
      chapter: chapter
        ? {
            _id: chapter._id,
            title: chapter.title,
            subject: chapter.subject,
            url: chapter.url,
          }
        : null,
      chunks,
      fullText,
    };
  }

  /**
   * Convert raw HTML notes to clean markdown text.
   * @param {string} html
   * @returns {string}
   */
  convertHtmlToMarkdown(html) {
    return htmlToMarkdown(html);
  }

  cleanHtml(html) {
    return cleanHtml(html);
  }

  /**
   * Fetch latest topic HTML from notes.mentorsdaily.com and return cleaned educational text.
   * @param {string} topicId
   * @returns {Promise<{ topic: object, cleanText: string, sourceUrl: string }>}
   */
  async fetchAndCleanTopicNotes(topicId) {
    const note = await this.getNoteByTopic(topicId);
    if (!note) {
      const err = new Error("Notes topic not found");
      err.statusCode = 404;
      throw err;
    }

    const sourceUrl = note.topic.sourceUrl || "";
    if (!sourceUrl) {
      const err = new Error("Topic has no source URL. Sync the chapter first.");
      err.statusCode = 400;
      throw err;
    }

    const { bodyHtml } = await fetchTopicHtmlFromUrl(sourceUrl);
    let cleanText = htmlToEducationalText(bodyHtml);

    if (!cleanText || cleanText.length < 80) {
      cleanText = note.fullText || "";
    }
    if (!cleanText || cleanText.length < 80) {
      const err = new Error(
        "Could not extract notes content from the topic page. Try re-syncing the chapter."
      );
      err.statusCode = 400;
      throw err;
    }

    cleanText = truncateNotesForPrompt(cleanText);
    return {
      topic: note.topic,
      chapter: note.chapter,
      cleanText,
      sourceUrl,
    };
  }

  /**
   * Fetch and clean notes for multiple topics (used at generation start).
   * @param {string[]} topicIds
   */
  async fetchAndCleanTopicsNotes(topicIds = []) {
    const ids = [...new Set((topicIds || []).map((id) => String(id)).filter(Boolean))];
    const results = [];
    for (const id of ids) {
      results.push(await this.fetchAndCleanTopicNotes(id));
    }
    return results;
  }

  /**
   * Chunk plain text for storage / retrieval.
   * @param {string} text
   * @param {{ heading?: string }} [opts]
   */
  chunkText(text, opts = {}) {
    return splitIntoChunks(text, opts);
  }

  /**
   * Validate topic has usable notes content.
   * @param {string} topicId
   */
  async assertTopicHasContent(topicId) {
    const note = await this.getNoteByTopic(topicId);
    if (!note) {
      const err = new Error("Notes topic not found");
      err.statusCode = 404;
      throw err;
    }

    const hasChunks =
      (note.chunks?.length || 0) > 0 && String(note.fullText || "").trim().length >= 80;
    const canLiveFetch = /^https?:\/\//i.test(String(note.topic.sourceUrl || ""));

    if (hasChunks || canLiveFetch) {
      return note;
    }

    const err = new Error(
      "No content found for this topic. Sync from notes.mentorsdaily.com or upload/process a PDF for this chapter first."
    );
    err.statusCode = 400;
    throw err;
  }

  /** Validate multiple topics have usable notes content. */
  async assertTopicsHaveContent(topicIds = []) {
    const ids = [...new Set((topicIds || []).map((id) => String(id)).filter(Boolean))];
    if (!ids.length) {
      const err = new Error("Select at least one topic from Notes");
      err.statusCode = 400;
      throw err;
    }
    const notes = [];
    for (const id of ids) {
      notes.push(await this.assertTopicHasContent(id));
    }
    return notes;
  }

  /**
   * Persist chunks for a topic (used by sync pipeline).
   * @param {string} topicId
   * @param {string} sourceUrlId
   * @param {object[]} chunks — { heading, text, order, tokenCount }
   */
  async saveTopicChunks(topicId, sourceUrlId, chunks, sourceUrl = "") {
    await ContentChunk.deleteMany({ topicId });
    if (!chunks?.length) return 0;

    const docs = chunks.map((c, i) => ({
      topicId,
      sourceUrlId,
      heading: c.heading || "",
      text: c.text,
      order: c.order ?? i,
      tokenCount: c.tokenCount ?? estimateTokenCount(c.text),
      sourceUrl,
      page: c.page ?? null,
      contentLanguage: c.contentLanguage || c.language || "",
      subTopic: c.subTopic || "",
      chunkNumber: c.chunkNumber ?? (c.order ?? i) + 1,
      source: c.source || "notes",
    }));

    await ContentChunk.insertMany(docs);
    await ContentTopic.findByIdAndUpdate(topicId, {
      chunkCount: docs.length,
    });

    console.log(`📝 NotesService: saved ${docs.length} chunks for topic ${topicId}`);
    return docs.length;
  }
}

export const notesService = new NotesService();
export default notesService;
