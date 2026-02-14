import mongoose from "mongoose";

/**
 * Prelims Topper Test - Manual scheduled tests (testType: MANUAL).
 * Separate from AI Test model to keep existing AI test system untouched.
 */
const prelimsTopperTestSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    testType: {
      type: String,
      enum: ["MANUAL"],
      default: "MANUAL",
    },
    section: {
      type: String,
      default: "Prelims Topper Test",
    },
    totalQuestions: {
      type: Number,
      required: true,
      min: 1,
    },
    totalMarks: {
      type: Number,
      required: true,
      min: 0,
    },
    negativeMarking: {
      type: Number,
      required: true,
      min: 0,
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 1,
    },
    questionPdfUrl: {
      type: String,
      default: null,
    },
    solutionPdfUrl: {
      type: String,
      default: null,
    },
    /** Answer key for scoring: { "0": "A", "1": "B", ... } question index -> correct option */
    answerKey: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    /** OCR-extracted questions: [{ question: string, options: { A, B, C, D } }] - shown in UI instead of raw PDF */
    questions: {
      type: [
        {
          question: { type: String, default: "" },
          options: {
            A: { type: String, default: "" },
            B: { type: String, default: "" },
            C: { type: String, default: "" },
            D: { type: String, default: "" },
          },
        },
      ],
      default: [],
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Index for listing by section and time
prelimsTopperTestSchema.index({ testType: 1, section: 1, startTime: -1 });
prelimsTopperTestSchema.index({ startTime: 1, endTime: 1 });

export default mongoose.model("PrelimsTopperTest", prelimsTopperTestSchema);
