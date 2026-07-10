import mongoose from "mongoose";

/** Chunked notes text linked to a topic. */
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
  },
  { timestamps: true, collection: "contentchunks" }
);

contentChunkSchema.index({ topicId: 1, order: 1 });

export default mongoose.models.ContentChunk || mongoose.model("ContentChunk", contentChunkSchema);
