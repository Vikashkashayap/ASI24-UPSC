import mongoose from "mongoose";

const documentChunkSchema = new mongoose.Schema(
  {
    processedDocumentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProcessedDocument",
      required: true,
      index: true,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "KbDocument",
      required: true,
      index: true,
    },
    chunkText: { type: String, required: true },
    chunkHash: { type: String, default: "", index: true },
    page: { type: Number, default: 1 },
    subject: { type: String, default: "" },
    chapter: { type: String, default: "" },
    topic: { type: String, default: "" },
    chunkOrder: { type: Number, default: 0 },
    wordCount: { type: Number, default: 0 },
    sectionType: { type: String, default: "paragraph" },
    isDuplicate: { type: Boolean, default: false },
    duplicateOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DocumentChunk",
      default: null,
    },
    // Future embedding placeholders
    embeddingStatus: {
      type: String,
      enum: ["idle", "queued", "pending", "completed", "failed", "skipped"],
      default: "idle",
    },
    embeddingId: { type: String, default: null },
    qdrantPointId: { type: String, default: null },
  },
  { timestamps: true, collection: "document_chunks" }
);

documentChunkSchema.index({ processedDocumentId: 1, chunkOrder: 1 });
documentChunkSchema.index({ documentId: 1, isDuplicate: 1 });

export const DocumentChunk = mongoose.model("DocumentChunk", documentChunkSchema);
export default DocumentChunk;
