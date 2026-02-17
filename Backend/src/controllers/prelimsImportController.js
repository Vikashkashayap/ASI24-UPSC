/**
 * Prelims Import - Admin upload PDF, parse English questions, save to MongoDB
 * Student: take test (modern UI), submit, view result
 */

import PrelimsImportedTest from "../models/PrelimsImportedTest.js";
import PrelimsImportedQuestion from "../models/PrelimsImportedQuestion.js";
import PrelimsImportedAttempt from "../models/PrelimsImportedAttempt.js";
import {
  extractTextFromPdf,
  extractEnglishQuestions,
  parseAnswerKey,
} from "../services/prelimsImportPdfService.js";

/**
 * POST /api/admin/upload-test
 * Body: title (required), questionPdf (file), answerKeyPdf (file, optional)
 */
export const uploadTest = async (req, res) => {
  try {
    const title = req.body?.title?.trim();
    const questionPdf = req.file || req.files?.questionPdf?.[0];

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: title",
      });
    }

    if (!questionPdf || !questionPdf.buffer) {
      return res.status(400).json({
        success: false,
        message: "Please upload a question paper PDF.",
      });
    }

    const buf = questionPdf.buffer;
    let rawText;
    try {
      const result = await extractTextFromPdf(buf);
      rawText = result.text;
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: `PDF extraction failed: ${e.message}`,
      });
    }

    const questions = extractEnglishQuestions(rawText);

    if (!questions || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "No English questions detected. Ensure the PDF contains typed text in format: 1. In the/With reference to/Consider the/Which of the ... (a) ... (b) ... (c) ... (d)",
      });
    }

    console.log(`[Prelims Import] Total questions parsed: ${questions.length}`);

    const startTime = req.body.startTime ? new Date(req.body.startTime) : null;
    const endTime = req.body.endTime ? new Date(req.body.endTime) : null;
    const examType = req.body.examType?.trim() || null;
    let duration = 120;
    let marksPerQuestion = 2;
    let negativeMark = 0.66;
    let totalMarks = 200;
    if (examType === "UPSC Prelims GS Paper 1") {
      duration = 120;
      marksPerQuestion = 2;
      negativeMark = 0.66;
      totalMarks = 200;
    }
    if (req.body.duration != null && req.body.duration !== "") duration = Number(req.body.duration) || duration;
    if (req.body.marksPerQuestion != null && req.body.marksPerQuestion !== "") marksPerQuestion = Number(req.body.marksPerQuestion) || marksPerQuestion;
    if (req.body.negativeMark != null && req.body.negativeMark !== "") negativeMark = Number(req.body.negativeMark) || negativeMark;
    if (req.body.totalMarks != null && req.body.totalMarks !== "") totalMarks = Number(req.body.totalMarks) || totalMarks;

    const test = new PrelimsImportedTest({
      title,
      totalQuestions: questions.length,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      examType: examType || undefined,
      duration,
      marksPerQuestion,
      negativeMark,
      totalMarks,
    });
    await test.save();

    const answerKeyPdf = req.files?.answerKeyPdf?.[0];
    let answerMap = {};
    if (answerKeyPdf && answerKeyPdf.buffer && answerKeyPdf.buffer.length > 0) {
      try {
        const keyResult = await extractTextFromPdf(answerKeyPdf.buffer);
        answerMap = parseAnswerKey(keyResult.text);
      } catch (err) {
        console.warn("Answer key PDF parse failed:", err.message);
      }
    }

    const questionDocs = questions.map((q) => ({
      testId: test._id,
      questionNumber: q.questionNumber,
      questionText: q.questionText,
      options: q.options,
      correctAnswer: answerMap[q.questionNumber] || "",
    }));

    await PrelimsImportedQuestion.insertMany(questionDocs);

    res.status(201).json({
      success: true,
      message: "Test imported successfully",
      data: {
        _id: test._id,
        title: test.title,
        totalQuestions: test.totalQuestions,
        startTime: test.startTime || null,
        endTime: test.endTime || null,
        examType: test.examType || null,
        duration: test.duration,
        marksPerQuestion: test.marksPerQuestion,
        negativeMark: test.negativeMark,
        totalMarks: test.totalMarks,
        createdAt: test.createdAt,
      },
    });
  } catch (error) {
    console.error("prelimsImportController uploadTest:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to import test",
    });
  }
};

