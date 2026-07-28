import mongoose from "mongoose";

const documentPageSchema = new mongoose.Schema(
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
    pageNumber: { type: Number, required: true },
    rawText: { type: String, default: "" },
    cleanedText: { type: String, default: "" },
    charCount: { type: Number, default: 0 },
    wordCount: { type: Number, default: 0 },
    hasImages: { type: Boolean, default: false },
    imageCount: { type: Number, default: 0 },
    ocrUsed: { type: Boolean, default: false },
    headings: [{ type: String }],
    footnotes: [{ type: String }],
    references: [{ type: String }],
    tables: [
      {
        preview: String,
        rowCount: Number,
      },
    ],
    imagesMetadata: [
      {
        index: Number,
        width: Number,
        height: Number,
        alt: String,
      },
    ],
  },
  { timestamps: true, collection: "document_pages" }
);

documentPageSchema.index(
  { processedDocumentId: 1, pageNumber: 1 },
  { unique: true }
);

export const DocumentPage = mongoose.model("DocumentPage", documentPageSchema);
export default DocumentPage;
