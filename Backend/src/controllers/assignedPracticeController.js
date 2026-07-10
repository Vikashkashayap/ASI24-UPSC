import AssignedPracticeTest from "../models/AssignedPracticeTest.js";
import Test from "../models/Test.js";
import { User } from "../models/User.js";
import { buildQuestionFingerprints } from "../services/testGenerationService.js";
import { notesService } from "../services/notes/notes.service.js";
import { pickBilingualQuestionFields } from "../services/questionTranslationService.js";
import { patternLabelForQuestionType } from "../config/questionPatterns.js";
import { runAssignedPracticeGeneration } from "../services/ai/batchGenerator.service.js";
import { generateQuestionsFromContextBatch } from "../services/ai/questionGenerator.service.js";

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

function normalizeNotesTopicIds(body = {}) {
  if (Array.isArray(body.notesTopicIds) && body.notesTopicIds.length > 0) {
    return [...new Set(body.notesTopicIds.map((id) => String(id).trim()).filter(Boolean))];
  }
  const single = body.notesTopicId ? String(body.notesTopicId).trim() : "";
  return single ? [single] : [];
}

function buildMultiTopicLabel(topicMetas = []) {
  const names = topicMetas.map((m) => m.topic.name);
  if (names.length <= 3) return names.join(" · ");
  return `${names.slice(0, 2).join(" · ")} · +${names.length - 2} more`;
}

function formatQuestionsForPreview(questions = []) {
  return (questions || []).map((q, i) => ({
    index: i + 1,
    question: q.question || q.question_en || "",
    options: q.options || q.options_en || {},
    correctAnswer: q.correctAnswer,
    questionType: q.questionType || "",
    patternLabel: patternLabelForQuestionType(q.questionType),
    explanation:
      typeof q.explanation === "string"
        ? q.explanation
        : q.explanation_en || q.explanation?.[q.correctAnswer] || "",
    sourceNote: q.conceptualSource || "",
  }));
}

/**
 * POST /api/admin/assigned-practice
 * Body: { subject, topic, difficulty?, title? } — generate 50Q only (no students yet)
 */
