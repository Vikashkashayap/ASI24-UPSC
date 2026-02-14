import mongoose from "mongoose";

/**
 * PrelimsQuestion - Bilingual (Hindi + English) question for Prelims Topper Test.
 * Stored in separate collection for scalability (1000+ students, 100+ questions per test).
 */
const prelimsQuestionSchema = new mongoose.Schema(
  {
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PrelimsTopperTest",
      required: true,
      index: true,
    },
    questionNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    questionHindi: {
      type: String,
      default: "",
    },
    questionEnglish: {
      type: String,
      default: "",
    },
    options: [
      {
        key: { type: String, required: true, enum: ["A", "B", "C", "D"] },
        textHindi: { type: String, default: "" },
        textEnglish: { type: String, default: "" },
      },
    ],
    correctAnswer: {
      type: String,
      required: true,
      enum: ["A", "B", "C", "D"],
    },
    /** Explanation from Solution PDF - shown only after submission */
    explanation: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

prelimsQuestionSchema.index({ testId: 1, questionNumber: 1 }, { unique: true });

export default mongoose.model("PrelimsQuestion", prelimsQuestionSchema);
