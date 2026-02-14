/**
 * Prelims PDF Test Controller
 * Admin: create PDF-based scheduled test (upload question + solution PDFs, set schedule).
 * Student: list tests (Upcoming/Live/Expired), start test, submit, get result.
 */

import PrelimsPdfTest from "../models/PrelimsPdfTest.js";
import PrelimsPdfTestAttempt from "../models/PrelimsPdfTestAttempt.js";
import { buildPrelimsPdfTestPayload } from "../services/prelimsPdfTestService.js";

// ---------- Admin ----------

/**
 * POST /api/admin/prelims-pdf-tests
 * Create a new PDF-based Prelims test. Expects multipart: questionPdf, solutionPdf; body: title, duration, negativeMarking, startTime, endTime.
 */
export const createPrelimsPdfTest = async (req, res) => {
  try {
    const questionPdf = req.files?.questionPdf?.[0] ?? req.file;
    const solutionPdf = req.files?.solutionPdf?.[0];

    if (!questionPdf?.buffer) {
      return res.status(400).json({
        success: false,
        message: "Question Paper PDF is required (field: questionPdf)",
      });
    }
    if (!solutionPdf?.buffer) {
      return res.status(400).json({
        success: false,
        message: "Solution PDF is required (field: solutionPdf)",
      });
    }

    const title = req.body.title?.trim() || "PDF Prelims Test";
    const duration = Math.max(1, parseInt(req.body.duration, 10) || 120);
    const negativeMarking = Math.max(0, parseFloat(req.body.negativeMarking) || 0.66);
    const startTime = req.body.startTime ? new Date(req.body.startTime) : new Date();
    const endTime = req.body.endTime ? new Date(req.body.endTime) : new Date(Date.now() + 24 * 60 * 60 * 1000);

    if (endTime <= startTime) {
      return res.status(400).json({
        success: false,
        message: "endTime must be after startTime",
      });
    }

    const payload = await buildPrelimsPdfTestPayload(
      questionPdf.buffer,
      solutionPdf.buffer,
      { title, duration, negativeMarking, startTime, endTime }
    );

    const test = new PrelimsPdfTest(payload);
    await test.save();

    return res.status(201).json({
      success: true,
      message: "PDF Prelims test created successfully",
      data: {
        _id: test._id,
        title: test.title,
        duration: test.duration,
        negativeMarking: test.negativeMarking,
        startTime: test.startTime,
        endTime: test.endTime,
        totalQuestions: test.totalQuestions,
        testType: test.testType,
      },
    });
  } catch (err) {
    console.error("createPrelimsPdfTest error:", err);
    const message = err.message || "Failed to create PDF test";
    return res.status(400).json({ success: false, message });
  }
};

/**
 * GET /api/admin/prelims-pdf-tests
 * List all PDF-based tests (admin).
 */
export const listPrelimsPdfTestsAdmin = async (req, res) => {
  try {
    const tests = await PrelimsPdfTest.find({})
      .sort({ createdAt: -1 })
      .select("title duration negativeMarking startTime endTime totalQuestions testType createdAt");
    return res.json({ success: true, data: tests });
  } catch (err) {
    console.error("listPrelimsPdfTestsAdmin error:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to list tests" });
  }
};

// ---------- Student (auth required) ----------

/**
 * GET /api/prelims-pdf-tests
 * List PDF-based tests with status: Upcoming | Live | Expired.
 */
export const listPrelimsPdfTests = async (req, res) => {
  try {
    const now = new Date();
    const tests = await PrelimsPdfTest.find({})
      .sort({ startTime: 1 })
      .select("title duration negativeMarking startTime endTime totalQuestions testType");

    const withStatus = tests.map((t) => {
      let status = "Expired";
      if (now < t.startTime) status = "Upcoming";
      else if (now >= t.startTime && now <= t.endTime) status = "Live";
      return {
        _id: t._id,
        title: t.title,
        duration: t.duration,
        negativeMarking: t.negativeMarking,
        startTime: t.startTime,
        endTime: t.endTime,
        totalQuestions: t.totalQuestions,
        testType: t.testType,
        status,
      };
    });

    return res.json({ success: true, data: withStatus });
  } catch (err) {
    console.error("listPrelimsPdfTests error:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to list tests" });
  }
};

