/**
 * Cached RAG-generated UPSC Prelims MCQs.
 * Used by POST /api/rag/generate-questions to skip duplicate LLM calls.
 */

import mongoose from "mongoose";

const optionSchema = new mongoose.Schema(
  {
    A: { type: String, required: true },
    B: { type: String, required: true },
    C: { type: String, required: true },
    D: { type: String, required: true },
  },
  { _id: false }
);

const questionItemSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    options: { type: optionSchema, required: true },
    correctAnswer: { type: String, required: true, enum: ["A", "B", "C", "D"] },
    explanation: { type: String, default: "" },
    difficulty: { type: String, default: "Medium" },
    subject: { type: String, default: "" },
    topic: { type: String, default: "" },
    source: { type: String, default: "" },
    similarityScore: { type: Number, default: null },
    chunkIds: [{ type: String }],
  },
  { _id: false }
);

const generatedQuestionSchema = new mongoose.Schema(
  {
    /** Normalized cache key: subject|topic|difficulty|count */
    cacheKey: { type: String, required: true, unique: true, index: true },
    subject: { type: String, required: true, trim: true, index: true },
    topic: { type: String, required: true, trim: true, index: true },
    difficulty: {
      type: String,
      default: "Medium",
      index: true,
    },
    count: { type: Number, required: true },
    exam: { type: String, default: "UPSC Prelims" },
    language: { type: String, default: "en" },
    questions: { type: [questionItemSchema], default: [] },
    retrievalSource: { type: String, default: "" },
    matchedChunks: { type: Number, default: 0 },
    avgSimilarity: { type: Number, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    llmMs: { type: Number, default: null },
    fromCache: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "generatedquestions" }
);

generatedQuestionSchema.index({ subject: 1, topic: 1, difficulty: 1 });

export function buildQuestionCacheKey({ subject, topic, difficulty, count }) {
  const s = String(subject || "").trim().toLowerCase();
  const t = String(topic || "").trim().toLowerCase();
  const d = String(difficulty || "Medium").trim().toLowerCase();
  const n = Number(count) || 20;
  return `${s}|${t}|${d}|${n}`;
}

export default mongoose.models.GeneratedQuestion ||
  mongoose.model("GeneratedQuestion", generatedQuestionSchema);
