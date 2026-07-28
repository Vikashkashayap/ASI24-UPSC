import mongoose from "mongoose";

const questionOptionSchema = new mongoose.Schema(
  {
    label: { type: String, required: true }, // A, B, C, D
    text: { type: String, required: true },
    isCorrect: { type: Boolean, default: false },
  },
  { _id: false }
);

const extractedQuestionSchema = new mongoose.Schema(
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
    questionNumber: { type: String, default: "" },
    questionText: { type: String, required: true },
    questionHash: { type: String, default: "", index: true },
    options: [questionOptionSchema],
    correctAnswer: { type: String, default: "" },
    explanation: { type: String, default: "" },
    difficulty: { type: String, default: "" }, // empty for now
    pageNumber: { type: Number, default: null },
    subject: { type: String, default: "" },
    chapter: { type: String, default: "" },
    topic: { type: String, default: "" },
    isDuplicate: { type: Boolean, default: false },
    duplicateOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExtractedQuestion",
      default: null,
    },
    order: { type: Number, default: 0 },
  },
  { timestamps: true, collection: "questions" }
);

extractedQuestionSchema.index({ processedDocumentId: 1, order: 1 });

export const ExtractedQuestion = mongoose.model("ExtractedQuestion", extractedQuestionSchema);
export default ExtractedQuestion;
