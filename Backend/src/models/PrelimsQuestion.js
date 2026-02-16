import mongoose from "mongoose";

/**
 * Prelims Question - Only answer map + explanation (no parsed question text)
 * PDF is rendered as-is via react-pdf
 */
const prelimsQuestionSchema = new mongoose.Schema(
  {
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PrelimsTest",
      required: true,
    },
    questionNumber: {
      type: Number,
      required: true,
    },
    correctAnswer: {
      type: String,
      required: true,
      enum: ["A", "B", "C", "D"],
    },
    explanation: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

prelimsQuestionSchema.index({ testId: 1, questionNumber: 1 }, { unique: true });

export default mongoose.model("PrelimsQuestion", prelimsQuestionSchema);
