import mongoose from "mongoose";

/**
 * Admin-assigned topic practice test (50 questions).
 * Generated for a specific subject + topic and visible only to assigned students on Prelims Test.
 */
const assignedPracticeTestSchema = new mongoose.Schema(
  {
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    topic: {
      type: String,
      required: true,
      trim: true,
    },
    chapter: {
      type: String,
      default: "",
      trim: true,
    },
    notesTopicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ContentTopic",
      required: false,
    },
    notesTopicIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ContentTopic",
      },
    ],
    notesSourceUrl: {
      type: String,
      default: "",
      trim: true,
    },
    title: {
      type: String,
      default: "",
    },
    difficulty: {
      type: String,
      enum: ["easy", "moderate", "hard"],
      default: "moderate",
    },
    totalQuestions: {
      type: Number,
      default: 50,
    },
    durationMinutes: {
      type: Number,
      default: 60,
    },
    totalMarks: {
      type: Number,
      default: 100,
    },
    negativeMark: {
      type: Number,
      default: 0.66,
    },
    questions: [
      {
        question: { type: String, required: true },
        question_en: { type: String, required: false },
        question_hi: { type: String, required: false },
        options: {
          A: { type: String, required: true },
          B: { type: String, required: true },
          C: { type: String, required: true },
          D: { type: String, required: true },
        },
        options_en: {
          A: { type: String, required: false },
          B: { type: String, required: false },
          C: { type: String, required: false },
          D: { type: String, required: false },
        },
        options_hi: {
          A: { type: String, required: false },
          B: { type: String, required: false },
          C: { type: String, required: false },
          D: { type: String, required: false },
        },
        correctAnswer: { type: String, required: true, enum: ["A", "B", "C", "D"] },
        explanation: { type: mongoose.Schema.Types.Mixed, required: true },
        explanation_en: { type: mongoose.Schema.Types.Mixed, required: false },
        explanation_hi: { type: mongoose.Schema.Types.Mixed, required: false },
        questionType: { type: String, required: false },
        tableData: { type: mongoose.Schema.Types.Mixed, required: false },
        matchColumns: { type: mongoose.Schema.Types.Mixed, required: false },
        assertionReason: { type: mongoose.Schema.Types.Mixed, required: false },
        eliminationLogic: { type: String, required: false },
        conceptualSource: { type: String, required: false },
      },
    ],
    assignedStudentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    status: {
      type: String,
      enum: ["generating", "ready", "failed"],
      default: "generating",
    },
    generationProgress: {
      totalBatches: { type: Number, default: 5 },
      completedBatches: { type: Number, default: 0 },
      currentBatch: { type: Number, default: 0 },
      generatedQuestions: { type: Number, default: 0 },
      failedBatches: { type: Number, default: 0 },
      isComplete: { type: Boolean, default: false },
      currentStep: { type: String, default: "pending" },
      readingNotes: { type: Boolean, default: false },
      cleaningHtml: { type: Boolean, default: false },
      batchSteps: {
        type: Map,
        of: Boolean,
        default: {},
      },
      approved: { type: Boolean, default: false },
    },
    generationStats: {
      inputTokens: { type: Number, default: 0 },
      outputTokens: { type: Number, default: 0 },
      totalTokens: { type: Number, default: 0 },
      estimatedCostUsd: { type: Number, default: 0 },
      generationTimeMs: { type: Number, default: 0 },
      chunksRetrieved: { type: Number, default: 0 },
      modelUsed: { type: String, default: "" },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    errorMessage: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("AssignedPracticeTest", assignedPracticeTestSchema);
