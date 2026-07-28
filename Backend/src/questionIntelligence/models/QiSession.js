import mongoose from "mongoose";

const selectedQuestionSchema = new mongoose.Schema(
  {
    questionText: { type: String, required: true },
    options: [
      {
        label: String,
        text: String,
        isCorrect: Boolean,
      },
    ],
    correctAnswer: { type: String, default: "" },
    explanation: { type: String, default: "" },
    difficulty: { type: String, default: "Medium" },
    subject: { type: String, default: "" },
    topic: { type: String, default: "" },
    chapter: { type: String, default: "" },
    sourceType: {
      type: String,
      enum: ["extracted", "generated", "similar"],
      required: true,
    },
    sourceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    pattern: { type: String, default: "" },
    confidence: { type: Number, default: null },
    validated: { type: Boolean, default: false },
    validationNotes: { type: String, default: "" },
    rankScore: { type: Number, default: 0 },
  },
  { _id: true }
);

const qiSessionSchema = new mongoose.Schema(
  {
    query: { type: String, default: "" },
    subject: { type: String, default: "", index: true },
    topic: { type: String, default: "", index: true },
    chapter: { type: String, default: "" },
    requestedCount: { type: Number, default: 10 },
    difficultyMix: {
      Easy: { type: Number, default: 0 },
      Medium: { type: Number, default: 0 },
      Hard: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: ["building", "completed", "partial", "failed"],
      default: "building",
      index: true,
    },
    questions: [selectedQuestionSchema],
    stats: {
      extractedUsed: { type: Number, default: 0 },
      generatedUsed: { type: Number, default: 0 },
      duplicatesRemoved: { type: Number, default: 0 },
      sourcesRanked: { type: Number, default: 0 },
      patterns: { type: mongoose.Schema.Types.Mixed, default: {} },
      avgConfidence: { type: Number, default: null },
      generationTriggered: { type: Boolean, default: false },
    },
    sourceChunks: [
      {
        chunkId: String,
        score: Number,
        subject: String,
        topic: String,
        page: Number,
      },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    errorMessage: { type: String, default: null },
    durationMs: { type: Number, default: 0 },
  },
  { timestamps: true, collection: "qi_sessions" }
);

qiSessionSchema.index({ createdAt: -1 });

export const QiSession = mongoose.model("QiSession", qiSessionSchema);
export default QiSession;
