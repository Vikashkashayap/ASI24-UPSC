import mongoose from "mongoose";

const vectorSyncLogSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: "KbDocument", index: true },
    processedDocumentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProcessedDocument",
      index: true,
    },
    chunkId: { type: mongoose.Schema.Types.ObjectId, ref: "DocumentChunk", index: true },
    embeddingId: { type: mongoose.Schema.Types.ObjectId, ref: "EmbeddingRecord", index: true },
    action: {
      type: String,
      enum: ["insert", "update", "delete", "sync", "retry", "ensure_collection"],
      required: true,
    },
    status: {
      type: String,
      enum: ["started", "completed", "failed"],
      required: true,
    },
    collectionName: { type: String, default: "" },
    qdrantPointId: { type: String, default: null },
    message: { type: String, default: "" },
    errorMessage: { type: String, default: null },
    durationMs: { type: Number, default: 0 },
  },
  { timestamps: true, collection: "vector_sync_logs" }
);

vectorSyncLogSchema.index({ createdAt: -1 });

export const VectorSyncLog = mongoose.model("VectorSyncLog", vectorSyncLogSchema);
export default VectorSyncLog;
