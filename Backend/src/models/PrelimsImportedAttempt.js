import mongoose from "mongoose";

/**
 * Prelims Imported Attempt - Student attempt for imported (parsed) test
 */
const prelimsImportedAttemptSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PrelimsImportedTest",
      required: true,
    },
    answers: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      // { questionNumber: "A"|"B"|"C"|"D" }
    },
    score: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    wrongCount: { type: Number, default: 0 },
    notAttempted: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },
    submittedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

prelimsImportedAttemptSchema.index({ studentId: 1, testId: 1 }, { unique: true });

export default mongoose.model("PrelimsImportedAttempt", prelimsImportedAttemptSchema);
