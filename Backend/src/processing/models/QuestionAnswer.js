import mongoose from "mongoose";

const questionAnswerSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExtractedQuestion",
      required: true,
      unique: true,
      index: true,
    },
    processedDocumentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProcessedDocument",
      required: true,
      index: true,
    },
    correctAnswer: { type: String, default: "" },
    explanation: { type: String, default: "" },
    confidence: { type: Number, default: null },
    source: { type: String, default: "extracted" },
  },
  { timestamps: true, collection: "question_answers" }
);

export const QuestionAnswer = mongoose.model("QuestionAnswer", questionAnswerSchema);
export default QuestionAnswer;
