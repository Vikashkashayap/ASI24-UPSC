import mongoose from "mongoose";

/**
 * Prelims Imported Test - From PDF upload (parsed questions, not PDF viewer)
 * examType e.g. "UPSC Prelims GS Paper 1" drives default duration/marking.
 * If startTime/endTime not set, test is always active.
 */
const prelimsImportedTestSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    totalQuestions: {
      type: Number,
      required: true,
      default: 0,
    },
    startTime: { type: Date, default: null },
    endTime: { type: Date, default: null },
    examType: { type: String, default: null },
    duration: { type: Number, default: 120 },
    marksPerQuestion: { type: Number, default: 2 },
    negativeMark: { type: Number, default: 0.66 },
    totalMarks: { type: Number, default: 200 },
  },
  { timestamps: true }
);

export default mongoose.model("PrelimsImportedTest", prelimsImportedTestSchema);
