import mongoose from "mongoose";

const topicProgressSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    studyPlanId: { type: mongoose.Schema.Types.ObjectId, ref: "StudyPlan" },
    subject: { type: String, required: true },
    topic: { type: String, required: true },
    syllabusTopicId: { type: String, default: null },
    syllabusModule: { type: String, default: null },
    status: {
      type: String,
      enum: ["not_started", "reading", "completed", "revision_due"],
      default: "not_started",
    },
    firstStudiedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    mcqAttempts: { type: Number, default: 0 },
    revisionCyclesCompleted: { type: Number, default: 0 },
    lastTaskId: { type: String, default: null },
  },
  { timestamps: true }
);

topicProgressSchema.index({ userId: 1, subject: 1, topic: 1 }, { unique: true });

export const TopicProgress = mongoose.model("TopicProgress", topicProgressSchema);
