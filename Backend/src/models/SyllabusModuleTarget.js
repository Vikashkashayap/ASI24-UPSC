import mongoose from "mongoose";

/**
 * Admin-assigned syllabus module target for students.
 * Appears on the student home dashboard as "Assigned Targets".
 */
const syllabusModuleTargetSchema = new mongoose.Schema(
  {
    subjectKey: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    subjectName: {
      type: String,
      required: true,
      trim: true,
    },
    moduleId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    moduleName: {
      type: String,
      required: true,
      trim: true,
    },
    estimatedDays: {
      type: Number,
      default: null,
    },
    estimatedHours: {
      type: Number,
      default: null,
    },
    chapterRange: {
      type: String,
      default: "",
      trim: true,
    },
    durationLabel: {
      type: String,
      default: "",
      trim: true,
    },
    topicCount: {
      type: Number,
      default: 0,
    },
    topicsPreview: {
      type: [String],
      default: [],
    },
    note: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    /** Assignment language medium for student dashboard labels */
    medium: {
      type: String,
      enum: ["en", "hi"],
      default: "en",
      index: true,
    },
    assignedStudentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    /** Students who marked this module target complete */
    completedStudentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  { timestamps: true }
);

syllabusModuleTargetSchema.index({ assignedStudentIds: 1, status: 1 });
syllabusModuleTargetSchema.index({ subjectKey: 1, moduleId: 1, medium: 1 });

export default mongoose.model("SyllabusModuleTarget", syllabusModuleTargetSchema);