export const createAssignedPractice = async (req, res) => {
  let record = null;
  try {
    const adminId = req.user?._id ?? req.user?.id;
    const { subject, topic, difficulty, title, patternsToInclude, notesTopicId, notesTopicIds, chapter } = req.body;

    const subjectStr = typeof subject === "string" ? subject.trim() : "";
    const topicStr = typeof topic === "string" ? topic.trim() : "";
    const chapterStr = typeof chapter === "string" ? chapter.trim() : "";
    const topicIdList = normalizeNotesTopicIds({ notesTopicId, notesTopicIds });

    if (!subjectStr) {
      return res.status(400).json({
        success: false,
        message: "Subject is required",
      });
    }

    if (!topicIdList.length) {
      return res.status(400).json({
        success: false,
        message: "Select at least one topic from Notes (chapter → topic). Questions are generated only from synced notes content.",
      });
    }

    let topicMetas;
    try {
      topicMetas = await notesService.assertTopicsHaveContent(topicIdList);
    } catch (err) {
      return res.status(err.statusCode || 400).json({
        success: false,
        message: err.message || "Selected notes topics are invalid",
      });
    }

    const resolvedTopic = topicStr || buildMultiTopicLabel(topicMetas);
    const resolvedChapter = chapterStr || topicMetas[0]?.chapter?.title || "";
    const resolvedSubject = topicMetas[0]?.topic.subject || subjectStr;
    const primaryTopicId = topicIdList[0];

    if (subjectStr !== resolvedSubject) {
      console.warn(
        `Subject mismatch: client sent "${subjectStr}", notes topic has "${resolvedSubject}" — using notes subject`
      );
    }
    if (!resolvedTopic || resolvedTopic.length < 2) {
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
        : `${resolvedSubject} — ${resolvedChapter ? `${resolvedChapter}: ` : ""}${resolvedTopic}`;

    record = new AssignedPracticeTest({
      subject: resolvedSubject,
      topic: resolvedTopic,
      chapter: resolvedChapter,
      notesTopicId: primaryTopicId,
      notesTopicIds: topicIdList,
      notesSourceUrl: topicMetas[0]?.topic.sourceUrl || "",
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

    console.log(`📝 Starting notes-only generation (${ASSIGNED_QUESTION_COUNT}Q) for ${resolvedSubject} — ${resolvedTopic}`);
    await getPriorTopicQuestionFingerprints(resolvedSubject, resolvedTopic);
    const patterns = normalizePatternsToInclude(patternsToInclude);

    record.generationProgress = {
      totalBatches: 5,
      completedBatches: 0,
      currentBatch: 0,
      generatedQuestions: 0,
      failedBatches: 0,
      isComplete: false,
      currentStep: "pending",
      readingNotes: false,
      cleaningHtml: false,
      batchSteps: {},
      approved: false,
    };
    await record.save();

    setImmediate(async () => {
      try {
        await runAssignedPracticeGeneration({
          assignedPracticeId: record._id,
          topicIds: topicIdList,
          topicName: resolvedTopic,
          subject: resolvedSubject,
          chapter: resolvedChapter,
          difficulty: diff,
          patternsToInclude: patterns,
        });
      } catch (bgErr) {
        console.error("runAssignedPracticeGeneration:", bgErr);
        await AssignedPracticeTest.findByIdAndUpdate(record._id, {
          $set: { status: "failed", errorMessage: bgErr.message || "Generation failed in background." },
        }).catch(() => {});
      }
    });

    return res.status(202).json({
      success: true,
      message: "Generation started. Progress will update batch-by-batch.",
      data: {
        _id: record._id,
        subject: record.subject,
        topic: record.topic,
        chapter: record.chapter,
        notesTopicId: record.notesTopicId,
        notesTopicIds: record.notesTopicIds || topicIdList,
        notesSourceUrl: record.notesSourceUrl,
        title: record.title,
        difficulty: record.difficulty,
        totalQuestions: 0,
        status: record.status,
        generationProgress: record.generationProgress,
        assignedStudents: [],
        isAssigned: false,
        createdAt: record.createdAt,
        questions: [],
        generatedFromNotes: true,
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
 * GET /api/admin/assigned-practice/:id — preview generated questions
 */
export const getAssignedPracticeById = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await AssignedPracticeTest.findById(id).lean();
    if (!record) {
      return res.status(404).json({ success: false, message: "Practice test not found" });
    }
    res.json({
      success: true,
      data: {
        _id: record._id,
        subject: record.subject,
        topic: record.topic,
        chapter: record.chapter,
        title: record.title,
        difficulty: record.difficulty,
        totalQuestions: record.totalQuestions,
        status: record.status,
        generationProgress: record.generationProgress || null,
        generationStats: record.generationStats || null,
        notesSourceUrl: record.notesSourceUrl,
        questions: formatQuestionsForPreview(record.questions || []),
        partialQuestions:
          record.status === "generating"
            ? formatQuestionsForPreview(record.questions || [])
            : [],
        generatedFromNotes: Boolean(record.notesTopicId),
        errorMessage: record.errorMessage || "",
      },
    });
  } catch (error) {
    console.error("getAssignedPracticeById:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to load test" });
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
        generationProgress: r.generationProgress || null,
        generationStats: r.generationStats || null,
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
 * PATCH /api/admin/assigned-practice/:id/questions/:index
 * Update a single question (admin edit).
 */
export const updatePracticeQuestion = async (req, res) => {
  try {
    const { id, index } = req.params;
    const idx = parseInt(index, 10);
    if (Number.isNaN(idx) || idx < 0) {
      return res.status(400).json({ success: false, message: "Invalid question index" });
    }

    const record = await AssignedPracticeTest.findById(id);
    if (!record) {
      return res.status(404).json({ success: false, message: "Practice test not found" });
    }
    if (!record.questions?.[idx]) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    const { question, options, correctAnswer, explanation, difficulty, questionType } = req.body;
    const q = record.questions[idx];
    if (typeof question === "string" && question.trim()) {
      q.question = question.trim();
      q.question_en = question.trim();
    }
    if (options && typeof options === "object") {
      ["A", "B", "C", "D"].forEach((k) => {
        if (typeof options[k] === "string") {
          q.options[k] = options[k].trim();
          if (q.options_en) q.options_en[k] = options[k].trim();
        }
      });
    }
    if (["A", "B", "C", "D"].includes(String(correctAnswer || "").toUpperCase())) {
      q.correctAnswer = String(correctAnswer).toUpperCase();
      q.answer = q.correctAnswer;
    }
    if (typeof explanation === "string") {
      q.explanation = explanation.trim();
      q.explanation_en = explanation.trim();
    }
    if (["easy", "moderate", "hard"].includes(String(difficulty || "").toLowerCase())) {
      q.difficulty = String(difficulty).toLowerCase();
    }
    if (typeof questionType === "string" && questionType.trim()) {
      q.questionType = questionType.trim();
    }

    record.totalQuestions = record.questions.length;
    await record.save();

    return res.json({
      success: true,
      message: "Question updated",
      data: formatQuestionsForPreview(record.questions),
    });
  } catch (error) {
    console.error("updatePracticeQuestion:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to update question" });
  }
};

/**
 * DELETE /api/admin/assigned-practice/:id/questions/:index
 */
export const deletePracticeQuestion = async (req, res) => {
  try {
    const { id, index } = req.params;
    const idx = parseInt(index, 10);
    if (Number.isNaN(idx) || idx < 0) {
      return res.status(400).json({ success: false, message: "Invalid question index" });
    }

    const record = await AssignedPracticeTest.findById(id);
    if (!record) {
      return res.status(404).json({ success: false, message: "Practice test not found" });
    }
    if (!record.questions?.[idx]) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    record.questions.splice(idx, 1);
    record.totalQuestions = record.questions.length;
    if (record.generationProgress) {
      record.generationProgress.generatedQuestions = record.questions.length;
    }
    await record.save();

    return res.json({
      success: true,
      message: "Question deleted",
      data: formatQuestionsForPreview(record.questions),
    });
  } catch (error) {
    console.error("deletePracticeQuestion:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to delete question" });
  }
};

/**
 * POST /api/admin/assigned-practice/:id/questions/:index/regenerate
 * Regenerate a single question from notes content.
 */
export const regeneratePracticeQuestion = async (req, res) => {
  try {
    const { id, index } = req.params;
    const idx = parseInt(index, 10);
    if (Number.isNaN(idx) || idx < 0) {
      return res.status(400).json({ success: false, message: "Invalid question index" });
    }

    const record = await AssignedPracticeTest.findById(id);
    if (!record) {
      return res.status(404).json({ success: false, message: "Practice test not found" });
    }
    if (!record.questions?.[idx]) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    const topicId =
      record.notesTopicIds?.[idx % (record.notesTopicIds?.length || 1)] ||
      record.notesTopicId;
    if (!topicId) {
      return res.status(400).json({ success: false, message: "No notes topic linked to this test" });
    }

    const topicNotes = await notesService.fetchAndCleanTopicNotes(String(topicId));
    const batchResult = await generateQuestionsFromContextBatch({
      contextText: topicNotes.cleanText,
      topic: topicNotes.topic.name || record.topic,
      difficulty: record.difficulty,
      batchSize: 1,
      patternsToInclude: [],
      batchIndex: idx,
      subject: record.subject,
      chapter: record.chapter,
    });

    if (!batchResult.success || !batchResult.questions?.length) {
      return res.status(502).json({
        success: false,
        message: batchResult.error || "Failed to regenerate question from notes",
      });
    }

    const newQ = pickBilingualQuestionFields({
      ...batchResult.questions[0],
      topic: topicNotes.topic.name || record.topic,
      conceptualSource:
        batchResult.questions[0].conceptualSource ||
        batchResult.questions[0].sourceParagraph ||
        topicNotes.topic.name,
    });

    record.questions[idx] = newQ;
    await record.save();

    return res.json({
      success: true,
      message: "Question regenerated from notes",
      data: formatQuestionsForPreview(record.questions),
    });
  } catch (error) {
    console.error("regeneratePracticeQuestion:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to regenerate question" });
  }
};

/**
 * PATCH /api/admin/assigned-practice/:id/questions
 * Save all questions (bulk admin edit).
 */
export const savePracticeQuestions = async (req, res) => {
  try {
    const { id } = req.params;
    const { questions } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, message: "questions array is required" });
    }

    const record = await AssignedPracticeTest.findById(id);
    if (!record) {
      return res.status(404).json({ success: false, message: "Practice test not found" });
    }

    record.questions = questions.map((q) =>
      pickBilingualQuestionFields({
        question: q.question || q.question_en || "",
        question_en: q.question || q.question_en || "",
        options: q.options || q.options_en || {},
        options_en: q.options || q.options_en || {},
        correctAnswer: q.correctAnswer,
        answer: q.correctAnswer,
        explanation: q.explanation || q.explanation_en || "",
        explanation_en: q.explanation || q.explanation_en || "",
        questionType: q.questionType || "",
        difficulty: q.difficulty || record.difficulty,
        conceptualSource: q.sourceNote || q.conceptualSource || "",
      })
    );
    record.totalQuestions = record.questions.length;
    if (record.generationProgress) {
      record.generationProgress.generatedQuestions = record.questions.length;
    }
    await record.save();

    return res.json({
      success: true,
      message: "Questions saved",
      data: formatQuestionsForPreview(record.questions),
    });
  } catch (error) {
    console.error("savePracticeQuestions:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to save questions" });
  }
};

