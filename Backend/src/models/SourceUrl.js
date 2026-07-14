import mongoose from "mongoose";

/** Notes chapter — website URL and/or uploaded PDF under a subject. */
const sourceUrlSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true, index: true },
    sourceType: {
      type: String,
      enum: ["url", "pdf"],
      default: "url",
      index: true,
    },
    /** Website chapter URL, or synthetic `pdf://…` key for uploaded PDFs (unique with subject). */
    url: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["pending", "syncing", "synced", "failed"],
      default: "pending",
    },
    autoSync: { type: Boolean, default: true },
    topicCount: { type: Number, default: 0 },
    chunkCount: { type: Number, default: 0 },
    questionCount: { type: Number, default: 0 },
    contentHash: { type: String, default: "" },
    lastSyncedAt: { type: Date },
    lastSyncError: { type: String, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    /** Local PDF path relative to Backend root (Step 1+). Empty for URL-only chapters. */
    filePath: { type: String, default: "" },
    originalFileName: { type: String, default: "" },
    mimeType: { type: String, default: "" },
    fileSize: { type: Number, default: 0 },
    /** Step 3 — vector index state (hash-gated; regenerate only when content changes). */
    embeddingHash: { type: String, default: "" },
    embeddingModel: { type: String, default: "" },
    embeddingsIndexedAt: { type: Date },
    embeddingStatus: {
      type: String,
      enum: ["pending", "indexing", "indexed", "failed", "skipped"],
      default: "pending",
    },
    embeddingError: { type: String, default: null },
  },
  { timestamps: true, collection: "sourceurls" }
);

sourceUrlSchema.index({ subject: 1, url: 1 }, { unique: true });
sourceUrlSchema.index({ subject: 1, sourceType: 1, status: 1 });

export default mongoose.models.SourceUrl || mongoose.model("SourceUrl", sourceUrlSchema);
