import mongoose from "mongoose";
import { SECTION_TYPES } from "../utils/constants.js";

const documentSectionSchema = new mongoose.Schema(
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
    pageNumber: { type: Number, default: 1 },
    sectionType: { type: String, enum: SECTION_TYPES, required: true },
    order: { type: Number, default: 0 },
    text: { type: String, default: "" },
    headingLevel: { type: Number, default: null },
    subject: { type: String, default: "" },
    chapter: { type: String, default: "" },
    topic: { type: String, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collection: "document_sections" }
);

documentSectionSchema.index({ processedDocumentId: 1, order: 1 });

export const DocumentSection = mongoose.model("DocumentSection", documentSectionSchema);
export default DocumentSection;
