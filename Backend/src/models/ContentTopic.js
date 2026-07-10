import mongoose from "mongoose";

/** Notes topic under a chapter (source URL). */
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
  },
  { timestamps: true, collection: "contenttopics" }
);

contentTopicSchema.index({ sourceUrlId: 1, slug: 1 }, { unique: true });

export default mongoose.models.ContentTopic || mongoose.model("ContentTopic", contentTopicSchema);
