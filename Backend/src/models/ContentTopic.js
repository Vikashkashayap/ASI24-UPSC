import mongoose from "mongoose";

/** Notes topic under a chapter (source URL or PDF). */
const contentTopicSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true, index: true },
    sourceUrlId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SourceUrl",
      required: true,
      index: true,
    },
    parentTopicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ContentTopic",
      default: null,
    },
    heading: { type: String, default: "" },
    summary: { type: String, default: "" },
    chunkCount: { type: Number, default: 0 },
    questionCount: { type: Number, default: 0 },
    sourceUrl: { type: String, default: "" },
    /** web | pdf — provenance for RAG metadata (Step 2+). */
    sourceFormat: {
      type: String,
      enum: ["web", "pdf"],
      default: "web",
    },
    pageStart: { type: Number, default: null },
    pageEnd: { type: Number, default: null },
  },
  { timestamps: true, collection: "contenttopics" }
);

contentTopicSchema.index({ sourceUrlId: 1, slug: 1 }, { unique: true });
contentTopicSchema.index({ subject: 1, sourceFormat: 1 });

export default mongoose.models.ContentTopic || mongoose.model("ContentTopic", contentTopicSchema);
