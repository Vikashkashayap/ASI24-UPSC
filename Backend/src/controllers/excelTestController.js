import ExcelTest from "../models/ExcelTest.js";
import ExcelTestQuestion from "../models/ExcelTestQuestion.js";
import ExcelTestAttempt from "../models/ExcelTestAttempt.js";
import { createExcelTestFromFile } from "../services/excelTestService.js";

/**
 * POST /api/admin/excel-test/create
 * Admin uploads Excel + metadata. Creates test and questions.
 */
export const createExcelTest = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: "Excel file is required",
      });
    }

    const {
      title,
      durationMinutes,
      startTime,
      endTime,
      negativeMarking,
    } = req.body;

    if (!title || !durationMinutes || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: title, durationMinutes, startTime, endTime",
      });
    }

    const duration = parseInt(durationMinutes, 10);
    if (isNaN(duration) || duration < 1) {
      return res.status(400).json({
        success: false,
        message: "durationMinutes must be a positive number",
      });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid startTime or endTime",
      });
    }
    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: "endTime must be after startTime",
      });
    }

    const result = await createExcelTestFromFile({
      title: String(title).trim(),
      durationMinutes: duration,
      startTime: start,
      endTime: end,
      negativeMarking:
        negativeMarking !== undefined && negativeMarking !== ""
          ? parseFloat(negativeMarking)
          : 0.33,
      createdBy: req.user?._id || null,
      excelBuffer: req.file.buffer,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Prelims Topper test created successfully",
      data: result.data,
    });
  } catch (err) {
    console.error("createExcelTest error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to create test",
    });
  }
};

/**
 * GET /api/student/tests (Excel-based tests only)
 * List tests that are within [startTime, endTime] for student.
 */
export const listStudentTests = async (req, res) => {
  try {
    const now = new Date();
    const tests = await ExcelTest.find({
      testType: "EXCEL_BASED",
      startTime: { $lte: now },
      endTime: { $gte: now },
    })
      .sort({ startTime: 1 })
      .select("title durationMinutes startTime endTime negativeMarking totalQuestions createdAt")
      .lean();

    return res.json({
      success: true,
      data: { tests },
    });
  } catch (err) {
    console.error("listStudentTests error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to list tests",
    });
  }
};

/**
 * POST /api/student/test/start/:id
 * Validate timing, create attempt if not exists, return questions WITHOUT correctAnswer.
 */
export const startStudentTest = async (req, res) => {
  try {
    const { id: testId } = req.params;
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    const test = await ExcelTest.findById(testId).lean();
    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Test not found",
      });
    }

    const now = new Date();
    if (now < new Date(test.startTime)) {
      return res.status(400).json({
        success: false,
        message: "Test has not started yet",
      });
    }
    if (now > new Date(test.endTime)) {
      return res.status(400).json({
        success: false,
        message: "Test has ended",
      });
    }

    let attempt = await ExcelTestAttempt.findOne({
      userId,
      testId,
    });

    if (!attempt) {
      attempt = new ExcelTestAttempt({
        userId,
        testId,
        answers: {},
      });
      await attempt.save();
    }

    if (attempt.submittedAt) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted this test",
      });
    }

    const questions = await ExcelTestQuestion.find({ testId })
      .sort({ questionNumber: 1 })
      .select("questionNumber questionText options")
      .lean();

    const questionsForClient = questions.map((q) => ({
      _id: q._id,
      questionNumber: q.questionNumber,
      questionText: q.questionText,
      options: q.options,
    }));

    return res.json({
      success: true,
      data: {
        attemptId: attempt._id,
        test: {
          _id: test._id,
          title: test.title,
          durationMinutes: test.durationMinutes,
          startTime: test.startTime,
          endTime: test.endTime,
          negativeMarking: test.negativeMarking,
          totalQuestions: test.totalQuestions,
        },
        questions: questionsForClient,
      },
    });
  } catch (err) {
    console.error("startStudentTest error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to start test",
    });
  }
};

/**
 * POST /api/student/test/submit/:id
 * id = testId. Validate timing and attempt, calculate score, save.
 */
export const submitStudentTest = async (req, res) => {
  try {
    const { id: testId } = req.params;
    const { answers } = req.body;
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    if (!answers || typeof answers !== "object") {
      return res.status(400).json({
        success: false,
        message: "answers object is required",
      });
    }

    const test = await ExcelTest.findById(testId).lean();
    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Test not found",
      });
    }

    const now = new Date();
    if (now > new Date(test.endTime)) {
      return res.status(400).json({
        success: false,
        message: "Test has ended",
      });
    }

    const attempt = await ExcelTestAttempt.findOne({
      userId,
      testId,
    });
    if (!attempt) {
      return res.status(400).json({
        success: false,
        message: "Attempt not found. Start the test first.",
      });
    }
    if (attempt.submittedAt) {
      return res.status(400).json({
        success: false,
        message: "Test already submitted",
      });
    }

    const questions = await ExcelTestQuestion.find({ testId })
      .sort({ questionNumber: 1 })
      .select("correctAnswer")
      .lean();

    let correctCount = 0;
    let wrongCount = 0;
    const negativeMarking = test.negativeMarking ?? 0.33;

    const answerMap = new Map();
    for (const [qId, userAns] of Object.entries(answers)) {
      if (userAns && ["A", "B", "C", "D"].includes(userAns)) {
        answerMap.set(qId.toString(), userAns);
      }
    }

    questions.forEach((q) => {
      const userAnswer = answerMap.get(q._id.toString());
      if (!userAnswer) return;
      if (userAnswer === q.correctAnswer) {
        correctCount++;
      } else {
        wrongCount++;
      }
    });

    const score = Math.max(
      0,
      correctCount - wrongCount * negativeMarking
    );
    const totalAttempted = correctCount + wrongCount;
    const accuracy =
      totalAttempted > 0 ? (correctCount / totalAttempted) * 100 : 0;

    attempt.answers = Object.fromEntries(answerMap);
    attempt.score = parseFloat(score.toFixed(2));
    attempt.correctCount = correctCount;
    attempt.wrongCount = wrongCount;
    attempt.accuracy = parseFloat(accuracy.toFixed(2));
    attempt.submittedAt = new Date();
    await attempt.save();

    return res.json({
      success: true,
      message: "Test submitted successfully",
      data: {
        attemptId: attempt._id,
        score: attempt.score,
        correctCount: attempt.correctCount,
        wrongCount: attempt.wrongCount,
        accuracy: attempt.accuracy,
      },
    });
  } catch (err) {
    console.error("submitStudentTest error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to submit test",
    });
  }
};

