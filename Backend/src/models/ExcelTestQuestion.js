import mongoose from "mongoose";

/**
 * Single question for an Excel-based test.
 * options stored as array [{ key: "A", text: "..." }, ...] for strict Excel format.
 */
const excelTestQuestionSchema = new mongoose.Schema(
  {
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExcelTest",
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
    options: [
      {
        key: { type: String, required: true },
        text: { type: String, required: true },
      },
    ],
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

excelTestQuestionSchema.index({ testId: 1, questionNumber: 1 });

export default mongoose.model("ExcelTestQuestion", excelTestQuestionSchema);
