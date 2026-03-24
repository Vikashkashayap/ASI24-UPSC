import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    date: { type: String, required: true },
    subject: { type: String, required: true },
    topic: { type: String, default: "" },
    subtopics: { type: [String], default: [] },
    taskType: {
      type: String,
      enum: [
        "subject_study",
        "current_affairs",
        "mcq_practice",
        "revision",
        "mock_test",
        "study",
        "test",
      ],
      required: true,
    },
    duration: { type: Number, default: 60 },
    startTime: { type: String, default: null },
    endTime: { type: String, default: null },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    questions: { type: Number, default: null },
    plannerTestType: { type: String, default: null },
    testAccuracy: { type: Number, default: null },
    testSkipped: { type: Boolean, default: false },
    revisionTopicSummaries: { type: [String], default: [] },
    linkedTopicKey: { type: String, default: null },
    carriedOverFromDate: { type: String, default: null },
    /** Clone rolled onto a later day; points to original subdoc _id */
    carriedCloneOf: { type: mongoose.Schema.Types.ObjectId, default: null },
    rolledForwardToDate: { type: String, default: null },
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
    planStartDate: { type: Date, default: null },
    planEndDate: { type: Date, default: null },
    plannerVersion: {
      type: String,
      enum: ["legacy", "syllabus"],
      default: "legacy",
    },
    intensiveMode: { type: Boolean, default: false },
    syllabusId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UpscSyllabus",
      default: null,
    },
    lastPlannerRollDate: { type: String, default: null },
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
    lastCompletedDate: { type: String, default: null },
    longestStreak: { type: Number, default: 0 },
  },
  { timestamps: true }
);

studyPlanSchema.index({ "tasks.date": 1 });

export const StudyPlan = mongoose.model("StudyPlan", studyPlanSchema);
