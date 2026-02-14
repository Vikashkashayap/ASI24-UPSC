import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PrelimsTopperTest from "../models/PrelimsTopperTest.js";
import PrelimsTestAttempt from "../models/PrelimsTestAttempt.js";
import PrelimsQuestion from "../models/PrelimsQuestion.js";
import { recalculateRanksForTest, getRankList } from "../services/prelimsRankingService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads", "prelims-topper");

/**
 * GET /api/student/prelims-tests
 * List all manual tests with status (Upcoming / Live / Expired) and user's attempt if any.
 */
export const listPrelimsTests = async (req, res) => {
  try {
    const userId = req.user._id?.toString() || req.user.id;
    const now = new Date();

    const tests = await PrelimsTopperTest.find({ testType: "MANUAL" })
      .sort({ startTime: -1 })
      .select("title totalQuestions totalMarks negativeMarking durationMinutes startTime endTime")
      .lean();

    const testIds = tests.map((t) => t._id);
    const attempts = await PrelimsTestAttempt.find({ userId, testId: { $in: testIds } })
      .select("testId score rank submittedAt timeTaken")
      .lean();
    const attemptByTest = {};
    attempts.forEach((a) => {
      attemptByTest[a.testId.toString()] = a;
    });

    const list = tests.map((t) => {
      const start = new Date(t.startTime);
      const end = new Date(t.endTime);
      let status = "Expired";
      if (now < start) status = "Upcoming";
      else if (now <= end) status = "Live";
      const attempt = attemptByTest[t._id.toString()];
      return {
        _id: t._id,
        title: t.title,
        totalQuestions: t.totalQuestions,
        totalMarks: t.totalMarks,
        negativeMarking: t.negativeMarking,
        durationMinutes: t.durationMinutes,
        startTime: t.startTime,
        endTime: t.endTime,
        status,
        canStart: status === "Live" && !attempt,
        hasAttempt: !!attempt,
        attempt: attempt
          ? { _id: attempt._id, score: attempt.score, rank: attempt.rank, submittedAt: attempt.submittedAt, timeTaken: attempt.timeTaken }
          : null,
      };
    });

    res.json({ success: true, data: list });
  } catch (error) {
    console.error("listPrelimsTests error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to list tests",
    });
  }
};

/**
 * Build questions payload - NEVER include correctAnswer.
 * For bilingual: return { questionHindi, questionEnglish, options }.
 * For legacy: return { question, options }.
 */
async function getQuestionsForStudent(testId, test) {
  const bilingualQuestions = await PrelimsQuestion.find({ testId })
    .sort({ questionNumber: 1 })
    .select("-correctAnswer")
    .lean();

  if (bilingualQuestions.length > 0) {
    return {
      hasBilingual: true,
      questions: bilingualQuestions.map((q) => ({
        questionNumber: q.questionNumber,
        questionHindi: q.questionHindi || "",
        questionEnglish: q.questionEnglish || "",
        options: (q.options || []).map((o) => ({
          key: o.key,
          textHindi: o.textHindi || "",
          textEnglish: o.textEnglish || "",
        })),
      })),
    };
  }

  const legacy = test.questions || [];
  return {
    hasBilingual: false,
    questions: legacy.map((q) => ({
      question: q.question || "",
      options: q.options || { A: "", B: "", C: "", D: "" },
    })),
  };
}

/**
 * POST /api/student/prelims-test/start/:id
 * Validate time window, create attempt with allowedTime = MIN(duration, remaining until end).
 * Body: { language?: "english"|"hindi"|"both" } (optional, for bilingual tests)
 */
