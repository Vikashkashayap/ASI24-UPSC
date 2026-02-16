import mongoose from "mongoose";

/**
 * Prelims Test Schema - PDF-based Prelims Topper Test
 * Admin uploads question paper, answer key, explanation PDFs
 */
const prelimsTestSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
      default: 120, // minutes
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    totalQuestions: {
      type: Number,
      default: 100,
    },
    questionPdfUrl: { type: String, default: "" },
    answerKeyPdfUrl: { type: String, default: "" },
    explanationPdfUrl: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("PrelimsTest", prelimsTestSchema);
