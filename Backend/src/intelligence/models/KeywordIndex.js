import mongoose from "mongoose";

/**
 * Inverted keyword index for BM25-style keyword search over knowledge chunks.
 */
const keywordIndexSchema = new mongoose.Schema(
  {
    term: { type: String, required: true, lowercase: true, index: true },
    chunkId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DocumentChunk",
      required: true,
      index: true,
    },
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
    },
    tf: { type: Number, default: 1 },
    subject: { type: String, default: "", index: true },
    chapter: { type: String, default: "" },
    topic: { type: String, default: "" },
    page: { type: Number, default: null },
  },
  { timestamps: true, collection: "keyword_index" }
);

keywordIndexSchema.index({ term: 1, chunkId: 1 }, { unique: true });
keywordIndexSchema.index({ term: 1, subject: 1 });

export const KeywordIndex = mongoose.model("KeywordIndex", keywordIndexSchema);
export default KeywordIndex;
