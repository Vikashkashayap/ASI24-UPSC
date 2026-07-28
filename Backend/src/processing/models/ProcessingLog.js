import mongoose from "mongoose";

const processingLogSchema = new mongoose.Schema(
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
    status: {
      type: String,
      enum: ["started", "completed", "failed", "skipped", "retry"],
      required: true,
    },
    message: { type: String, default: "" },
    errorMessage: { type: String, default: null },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
    duration: { type: Number, default: 0 },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collection: "processing_logs" }
);

processingLogSchema.index({ processedDocumentId: 1, createdAt: -1 });

export const ProcessingLog = mongoose.model("ProcessingLog", processingLogSchema);
export default ProcessingLog;
