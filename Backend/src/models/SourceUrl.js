import mongoose from "mongoose";

/** Notes website chapter (e.g. Ancient History under History). */
const sourceUrlSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true, index: true },
    sourceType: { type: String, default: "url" },
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
  },
  { timestamps: true, collection: "sourceurls" }
);

sourceUrlSchema.index({ subject: 1, url: 1 }, { unique: true });

export default mongoose.models.SourceUrl || mongoose.model("SourceUrl", sourceUrlSchema);
