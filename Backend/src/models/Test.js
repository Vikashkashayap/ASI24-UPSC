import mongoose from "mongoose";

/**
 * Test Schema for UPSC Prelims Test Generator
 * Stores test questions, user answers, and results
 */
const testSchema = new mongoose.Schema(
  {
    subject: {
      type: String,
      required: true,
      enum: ["Polity", "History", "Geography", "Economy", "Environment", "Science & Tech"],
    },
    topic: {
      type: String,
      required: true,
    },
    difficulty: {
      type: String,
      required: true,
      enum: ["Easy", "Moderate", "Hard"],
    },
    questions: [
      {
        question: {
          type: String,
          required: true,
        },
        options: {
          A: { type: String, required: true },
          B: { type: String, required: true },
          C: { type: String, required: true },
          D: { type: String, required: true },
        },
        correctAnswer: {
          type: String,
          required: true,
          enum: ["A", "B", "C", "D"],
        },
        explanation: {
          type: String,
          required: true,
        },
        userAnswer: {
          type: String,
          enum: ["A", "B", "C", "D", null],
          default: null,
        },
      },
    ],
    score: {
      type: Number,
      default: 0,
    },
    totalQuestions: {
      type: Number,
      required: true,
    },
    correctAnswers: {
      type: Number,
      default: 0,
    },
    wrongAnswers: {
      type: Number,
      default: 0,
    },
    accuracy: {
      type: Number,
      default: 0,
    },
    isSubmitted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Test", testSchema);

