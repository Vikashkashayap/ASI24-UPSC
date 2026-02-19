import mongoose from "mongoose";

/**
 * Scheduled Prelims Mock (Full-length GS Paper 1).
 * Admin schedules a test; at scheduledAt time questions are auto-generated and test goes live.
 * Students see live mocks under "Prelims Mock" and start attempt (creates a Test copy per student).
 */
const prelimsMockSchema = new mongoose.Schema(
  {
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    isMix: {
      type: Boolean,
      default: false,
    },
    isPyo: {
      type: Boolean,
      default: false,
    },
    isCsat: {
      type: Boolean,
      default: false,
    },
    yearFrom: { type: Number },
    yearTo: { type: Number },
    scheduledAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["scheduled", "generating", "live", "ended"],
      default: "scheduled",
    },
    title: {
      type: String,
      default: "",
    },
    questions: [
      {
        question: { type: String, required: true },
        options: {
          A: { type: String, required: true },
          B: { type: String, required: true },
          C: { type: String, required: true },
          D: { type: String, required: true },
        },
        correctAnswer: { type: String, required: true, enum: ["A", "B", "C", "D"] },
        explanation: { type: String, required: true },
      },
    ],
    totalQuestions: { type: Number, default: 100 },
    durationMinutes: { type: Number, default: 120 },
    totalMarks: { type: Number, default: 200 },
    negativeMark: { type: Number, default: 0.66 },
    liveAt: { type: Date },
    endedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("PrelimsMock", prelimsMockSchema);
