import mongoose from "mongoose";

const mockResultSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    examType: { type: String, enum: ["UPSC", "MPPSC"], default: "UPSC" },
    testName: { type: String, default: "Mock Test" },
    totalQuestions: { type: Number, default: 100 },
    correctAnswers: { type: Number, default: 0 },
    scorePercent: { type: Number, required: true, min: 0, max: 100 },
    subjectBreakdown: [
      {
        subject: String,
        correct: Number,
        total: Number,
        accuracy: Number,
      },
    ],
    weakTopics: [{ type: String }],
    durationMinutes: { type: Number, default: 120 },
    aiAnalysis: {
      summary: String,
      recommendations: [String],
      accuracyTrend: String,
    },
    takenAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

mockResultSchema.index({ userId: 1, takenAt: -1 });

export const MockResult = mongoose.model("MockResult", mockResultSchema);
