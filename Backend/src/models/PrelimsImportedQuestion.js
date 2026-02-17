import mongoose from "mongoose";

/**
 * Prelims Imported Question - Parsed from PDF (questionText + options)
 * correctAnswer optional (set if answer key PDF provided)
 */
const prelimsImportedQuestionSchema = new mongoose.Schema(
  {
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PrelimsImportedTest",
      required: true,
    },
    questionNumber: {
      type: Number,
      required: true,
    },
    questionText: {
      type: String,
      required: true,
    },
    options: {
      A: { type: String, default: "" },
      B: { type: String, default: "" },
      C: { type: String, default: "" },
      D: { type: String, default: "" },
    },
    correctAnswer: {
      type: String,
      enum: ["A", "B", "C", "D", ""],
      default: "",
    },
  },
  { timestamps: true }
);

prelimsImportedQuestionSchema.index({ testId: 1, questionNumber: 1 }, { unique: true });

export default mongoose.model("PrelimsImportedQuestion", prelimsImportedQuestionSchema);