export const startPrelimsTest = async (req, res) => {
  try {
    const userId = req.user._id?.toString() || req.user.id;
    const { id } = req.params;
    const now = new Date();

    const test = await PrelimsTopperTest.findById(id).lean();
    if (!test) {
      return res.status(404).json({ success: false, message: "Test not found" });
    }

    const start = new Date(test.startTime);
    const end = new Date(test.endTime);
    if (now < start) {
      return res.status(400).json({ success: false, message: "Test has not started yet" });
    }
    if (now > end) {
      return res.status(400).json({ success: false, message: "Test has expired" });
    }

    const { questions, hasBilingual } = await getQuestionsForStudent(id, test);

    let attempt = await PrelimsTestAttempt.findOne({ userId, testId: id });
    if (attempt) {
      return res.json({
        success: true,
        data: {
          attemptId: attempt._id,
          allowedTimeSeconds: attempt.allowedTimeSeconds,
          startedAt: attempt.startedAt,
          test: {
            _id: test._id,
            title: test.title,
            totalQuestions: test.totalQuestions,
            totalMarks: test.totalMarks,
            negativeMarking: test.negativeMarking,
            questionPdfUrl: test.questionPdfUrl,
            questions,
            hasBilingual,
          },
        },
      });
    }

    const durationSeconds = test.durationMinutes * 60;
    const remainingUntilEnd = Math.max(0, Math.floor((end - now) / 1000));
    const allowedTimeSeconds = Math.min(durationSeconds, remainingUntilEnd);

    attempt = new PrelimsTestAttempt({
      userId,
      testId: id,
      score: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      skipped: test.totalQuestions,
      accuracy: 0,
      timeTaken: 0,
      startedAt: now,
      submittedAt: now,
      answers: {},
      allowedTimeSeconds,
      markForReview: [],
    });
    try {
      await attempt.save();
    } catch (saveErr) {
      if (saveErr.code === 11000 && /userId_1_testId_1|duplicate key/.test(saveErr.message || "")) {
        attempt = await PrelimsTestAttempt.findOne({ userId, testId: id });
        if (attempt) {
          return res.json({
            success: true,
            data: {
              attemptId: attempt._id,
              allowedTimeSeconds: attempt.allowedTimeSeconds,
              startedAt: attempt.startedAt,
              test: {
                _id: test._id,
                title: test.title,
                totalQuestions: test.totalQuestions,
                totalMarks: test.totalMarks,
                negativeMarking: test.negativeMarking,
                questionPdfUrl: test.questionPdfUrl,
                questions,
                hasBilingual,
              },
            },
          });
        }
      }
      throw saveErr;
    }

    res.status(201).json({
      success: true,
      data: {
        attemptId: attempt._id,
        allowedTimeSeconds,
        startedAt: attempt.startedAt,
        test: {
          _id: test._id,
          title: test.title,
          totalQuestions: test.totalQuestions,
          totalMarks: test.totalMarks,
          negativeMarking: test.negativeMarking,
          questionPdfUrl: test.questionPdfUrl,
          questions,
          hasBilingual,
        },
      },
    });
  } catch (error) {
    console.error("startPrelimsTest error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to start test",
    });
  }
};

/**
 * POST /api/student/prelims-test/submit/:id
 * id = testId. Body: { timeTakenSeconds, answers: { "0": "A", "1": "B", ... } }
 * Score calculated server-side from test.answerKey. Rank recalculated.
 */
export const submitPrelimsTest = async (req, res) => {
  try {
    const userId = req.user._id?.toString() || req.user.id;
    const { id: testId } = req.params;
    const { timeTakenSeconds, answers, markForReview } = req.body || {};

    const test = await PrelimsTopperTest.findById(testId).lean();
    if (!test) {
      return res.status(404).json({ success: false, message: "Test not found" });
    }

    const now = new Date();
    const start = new Date(test.startTime);
    const end = new Date(test.endTime);
    if (now < start) {
      return res.status(400).json({ success: false, message: "Test has not started yet" });
    }
    if (now > end) {
      return res.status(400).json({ success: false, message: "Test has expired" });
    }

    const attempt = await PrelimsTestAttempt.findOne({ userId, testId });
    if (!attempt) {
      return res.status(400).json({ success: false, message: "No attempt found. Start the test first." });
    }

    const answerKey = test.answerKey || {};
    /** Score = (correct × marksPerQuestion) - (wrong × negativeMarking); UPSC: 2/0.66 */
    const marksPerQuestion = test.totalMarks / test.totalQuestions;
    let correct = 0;
    let wrong = 0;
    const ans = typeof answers === "object" && answers !== null ? answers : {};

    for (let i = 0; i < test.totalQuestions; i++) {
      const key = String(i);
      const userAns = ans[key];
      const correctAns = answerKey[key];
      if (!userAns || userAns.trim() === "") {
        continue;
      }
      if (correctAns && String(userAns).toUpperCase() === String(correctAns).toUpperCase()) {
        correct++;
      } else {
        wrong++;
      }
    }
    const skipped = test.totalQuestions - correct - wrong;
    const score = Math.max(
      0,
      correct * marksPerQuestion - wrong * test.negativeMarking
    );
    const attempted = correct + wrong;
    const accuracy = attempted > 0 ? (correct / attempted) * 100 : 0;
    const timeTaken = Math.max(0, parseInt(timeTakenSeconds, 10) || 0);

    attempt.score = Math.round(score * 100) / 100;
    attempt.correctAnswers = correct;
    attempt.wrongAnswers = wrong;
    attempt.skipped = skipped;
    attempt.accuracy = Math.round(accuracy * 100) / 100;
    attempt.timeTaken = timeTaken;
    attempt.submittedAt = new Date();
    attempt.answers = ans;
    if (Array.isArray(markForReview)) {
      attempt.markForReview = markForReview.filter((n) => typeof n === "number" && n >= 0 && n < test.totalQuestions);
    }
    await attempt.save();

    await recalculateRanksForTest(testId);
    const updated = await PrelimsTestAttempt.findOne({ userId, testId }).lean();
    const rankList = await getRankList(testId, 1);
    const topperScore = rankList[0]?.score ?? score;

    res.json({
      success: true,
      data: {
        attemptId: updated._id,
        score: updated.score,
        correctAnswers: updated.correctAnswers,
        wrongAnswers: updated.wrongAnswers,
        skipped: updated.skipped,
        accuracy: updated.accuracy,
        timeTaken: updated.timeTaken,
        rank: updated.rank,
        submittedAt: updated.submittedAt,
        totalAttempted: await PrelimsTestAttempt.countDocuments({ testId }),
        topperScore,
        solutionPdfUrl: test.solutionPdfUrl,
      },
    });
  } catch (error) {
    console.error("submitPrelimsTest error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to submit test",
    });
  }
};