/**
 * GET /api/student/test/result/:attemptId
 * Return result with userAnswer, correctAnswer, explanation, score, accuracy.
 */
export const getStudentTestResult = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    const attempt = await ExcelTestAttempt.findOne({
      _id: attemptId,
      userId,
    }).lean();
    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Attempt not found",
      });
    }
    if (!attempt.submittedAt) {
      return res.status(400).json({
        success: false,
        message: "Test not submitted yet",
      });
    }

    const test = await ExcelTest.findById(attempt.testId).lean();
    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Test not found",
      });
    }

    const questions = await ExcelTestQuestion.find({ testId: attempt.testId })
      .sort({ questionNumber: 1 })
      .lean();

    const answersMap = attempt.answers instanceof Map
      ? attempt.answers
      : new Map(Object.entries(attempt.answers || {}));

    const questionsWithResult = questions.map((q) => {
      const userAnswer = answersMap.get(q._id.toString()) || null;
      return {
        _id: q._id,
        questionNumber: q.questionNumber,
        questionText: q.questionText,
        options: q.options,
        correctAnswer: q.correctAnswer,
        userAnswer,
        explanation: q.explanation,
        isCorrect: userAnswer === q.correctAnswer,
      };
    });

    return res.json({
      success: true,
      data: {
        _id: attempt._id,
        test: {
          _id: test._id,
          title: test.title,
          totalQuestions: test.totalQuestions,
        },
        score: attempt.score,
        correctCount: attempt.correctCount,
        wrongCount: attempt.wrongCount,
        accuracy: attempt.accuracy,
        questions: questionsWithResult,
        submittedAt: attempt.submittedAt,
      },
    });
  } catch (err) {
    console.error("getStudentTestResult error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to get result",
    });
  }
};

/**
 * GET /api/student/test/attempt/:attemptId
 * Get in-progress attempt with questions (for exam page refresh). No correctAnswer.
 */
export const getAttemptForExam = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const attempt = await ExcelTestAttempt.findOne({
      _id: attemptId,
      userId,
    }).lean();
    if (!attempt) {
      return res.status(404).json({ success: false, message: "Attempt not found" });
    }
    if (attempt.submittedAt) {
      return res.status(400).json({
        success: false,
        message: "Test already submitted",
      });
    }

    const test = await ExcelTest.findById(attempt.testId).lean();
    if (!test) {
      return res.status(404).json({ success: false, message: "Test not found" });
    }

    const questions = await ExcelTestQuestion.find({ testId: attempt.testId })
      .sort({ questionNumber: 1 })
      .select("questionNumber questionText options")
      .lean();

    const questionsForClient = questions.map((q) => ({
      _id: q._id,
      questionNumber: q.questionNumber,
      questionText: q.questionText,
      options: q.options,
    }));

    return res.json({
      success: true,
      data: {
        attemptId: attempt._id,
        test: {
          _id: test._id,
          title: test.title,
          durationMinutes: test.durationMinutes,
          startTime: test.startTime,
          endTime: test.endTime,
          negativeMarking: test.negativeMarking,
          totalQuestions: test.totalQuestions,
        },
        questions: questionsForClient,
      },
    });
  } catch (err) {
    console.error("getAttemptForExam error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to load attempt",
    });
  }
};

/**
 * GET /api/student/test/attempts
 * List current user's Excel test attempts (history).
 */
export const listStudentAttempts = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    const attempts = await ExcelTestAttempt.find({ userId })
      .sort({ submittedAt: -1 })
      .limit(100)
      .populate("testId", "title totalQuestions startTime endTime")
      .lean();

    const list = attempts
      .filter((a) => a.testId && a.submittedAt)
      .map((a) => ({
        _id: a._id,
        testId: a.testId._id,
        title: a.testId.title,
        totalQuestions: a.testId.totalQuestions,
        score: a.score,
        correctCount: a.correctCount,
        wrongCount: a.wrongCount,
        accuracy: a.accuracy,
        submittedAt: a.submittedAt,
      }));

    return res.json({
      success: true,
      data: { attempts: list },
    });
  } catch (err) {
    console.error("listStudentAttempts error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to list attempts",
    });
  }
};
