import mongoose from "mongoose";
import { EMBEDDING_STATUSES } from "../utils/constants.js";

const embeddingSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "KbDocument",
      required: true,
      index: true,
    },
    processedDocumentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProcessedDocument",
      default: null,
      index: true,
    },
    chunkId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DocumentChunk",
      required: true,
      unique: true,
      index: true,
    },
    embeddingText: { type: String, required: true },
    embeddingHash: { type: String, default: "", index: true },
    status: {
      type: String,
      enum: EMBEDDING_STATUSES,
      default: "Pending",
      index: true,
    },
    provider: { type: String, default: "" },
    model: { type: String, default: "" },
    dimensions: { type: Number, default: 0 },
    /** Store vector optionally for cache/debug — can be large; keep when INTEL_STORE_VECTORS=true */
    vector: { type: [Number], default: undefined, select: false },
    qdrantPointId: { type: String, default: null, index: true },
    qdrantSynced: { type: Boolean, default: false, index: true },
    qdrantSyncedAt: { type: Date, default: null },
    errorMessage: { type: String, default: null },
    retryCount: { type: Number, default: 0 },
    subject: { type: String, default: "", index: true },
    chapter: { type: String, default: "" },
    topic: { type: String, default: "", index: true },
    source: { type: String, default: "" },
    year: { type: Number, default: null },
    difficulty: { type: String, default: "" },
    language: { type: String, default: "English" },
    tags: [{ type: String }],
    page: { type: Number, default: null },
    chunkOrder: { type: Number, default: 0 },
    generatedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "embeddings" }
);

embeddingSchema.index({ status: 1, updatedAt: -1 });
embeddingSchema.index({ documentId: 1, status: 1 });

export const EmbeddingRecord = mongoose.model("EmbeddingRecord", embeddingSchema);
export default EmbeddingRecord;