/**
 * POST /api/prelims-pdf-tests/:testId/start
 * Start a PDF test (create attempt). Allowed only when currentTime >= startTime && currentTime <= endTime.
 */
export const startPrelimsPdfTest = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { testId } = req.params;
    const test = await PrelimsPdfTest.findById(testId);
    if (!test) {
      return res.status(404).json({ success: false, message: "Test not found" });
    }

    const now = new Date();
    if (now < test.startTime) {
      return res.status(400).json({
        success: false,
        message: "Test has not started yet",
        startTime: test.startTime,
      });
    }
    if (now > test.endTime) {
      return res.status(400).json({
        success: false,
        message: "Test has ended",
        endTime: test.endTime,
      });
    }

    let attempt = await PrelimsPdfTestAttempt.findOne({ userId, testId });
    if (attempt) {
      if (attempt.isSubmitted) {
        return res.status(400).json({
          success: false,
          message: "You have already submitted this test",
          attemptId: attempt._id,
        });
      }
      return res.json({
        success: true,
        message: "Attempt already in progress",
        data: { attemptId: attempt._id, testId },
      });
    }

    attempt = new PrelimsPdfTestAttempt({
      userId,
      testId,
      answers: test.questions.map((q, i) => ({
        questionNumber: q.questionNumber ?? i + 1,
        userAnswer: null,
      })),
    });
    await attempt.save();

    return res.status(201).json({
      success: true,
      message: "Test started",
      data: { attemptId: attempt._id, testId },
    });
  } catch (err) {
    console.error("startPrelimsPdfTest error:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to start test" });
  }
};

/**
 * GET /api/prelims-pdf-tests/attempt/:attemptId
 * Get attempt + test questions for exam page. Does NOT send correctAnswer.
 */
export const getPrelimsPdfTestAttempt = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { attemptId } = req.params;
    const attempt = await PrelimsPdfTestAttempt.findOne({
      _id: attemptId,
      userId,
    }).populate("testId");
    if (!attempt || !attempt.testId) {
      return res.status(404).json({ success: false, message: "Attempt not found" });
    }

    const test = attempt.testId;
    const now = new Date();
    if (now < test.startTime || now > test.endTime) {
      return res.status(400).json({
        success: false,
        message: "Test is not available in current time window",
      });
    }

    const answersByNum = new Map(
      (attempt.answers || []).map((a) => [a.questionNumber, a.userAnswer])
    );

    const questions = test.questions.map((q) => ({
      _id: q._id,
      questionNumber: q.questionNumber,
      questionText: q.questionText,
      options: q.options.map((o) => ({ key: o.key, english: o.english, hindi: o.hindi })),
      userAnswer: answersByNum.get(q.questionNumber) ?? null,
    }));

    return res.json({
      success: true,
      data: {
        attemptId: attempt._id,
        testId: test._id,
        title: test.title,
        duration: test.duration,
        negativeMarking: test.negativeMarking,
        startTime: test.startTime,
        endTime: test.endTime,
        totalQuestions: test.totalQuestions,
        questions,
        isSubmitted: attempt.isSubmitted,
        startedAt: attempt.startedAt,
      },
    });
  } catch (err) {
    console.error("getPrelimsPdfTestAttempt error:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to get attempt" });
  }
};

/**
 * PATCH /api/prelims-pdf-tests/attempt/:attemptId/answers
 * Save answers (during test). Body: { answers: { questionNumber: "A"|"B"|"C"|"D" } } or { answers: { [questionId]: "A" } }.
 * We key by questionNumber 1-100 for PDF tests.
 */
export const savePrelimsPdfTestAnswers = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { attemptId } = req.params;
    const { answers } = req.body || {};
    if (!answers || typeof answers !== "object") {
      return res.status(400).json({ success: false, message: "answers object required" });
    }

    const attempt = await PrelimsPdfTestAttempt.findOne({
      _id: attemptId,
      userId,
    }).populate("testId");
    if (!attempt || !attempt.testId) {
      return res.status(404).json({ success: false, message: "Attempt not found" });
    }
    if (attempt.isSubmitted) {
      return res.status(400).json({ success: false, message: "Test already submitted" });
    }

    const test = attempt.testId;
    const now = new Date();
    if (now > test.endTime) {
      return res.status(400).json({ success: false, message: "Test has ended" });
    }

    const validKeys = ["A", "B", "C", "D"];
    const updated = (attempt.answers || []).map((a) => {
      const key = a.questionNumber;
      const val = answers[key] ?? answers[String(key)];
      const userAnswer = validKeys.includes(val) ? val : null;
      return { questionNumber: key, userAnswer };
    });
    attempt.answers = updated;
    await attempt.save();

    return res.json({ success: true, message: "Answers saved" });
  } catch (err) {
    console.error("savePrelimsPdfTestAnswers error:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to save answers" });
  }
};

