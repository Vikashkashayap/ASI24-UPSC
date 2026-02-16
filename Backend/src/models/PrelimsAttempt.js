import mongoose from "mongoose";

/**
 * Prelims Attempt Schema - Student test attempt
 */
const prelimsAttemptSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PrelimsTest",
      required: true,
    },
    answers: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      // { questionNumber: "A"|"B"|"C"|"D" } or { questionId: "A" }
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
    notAttempted: {
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

prelimsAttemptSchema.index({ studentId: 1, testId: 1 }, { unique: true });

export default mongoose.model("PrelimsAttempt", prelimsAttemptSchema);
