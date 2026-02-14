import mongoose from "mongoose";

/**
 * Student attempt for an Excel-based test.
 * Stores answers, score (server-calculated), and links to result view.
 */
const excelTestAttemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExcelTest",
      required: true,
    },
    answers: {
      type: Map,
      of: String,
      default: {},
    },
    score: {
      type: Number,
      default: 0,
    },
    correctCount: {
      type: Number,
      default: 0,
    },
    wrongCount: {
      type: Number,
      default: 0,
    },
    accuracy: {
      type: Number,
      default: 0,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

excelTestAttemptSchema.index({ userId: 1, testId: 1 });
excelTestAttemptSchema.index({ userId: 1, submittedAt: -1 });

export default mongoose.model("ExcelTestAttempt", excelTestAttemptSchema);
