import mongoose from "mongoose";

/**
 * Cached UPSC-related topics for a syllabus chapter (Knowledge Base search results).
 * Prefetched when a student practices the previous chapter so the next chapter UI
 * (and other students) can show related topics without re-searching.
 */
const chapterRelatedTopicCacheSchema = new mongoose.Schema(
  {
    subjectKey: { type: String, required: true, trim: true, index: true },
    /** Notes / KB subject e.g. Polity */
    kbSubject: { type: String, required: true, trim: true, index: true },
    /** Normalized chapter topic name used as cache key */
    topic: { type: String, required: true, trim: true, index: true },
    /** Original preview line e.g. "Ch 2: Making of the Constitution" */
    chapterLabel: { type: String, default: "", trim: true },
    relatedTopics: {
      type: [
        {
          title: { type: String, required: true },
          score: { type: Number, default: null },
          source: { type: String, default: "" },
        },
      ],
      default: [],
    },
    matchedChunks: { type: Number, default: 0 },
    query: { type: String, default: "" },
    prefetchedFromChapter: { type: String, default: "" },
  },
  { timestamps: true, collection: "chapterrelatedtopiccaches" }
);

chapterRelatedTopicCacheSchema.index(
  { kbSubject: 1, topic: 1 },
  { unique: true }
);

export function buildChapterTopicCacheKey(kbSubject, topic) {
  return {
    kbSubject: String(kbSubject || "").trim(),
    topic: String(topic || "").trim().toLowerCase().replace(/\s+/g, " "),
  };
}

export default mongoose.models.ChapterRelatedTopicCache ||
  mongoose.model("ChapterRelatedTopicCache", chapterRelatedTopicCacheSchema);
