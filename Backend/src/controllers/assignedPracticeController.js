import AssignedPracticeTest from "../models/AssignedPracticeTest.js";
import Test from "../models/Test.js";
import { User } from "../models/User.js";
import { generateAssignedPracticeQuestions, buildQuestionFingerprints, enrichAssignedPracticeWithHindi } from "../services/testGenerationService.js";
import { pickBilingualQuestionFields } from "../services/questionTranslationService.js";

const GS_SUBJECTS = [
  "Polity",
  "History",
  "Geography",
  "Economy",
  "Environment",
  "Science & Tech",
  "Art & Culture",
  "Current Affairs",
];

const ASSIGNED_QUESTION_COUNT = 50;

const VALID_PATTERN_IDS = [
  "statement_based",
  "statement_not_correct",
  "pair_matching",
  "assertion_reason",
  "direct_conceptual",
  "chronology",
  "sequence_arrangement",
  "map_location",
  "odd_one_out",
  "multi_statement_elimination",
];

/** Prior question fingerprints for same subject+topic — blocks exact and paraphrased repeats. */
async function getPriorTopicQuestionFingerprints(subject, topic) {
  const priorTests = await AssignedPracticeTest.find({
    subject,
    topic: { $regex: new RegExp(`^${String(topic).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    status: "ready",
  })
    .select("questions")
    .lean();

  const allQuestions = priorTests.flatMap((doc) => doc.questions || []);
  return buildQuestionFingerprints(allQuestions);
}

function normalizePatternsToInclude(raw) {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map((id) => String(id).trim()).filter((id) => VALID_PATTERN_IDS.includes(id)))];
}

function difficultyToGeneration(difficulty) {
  const d = String(difficulty || "moderate").toLowerCase();
  if (d === "easy") return "Easy";
  if (d === "hard") return "Hard";
  return "Moderate";
}

function difficultyToTestModel(difficulty) {
  return difficultyToGeneration(difficulty);
}

async function validateStudentIds(studentIds) {
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return { ok: false, message: "At least one student must be selected" };
  }
  const uniqueIds = [...new Set(studentIds.map((id) => String(id)))];
  const students = await User.find({
    _id: { $in: uniqueIds },
    role: "student",
  }).select("_id name email");
  if (students.length !== uniqueIds.length) {
    return { ok: false, message: "One or more selected users are invalid or not students" };
  }
  return { ok: true, students, uniqueIds };
}

/**
 * POST /api/admin/assigned-practice
 * Body: { subject, topic, difficulty?, title? } — generate 50Q only (no students yet)
 */
export const createAssignedPractice = async (req, res) => {
  let record = null;
  try {
    const adminId = req.user?._id ?? req.user?.id;
    const { subject, topic, difficulty, title, patternsToInclude } = req.body;

    const subjectStr = typeof subject === "string" ? subject.trim() : "";
    const topicStr = typeof topic === "string" ? topic.trim() : "";

    if (!subjectStr || !GS_SUBJECTS.includes(subjectStr)) {
      return res.status(400).json({
        success: false,
        message: `Invalid subject. Allowed: ${GS_SUBJECTS.join(", ")}`,
      });
    }

    if (!topicStr || topicStr.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Topic is required (minimum 2 characters)",
      });
    }

    const diff = ["easy", "moderate", "hard"].includes(String(difficulty || "").toLowerCase())
      ? String(difficulty).toLowerCase()
      : "moderate";

    const titleStr =
      typeof title === "string" && title.trim()
        ? title.trim()
        : `${subjectStr} — ${topicStr}`;

    record = new AssignedPracticeTest({
      subject: subjectStr,
      topic: topicStr,
      title: titleStr,
      difficulty: diff,
      totalQuestions: ASSIGNED_QUESTION_COUNT,
      durationMinutes: 60,
      totalMarks: 100,
      negativeMark: 0.66,
      assignedStudentIds: [],
      status: "generating",
      createdBy: adminId,
    });
    await record.save();

    console.log(
      `📝 Generating topic practice (${ASSIGNED_QUESTION_COUNT}Q) for ${subjectStr} — ${topicStr}...`
    );

    const priorFingerprints = await getPriorTopicQuestionFingerprints(subjectStr, topicStr);
    const patterns = normalizePatternsToInclude(patternsToInclude);

    const generationResult = await generateAssignedPracticeQuestions({
      subject: subjectStr,
      topic: topicStr,
      difficulty: difficultyToGeneration(diff),
      questionCount: ASSIGNED_QUESTION_COUNT,
      priorFingerprints,
      patternsToInclude: patterns,
    });

    if (!generationResult.success || !generationResult.questions?.length) {
      record.status = "failed";
      record.errorMessage = generationResult.error || "Failed to generate questions";
      await record.save();
      return res.status(500).json({
        success: false,
        message: record.errorMessage,
      });
    }

    record.questions = generationResult.questions.map((q) =>
      pickBilingualQuestionFields({ ...q })
    );
    record.totalQuestions = record.questions.length;
    record.status = "ready";
    record.errorMessage = "";
    await record.save();

    return res.status(201).json({
      success: true,
      message: `Test generated with ${record.totalQuestions} questions. Now assign it to students.`,
      data: {
        _id: record._id,
        subject: record.subject,
        topic: record.topic,
        title: record.title,
        difficulty: record.difficulty,
        totalQuestions: record.totalQuestions,
        status: record.status,
        assignedStudents: [],
        isAssigned: false,
        createdAt: record.createdAt,
      },
    });
  } catch (error) {
    console.error("createAssignedPractice:", error);
    if (record) {
      record.status = "failed";
      record.errorMessage = error.message || "Internal server error";
      await record.save().catch(() => {});
    }
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

/**
 * POST /api/admin/assigned-practice/:id/assign
 * Body: { studentIds: string[] }
 */
export const assignStudentsToPractice = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentIds } = req.body;

    const record = await AssignedPracticeTest.findById(id);
    if (!record) {
      return res.status(404).json({ success: false, message: "Practice test not found" });
    }

    if (record.status !== "ready") {
      return res.status(400).json({
        success: false,
        message: record.status === "generating"
          ? "Test is still generating. Please wait."
          : "Cannot assign a failed test. Generate a new one.",
      });
    }

    const validation = await validateStudentIds(studentIds);
    if (!validation.ok) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    const startedTests = await Test.find({ assignedPracticeTestId: id }).select("userId").lean();
    const startedUserIds = new Set(
      startedTests.map((t) => String(t.userId)).filter(Boolean)
    );
    const newIdSet = new Set(validation.uniqueIds);

    for (const startedId of startedUserIds) {
      if (!newIdSet.has(startedId)) {
        return res.status(400).json({
          success: false,
          message:
            "Cannot remove students who have already started this test. You can add more students or keep existing ones.",
        });
      }
    }

    const wasAssigned = (record.assignedStudentIds || []).length > 0;
    record.assignedStudentIds = validation.students.map((s) => s._id);
    await record.save();

    const studentList = validation.students.map((s) => ({
      _id: s._id,
      name: s.name,
      email: s.email,
    }));

    const addedCount = studentList.length - (wasAssigned ? startedUserIds.size : 0);

    return res.json({
      success: true,
      message: wasAssigned
        ? `Assignment updated — ${studentList.length} student(s) now assigned.${addedCount > 0 ? ` Added ${addedCount} new.` : ""}`
        : `Test assigned to ${studentList.length} student(s). They will see it under Practice Test.`,
      data: {
        _id: record._id,
        subject: record.subject,
        topic: record.topic,
        title: record.title,
        totalQuestions: record.totalQuestions,
        assignedStudents: studentList,
        isAssigned: true,
      },
    });
  } catch (error) {
    console.error("assignStudentsToPractice:", error);
    res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
};

/**
 * GET /api/admin/assigned-practice
 */
export const listAdminAssignedPractice = async (req, res) => {
  try {
    const records = await AssignedPracticeTest.find()
      .sort({ createdAt: -1 })
      .lean();

    const allStudentIds = [
      ...new Set(records.flatMap((r) => (r.assignedStudentIds || []).map(String))),
    ];
    const users = allStudentIds.length
      ? await User.find({ _id: { $in: allStudentIds } }).select("_id name email").lean()
      : [];
    const userMap = Object.fromEntries(
      users.map((u) => [u._id.toString(), { name: u.name, email: u.email }])
    );

    const recordIds = records.map((r) => r._id);
    const attempts = await Test.find({
      assignedPracticeTestId: { $in: recordIds },
    })
      .select("assignedPracticeTestId userId isSubmitted")
      .lean();

    const attemptCountByRecord = {};
    const startedByRecord = {};
    attempts.forEach((t) => {
      const rid = t.assignedPracticeTestId?.toString();
      const uid = t.userId?.toString();
      if (rid) attemptCountByRecord[rid] = (attemptCountByRecord[rid] || 0) + 1;
      if (rid && uid) {
        if (!startedByRecord[rid]) startedByRecord[rid] = [];
        if (!startedByRecord[rid].includes(uid)) startedByRecord[rid].push(uid);
      }
    });

    const data = records.map((r) => {
      const rid = r._id.toString();
      const assignedStudents = (r.assignedStudentIds || []).map((sid) => {
        const sidStr = sid.toString();
        const u = userMap[sidStr];
        return { _id: sid, name: u?.name || "—", email: u?.email || "" };
      });
      return {
        _id: r._id,
        subject: r.subject,
        topic: r.topic,
        title: r.title,
        difficulty: r.difficulty,
        totalQuestions: r.totalQuestions,
        status: r.status,
        errorMessage: r.errorMessage || "",
        createdAt: r.createdAt,
        attemptCount: attemptCountByRecord[rid] || 0,
        startedStudentIds: startedByRecord[rid] || [],
        assignedStudents,
        isAssigned: assignedStudents.length > 0,
      };
    });

    return res.json({ success: true, data });
  } catch (error) {
    console.error("listAdminAssignedPractice:", error);
    res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
};

/**
 * DELETE /api/admin/assigned-practice/:id
 */
export const deleteAssignedPractice = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await AssignedPracticeTest.findById(id);
    if (!record) {
      return res.status(404).json({ success: false, message: "Assigned practice test not found" });
    }

    const attemptCount = await Test.countDocuments({ assignedPracticeTestId: id });
    if (attemptCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete: students have already started or completed this test",
      });
    }

    await AssignedPracticeTest.findByIdAndDelete(id);
    return res.json({ success: true, message: "Assigned practice test deleted" });
  } catch (error) {
    console.error("deleteAssignedPractice:", error);
    res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
};

/**
 * GET /api/tests/assigned-practice
 */
export const listStudentAssignedPractice = async (req, res) => {
  try {
    const userId = req.user?._id ?? req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const records = await AssignedPracticeTest.find({
      assignedStudentIds: userId,
      status: "ready",
    })
      .select("subject topic title totalQuestions durationMinutes totalMarks difficulty createdAt")
      .sort({ createdAt: -1 })
      .lean();

    const recordIds = records.map((r) => r._id);
    const attempts = await Test.find({
      userId,
      assignedPracticeTestId: { $in: recordIds },
    })
      .select("assignedPracticeTestId _id isSubmitted score")
      .lean();

    const attemptByRecord = {};
    attempts.forEach((t) => {
      const rid = t.assignedPracticeTestId?.toString();
      if (rid) {
        attemptByRecord[rid] = { testId: t._id, isSubmitted: t.isSubmitted, score: t.score };
      }
    });

    const data = records.map((r) => ({
      _id: r._id,
      subject: r.subject,
      topic: r.topic,
      title: r.title,
      totalQuestions: r.totalQuestions,
      durationMinutes: r.durationMinutes,
      totalMarks: r.totalMarks,
      difficulty: r.difficulty,
      createdAt: r.createdAt,
      attempted: !!attemptByRecord[r._id.toString()],
      attempt: attemptByRecord[r._id.toString()] || null,
    }));

    return res.json({ success: true, data });
  } catch (error) {
    console.error("listStudentAssignedPractice:", error);
    res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
};

/**
 * GET /api/tests/assigned-practice/history
 */
export const listAssignedPracticeHistory = async (req, res) => {
  try {
    const userId = req.user?._id ?? req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const skip = (page - 1) * limit;

    const filter = {
      userId,
      assignedPracticeTestId: { $exists: true, $ne: null },
    };

    const [tests, total] = await Promise.all([
      Test.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("subject topic difficulty totalQuestions score accuracy isSubmitted createdAt assignedPracticeTestId")
        .lean(),
      Test.countDocuments(filter),
    ]);

    const practiceIds = [...new Set(tests.map((t) => String(t.assignedPracticeTestId)).filter(Boolean))];
    const practices = practiceIds.length
      ? await AssignedPracticeTest.find({ _id: { $in: practiceIds } }).select("title subject topic").lean()
      : [];
    const practiceMap = Object.fromEntries(practices.map((p) => [String(p._id), p]));

    const data = tests.map((t) => {
      const pid = String(t.assignedPracticeTestId);
      const practice = practiceMap[pid];
      return {
        _id: t._id,
        assignedPracticeTestId: t.assignedPracticeTestId,
        title: practice?.title || `${t.subject} — ${t.topic}`,
        subject: t.subject,
        topic: t.topic,
        difficulty: t.difficulty,
        totalQuestions: t.totalQuestions,
        score: t.score,
        accuracy: t.accuracy,
        isSubmitted: t.isSubmitted,
        createdAt: t.createdAt,
      };
    });

    return res.json({
      success: true,
      data: {
        tests: data,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    console.error("listAssignedPracticeHistory:", error);
    res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
};

/**
 * POST /api/tests/assigned-practice/:id/start
 */
export const startAssignedPracticeAttempt = async (req, res) => {
  try {
    const userId = req.user?._id ?? req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const { id } = req.params;
    const record = await AssignedPracticeTest.findById(id);
    if (!record) {
      return res.status(404).json({ success: false, message: "Assigned practice test not found" });
    }

    if (record.status !== "ready") {
      return res.status(400).json({
        success: false,
        message: "This assigned test is not ready yet",
      });
    }

    const isAssigned = record.assignedStudentIds.some(
      (sid) => sid.toString() === userId.toString()
    );
    if (!isAssigned) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned to this practice test",
      });
    }

    if (!record.questions?.length) {
      return res.status(400).json({
        success: false,
        message: "This test has no questions. Contact admin.",
      });
    }

    let practiceQuestions = record.questions.map((q) =>
      pickBilingualQuestionFields(typeof q.toObject === "function" ? q.toObject() : { ...q })
    );
    practiceQuestions = await enrichAssignedPracticeWithHindi(practiceQuestions);
    const hindiChanged = practiceQuestions.some((q, i) => {
      const orig = record.questions[i];
      const origHi = String(orig?.question_hi || "").trim();
      const newHi = String(q.question_hi || "").trim();
      return newHi && newHi !== origHi;
    });
    if (hindiChanged) {
      record.questions = practiceQuestions.map((q) => pickBilingualQuestionFields(q));
      await record.save();
    }

    const existing = await Test.findOne({ userId, assignedPracticeTestId: id });
    if (existing) {
      return res.json({
        success: true,
        message: "Existing attempt found",
        data: { testId: existing._id, alreadyStarted: true },
      });
    }

    const test = new Test({
      userId,
      subject: record.subject,
      examType: "GS",
      topic: record.topic,
      difficulty: difficultyToTestModel(record.difficulty),
      assignedPracticeTestId: record._id,
      durationMinutes: record.durationMinutes,
      questions: practiceQuestions.map((q) => {
        const plain = { ...q };
        return pickBilingualQuestionFields({
          ...plain,
          userAnswer: null,
          timeSpent: 0,
        });
      }),
      totalQuestions: record.questions.length,
    });
    await test.save();

    return res.status(201).json({
      success: true,
      message: "Attempt started",
      data: { testId: test._id, alreadyStarted: false },
    });
  } catch (error) {
    console.error("startAssignedPracticeAttempt:", error);
    res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
};
