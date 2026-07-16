import AssignedPracticeTest from "../models/AssignedPracticeTest.js";
import Test from "../models/Test.js";
import { User } from "../models/User.js";
import { buildQuestionFingerprints } from "../services/testGenerationService.js";
import { notesService } from "../services/notes/notes.service.js";
import { pickBilingualQuestionFields, ensureFullQuestionStem } from "../services/questionTranslationService.js";
import { patternLabelForQuestionType } from "../config/questionPatterns.js";
import { runAssignedPracticeGeneration } from "../services/ai/batchGenerator.service.js";
import { generateQuestionsFromContextBatch } from "../services/ai/questionGenerator.service.js";
import {
  getPracticeBatchSize,
  getPracticeTranslationModel,
  isPracticeBatchHindiEnabled,
} from "../config/openRouterConfig.js";
import { runInMigrationBatchContext } from "../middleware/examAiGuard.js";
import { batchTranslatePracticeQuestionsToHindi } from "../services/testGenerationService.js";
import SourceUrl from "../models/SourceUrl.js";
import ContentChunk from "../models/ContentChunk.js";
import { retrieverService } from "../services/ai/retriever.service.js";

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

const ASSIGNED_QUESTION_COUNT_DEFAULT = 50;
const ALLOWED_QUESTION_COUNTS = new Set([50, 100]);

function normalizeAssignedQuestionCount(value) {
  const n = parseInt(value, 10);
  if (ALLOWED_QUESTION_COUNTS.has(n)) return n;
  return ASSIGNED_QUESTION_COUNT_DEFAULT;
}

/** Deduplicate + keep only complete stems, capped at target (default 50). */
function selectFinalPracticeQuestions(questions = [], target = ASSIGNED_QUESTION_COUNT_DEFAULT) {
  const cap = normalizeAssignedQuestionCount(target);
  const seen = new Set();
  const out = [];
  const rejected = [];

  for (const raw of questions || []) {
    const plain = typeof raw.toObject === "function" ? raw.toObject() : { ...raw };
    const fixed = ensureFullQuestionStem(plain);
    const text = String(fixed.question_en || fixed.question || "")
      .replace(/\\n/g, "\n")
      .trim();
    const opts = fixed.options_en || fixed.options || {};
    const filled = ["A", "B", "C", "D"].filter((k) => String(opts[k] || "").trim().length >= 1).length;
    const answer = String(fixed.correctAnswer || fixed.answer || "")
      .toUpperCase()
      .trim()
      .charAt(0);

    if (text.length < 40 || filled < 4 || !["A", "B", "C", "D"].includes(answer)) {
      rejected.push({ ...fixed, backupReason: "incomplete" });
      continue;
    }

    const key = text
      .toLowerCase()
      .replace(/[^a-z0-9\u0900-\u097f]+/g, " ")
      .trim()
      .slice(0, 140);
    if (!key || seen.has(key)) {
      rejected.push({ ...fixed, backupReason: "duplicate" });
      continue;
    }
    seen.add(key);
    out.push(pickBilingualQuestionFields({ ...fixed, correctAnswer: answer, answer }));
    if (out.length >= cap) break;
  }

  return { questions: out, rejected, target: cap };
}

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
    question_en: q.question_en || q.question || "",
    question_hi: q.question_hi || "",
    options: q.options || q.options_en || {},
    options_en: q.options_en || q.options || {},
    options_hi: q.options_hi || {},
    correctAnswer: q.correctAnswer,
    questionType: q.questionType || "",
    patternLabel: patternLabelForQuestionType(q.questionType),
    explanation:
      typeof q.explanation === "string"
        ? q.explanation
        : q.explanation_en || q.explanation?.[q.correctAnswer] || "",
    explanation_en: q.explanation_en || q.explanation,
    explanation_hi: q.explanation_hi || "",
    matchColumns: q.matchColumns || null,
    matchColumns_hi: q.matchColumns_hi || null,
    assertionReason: q.assertionReason || null,
    sourceNote: q.conceptualSource || "",
    backupReason: q.backupReason || "",
  }));
}

/**
 * POST /api/admin/assigned-practice
 * Body: { subject, topic, difficulty?, title?, questionCount?: 50|100 } — generate only (no students yet)
 */
