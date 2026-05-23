import mongoose from "mongoose";

const plannerAnalyticsSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    completionPercent: { type: Number, default: 0 },
    consistencyScore: { type: Number, default: 0 },
    subjectStrength: { type: mongoose.Schema.Types.Mixed, default: [] },
    weakTopics: { type: mongoose.Schema.Types.Mixed, default: [] },
    mockPerformance: { type: mongoose.Schema.Types.Mixed, default: [] },
    dailyHours: { type: mongoose.Schema.Types.Mixed, default: [] },
    lastComputedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const PlannerAnalytics = mongoose.model("PlannerAnalytics", plannerAnalyticsSchema);
