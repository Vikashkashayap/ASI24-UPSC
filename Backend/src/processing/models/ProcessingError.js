import mongoose from "mongoose";

const processingErrorSchema = new mongoose.Schema(
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
    stage: { type: String, required: true },
    workerName: { type: String, required: true },
    queueName: { type: String, default: "" },
    jobId: { type: String, default: null },
    errorMessage: { type: String, required: true },
    stack: { type: String, default: null },
    retryable: { type: Boolean, default: true },
    resolved: { type: Boolean, default: false },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "processing_errors" }
);

processingErrorSchema.index({ resolved: 1, createdAt: -1 });

export const ProcessingError = mongoose.model("ProcessingError", processingErrorSchema);
export default ProcessingError;
