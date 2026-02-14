import mongoose from "mongoose";

/**
 * User attempt for a Prelims Topper Test (MANUAL).
 * One document per student per test attempt.
 * Rank is recalculated after each submission via aggregation.
 */
const prelimsTestAttemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PrelimsTopperTest",
      required: true,
    },
    score: {
      type: Number,
      required: true,
      default: 0,
    },
    correctAnswers: {
      type: Number,
      required: true,
      default: 0,
    },
    wrongAnswers: {
      type: Number,
      required: true,
      default: 0,
    },
    skipped: {
      type: Number,
      required: true,
      default: 0,
    },
    accuracy: {
      type: Number,
      required: true,
      default: 0,
    },
    timeTaken: {
      type: Number,
      required: true,
      default: 0,
      comment: "Time taken in seconds",
    },
    rank: {
      type: Number,
      default: null,
    },
    submittedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    startedAt: {
      type: Date,
      required: true,
    },
    /** Answers: { "0": "A", "1": "B", ... } question index -> option */
    answers: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    /** Allowed time in seconds (MIN(duration, remaining until end)) */
    allowedTimeSeconds: {
      type: Number,
      required: true,
    },
    /** Question indices marked for review: [0, 5, 12, ...] */
    markForReview: {
      type: [Number],
      default: [],
    },
  },
  { timestamps: true }
);

// One attempt per user per test (unless you allow multiple later)
prelimsTestAttemptSchema.index({ userId: 1, testId: 1 }, { unique: true });
prelimsTestAttemptSchema.index({ testId: 1, score: -1, timeTaken: 1 });

export default mongoose.model("PrelimsTestAttempt", prelimsTestAttemptSchema);
