import mongoose from "mongoose";

/**
 * Separate collection for option rows when needed for analytics.
 * Primary options also live embedded on ExtractedQuestion.
 */
const questionOptionDocSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExtractedQuestion",
      required: true,
      index: true,
    },
    processedDocumentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProcessedDocument",
      required: true,
      index: true,
    },
    label: { type: String, required: true },
    text: { type: String, required: true },
    isCorrect: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  { timestamps: true, collection: "question_options" }
);

export const QuestionOption = mongoose.model("QuestionOption", questionOptionDocSchema);
export default QuestionOption;
