import mongoose from "mongoose";

/**
 * PrelimsPdfTestAttempt Schema
 * Stores a student's attempt for a PDF-based scheduled Prelims test.
 */
const attemptAnswerSchema = new mongoose.Schema(
  {
    questionNumber: { type: Number, required: true, min: 1, max: 100 },
    userAnswer: { type: String, enum: ["A", "B", "C", "D", null], default: null },
  },
  { _id: false }
);

const prelimsPdfTestAttemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PrelimsPdfTest",
      required: true,
    },
    answers: {
      type: [attemptAnswerSchema],
      default: [],
    },
    score: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    wrongCount: { type: Number, default: 0 },
    isSubmitted: { type: Boolean, default: false },
    startedAt: { type: Date, default: Date.now },
    submittedAt: { type: Date },
  },
  { timestamps: true }
);

prelimsPdfTestAttemptSchema.index({ userId: 1, testId: 1 }, { unique: true });

export default mongoose.model("PrelimsPdfTestAttempt", prelimsPdfTestAttemptSchema);