/**
 * POST /api/admin/assigned-practice/:id/approve
 * Approve generated questions and mark test ready for assignment.
 */
export const approvePracticeTest = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await AssignedPracticeTest.findById(id);
    if (!record) {
      return res.status(404).json({ success: false, message: "Practice test not found" });
    }
    if (!record.questions?.length) {
      return res.status(400).json({ success: false, message: "No questions to approve" });
    }

    record.status = "ready";
    record.errorMessage = "";
    if (record.generationProgress) {
      record.generationProgress.approved = true;
      record.generationProgress.isComplete = true;
      record.generationProgress.currentStep = "completed";
    }
    record.totalQuestions = record.questions.length;
    await record.save();

    return res.json({
      success: true,
      message: `Approved ${record.questions.length} question(s) for assignment`,
      data: {
        _id: record._id,
        status: record.status,
        totalQuestions: record.totalQuestions,
        questions: formatQuestionsForPreview(record.questions),
      },
    });
  } catch (error) {
    console.error("approvePracticeTest:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to approve test" });
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
      await Test.deleteMany({ assignedPracticeTestId: id });
    }

    await AssignedPracticeTest.findByIdAndDelete(id);
    return res.json({
      success: true,
      message:
        attemptCount > 0
          ? `Practice test and ${attemptCount} student attempt(s) deleted`
          : "Assigned practice test deleted",
    });
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

    const existing = await Test.findOne({ userId, assignedPracticeTestId: id });
    if (existing) {
      return res.json({
        success: true,
        message: "Existing attempt found",
        data: { testId: existing._id, alreadyStarted: true },
      });
    }

    // Copy stored bilingual fields only — no runtime translation (zero AI cost).
    const test = new Test({
      userId,
      subject: record.subject,
      examType: "GS",
      topic: record.topic,
      difficulty: difficultyToTestModel(record.difficulty),
      assignedPracticeTestId: record._id,
      durationMinutes: record.durationMinutes,
      questions: record.questions.map((q) => {
        const plain = typeof q.toObject === "function" ? q.toObject() : { ...q };
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
