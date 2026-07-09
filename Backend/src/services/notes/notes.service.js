import SourceUrl from "../../models/SourceUrl.js";
import ContentTopic from "../../models/ContentTopic.js";
import ContentChunk from "../../models/ContentChunk.js";
import { htmlToMarkdown, cleanHtml } from "./htmlCleaner.js";
import { splitIntoChunks, estimateTokenCount } from "./chunking.service.js";
import { getAllCatalogSubjects, getCatalogChapters } from "../../config/notesCatalog.js";

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
      .select("_id title subject url topicCount chunkCount status lastSyncedAt")
      .lean();

    const byUrl = new Map(synced.map((c) => [c.url.replace(/\/$/, ""), c]));

    return catalogChapters.map((cat) => {
      const db = byUrl.get(cat.url.replace(/\/$/, ""));
      if (db) {
        return {
          _id: db._id,
          title: cat.title || db.title,
          subject: subjectStr,
          url: db.url,
          slug: cat.slug,
          gsPaper: cat.gsPaper,
          topicCount: db.topicCount || 0,
          expectedTopicCount: cat.expectedTopicCount,
          chunkCount: db.chunkCount || 0,
          status: db.status,
          synced: db.status === "synced",
          lastSyncedAt: db.lastSyncedAt,
        };
      }
      return {
        _id: null,
        title: cat.title,
        subject: subjectStr,
        url: cat.url,
        slug: cat.slug,
        gsPaper: cat.gsPaper,
        topicCount: 0,
        expectedTopicCount: cat.expectedTopicCount,
        chunkCount: 0,
        status: "not_synced",
        synced: false,
        lastSyncedAt: null,
      };
    });
  }

  /**
   * @param {string} chapterId — SourceUrl _id
   * @returns {Promise<object[]>}
   */
  async getTopics(chapterId) {
    if (!chapterId) return [];

    const topics = await ContentTopic.find({ sourceUrlId: chapterId })
      .sort({ name: 1 })
      .select("_id name slug subject sourceUrlId heading summary chunkCount sourceUrl")
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
    if (!note.fullText || note.fullText.length < 100) {
      const err = new Error(
        "No notes content found for this topic. Sync the chapter from notes.mentorsdaily.com first."
      );
      err.statusCode = 400;
      throw err;
    }
    return note;
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
