import mongoose from "mongoose";

const revisionScheduleSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    studyPlanId: { type: mongoose.Schema.Types.ObjectId, ref: "StudyPlan" },
    subject: { type: String, required: true },
    topic: { type: String, required: true },
    syllabusTopicId: { type: String, default: null },
    studyDate: { type: String, required: true },
    revisionDate: { type: String, required: true },
    cycle: { type: String, enum: ["1-day", "7-day", "30-day"], required: true },
    taskId: { type: String, default: null },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

revisionScheduleSchema.index({ userId: 1, revisionDate: 1 });
revisionScheduleSchema.index({ userId: 1, subject: 1, topic: 1, cycle: 1 });

export const RevisionSchedule = mongoose.model("RevisionSchedule", revisionScheduleSchema);
