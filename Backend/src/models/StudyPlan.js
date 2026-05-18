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
    startTime: { type: String, default: null }, // HH:mm for daily timetable
    endTime: { type: String, default: null },   // HH:mm
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
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
    dailyHours: { type: Number, required: true, min: 1, max: 16 },
    preparationLevel: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "intermediate",
    },
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
