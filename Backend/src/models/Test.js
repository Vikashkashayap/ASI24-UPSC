import mongoose from "mongoose";

/**
 * Test Schema for UPSC Prelims Test Generator
 * Stores test questions, user answers, and results
 */
const testSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false, // Allow backward compatibility for existing tests
    },
    subject: {
      type: String,
      required: true,
      // Stored as comma-separated for multi-subject (e.g. "Polity, History"); single value for CSAT
    },
    examType: {
      type: String,
      enum: ["GS", "CSAT"],
      default: "GS",
    },
    topic: {
      type: String,
      required: true,
    },
    prelimsMockId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PrelimsMock",
      required: false,
    },
    difficulty: {
      type: String,
      required: false,
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
        timeSpent: {
          type: Number,
          default: 0,
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

// Static method to get user analytics
testSchema.statics.getUserAnalytics = async function(userId) {
  const tests = await this.find({
    $or: [
      { userId, isSubmitted: true },
      { userId: { $exists: false }, isSubmitted: true }
    ]
  });

  if (tests.length === 0) {
    return {
      totalTests: 0,
      averageScore: 0,
      averageAccuracy: 0,
      highestScore: 0,
      totalQuestionsAnswered: 0,
      subjectWisePerformance: {},
      difficultyWisePerformance: {},
      recentTests: []
    };
  }

  const scores = tests.map(t => t.score || 0);
  const accuracies = tests.map(t => t.accuracy || 0);
  const totalScore = scores.reduce((sum, score) => sum + score, 0);
  const totalAccuracy = accuracies.reduce((sum, accuracy) => sum + accuracy, 0);

  // Subject-wise performance
  const subjectWise = {};
  tests.forEach(test => {
    if (!subjectWise[test.subject]) {
      subjectWise[test.subject] = { total: 0, correct: 0, count: 0 };
    }
    subjectWise[test.subject].total += test.totalQuestions;
    subjectWise[test.subject].correct += test.correctAnswers || 0;
    subjectWise[test.subject].count += 1;
  });

  // Difficulty-wise performance
  const difficultyWise = {};
  tests.forEach(test => {
    if (!difficultyWise[test.difficulty]) {
      difficultyWise[test.difficulty] = { total: 0, correct: 0, count: 0 };
    }
    difficultyWise[test.difficulty].total += test.totalQuestions;
    difficultyWise[test.difficulty].correct += test.correctAnswers || 0;
    difficultyWise[test.difficulty].count += 1;
  });

  // Recent tests (last 10)
  const recentTests = tests
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10)
    .map(test => ({
      _id: test._id,
      subject: test.subject,
      topic: test.topic,
      difficulty: test.difficulty,
      score: test.score,
      accuracy: test.accuracy,
      totalQuestions: test.totalQuestions,
      createdAt: test.createdAt
    }));

  return {
    totalTests: tests.length,
    averageScore: Math.round((totalScore / tests.length) * 100) / 100,
    averageAccuracy: Math.round((totalAccuracy / tests.length) * 100) / 100,
    highestScore: Math.max(...scores),
    totalQuestionsAnswered: tests.reduce((sum, test) => sum + test.totalQuestions, 0),
    subjectWisePerformance: subjectWise,
    difficultyWisePerformance: difficultyWise,
    recentTests
  };
};

export default mongoose.model("Test", testSchema);

