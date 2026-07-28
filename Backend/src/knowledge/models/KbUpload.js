import mongoose from "mongoose";

const fileEntrySchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    mimeType: { type: String, default: "" },
    fileSize: { type: Number, default: 0 },
    checksum: { type: String, default: "" },
    storageKey: { type: String, default: "" },
    storageUrl: { type: String, default: "" },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: "KbDocument", default: null },
    status: {
      type: String,
      enum: ["pending", "uploading", "uploaded", "failed", "cancelled", "paused"],
      default: "pending",
    },
    progress: { type: Number, default: 0 },
    error: { type: String, default: null },
  },
  { _id: true }
);

const kbUploadSchema = new mongoose.Schema(
  {
    uploadType: {
      type: String,
      enum: ["single", "bulk", "zip"],
      default: "single",
    },
    status: {
      type: String,
      enum: ["pending", "uploading", "uploaded", "partial", "failed", "cancelled"],
      default: "pending",
      index: true,
    },
    files: [fileEntrySchema],
    totalFiles: { type: Number, default: 0 },
    completedFiles: { type: Number, default: 0 },
    failedFiles: { type: Number, default: 0 },
    totalBytes: { type: Number, default: 0 },
    uploadedBytes: { type: Number, default: 0 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    error: { type: String, default: null },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

kbUploadSchema.index({ createdAt: -1 });

export const KbUpload = mongoose.model("KbUpload", kbUploadSchema);
export default KbUpload;
