import PrelimsMock from "../models/PrelimsMock.js";
import Test from "../models/Test.js";
import { generateFullMockTestQuestions, generateFullMockMixTestQuestions, generateFullMockPyoTestQuestions, generateFullMockCsatTestQuestions } from "../services/testGenerationService.js";

const GS_SUBJECTS = ["Polity", "History", "Geography", "Economy", "Environment", "Science & Tech", "Art & Culture", "Current Affairs"];

/**
 * Admin: Create a scheduled Prelims Mock
 * POST /api/admin/prelims-mock
 * Body: { subject: string, scheduledAt: string (ISO date) }
 */
const FULL_LENGTH_MIX_SUBJECT = "Full Length GS Mix";
const PYQ_MIN_YEAR = 2010;
const PYQ_MAX_YEAR = 2025;

export const createPrelimsMockSchedule = async (req, res) => {
  try {
    const { subject, scheduledAt, isMix, isPyo, isCsat, yearFrom, yearTo } = req.body;
    const useMix = Boolean(isMix);
    const usePyo = Boolean(isPyo);
    const useCsat = Boolean(isCsat);

    let subjectStr;
    let titleStr;
    const mockPayload = {
      scheduledAt: null,
      status: "scheduled",
      totalQuestions: 100,
      durationMinutes: 120,
      totalMarks: 200,
      negativeMark: 0.66,
    };

    if (useCsat) {
      subjectStr = "CSAT Paper 2";
      titleStr = "Prelims Mock - CSAT Paper 2";
      mockPayload.subject = subjectStr;
      mockPayload.isCsat = true;
      mockPayload.title = titleStr;
      mockPayload.totalQuestions = 80;
      mockPayload.totalMarks = 200;
      mockPayload.negativeMark = 0.83;
      mockPayload.durationMinutes = 120;
    } else if (usePyo) {
      const yFrom = parseInt(yearFrom, 10);
      const yTo = parseInt(yearTo, 10);
      if (!Number.isFinite(yFrom) || !Number.isFinite(yTo)) {
        return res.status(400).json({ success: false, message: "yearFrom and yearTo are required for PYQ mock" });
      }
      if (yFrom < PYQ_MIN_YEAR || yTo > PYQ_MAX_YEAR || yFrom > yTo) {
        return res.status(400).json({
          success: false,
          message: `Years must be between ${PYQ_MIN_YEAR} and ${PYQ_MAX_YEAR}, and yearFrom must be ≤ yearTo`,
        });
      }
      subjectStr = `PYQ ${yFrom}-${yTo}`;
      titleStr = `Prelims Mock - PYQ ${yFrom}-${yTo}`;
      mockPayload.isPyo = true;
      mockPayload.yearFrom = yFrom;
      mockPayload.yearTo = yTo;
      mockPayload.subject = subjectStr;
      mockPayload.title = titleStr;
    } else if (useMix) {
      subjectStr = FULL_LENGTH_MIX_SUBJECT;
      titleStr = "Prelims Mock - Full Length GS Mix";
      mockPayload.subject = subjectStr;
      mockPayload.isMix = true;
      mockPayload.title = titleStr;
    } else {
      subjectStr = typeof subject === "string" ? subject.trim() : "";
      if (!subjectStr) {
        return res.status(400).json({ success: false, message: "subject is required" });
      }
      const subjectList = subjectStr.split(",").map((s) => s.trim()).filter(Boolean);
      const invalid = subjectList.filter((s) => !GS_SUBJECTS.includes(s));
      if (invalid.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid subject(s): ${invalid.join(", ")}. Allowed: ${GS_SUBJECTS.join(", ")}`,
        });
      }
      mockPayload.subject = subjectStr;
      mockPayload.title = `Prelims Mock - ${subjectStr}`;
    }

    const at = scheduledAt ? new Date(scheduledAt) : null;
    if (!at || isNaN(at.getTime())) {
      return res.status(400).json({ success: false, message: "scheduledAt must be a valid ISO date/time" });
    }
    if (at <= new Date()) {
      return res.status(400).json({ success: false, message: "scheduledAt must be in the future" });
    }
    mockPayload.scheduledAt = at;

    const mock = new PrelimsMock(mockPayload);
    await mock.save();

    return res.status(201).json({
      success: true,
      message: "Prelims Mock scheduled successfully",
      data: {
        _id: mock._id,
        subject: mock.subject,
        scheduledAt: mock.scheduledAt,
        status: mock.status,
        title: mock.title,
        totalQuestions: mock.totalQuestions,
        durationMinutes: mock.durationMinutes,
        createdAt: mock.createdAt,
      },
    });
  } catch (error) {
    console.error("createPrelimsMockSchedule:", error);
    res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
};

/**
 * Admin: Update schedule (date/time) of a scheduled Prelims Mock
 * PATCH /api/admin/prelims-mock/:id
 * Body: { scheduledAt: string (ISO date) }
 */
export const updatePrelimsMockSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduledAt } = req.body;
    const mock = await PrelimsMock.findById(id);
    if (!mock) {
      return res.status(404).json({ success: false, message: "Prelims Mock not found" });
    }
    if (mock.status !== "scheduled") {
      return res.status(400).json({
        success: false,
        message: "Only scheduled mocks can be rescheduled. Status: " + mock.status,
      });
    }
    const at = scheduledAt ? new Date(scheduledAt) : null;
    if (!at || isNaN(at.getTime())) {
      return res.status(400).json({ success: false, message: "scheduledAt must be a valid ISO date/time" });
    }
    if (at <= new Date()) {
      return res.status(400).json({ success: false, message: "scheduledAt must be in the future" });
    }
    mock.scheduledAt = at;
    await mock.save();
    return res.json({
      success: true,
      message: "Schedule updated",
      data: { _id: mock._id, scheduledAt: mock.scheduledAt },
    });
  } catch (error) {
    console.error("updatePrelimsMockSchedule:", error);
    res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
};

/**
 * Admin: Delete a Prelims Mock
 * DELETE /api/admin/prelims-mock/:id
 */
export const deletePrelimsMock = async (req, res) => {
  try {
    const { id } = req.params;
    const mock = await PrelimsMock.findById(id);
    if (!mock) {
      return res.status(404).json({ success: false, message: "Prelims Mock not found" });
    }
    await PrelimsMock.findByIdAndDelete(id);
    return res.json({ success: true, message: "Prelims Mock deleted" });
  } catch (error) {
    console.error("deletePrelimsMock:", error);
    res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
};

/**
 * Admin: List all Prelims Mocks (scheduled, live, ended)
 * GET /api/admin/prelims-mock
 */
export const listAdminPrelimsMocks = async (req, res) => {
  try {
    const mocks = await PrelimsMock.find().sort({ scheduledAt: -1 }).lean();
    const data = mocks.map((m) => ({
      _id: m._id,
      subject: m.subject,
      title: m.title,
      scheduledAt: m.scheduledAt,
      status: m.status,
      totalQuestions: m.totalQuestions,
      durationMinutes: m.durationMinutes,
      totalMarks: m.totalMarks,
      liveAt: m.liveAt,
      endedAt: m.endedAt,
      createdAt: m.createdAt,
      questionCount: (m.questions || []).length,
    }));
    return res.json({ success: true, data });
  } catch (error) {
    console.error("listAdminPrelimsMocks:", error);
    res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
};

/**
 * Admin: Go live now — generate questions and set status to live
 * POST /api/admin/prelims-mock/:id/go-live
 */
export const goLivePrelimsMock = async (req, res) => {
  try {
    const { id } = req.params;
    const mock = await PrelimsMock.findById(id);
    if (!mock) {
      return res.status(404).json({ success: false, message: "Prelims Mock not found" });
    }
    if (mock.status === "live") {
      return res.json({
        success: true,
        message: "Mock is already live",
        data: { _id: mock._id, status: mock.status, liveAt: mock.liveAt },
      });
    }
    if (mock.status === "generating") {
      return res.status(400).json({ success: false, message: "Generation already in progress" });
    }

    mock.status = "generating";
    await mock.save();

    const result = mock.isCsat
      ? await generateFullMockCsatTestQuestions()
      : mock.isPyo
        ? await generateFullMockPyoTestQuestions({ yearFrom: mock.yearFrom, yearTo: mock.yearTo })
        : mock.isMix
          ? await generateFullMockMixTestQuestions()
          : await generateFullMockTestQuestions({ subject: mock.subject });
    if (!result.success || !result.questions || result.questions.length === 0) {
      mock.status = "scheduled";
      await mock.save();
      return res.status(500).json({
        success: false,
        message: result.error || "Failed to generate questions. Try again.",
      });
    }

    mock.questions = result.questions;
    mock.totalQuestions = result.questions.length;
    mock.status = "live";
    mock.liveAt = new Date();
    mock.title = result.testName || mock.title;
    await mock.save();

    return res.json({
      success: true,
      message: "Prelims Mock is now live",
      data: {
        _id: mock._id,
        status: mock.status,
        liveAt: mock.liveAt,
        totalQuestions: mock.totalQuestions,
      },
    });
  } catch (error) {
    console.error("goLivePrelimsMock:", error);
    const mock = await PrelimsMock.findById(req.params.id).catch(() => null);
    if (mock && mock.status === "generating") {
      mock.status = "scheduled";
      await mock.save();
    }
    res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
};

/**
 * Process scheduled mocks (call from cron): find scheduledAt <= now, generate and go live
 */
export const processScheduledPrelimsMocks = async () => {
  const now = new Date();
  const due = await PrelimsMock.find({
    status: "scheduled",
    scheduledAt: { $lte: now },
  });
  for (const mock of due) {
    try {
      mock.status = "generating";
      await mock.save();
      const result = mock.isCsat
        ? await generateFullMockCsatTestQuestions()
        : mock.isPyo
          ? await generateFullMockPyoTestQuestions({ yearFrom: mock.yearFrom, yearTo: mock.yearTo })
          : mock.isMix
            ? await generateFullMockMixTestQuestions()
            : await generateFullMockTestQuestions({ subject: mock.subject });
      if (result.success && result.questions && result.questions.length > 0) {
        mock.questions = result.questions;
        mock.totalQuestions = result.questions.length;
        mock.status = "live";
        mock.liveAt = new Date();
        mock.title = result.testName || mock.title;
        await mock.save();
        console.log(`✅ Prelims Mock ${mock._id} went live at scheduled time`);
      } else {
        mock.status = "scheduled";
        await mock.save();
        console.error(`❌ Prelims Mock ${mock._id} generation failed:`, result.error);
      }
    } catch (err) {
      console.error("processScheduledPrelimsMocks error for", mock._id, err);
      mock.status = "scheduled";
      await mock.save().catch(() => {});
    }
  }
};

/**
 * Student: List live Prelims Mocks (and whether current user has attempted)
 * GET /api/prelims-mock
 */
export const listLivePrelimsMocks = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const mocks = await PrelimsMock.find({ status: "live" })
      .select("subject title totalQuestions durationMinutes totalMarks negativeMark liveAt")
      .sort({ liveAt: -1 })
      .lean();

    const attemptsByMock = await Test.find({
      userId,
      prelimsMockId: { $in: mocks.map((m) => m._id) },
    })
      .select("prelimsMockId _id isSubmitted score")
      .lean();
    const mockToAttempt = {};
    attemptsByMock.forEach((t) => {
      const mid = t.prelimsMockId?.toString();
      if (mid) mockToAttempt[mid] = { testId: t._id, isSubmitted: t.isSubmitted, score: t.score };
    });

    const data = mocks.map((m) => ({
      _id: m._id,
      subject: m.subject,
      title: m.title,
      totalQuestions: m.totalQuestions,
      durationMinutes: m.durationMinutes,
      totalMarks: m.totalMarks,
      negativeMark: m.negativeMark,
      liveAt: m.liveAt,
      attempted: !!mockToAttempt[m._id.toString()],
      attempt: mockToAttempt[m._id.toString()] || null,
    }));

    return res.json({ success: true, data });
  } catch (error) {
    console.error("listLivePrelimsMocks:", error);
    res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
};

/**
 * Student: Start a Prelims Mock attempt — creates a Test copy for the user and returns testId
 * POST /api/prelims-mock/:id/start
 */
export const startPrelimsMockAttempt = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }
    const { id: mockId } = req.params;

    const mock = await PrelimsMock.findById(mockId);
    if (!mock) {
      return res.status(404).json({ success: false, message: "Prelims Mock not found" });
    }
    if (mock.status !== "live") {
      return res.status(400).json({ success: false, message: "This mock is not live" });
    }
    if (!mock.questions || mock.questions.length === 0) {
      return res.status(400).json({ success: false, message: "Mock has no questions" });
    }

    const existing = await Test.findOne({ userId, prelimsMockId: mockId });
    if (existing) {
      return res.json({
        success: true,
        message: "Existing attempt found",
        data: { testId: existing._id, alreadyStarted: true },
      });
    }

    const test = new Test({
      userId,
      subject: mock.subject,
      examType: "GS",
      topic: mock.title || "Prelims Mock",
      difficulty: "Moderate",
      prelimsMockId: mock._id,
      questions: mock.questions.map((q) => ({
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        userAnswer: null,
        timeSpent: 0,
      })),
      totalQuestions: mock.questions.length,
    });
    await test.save();

    return res.status(201).json({
      success: true,
      message: "Attempt started",
      data: { testId: test._id, alreadyStarted: false },
    });
  } catch (error) {
    console.error("startPrelimsMockAttempt:", error);
    res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
};