/**
 * GET /api/admin/imported-tests - List all imported tests (admin)
 */
export const listImportedTests = async (req, res) => {
  try {
    const tests = await PrelimsImportedTest.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: tests });
  } catch (error) {
    console.error("prelimsImportController listImportedTests:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/admin/imported-tests/:id - Update test (title, startTime, endTime)
 */
export const updateImportedTest = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, startTime, endTime, examType, duration, marksPerQuestion, negativeMark, totalMarks } = req.body;
    const test = await PrelimsImportedTest.findById(id);
    if (!test) {
      return res.status(404).json({ success: false, message: "Test not found" });
    }
    if (title !== undefined && String(title).trim()) test.title = String(title).trim();
    if (startTime !== undefined) test.startTime = startTime ? new Date(startTime) : null;
    if (endTime !== undefined) test.endTime = endTime ? new Date(endTime) : null;
    if (examType !== undefined) test.examType = examType || null;
    if (duration !== undefined && duration !== "") test.duration = Number(duration) ?? test.duration;
    if (marksPerQuestion !== undefined && marksPerQuestion !== "") test.marksPerQuestion = Number(marksPerQuestion) ?? test.marksPerQuestion;
    if (negativeMark !== undefined && negativeMark !== "") test.negativeMark = Number(negativeMark) ?? test.negativeMark;
    if (totalMarks !== undefined && totalMarks !== "") test.totalMarks = Number(totalMarks) ?? test.totalMarks;
    await test.save();
    res.json({
      success: true,
      data: {
        _id: test._id,
        title: test.title,
        totalQuestions: test.totalQuestions,
        startTime: test.startTime || null,
        endTime: test.endTime || null,
        examType: test.examType || null,
        duration: test.duration,
        marksPerQuestion: test.marksPerQuestion,
        negativeMark: test.negativeMark,
        totalMarks: test.totalMarks,
        createdAt: test.createdAt,
      },
    });
  } catch (error) {
    console.error("prelimsImportController updateImportedTest:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/admin/imported-tests/:id - Delete test and all its questions and attempts
 */
export const deleteImportedTest = async (req, res) => {
  try {
    const { id } = req.params;
    const test = await PrelimsImportedTest.findById(id);
    if (!test) {
      return res.status(404).json({ success: false, message: "Test not found" });
    }
    await PrelimsImportedQuestion.deleteMany({ testId: id });
    await PrelimsImportedAttempt.deleteMany({ testId: id });
    await PrelimsImportedTest.findByIdAndDelete(id);
    res.json({ success: true, message: "Test deleted successfully" });
  } catch (error) {
    console.error("prelimsImportController deleteImportedTest:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/admin/imported-tests/:id/analytics - Attempts count, average score, list
 */
export const getImportedTestAnalytics = async (req, res) => {
  try {
    const { id } = req.params;
    const test = await PrelimsImportedTest.findById(id).lean();
    if (!test) {
      return res.status(404).json({ success: false, message: "Test not found" });
    }
    const attempts = await PrelimsImportedAttempt.find({ testId: id })
      .populate("studentId", "name email")
      .sort({ submittedAt: -1 })
      .lean();
    const submitted = attempts.filter((a) => a.submittedAt);
    const avgScore = submitted.length
      ? submitted.reduce((s, a) => s + (a.score || 0), 0) / submitted.length
      : 0;
    res.json({
      success: true,
      data: {
        test: { _id: test._id, title: test.title, totalQuestions: test.totalQuestions },
        totalAttempts: attempts.length,
        submittedCount: submitted.length,
        averageScore: Math.round(avgScore * 100) / 100,
        attempts: submitted.map((a) => ({
          _id: a._id,
          studentName: a.studentId?.name || "—",
          studentEmail: a.studentId?.email || "—",
          score: a.score,
          correctCount: a.correctCount,
          wrongCount: a.wrongCount,
          notAttempted: a.notAttempted,
          accuracy: a.accuracy,
          submittedAt: a.submittedAt,
        })),
      },
    });
  } catch (error) {
    console.error("prelimsImportController getImportedTestAnalytics:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/prelims-import/active - List tests for students with status (live/upcoming/ended)
 * Live tests first, then upcoming, then ended. Start button only valid when status === 'live'.
 */
function getTestStatus(test, now) {
  const start = test.startTime ? new Date(test.startTime) : null;
  const end = test.endTime ? new Date(test.endTime) : null;
  if (!start && !end) return "live";
  if (end && now > end) return "ended";
  if (start && now < start) return "upcoming";
  return "live";
}

export const getActiveImportedTests = async (req, res) => {
  try {
    const now = new Date();
    const tests = await PrelimsImportedTest.find().sort({ createdAt: -1 }).lean();
    const withStatus = tests.map((t) => ({
      ...t,
      status: getTestStatus(t, now),
    }));
    // Sort: live first, then upcoming (by startTime), then ended (by endTime desc)
    withStatus.sort((a, b) => {
      const order = { live: 0, upcoming: 1, ended: 2 };
      const o = order[a.status] - order[b.status];
      if (o !== 0) return o;
      if (a.status === "upcoming" && a.startTime && b.startTime)
        return new Date(a.startTime) - new Date(b.startTime);
      if (a.status === "ended" && a.endTime && b.endTime)
        return new Date(b.endTime) - new Date(a.endTime);
      return 0;
    });
    res.json({ success: true, data: withStatus });
  } catch (error) {
    console.error("prelimsImportController getActiveImportedTests:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/prelims-import/test/:id - Get test with full questions (for taking test)
 */
export const getImportedTest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const test = await PrelimsImportedTest.findById(id).lean();
    if (!test) {
      return res.status(404).json({ success: false, message: "Test not found" });
    }
    const now = new Date();
    const status = getTestStatus(test, now);
    if (status !== "live") {
      return res.status(403).json({
        success: false,
        message: status === "upcoming"
          ? "Test is not active yet. It will be available at the scheduled start time."
          : "This test has ended.",
      });
    }

    const questions = await PrelimsImportedQuestion.find({ testId: id })
      .sort({ questionNumber: 1 })
      .lean();

    let attempt = await PrelimsImportedAttempt.findOne({
      studentId: userId,
      testId: id,
    });
    if (!attempt) {
      attempt = new PrelimsImportedAttempt({
        studentId: userId,
        testId: id,
        answers: {},
      });
      await attempt.save();
    }

    res.json({
      success: true,
      data: {
        test: {
          _id: test._id,
          title: test.title,
          totalQuestions: test.totalQuestions,
          duration: test.duration ?? 120,
          marksPerQuestion: test.marksPerQuestion ?? 2,
          negativeMark: test.negativeMark ?? 0.66,
          totalMarks: test.totalMarks ?? 200,
          createdAt: test.createdAt,
        },
        questions: questions.map((q) => ({
          _id: q._id,
          questionNumber: q.questionNumber,
          questionText: q.questionText,
          options: q.options,
        })),
        attemptId: attempt._id,
        existingAnswers: attempt.answers || {},
      },
    });
  } catch (error) {
    console.error("prelimsImportController getImportedTest:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/prelims-import/submit/:id - Submit answers
 */
export const submitImportedTest = async (req, res) => {
  try {
    const { id } = req.params;
    const { answers } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    if (!answers || typeof answers !== "object") {
      return res.status(400).json({ success: false, message: "Answers object required" });
    }

    const test = await PrelimsImportedTest.findById(id);
    if (!test) {
      return res.status(404).json({ success: false, message: "Test not found" });
    }

    const attempt = await PrelimsImportedAttempt.findOne({
      studentId: userId,
      testId: id,
    });
    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Attempt not found. Start the test first.",
      });
    }

    if (attempt.submittedAt) {
      return res.status(400).json({ success: false, message: "Test already submitted" });
    }

    const questions = await PrelimsImportedQuestion.find({ testId: id })
      .sort({ questionNumber: 1 })
      .lean();

    const normalizedAnswers = {};
    for (const [key, value] of Object.entries(answers)) {
      const v = String(value).toUpperCase();
      if (!["A", "B", "C", "D"].includes(v)) continue;
      const qNum = parseInt(key, 10);
      if (qNum >= 1 && qNum <= 1000) {
        normalizedAnswers[qNum] = v;
      }
    }

    const marksPerQ = test.marksPerQuestion ?? 2;
    const negMark = test.negativeMark ?? 0.66;
    let score = 0;
    let correctCount = 0;
    let wrongCount = 0;
    const hasAnswerKey = questions.some((q) => q.correctAnswer);

    const results = questions.map((q) => {
      const userAnswer = normalizedAnswers[q.questionNumber] ?? null;
      const correct = q.correctAnswer || "";
      const isCorrect = hasAnswerKey && correct ? userAnswer === correct : false;
      const notAttempted = !userAnswer;

      if (hasAnswerKey && correct && userAnswer) {
        if (userAnswer === correct) {
          score += marksPerQ;
          correctCount++;
        } else {
          score -= negMark;
          wrongCount++;
        }
      }

      return {
        _id: q._id,
        questionNumber: q.questionNumber,
        correctAnswer: correct,
        userAnswer,
        isCorrect,
        notAttempted,
      };
    });

    score = Math.max(0, parseFloat(score.toFixed(2)));
    const totalAttempted = correctCount + wrongCount;
    const accuracy =
      totalAttempted > 0 ? parseFloat(((correctCount / totalAttempted) * 100).toFixed(2)) : 0;
    const notAttemptedCount = questions.length - totalAttempted;

    attempt.answers = normalizedAnswers;
    attempt.score = score;
    attempt.correctCount = correctCount;
    attempt.wrongCount = wrongCount;
    attempt.notAttempted = notAttemptedCount;
    attempt.accuracy = accuracy;
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
        questions: results,
        submittedAt: attempt.submittedAt,
      },
    });
  } catch (error) {
    console.error("prelimsImportController submitImportedTest:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/prelims-import/result/:testId - Get result after submit
 */
export const getImportedResult = async (req, res) => {
  try {
    const { testId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const attempt = await PrelimsImportedAttempt.findOne({
      studentId: userId,
      testId,
    }).populate("testId");

    if (!attempt) {
      return res.status(404).json({ success: false, message: "Attempt not found" });
    }

    if (!attempt.submittedAt) {
      return res.status(400).json({ success: false, message: "Test not yet submitted" });
    }

    const questions = await PrelimsImportedQuestion.find({ testId })
      .sort({ questionNumber: 1 })
      .lean();
    const answers = attempt.answers || {};

    const results = questions.map((q) => {
      const userAnswer = answers[q.questionNumber] ?? null;
      const isCorrect = q.correctAnswer ? userAnswer === q.correctAnswer : false;
      const notAttempted = !userAnswer;

      return {
        _id: q._id,
        questionNumber: q.questionNumber,
        questionText: q.questionText,
        options: q.options,
        correctAnswer: q.correctAnswer || "",
        userAnswer,
        isCorrect,
        notAttempted,
      };
    });

    const totalMarks = attempt.testId?.totalMarks ?? (questions.length * (attempt.testId?.marksPerQuestion ?? 2));
    res.json({
      success: true,
      data: {
        _id: attempt._id,
        testId: attempt.testId._id,
        title: attempt.testId.title,
        totalQuestions: questions.length,
        totalMarks,
        score: attempt.score,
        correctCount: attempt.correctCount,
        wrongCount: attempt.wrongCount,
        notAttempted: attempt.notAttempted,
        accuracy: attempt.accuracy,
        questions: results,
        submittedAt: attempt.submittedAt,
      },
    });
  } catch (error) {
    console.error("prelimsImportController getImportedResult:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
