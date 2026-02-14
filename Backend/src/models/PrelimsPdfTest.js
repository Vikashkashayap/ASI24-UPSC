import mongoose from "mongoose";

/**
 * PrelimsPdfTest Schema
 * PDF-based scheduled Prelims test (UPSC format, bilingual Hindi + English).
 * Test type: PDF_BASED. Do not modify existing AI/manual test schema.
 */
const optionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, enum: ["A", "B", "C", "D"] },
    english: { type: String, default: "" },
    hindi: { type: String, default: "" },
  },
  { _id: false }
);

const questionTextSchema = new mongoose.Schema(
  {
    english: { type: String, default: "" },
    hindi: { type: String, default: "" },
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    questionNumber: { type: Number, required: true, min: 1, max: 100 },
    questionText: {
      type: questionTextSchema,
      required: true,
      default: () => ({}),
    },
    options: {
      type: [optionSchema],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length === 4,
        message: "Each question must have exactly 4 options (A, B, C, D)",
      },
    },
    correctAnswer: { type: String, required: true, enum: ["A", "B", "C", "D"] },
    explanation: { type: String, default: "" },
  },
  { _id: true }
);

const prelimsPdfTestSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    duration: { type: Number, required: true, min: 1 }, // minutes
    negativeMarking: { type: Number, required: true, min: 0 }, // e.g. 0.66
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    totalQuestions: { type: Number, required: true, min: 1, max: 100 },
    questions: {
      type: [questionSchema],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length >= 1 && v.length <= 100,
        message: "Questions array must have 1 to 100 items",
      },
    },
    testType: {
      type: String,
      default: "PDF_BASED",
      enum: ["PDF_BASED"],
    },
  },
  { timestamps: true }
);

// Ensure endTime > startTime
prelimsPdfTestSchema.pre("validate", function (next) {
  if (this.startTime && this.endTime && this.endTime <= this.startTime) {
    next(new Error("endTime must be after startTime"));
  } else {
    next();
  }
});

export default mongoose.model("PrelimsPdfTest", prelimsPdfTestSchema);
