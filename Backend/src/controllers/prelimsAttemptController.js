/**
 * Prelims Topper Test - Student Controller
 * PDF-based: no question text/options, only answer map + explanations
 */

import PrelimsTest from "../models/PrelimsTest.js";
import PrelimsQuestion from "../models/PrelimsQuestion.js";
import PrelimsAttempt from "../models/PrelimsAttempt.js";

/**
 * Get active Prelims Topper Tests
 */
export const getActiveTests = async (req, res) => {
  try {
    const now = new Date();
    const tests = await PrelimsTest.find({
      isPublished: true,
      startTime: { $lte: now },
      endTime: { $gte: now },
    })
      .sort({ startTime: 1 })
      .lean();

    res.json({ success: true, data: tests });
  } catch (error) {
    console.error("prelimsAttemptController getActiveTests:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get test data for taking test: PDF URL, question numbers 1-N, attempt, existing answers
 */
export const getTestQuestions = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const test = await PrelimsTest.findById(id);
    if (!test) {
      return res.status(404).json({ success: false, message: "Test not found" });
    }

    if (!test.isPublished) {
      return res.status(403).json({ success: false, message: "Test is not published" });
    }

    const now = new Date();
    if (now < test.startTime) {
      return res.status(403).json({ success: false, message: "Test has not started yet" });
    }
    if (now > test.endTime) {
      return res.status(403).json({ success: false, message: "Test has ended" });
    }

    const questions = await PrelimsQuestion.find({ testId: id }).sort({ questionNumber: 1 }).lean();

    let attempt = await PrelimsAttempt.findOne({ studentId: userId, testId: id });
    if (!attempt) {
      attempt = new PrelimsAttempt({
        studentId: userId,
        testId: id,
        answers: {},
      });
      await attempt.save();
    }

    const questionNumbers = questions.map((q) => ({ questionNumber: q.questionNumber }));

    res.json({
      success: true,
      data: {
        test: {
          _id: test._id,
          title: test.title,
          duration: test.duration,
          startTime: test.startTime,
          endTime: test.endTime,
          totalQuestions: test.totalQuestions,
          questionPdfUrl: test.questionPdfUrl || "",
        },
        questions: questionNumbers,
        attemptId: attempt._id,
        existingAnswers: attempt.answers || {},
      },
    });
  } catch (error) {
    console.error("prelimsAttemptController getTestQuestions:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Submit test - answers: { 1: "A", 2: "B", ... }
 */
export const submitTest = async (req, res) => {
  try {
    const { id } = req.params;
    const { answers } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    if (!answers || typeof answers !== "object") {
      return res.status(400).json({ success: false, message: "Answers object required" });
    }

    const test = await PrelimsTest.findById(id);
    if (!test) {
      return res.status(404).json({ success: false, message: "Test not found" });
    }

    const attempt = await PrelimsAttempt.findOne({ studentId: userId, testId: id });
    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Attempt not found. Start the test first.",
      });
    }

    if (attempt.submittedAt) {
      return res.status(400).json({ success: false, message: "Test already submitted" });
    }

    const questions = await PrelimsQuestion.find({ testId: id }).sort({ questionNumber: 1 }).lean();

    const normalizedAnswers = {};
    for (const [key, value] of Object.entries(answers)) {
      if (!["A", "B", "C", "D"].includes(String(value).toUpperCase())) continue;
      const qNum = parseInt(key, 10);
      if (qNum >= 1 && qNum <= 100) {
        normalizedAnswers[qNum] = String(value).toUpperCase();
      }
    }

    let score = 0;
    let correctCount = 0;
    let wrongCount = 0;
    const results = [];

    for (const q of questions) {
      const userAnswer = normalizedAnswers[q.questionNumber] || null;
      const correct = q.correctAnswer;
      const isCorrect = userAnswer === correct;
      const notAttempted = !userAnswer;

      if (userAnswer) {
        if (isCorrect) {
          score += 2;
          correctCount++;
        } else {
          score -= 0.66;
          wrongCount++;
        }
      }

      results.push({
        _id: q._id,
        questionNumber: q.questionNumber,
        correctAnswer: correct,
        userAnswer,
        explanation: q.explanation || "",
        isCorrect,
        notAttempted,
      });
    }

    score = Math.max(0, parseFloat(score.toFixed(2)));
    const totalAttempted = correctCount + wrongCount;
    const accuracy = totalAttempted > 0 ? (correctCount / totalAttempted) * 100 : 0;
    const notAttemptedCount = questions.length - totalAttempted;

    attempt.answers = normalizedAnswers;
    attempt.score = score;
    attempt.correctCount = correctCount;
    attempt.wrongCount = wrongCount;
    attempt.notAttempted = notAttemptedCount;
    attempt.accuracy = parseFloat(accuracy.toFixed(2));
    attempt.submittedAt = new Date();
    await attempt.save();

    res.json({
      success: true,
      message: "Test submitted successfully",
      data: {
        _id: attempt._id,
        testId: test._id,
        title: test.title,
        totalQuestions: questions.length,
        score,
        correctCount,
        wrongCount,
        notAttempted: notAttemptedCount,
        accuracy,
        questionPdfUrl: test.questionPdfUrl || "",
        questions: results,
        submittedAt: attempt.submittedAt,
      },
    });
  } catch (error) {
    console.error("prelimsAttemptController submitTest:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get result - includes questionPdfUrl for PDF viewer
 */
export const getResult = async (req, res) => {
  try {
    const { testId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const attempt = await PrelimsAttempt.findOne({ studentId: userId, testId }).populate("testId");
    if (!attempt) {
      return res.status(404).json({ success: false, message: "Attempt not found" });
    }

    if (!attempt.submittedAt) {
      return res.status(400).json({ success: false, message: "Test not yet submitted" });
    }

    const questions = await PrelimsQuestion.find({ testId }).sort({ questionNumber: 1 }).lean();
    const answers = attempt.answers || {};

    const results = questions.map((q) => {
      const userAnswer = answers[q.questionNumber] ?? null;
      const isCorrect = userAnswer === q.correctAnswer;
      const notAttempted = !userAnswer;

      return {
        _id: q._id,
        questionNumber: q.questionNumber,
        correctAnswer: q.correctAnswer,
        userAnswer,
        explanation: q.explanation || "",
        isCorrect,
        notAttempted,
      };
    });

    res.json({
      success: true,
      data: {
        _id: attempt._id,
        testId: attempt.testId._id,
        title: attempt.testId.title,
        totalQuestions: questions.length,
        score: attempt.score,
        correctCount: attempt.correctCount,
        wrongCount: attempt.wrongCount,
        notAttempted: attempt.notAttempted,
        accuracy: attempt.accuracy,
        questionPdfUrl: attempt.testId?.questionPdfUrl || "",
        questions: results,
        submittedAt: attempt.submittedAt,
      },
    });
  } catch (error) {
    console.error("prelimsAttemptController getResult:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyAttempts = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const attempts = await PrelimsAttempt.find({
      studentId: userId,
      submittedAt: { $ne: null },
    })
      .populate("testId", "title duration startTime endTime totalQuestions")
      .sort({ submittedAt: -1 })
      .lean();

    res.json({ success: true, data: attempts });
  } catch (error) {
    console.error("prelimsAttemptController getMyAttempts:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
