import mongoose from "mongoose";

/** Chunked notes / PDF text linked to a topic. */
const contentChunkSchema = new mongoose.Schema(
  {
    sourceUrlId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SourceUrl",
      required: true,
      index: true,
    },
    topicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ContentTopic",
      required: true,
      index: true,
    },
    heading: { type: String, default: "" },
    text: { type: String, required: true },
    order: { type: Number, default: 0 },
    tokenCount: { type: Number, default: 0 },
    sourceUrl: { type: String, default: "" },
    /** 1-based page when known (PDF ingest). */
    page: { type: Number, default: null },
    /** en | hi | … — named contentLanguage to avoid Mongo text-index "language" override errors. */
    contentLanguage: { type: String, default: "" },
    subTopic: { type: String, default: "" },
    chunkNumber: { type: Number, default: null },
    /** Notes website | uploaded PDF | etc. */
    source: { type: String, default: "notes" },
    /** Step 3 — avoid re-embedding unchanged chunk text. */
    embeddedAt: { type: Date },
    embeddingModel: { type: String, default: "" },
    embeddingHash: { type: String, default: "" },
  },
  { timestamps: true, collection: "contentchunks" }
);

contentChunkSchema.index({ topicId: 1, order: 1 });
contentChunkSchema.index({ sourceUrlId: 1, chunkNumber: 1 });
contentChunkSchema.index({ topicId: 1, source: 1 });

export default mongoose.models.ContentChunk || mongoose.model("ContentChunk", contentChunkSchema);
