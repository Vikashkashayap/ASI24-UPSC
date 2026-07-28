import mongoose from "mongoose";
import { PIPELINE_STAGES, DOC_KINDS } from "../utils/constants.js";

const processedDocumentSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "KbDocument",
      required: true,
      unique: true,
      index: true,
    },
    title: { type: String, default: "" },
    checksum: { type: String, default: "", index: true },
    mimeType: { type: String, default: "" },
    extension: { type: String, default: "" },
    storageKey: { type: String, default: "" },
    storageUrl: { type: String, default: "" },

    stage: {
      type: String,
      enum: PIPELINE_STAGES,
      default: "Queued",
      index: true,
    },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    status: {
      type: String,
      enum: ["queued", "running", "completed", "failed", "retrying", "cancelled"],
      default: "queued",
      index: true,
    },

    isScanned: { type: Boolean, default: false },
    ocrProvider: { type: String, default: null },
    parserProvider: { type: String, default: null },
    documentKind: { type: String, enum: DOC_KINDS, default: "unknown" },

    pageCount: { type: Number, default: 0 },
    sectionCount: { type: Number, default: 0 },
    chunkCount: { type: Number, default: 0 },
    questionCount: { type: Number, default: 0 },

    detectedSubject: { type: String, default: "" },
    detectedChapter: { type: String, default: "" },
    detectedTopics: [{ type: String }],

    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "KbSubject", default: null },
    chapterId: { type: mongoose.Schema.Types.ObjectId, ref: "KbChapter", default: null },
    topicId: { type: mongoose.Schema.Types.ObjectId, ref: "KbTopic", default: null },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "KbCategory", default: null },

    duplicateOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProcessedDocument",
      default: null,
    },
    isDuplicate: { type: Boolean, default: false },

    // Future placeholders
    embeddingStatus: {
      type: String,
      enum: ["idle", "queued", "running", "completed", "failed", "skipped"],
      default: "idle",
    },
    qdrantSyncStatus: {
      type: String,
      enum: ["idle", "queued", "running", "completed", "failed", "skipped"],
      default: "idle",
    },
    rerankStatus: {
      type: String,
      enum: ["idle", "queued", "running", "completed", "failed", "skipped"],
      default: "idle",
    },
    knowledgeGraphStatus: {
      type: String,
      enum: ["idle", "queued", "running", "completed", "failed", "skipped"],
      default: "idle",
    },
    llmMetadataStatus: {
      type: String,
      enum: ["idle", "queued", "running", "completed", "failed", "skipped"],
      default: "idle",
    },
    aiValidationStatus: {
      type: String,
      enum: ["idle", "queued", "running", "completed", "failed", "skipped"],
      default: "idle",
    },

    currentJobId: { type: String, default: null },
    currentQueue: { type: String, default: null },
    lastError: { type: String, default: null },
    retryCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 3 },

    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },

    // In-memory path hint for workers (temp file optional — we re-download from S3 per stage if needed)
    tempFilePath: { type: String, default: null },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "processed_documents" }
);

processedDocumentSchema.index({ status: 1, stage: 1, updatedAt: -1 });
processedDocumentSchema.index({ createdAt: -1 });

export const ProcessedDocument = mongoose.model("ProcessedDocument", processedDocumentSchema);
export default ProcessedDocument;