export const createAssignedPractice = async (req, res) => {
  let record = null;
  try {
    const adminId = req.user?._id ?? req.user?.id;
    const {
      subject,
      topic,
      difficulty,
      title,
      reference,
      patternsToInclude,
      notesTopicId,
      notesTopicIds,
      chapter,
      chapterId,
      searchQuery,
      questionCount,
    } = req.body;

    const subjectStr = typeof subject === "string" ? subject.trim() : "";
    const topicStr = typeof topic === "string" ? topic.trim() : "";
    const chapterStr = typeof chapter === "string" ? chapter.trim() : "";
    const chapterIdStr = typeof chapterId === "string" ? chapterId.trim() : "";
    const keyword = typeof searchQuery === "string" ? searchQuery.trim() : "";
    const topicIdList = normalizeNotesTopicIds({ notesTopicId, notesTopicIds });
    const keywordMode = Boolean(keyword && subjectStr);
    const targetQuestions = normalizeAssignedQuestionCount(questionCount);
    const totalBatches = Math.ceil(targetQuestions / getPracticeBatchSize());

    if (!subjectStr) {
      return res.status(400).json({
        success: false,
        message: "Subject is required",
      });
    }

    if (!keywordMode && !topicIdList.length) {
      return res.status(400).json({
        success: false,
        message:
          "Topic keyword is required — RAG searches PDF + website knowledge for that subject.",
      });
    }

    if (keywordMode && keyword.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Topic keyword must be at least 2 characters",
      });
    }

    const titleTrimmed = typeof title === "string" ? title.trim() : "";
    if (!titleTrimmed) {
      return res.status(400).json({
        success: false,
        message: "Test name is required",
      });
    }

    let topicMetas = [];
    let resolvedTopic = topicStr;
    let resolvedChapter = chapterStr;
    let resolvedSubject = subjectStr;
    let primaryTopicId = topicIdList[0] || undefined;
    let notesSourceUrl = "";

    if (keywordMode) {
      const chunkCount = await ContentChunk.countDocuments({
        sourceUrlId: {
          $in: (await SourceUrl.find({ subject: subjectStr }).select("_id").lean()).map((c) => c._id),
        },
      });
      if (!chunkCount) {
        return res.status(400).json({
          success: false,
          message:
            "No knowledge chunks for this subject yet. Upload PDF(s) and/or sync website notes first.",
        });
      }

      const probe = await retrieverService.getContextForSubjectQuery({
        subject: subjectStr,
        query: keyword,
        batchIndex: 0,
      });
      if (!probe.contextText || probe.contextText.length < 80) {
        return res.status(400).json({
          success: false,
          message: `No matching content for "${keyword}" in PDF/notes knowledge. Try another keyword.`,
        });
      }

      resolvedTopic = topicStr || keyword;
      if (chapterIdStr) {
        const chapterDoc = await SourceUrl.findById(chapterIdStr).lean();
        resolvedChapter = chapterStr || chapterDoc?.title || "";
        notesSourceUrl = chapterDoc?.url || "";
      } else {
        resolvedChapter = chapterStr || "Subject knowledge";
      }
      primaryTopicId = undefined;
    } else {
      try {
        topicMetas = await notesService.assertTopicsHaveContent(topicIdList);
      } catch (err) {
        return res.status(err.statusCode || 400).json({
          success: false,
          message: err.message || "Selected notes topics are invalid",
        });
      }

      resolvedTopic = topicStr || buildMultiTopicLabel(topicMetas);
      resolvedChapter = chapterStr || topicMetas[0]?.chapter?.title || "";
      resolvedSubject = topicMetas[0]?.topic.subject || subjectStr;
      primaryTopicId = topicIdList[0];
      notesSourceUrl = topicMetas[0]?.topic.sourceUrl || "";

      if (subjectStr !== resolvedSubject) {
        console.warn(
          `Subject mismatch: client sent "${subjectStr}", notes topic has "${resolvedSubject}" — using notes subject`
        );
      }
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

    const titleStr = titleTrimmed;
    const referenceStr = typeof reference === "string" ? reference.trim() : "";

    record = new AssignedPracticeTest({
      subject: resolvedSubject,
      topic: resolvedTopic,
      chapter: keywordMode ? (resolvedChapter || "Subject knowledge") : resolvedChapter,
      notesTopicId: primaryTopicId,
      notesTopicIds: keywordMode ? [] : topicIdList,
      notesChapterId: keywordMode ? undefined : chapterIdStr || topicMetas[0]?.chapter?._id || undefined,
      searchQuery: keywordMode ? keyword : "",
      notesSourceUrl,
      title: titleStr,
      reference: referenceStr,
      difficulty: diff,
      totalQuestions: targetQuestions,
      durationMinutes: targetQuestions >= 100 ? 120 : 60,
      totalMarks: targetQuestions >= 100 ? 200 : 100,
      negativeMark: 0.66,
      assignedStudentIds: [],
      status: "generating",
      createdBy: adminId,
    });
    await record.save();

    console.log(
      `📝 Starting ${keywordMode ? "keyword-RAG" : "topic-RAG"} generation (${targetQuestions}Q) for ${resolvedSubject} — ${resolvedTopic}`
    );
    await getPriorTopicQuestionFingerprints(resolvedSubject, resolvedTopic);
    const patterns = normalizePatternsToInclude(patternsToInclude);

    record.generationProgress = {
      totalBatches,
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
          topicIds: keywordMode ? [] : topicIdList,
          topicName: resolvedTopic,
          subject: resolvedSubject,
          chapter: resolvedChapter,
          difficulty: diff,
          patternsToInclude: patterns,
          chapterId: chapterIdStr || null,
          searchQuery: keywordMode ? keyword : "",
          questionCount: targetQuestions,
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
      message: keywordMode
        ? `Generation started for keyword "${keyword}" (${targetQuestions}Q via RAG).`
        : `Generation started for ${targetQuestions} questions. Progress will update batch-by-batch.`,
      data: {
        _id: record._id,
        subject: record.subject,
        topic: record.topic,
        chapter: record.chapter,
        notesTopicId: record.notesTopicId,
        notesTopicIds: record.notesTopicIds || topicIdList,
        searchQuery: record.searchQuery,
        notesSourceUrl: record.notesSourceUrl,
        title: record.title,
        reference: record.reference || "",
        difficulty: record.difficulty,
        totalQuestions: targetQuestions,
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
        backupQuestions: formatQuestionsForPreview(record.backupQuestions || []),
        backupCount: Array.isArray(record.backupQuestions) ? record.backupQuestions.length : 0,
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
 * Compact list title — prefer admin-given name; fall back to chapter / keyword.
 */
function buildListDisplayTitle(record) {
  const customTitle = String(record.title || "").trim();
  if (customTitle) {
    return customTitle.length > 80 ? `${customTitle.slice(0, 77).trim()}…` : customTitle;
  }

  const subject = String(record.subject || "").trim();
  const chapter = String(record.chapter || "").trim();
  const searchQuery = String(record.searchQuery || "").trim();
  const topic = String(record.topic || "").trim();

  let focus = searchQuery || topic;
  const splitter = /\s*[·•|]\s*/;
  if (!searchQuery && splitter.test(topic)) {
    const parts = topic.split(splitter).map((p) => p.trim()).filter(Boolean);
    const moreMatch = parts[parts.length - 1]?.match(/^\+(\d+)\s+more$/i);
    const clean = moreMatch ? parts.slice(0, -1) : parts;
    const extra = moreMatch ? Number(moreMatch[1]) : Math.max(0, clean.length - 2);
    if (clean.length > 2 || moreMatch) {
      focus = `${clean.slice(0, 2).join(" · ")}${extra > 0 ? ` · +${extra} more` : ""}`;
    } else {
      focus = clean.join(" · ");
    }
  } else if (focus.length > 72) {
    focus = `${focus.slice(0, 69).trim()}…`;
  }

  if (chapter) return chapter;
  if (focus) return focus;
  return subject || "Practice test";
}

/**
 * GET /api/admin/assigned-practice
 * Query: page, limit, filter=all|assigned|unassigned
 */
export const listAdminAssignedPractice = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || "10"), 10) || 10));
    const filter = String(req.query.filter || "all").toLowerCase();

    const query = {};
    if (filter === "assigned") {
      query.assignedStudentIds = { $exists: true, $not: { $size: 0 } };
    } else if (filter === "unassigned") {
      query.$or = [
        { assignedStudentIds: { $exists: false } },
        { assignedStudentIds: { $size: 0 } },
        { assignedStudentIds: null },
      ];
      query.status = "ready";
    }

    const total = await AssignedPracticeTest.countDocuments(query);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const skip = (safePage - 1) * limit;

    // Never ship full question payloads on the list endpoint
    const records = await AssignedPracticeTest.find(query)
      .select(
        "subject topic chapter title reference difficulty totalQuestions status errorMessage createdAt assignedStudentIds searchQuery notesTopicIds generationProgress"
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
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
    const attempts = recordIds.length
      ? await Test.find({
          assignedPracticeTestId: { $in: recordIds },
        })
          .select("assignedPracticeTestId userId isSubmitted")
          .lean()
      : [];

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
        chapter: r.chapter || "",
        searchQuery: r.searchQuery || "",
        title: r.title,
        displayTitle: buildListDisplayTitle(r),
        reference: r.reference || "",
        difficulty: r.difficulty,
        totalQuestions: r.totalQuestions,
        status: r.status,
        generationProgress: r.generationProgress || null,
        errorMessage: r.errorMessage || "",
        createdAt: r.createdAt,
        attemptCount: attemptCountByRecord[rid] || 0,
        startedStudentIds: startedByRecord[rid] || [],
        assignedStudents,
        assignedCount: assignedStudents.length,
        topicCount: Array.isArray(r.notesTopicIds) ? r.notesTopicIds.length : 0,
        isAssigned: assignedStudents.length > 0,
      };
    });

    return res.json({
      success: true,
      data,
      pagination: {
        page: safePage,
        limit,
        total,
        totalPages,
        hasPrev: safePage > 1,
        hasNext: safePage < totalPages,
      },
    });
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

    const note = await notesService.getNoteByTopic(String(topicId));
    if (!note) {
      return res.status(404).json({ success: false, message: "Notes topic not found" });
    }

    const { retrieverService } = await import("../services/ai/retriever.service.js");
    const rag = await retrieverService.getContextForBatch({
      topicId: String(topicId),
      batchIndex: idx,
      topicName: note.topic.name || record.topic,
      subject: record.subject,
      allowLiveFallback: true,
    });

    if (!rag.contextText || rag.contextText.length < 80) {
      return res.status(400).json({
        success: false,
        message:
          "No retrieved chunks for this topic. Process the PDF or sync notes, then try again.",
      });
    }

    const batchResult = await generateQuestionsFromContextBatch({
      contextText: rag.contextText,
      topic: note.topic.name || record.topic,
      difficulty: record.difficulty,
      batchSize: 1,
      patternsToInclude: [],
      batchIndex: idx,
      subject: record.subject,
      chapter: record.chapter,
      ragOptimized: true,
    });

    if (!batchResult.success || !batchResult.questions?.length) {
      return res.status(502).json({
        success: false,
        message: batchResult.error || "Failed to regenerate question from retrieved chunks",
      });
    }

    const newQ = pickBilingualQuestionFields({
      ...batchResult.questions[0],
      topic: note.topic.name || record.topic,
      conceptualSource:
        batchResult.questions[0].conceptualSource ||
        batchResult.questions[0].sourceParagraph ||
        note.topic.name,
    });

    record.questions[idx] = newQ;
    await record.save();

    return res.json({
      success: true,
      message: `Question regenerated via RAG (${rag.source})`,
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
        question_hi: q.question_hi || "",
        options: q.options || q.options_en || {},
        options_en: q.options || q.options_en || {},
        options_hi: q.options_hi || {},
        correctAnswer: q.correctAnswer,
        answer: q.correctAnswer,
        explanation: q.explanation || q.explanation_en || "",
        explanation_en: q.explanation || q.explanation_en || "",
        explanation_hi: q.explanation_hi,
        matchColumns: q.matchColumns,
        matchColumns_hi: q.matchColumns_hi,
        assertionReason: q.assertionReason,
        tableData: q.tableData,
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
 * POST /api/admin/assigned-practice/:id/fill-hindi
 * Backfill missing question_hi / options_hi for an assigned practice test,
 * then sync Hindi into any in-progress student attempts.
 */
export const fillMissingPracticeHindi = async (req, res) => {
  try {
    const { id } = req.params;
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ success: false, message: "OPENROUTER_API_KEY not configured" });
    }

    const record = await AssignedPracticeTest.findById(id);
    if (!record) {
      return res.status(404).json({ success: false, message: "Practice test not found" });
    }
    if (!record.questions?.length) {
      return res.status(400).json({ success: false, message: "No questions to translate" });
    }

    const before = record.questions.filter((q) =>
      /[\u0900-\u097F]/.test(String(q.question_hi || ""))
    ).length;

    const translated = await runInMigrationBatchContext(() =>
      batchTranslatePracticeQuestionsToHindi(
        apiKey,
        getPracticeTranslationModel(),
        record.questions.map((q) => (typeof q.toObject === "function" ? q.toObject() : { ...q }))
      )
    );

    record.questions = translated.map((q) => pickBilingualQuestionFields(q));
    record.markModified("questions");
    await record.save();

    const after = record.questions.filter((q) =>
      /[\u0900-\u097F]/.test(String(q.question_hi || ""))
    ).length;

    // Sync into in-progress student attempts (no LLM)
    const attempts = await Test.find({
      assignedPracticeTestId: record._id,
      isSubmitted: { $ne: true },
    });
    let attemptsUpdated = 0;
    for (const test of attempts) {
      let changed = false;
      test.questions = test.questions.map((q, i) => {
        const src = record.questions[i];
        if (!src) return q;
        const plain = typeof q.toObject === "function" ? q.toObject() : { ...q };
        const next = pickBilingualQuestionFields({
          ...plain,
          question_hi: src.question_hi || plain.question_hi,
          options_hi: src.options_hi || plain.options_hi,
          explanation_hi: src.explanation_hi || plain.explanation_hi,
          matchColumns_hi: src.matchColumns_hi || plain.matchColumns_hi,
        });
        if (String(next.question_hi || "") !== String(plain.question_hi || "")) changed = true;
        return next;
      });
      if (changed) {
        test.markModified("questions");
        await test.save();
        attemptsUpdated += 1;
      }
    }

    return res.json({
      success: true,
      message: `Hindi filled: ${before} → ${after}/${record.questions.length}; synced ${attemptsUpdated} attempt(s)`,
      data: {
        before,
        after,
        total: record.questions.length,
        attemptsUpdated,
        questions: formatQuestionsForPreview(record.questions),
      },
    });
  } catch (error) {
    console.error("fillMissingPracticeHindi:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to fill Hindi" });
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

    const target = normalizeAssignedQuestionCount(record.totalQuestions || ASSIGNED_QUESTION_COUNT_DEFAULT);
    const stillGenerating =
      record.status === "generating" ||
      (record.generationProgress &&
        !record.generationProgress.isComplete &&
        record.generationProgress.currentStep !== "completed");

    // Cap + dedupe + drop incomplete before approve (never publish 61 for a 50-Q test)
    const { questions: capped, rejected } = selectFinalPracticeQuestions(record.questions, target);
    const have = capped.length;

    if (stillGenerating && have < target) {
      return res.status(400).json({
        success: false,
        message: `Generation still running (${have}/${target}). Wait until ${target} questions are ready, or let refill finish.`,
      });
    }
    if (have < target && record.status !== "ready") {
      return res.status(400).json({
        success: false,
        message: `Only ${have}/${target} complete questions ready. Wait for RAG refill to finish or regenerate.`,
      });
    }
    if (have === 0) {
      return res.status(400).json({
        success: false,
        message: "No complete questions to approve (empty/incomplete stems removed).",
      });
    }

    let finalQuestions = capped;

    // Ensure Hindi after approve when batch Hindi is enabled
    if (isPracticeBatchHindiEnabled()) {
      const needHi = finalQuestions.some(
        (q) => !/[\u0900-\u097F]/.test(String(q.question_hi || ""))
      );
      if (needHi) {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (apiKey) {
          console.log(`🌐 Approve: translating ${finalQuestions.length} questions to Hindi…`);
          finalQuestions = await runInMigrationBatchContext(() =>
            batchTranslatePracticeQuestionsToHindi(
              apiKey,
              getPracticeTranslationModel(),
              finalQuestions
            )
          );
          finalQuestions = finalQuestions.map((q) => pickBilingualQuestionFields(q));
        }
      }
    }

    const extras = [
      ...(Array.isArray(record.backupQuestions) ? record.backupQuestions : []),
      ...rejected.map((q) => pickBilingualQuestionFields(q)),
    ];

    record.questions = finalQuestions;
    record.backupQuestions = extras;
    record.totalQuestions = finalQuestions.length;
    record.status = "ready";
    record.errorMessage = rejected.length
      ? `Removed ${rejected.length} duplicate/incomplete question(s). Showing ${finalQuestions.length}.`
      : "";
    if (record.generationProgress) {
      record.generationProgress.approved = true;
      record.generationProgress.isComplete = true;
      record.generationProgress.currentStep = "completed";
      record.generationProgress.generatedQuestions = finalQuestions.length;
    }
    record.markModified("questions");
    record.markModified("backupQuestions");
    await record.save();

    return res.json({
      success: true,
      message: `Approved ${finalQuestions.length} question(s) for assignment`,
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
    // Cap to target (50) and repair stems so students never see blank match/statement questions.
    const target = normalizeAssignedQuestionCount(
      record.totalQuestions || ASSIGNED_QUESTION_COUNT_DEFAULT
    );
    const { questions: finalQuestions } = selectFinalPracticeQuestions(record.questions, target);
    if (!finalQuestions.length) {
      return res.status(400).json({
        success: false,
        message: "This test has no complete questions. Contact admin.",
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
      questions: finalQuestions.map((q) =>
        pickBilingualQuestionFields({
          ...q,
          userAnswer: null,
          timeSpent: 0,
        })
      ),
      totalQuestions: finalQuestions.length,
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