/**
 * GET /api/student/prelims-test/history
 */
export const getPrelimsTestHistory = async (req, res) => {
  try {
    const userId = req.user._id?.toString() || req.user.id;
    const attempts = await PrelimsTestAttempt.find({ userId })
      .sort({ submittedAt: -1 })
      .populate("testId", "title totalQuestions totalMarks startTime endTime")
      .lean();

    const list = attempts.map((a) => ({
      _id: a._id,
      testId: a.testId?._id,
      title: a.testId?.title,
      totalQuestions: a.testId?.totalQuestions,
      totalMarks: a.testId?.totalMarks,
      score: a.score,
      correctAnswers: a.correctAnswers,
      wrongAnswers: a.wrongAnswers,
      skipped: a.skipped,
      accuracy: a.accuracy,
      timeTaken: a.timeTaken,
      rank: a.rank,
      submittedAt: a.submittedAt,
    }));

    res.json({ success: true, data: list });
  } catch (error) {
    console.error("getPrelimsTestHistory error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get history",
    });
  }
};

/**
 * GET /api/student/prelims-test/result/:attemptId
 */
export const getPrelimsTestResult = async (req, res) => {
  try {
    const userId = req.user._id?.toString() || req.user.id;
    const { attemptId } = req.params;

    const attempt = await PrelimsTestAttempt.findOne({ _id: attemptId, userId })
      .populate("testId")
      .lean();
    if (!attempt) {
      return res.status(404).json({ success: false, message: "Attempt not found" });
    }

    const test = attempt.testId;
    const totalAttempted = await PrelimsTestAttempt.countDocuments({ testId: test._id });
    const rankList = await getRankList(test._id, 1);
    const topperScore = rankList[0]?.score ?? attempt.score;

    res.json({
      success: true,
      data: {
        attempt: {
          _id: attempt._id,
          score: attempt.score,
          correctAnswers: attempt.correctAnswers,
          wrongAnswers: attempt.wrongAnswers,
          skipped: attempt.skipped,
          accuracy: attempt.accuracy,
          timeTaken: attempt.timeTaken,
          rank: attempt.rank,
          submittedAt: attempt.submittedAt,
        },
        test: {
          _id: test._id,
          title: test.title,
          totalQuestions: test.totalQuestions,
          totalMarks: test.totalMarks,
          solutionPdfUrl: test.solutionPdfUrl,
        },
        totalAttempted,
        topperScore,
      },
    });
  } catch (error) {
    console.error("getPrelimsTestResult error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get result",
    });
  }
};

/**
 * GET /api/student/prelims-test/rank/:id (testId)
 */
export const getPrelimsTestRank = async (req, res) => {
  try {
    const userId = req.user._id?.toString() || req.user.id;
    const { id: testId } = req.params;

    const test = await PrelimsTopperTest.findById(testId).select("title").lean();
    if (!test) {
      return res.status(404).json({ success: false, message: "Test not found" });
    }

    const attempt = await PrelimsTestAttempt.findOne({ userId, testId }).lean();
    const rankList = await getRankList(testId, 50);
    const totalAttempted = await PrelimsTestAttempt.countDocuments({ testId });
    const scores = await PrelimsTestAttempt.find({ testId }).select("score").lean();
    const avgScore =
      scores.length > 0 ? scores.reduce((s, a) => s + a.score, 0) / scores.length : 0;
    const topScore = scores.length > 0 ? Math.max(...scores.map((a) => a.score)) : 0;

    res.json({
      success: true,
      data: {
        test: test.title,
        myRank: attempt?.rank ?? null,
        myScore: attempt?.score ?? null,
        totalAttempted,
        topScore,
        averageScore: Math.round(avgScore * 100) / 100,
        rankList,
      },
    });
  } catch (error) {
    console.error("getPrelimsTestRank error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get rank",
    });
  }
};

/**
 * GET /api/student/prelims-test/file/:testId/question | solution
 * Serve question or solution PDF (auth required).
 */
export const servePrelimsTestFile = async (req, res) => {
  try {
    const { testId, type } = req.params;
    if (!["question", "solution"].includes(type)) {
      return res.status(400).json({ success: false, message: "Invalid file type" });
    }

    const test = await PrelimsTopperTest.findById(testId).select(`${type === "question" ? "questionPdfUrl" : "solutionPdfUrl"}`).lean();
    if (!test) {
      return res.status(404).json({ success: false, message: "Test not found" });
    }
    const url = type === "question" ? test.questionPdfUrl : test.solutionPdfUrl;
    if (!url) {
      return res.status(404).json({ success: false, message: "File not available" });
    }

    const filename = `${testId}_${type}.pdf`;
    const filepath = path.join(UPLOAD_DIR, filename);
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ success: false, message: "File not found on server" });
    }
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    res.sendFile(path.resolve(filepath));
  } catch (error) {
    console.error("servePrelimsTestFile error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to serve file",
    });
  }
};
