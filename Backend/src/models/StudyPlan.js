import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // YYYY-MM-DD
    subject: { type: String, required: true },
    topic: { type: String, default: "" },
    taskType: {
      type: String,
      enum: ["subject_study", "current_affairs", "mcq_practice", "revision", "mock_test"],
      required: true,
    },
    duration: { type: Number, default: 60 }, // minutes
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    sortOrder: { type: Number, default: 0 },
    startTime: { type: String, default: null }, // HH:mm for daily timetable
    endTime: { type: String, default: null },   // HH:mm
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    rescheduledFrom: { type: String, default: null }, // original date if rolled over
  },
  { _id: true }
);

const badgeSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    icon: { type: String, default: "🏆" },
    earnedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const insightSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["warning", "success", "tip"], default: "tip" },
    title: { type: String, required: true },
    message: { type: String, required: true },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    subject: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const heatmapEntrySchema = new mongoose.Schema(
  {
    date: { type: String, required: true },
    completedTasks: { type: Number, default: 0 },
    totalTasks: { type: Number, default: 0 },
    studyMinutes: { type: Number, default: 0 },
  },
  { _id: false }
);

const revisionEntrySchema = new mongoose.Schema(
  {
    topic: { type: String, required: true },
    subject: { type: String, default: "" },
    studyDate: { type: String, required: true },
    revisionDates: [{ type: String }],
    cycle: { type: String, enum: ["1-day", "7-day", "30-day"], default: "7-day" },
  },
  { _id: true }
);

const studyPlanSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    examDate: { type: Date, required: true },
    examType: { type: String, enum: ["UPSC", "MPPSC"], default: "UPSC" },
    targetYear: { type: String, default: "2026" },
    dailyHours: { type: Number, required: true, min: 1, max: 16 },
    preparationLevel: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "intermediate",
    },
    weakSubjects: { type: [String], default: [] },
    strongSubjects: { type: [String], default: [] },
    optionalSubject: { type: String, default: "" },
    sleepTime: { type: String, default: "23:00" },
    wakeTime: { type: String, default: "06:00" },
    preferredSession: {
      type: String,
      enum: ["morning", "afternoon", "evening", "night"],
      default: "morning",
    },
    mockTestAverageScore: { type: Number, default: 0, min: 0, max: 100 },
    motivationalLine: { type: String, default: "" },
    weeklyGoals: { type: [String], default: [] },
    monthlyTargets: { type: [String], default: [] },
    revisionStrategy: { type: String, default: "" },
    readinessScore: { type: Number, default: 0, min: 0, max: 100 },
    readinessBreakdown: {
      mockScores: { type: Number, default: 0 },
      completion: { type: Number, default: 0 },
      revision: { type: Number, default: 0 },
      consistency: { type: Number, default: 0 },
      studyHours: { type: Number, default: 0 },
    },
    xpPoints: { type: Number, default: 0 },
    badges: [badgeSchema],
    aiInsights: [insightSchema],
    heatmap: [heatmapEntrySchema],
    revisionSchedule: [revisionEntrySchema],
    dailyQuote: { type: String, default: "" },
    focusModeEnabled: { type: Boolean, default: false },
    totalStudyMinutes: { type: Number, default: 0 },
    lastAiGeneratedAt: { type: Date, default: null },
    subjects: {
      type: [String],
      default: [
        "Polity",
        "History",
        "Geography",
        "Economy",
        "Environment",
        "Science & Tech",
        "Current Affairs",
        "CSAT",
      ],
    },
    tasks: [taskSchema],
    currentStreak: { type: Number, default: 0 },
    lastCompletedDate: { type: String, default: null }, // YYYY-MM-DD of last day with completion
    longestStreak: { type: Number, default: 0 },
  },
  { timestamps: true }
);

studyPlanSchema.index({ userId: 1 });
studyPlanSchema.index({ "tasks.date": 1 });

export const StudyPlan = mongoose.model("StudyPlan", studyPlanSchema);
