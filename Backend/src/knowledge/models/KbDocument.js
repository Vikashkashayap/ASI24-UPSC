import mongoose from "mongoose";
import { slugify } from "../utils/slugify.js";

export const PROCESSING_STATUSES = [
  "Pending",
  "Queued",
  "Uploading",
  "Uploaded",
  "Processing",
  "Completed",
  "Failed",
];

export const PIPELINE_STATUSES = [
  "idle",
  "pending",
  "queued",
  "running",
  "completed",
  "failed",
  "skipped",
];

const pipelineField = {
  type: String,
  enum: PIPELINE_STATUSES,
  default: "idle",
};

const kbDocumentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true },
    description: { type: String, default: "" },

    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "KbSubject", default: null, index: true },
    chapterId: { type: mongoose.Schema.Types.ObjectId, ref: "KbChapter", default: null, index: true },
    topicId: { type: mongoose.Schema.Types.ObjectId, ref: "KbTopic", default: null, index: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "KbCategory", default: null, index: true },
    sourceId: { type: mongoose.Schema.Types.ObjectId, ref: "KbSource", default: null },

    tags: [{ type: String, trim: true }],
    language: { type: String, default: "English", trim: true },
    year: { type: Number, default: null, index: true },
    publication: { type: String, default: "", trim: true },
    sourceLabel: { type: String, default: "", trim: true },

    difficulty: {
      type: String,
      enum: ["Easy", "Moderate", "Hard", "Static", "Dynamic"],
      default: "Moderate",
    },
    contentType: {
      type: String,
      enum: ["Static", "Dynamic"],
      default: "Static",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },

    status: {
      type: String,
      enum: ["draft", "active", "archived"],
      default: "active",
      index: true,
    },
    processingStatus: {
      type: String,
      enum: PROCESSING_STATUSES,
      default: "Pending",
      index: true,
    },

    // Future AI pipeline fields (unused in this phase)
    processingStartedAt: { type: Date, default: null },
    processingCompletedAt: { type: Date, default: null },
    processingError: { type: String, default: null },
    processingLogs: [
      {
        at: { type: Date, default: Date.now },
        level: { type: String, enum: ["info", "warn", "error"], default: "info" },
        message: { type: String, required: true },
      },
    ],
    embeddingStatus: pipelineField,
    ocrStatus: pipelineField,
    parserStatus: pipelineField,
    questionExtractionStatus: pipelineField,
    metadataExtractionStatus: pipelineField,
    topicExtractionStatus: pipelineField,
    duplicateDetectionStatus: pipelineField,

    storageKey: { type: String, default: "" },
    storageUrl: { type: String, default: "" },
    thumbnail: { type: String, default: "" },
    originalFileName: { type: String, default: "" },
    fileSize: { type: Number, default: 0 },
    mimeType: { type: String, default: "" },
    extension: { type: String, default: "" },
    checksum: { type: String, default: "", index: true },

    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    uploadId: { type: mongoose.Schema.Types.ObjectId, ref: "KbUpload", default: null },
    parentDocumentId: { type: mongoose.Schema.Types.ObjectId, ref: "KbDocument", default: null },
    version: { type: Number, default: 1 },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

kbDocumentSchema.index({ slug: 1 }, { unique: true });
kbDocumentSchema.index({ title: "text", description: "text", tags: "text", originalFileName: "text" });
kbDocumentSchema.index({ subjectId: 1, categoryId: 1, processingStatus: 1, isDeleted: 1 });
kbDocumentSchema.index({ createdAt: -1 });

kbDocumentSchema.pre("validate", function (next) {
  if (!this.slug && this.title) this.slug = slugify(this.title);
  next();
});

export const KbDocument = mongoose.model("KbDocument", kbDocumentSchema);
export default KbDocument;
