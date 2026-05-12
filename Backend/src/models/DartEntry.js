import mongoose from "mongoose";

/**
 * DART – Daily Activity & Reflection Tracker
 * One document per student per calendar day.
 * Schema matches requirement; can be mirrored to Firestore if needed.
 */
const dartEntrySchema = new mongoose.Schema(
  {
    enrollmentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    enrollmentName: { type: String, required: true },
    category: {
      type: String,
      enum: ["full_time", "working_professional"],
      default: "full_time"
    },
    date: { type: Date, required: true, index: true }, // calendar date (start of day UTC or local)
    wakeUpTime: { type: String, default: "" },       // e.g. "05:30"
    sleepHours: { type: Number, default: 0 },
    officialWorkHours: { type: Number, default: 0 },  // for working professional
    totalStudyHours: { type: Number, default: 0 },
    subjectStudied: { type: [String], default: [] }, // from UPSC subject list
    chaptersCovered: { type: String, default: "" },
    newspaperRead: { type: Boolean, default: false },
    answerWritingDone: { type: Boolean, default: false },
    emotionalStatus: { type: String, default: "" },   // e.g. Good, Stressed, etc.
    physicalHealthStatus: { type: String, default: "" },
    targetStudyHours: { type: Number, default: 0 },
    challengeCompleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// One entry per enrollment per day
dartEntrySchema.index({ enrollmentId: 1, date: 1 }, { unique: true });

export const DartEntry = mongoose.model("DartEntry", dartEntrySchema);
