import mongoose from "mongoose";

/**
 * Excel-based Prelims Test (Prelims Topper)
 * Admin-created test from uploaded Excel. testType: EXCEL_BASED
 */
const excelTestSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 1,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    negativeMarking: {
      type: Number,
      default: 0.33,
      min: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    testType: {
      type: String,
      default: "EXCEL_BASED",
      enum: ["EXCEL_BASED"],
    },
    totalQuestions: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Index for student listing: active tests in time window
excelTestSchema.index({ startTime: 1, endTime: 1 });
excelTestSchema.index({ createdAt: -1 });

export default mongoose.model("ExcelTest", excelTestSchema);