/**
 * POST /api/prelims-pdf-tests/attempt/:attemptId/submit
 * Submit test: validate server-side, calculate score, save attempt.
 */
export const submitPrelimsPdfTest = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { attemptId } = req.params;
    const attempt = await PrelimsPdfTestAttempt.findOne({
      _id: attemptId,
      userId,
    }).populate("testId");
    if (!attempt || !attempt.testId) {
      return res.status(404).json({ success: false, message: "Attempt not found" });
    }
    if (attempt.isSubmitted) {
      return res.status(400).json({ success: false, message: "Test already submitted" });
    }

    const test = attempt.testId;
    const nm = test.negativeMarking ?? 0.66;

    const answerMap = new Map(
      (attempt.answers || []).map((a) => [a.questionNumber, a.userAnswer])
    );
    const questions = test.questions || [];
    let correctCount = 0;
    let wrongCount = 0;

    const results = questions.map((q) => {
      const userAnswer = answerMap.get(q.questionNumber) ?? null;
      const correct = q.correctAnswer;
      const isCorrect = userAnswer && userAnswer === correct;
      if (isCorrect) correctCount++;
      else if (userAnswer) wrongCount++;
      return {
        questionNumber: q.questionNumber,
        questionText: q.questionText,
        options: q.options,
        correctAnswer: correct,
        userAnswer,
        explanation: q.explanation || "",
        isCorrect,
      };
    });

    const score = Math.max(
      0,
      correctCount * 2 - wrongCount * nm
    );
    attempt.score = Math.round(score * 100) / 100;
    attempt.correctCount = correctCount;
    attempt.wrongCount = wrongCount;
    attempt.isSubmitted = true;
    attempt.submittedAt = new Date();
    await attempt.save();

    return res.json({
      success: true,
      message: "Test submitted successfully",
      data: {
        attemptId: attempt._id,
        testId: test._id,
        title: test.title,
        totalQuestions: test.totalQuestions,
        score: attempt.score,
        correctCount: attempt.correctCount,
        wrongCount: attempt.wrongCount,
        questions: results,
        submittedAt: attempt.submittedAt,
      },
    });
  } catch (err) {
    console.error("submitPrelimsPdfTest error:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to submit test" });
  }
};

/**
 * GET /api/prelims-pdf-tests/attempt/:attemptId/result
 * Get result after submit (your answer, correct answer, explanation, score).
 */
export const getPrelimsPdfTestResult = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { attemptId } = req.params;
    const attempt = await PrelimsPdfTestAttempt.findOne({
      _id: attemptId,
      userId,
    }).populate("testId");
    if (!attempt || !attempt.testId) {
      return res.status(404).json({ success: false, message: "Attempt not found" });
    }
    if (!attempt.isSubmitted) {
      return res.status(400).json({
        success: false,
        message: "Test not submitted yet",
      });
    }

    const test = attempt.testId;
    const answerMap = new Map(
      (attempt.answers || []).map((a) => [a.questionNumber, a.userAnswer])
    );
    const questions = (test.questions || []).map((q) => ({
      questionNumber: q.questionNumber,
      questionText: q.questionText,
      options: q.options,
      correctAnswer: q.correctAnswer,
      userAnswer: answerMap.get(q.questionNumber) ?? null,
      explanation: q.explanation || "",
      isCorrect: (answerMap.get(q.questionNumber) ?? null) === q.correctAnswer,
    }));

    return res.json({
      success: true,
      data: {
        attemptId: attempt._id,
        testId: test._id,
        title: test.title,
        totalQuestions: test.totalQuestions,
        score: attempt.score,
        correctCount: attempt.correctCount,
        wrongCount: attempt.wrongCount,
        questions,
        submittedAt: attempt.submittedAt,
      },
    });
  } catch (err) {
    console.error("getPrelimsPdfTestResult error:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to get result" });
  }
};
