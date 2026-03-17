import mongoose from "mongoose";

// explanation can be: string (legacy) or { A: string, B: string, C: string, D: string }

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
        questionId: { type: String, required: false },
        subject: { type: String, required: false },
        difficulty: { type: String, enum: ["easy", "moderate", "hard"], default: "moderate" },
        question: { type: String, required: true },
        options: {
          A: { type: String, required: true },
          B: { type: String, required: true },
          C: { type: String, required: true },
          D: { type: String, required: true },
        },
        correctAnswer: { type: String, required: true, enum: ["A", "B", "C", "D"] },
        explanation: { type: mongoose.Schema.Types.Mixed, required: true },
        questionType: { type: String, required: false },
        tableData: { type: mongoose.Schema.Types.Mixed, required: false },
        matchColumns: { type: mongoose.Schema.Types.Mixed, required: false },
        assertionReason: { type: mongoose.Schema.Types.Mixed, required: false },
        eliminationLogic: { type: String, required: false },
        conceptualSource: { type: String, required: false },
      },
    ],
    totalQuestions: { type: Number, default: 100 }, // 100 full-length or 50 sectional
    difficulty: { type: String, enum: ["easy", "moderate", "hard"], default: "moderate" }, // for filtering & generation mix
    /** UPSC question patterns to include. Empty = default balanced mix. Keys: statement_based, statement_not_correct, pair_matching, assertion_reason, direct_conceptual, chronology, sequence_arrangement, map_location, odd_one_out, multi_statement_elimination */
    patternsToInclude: [{ type: String, trim: true }],
    avoidPreviouslyUsed: { type: Boolean, default: false },
    durationMinutes: { type: Number, default: 120 },
    totalMarks: { type: Number, default: 200 },
    negativeMark: { type: Number, default: 0.66 },
    liveAt: { type: Date },
    endedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("PrelimsMock", prelimsMockSchema);
