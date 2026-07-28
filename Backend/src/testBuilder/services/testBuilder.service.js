import AssignedPracticeTest from "../../models/AssignedPracticeTest.js";
import QiSession from "../../questionIntelligence/models/QiSession.js";
import {
  buildQuestionSet,
  resolvePoolCounts,
} from "../../questionIntelligence/services/orchestrator.service.js";
import {
  mapQiSessionToPracticeQuestions,
  qiQuestionToPractice,
  dedupePracticeQuestions,
} from "./questionMapper.service.js";
import { pickBilingualQuestionFields } from "../../services/questionTranslationService.js";

function normalizeDifficulty(d) {
  const v = String(d || "moderate").toLowerCase();
  if (v === "easy") return "easy";
  if (v === "hard") return "hard";
  return "moderate";
}

function sanitizeBackup(items) {
  return (items || []).slice(0, 30).map((q) => ({
    question: q.question || "Incomplete question",
    question_en: q.question_en || q.question || "",
    options: {
      A: q.options?.A || "—",
      B: q.options?.B || "—",
      C: q.options?.C || "—",
      D: q.options?.D || "—",
    },
    options_en: q.options_en || undefined,
    correctAnswer: ["A", "B", "C", "D"].includes(q.correctAnswer) ? q.correctAnswer : "A",
    explanation: q.explanation || "—",
    explanation_en: q.explanation_en || q.explanation || "—",
    questionType: q.questionType,
    conceptualSource: q.conceptualSource,
    backupReason: q.backupReason || "pool_extra",
  }));
}

function mapBackupFromQi(backupQuestions = []) {
  const out = [];
  for (const q of backupQuestions) {
    const item = qiQuestionToPractice(q);
    const filled = ["A", "B", "C", "D"].filter((k) => String(item.options[k] || "").trim()).length;
    if (item.question.length < 20 || filled < 4) {
      out.push({ ...item, backupReason: "incomplete" });
      continue;
    }
    out.push({ ...item, backupReason: "pool_extra" });
  }
  return sanitizeBackup(out);
}

/**
 * Create an AssignedPracticeTest from an existing QI session (ready for assign).
 */
export async function createTestFromSession({
  sessionId,
  title,
  durationMinutes = 60,
  totalMarks = 100,
  negativeMark = 0.66,
  difficulty,
  maxQuestions,
  createdBy,
  extraBackup = [],
} = {}) {
  const session = await QiSession.findById(sessionId);
  if (!session) {
    const err = new Error("Question Intelligence session not found");
    err.statusCode = 404;
    throw err;
  }
  if (!session.questions?.length) {
    const err = new Error("Session has no questions to build a test");
    err.statusCode = 400;
    throw err;
  }

  const showCount =
    maxQuestions || session.stats?.showCount || session.requestedCount || session.questions.length;

  const primary = mapQiSessionToPracticeQuestions(session, { maxQuestions: undefined });
  const mergedPool = [
    ...primary.questions,
    ...sanitizeBackup(primary.rejected),
    ...mapBackupFromQi(extraBackup),
  ];
  const { questions: uniquePool, duplicatesRemoved } = dedupePracticeQuestions(mergedPool, {
    threshold: parseFloat(process.env.QI_DEDUPE_THRESHOLD || "0.75") || 0.75,
  });
  let questions = uniquePool.slice(0, showCount);
  const rejected = uniquePool.slice(showCount).map((q) => ({ ...q, backupReason: "pool_extra" }));

  if (!questions.length) {
    const err = new Error("No valid MCQs in session after mapping");
    err.statusCode = 400;
    throw err;
  }

  // Hindi: no OpenRouter translate — student UI fills Hindi free on client (zero tokens)

  const subject = session.subject || "General Studies";
  const topic = session.topic || session.query || "Practice";
  const testTitle =
    String(title || "").trim() || `${subject} — ${topic} (${questions.length}Q)`;

  const marksPerQ = (Number(totalMarks) || 100) / questions.length;
  const backup = sanitizeBackup(rejected);

  const record = await AssignedPracticeTest.create({
    subject,
    topic,
    chapter: session.chapter || "",
    title: testTitle,
    reference: "Knowledge Base · Question Intelligence",
    difficulty: normalizeDifficulty(difficulty || "moderate"),
    totalQuestions: questions.length,
    durationMinutes: Number(durationMinutes) || 60,
    totalMarks: Number(totalMarks) || Math.round(questions.length * 2),
    negativeMark: Number(negativeMark) ?? 0.66,
    questions: questions.map((q) =>
      pickBilingualQuestionFields({ ...q, explanation: q.explanation || "—" })
    ),
    backupQuestions: backup,
    status: "ready",
    generationProgress: {
      totalBatches: 1,
      completedBatches: 1,
      currentBatch: 1,
      generatedQuestions: questions.length,
      failedBatches: 0,
      isComplete: true,
      currentStep: "complete",
      approved: false,
    },
    generationStats: {
      generationTimeMs: session.durationMs || 0,
      chunksRetrieved: session.stats?.sourcesRanked || 0,
      modelUsed: session.stats?.generationTriggered ? "qi+llm" : "qi-bank",
      notesSource: "question_intelligence",
      ragSources: {
        extractedUsed: session.stats?.extractedUsed || 0,
        generatedUsed: session.stats?.generatedUsed || 0,
        avgConfidence: session.stats?.avgConfidence,
        poolTarget: session.stats?.poolTarget,
        showCount: session.stats?.showCount || questions.length,
        duplicatesRemoved:
          (session.stats?.duplicatesRemoved || 0) +
          (primary.duplicatesRemoved || 0) +
          (duplicatesRemoved || 0),
        marksPerQuestion: marksPerQ,
        hindiMode: "client_free_ui",
      },
    },
    qiSessionId: session._id,
    builderSource: "question_intelligence",
    createdBy: createdBy || null,
    assignedStudentIds: [],
  });

  return {
    test: record,
    mapped: questions.length,
    rejected: rejected.length,
    sessionId: session._id,
  };
}

/**
 * Sync build (blocking). Still uses pool+10 + dedupe internally.
 */
export async function buildAndCreateTest(params = {}, userId = null) {
  const qi = await buildQuestionSet(
    {
      subject: params.subject,
      topic: params.topic,
      chapter: params.chapter,
      query: params.query,
      count: params.count || 10,
      allowGeneration: params.allowGeneration !== false,
      preferExtracted: params.preferExtracted !== false,
      difficulty: params.difficulty,
      difficultyMix: params.difficultyMix,
    },
    userId
  );

  if (!qi.sessionId || !qi.questions?.length) {
    const err = new Error(qi.generation?.message || "Could not build questions");
    err.statusCode = 400;
    throw err;
  }

  const created = await createTestFromSession({
    sessionId: qi.sessionId,
    title: params.title,
    durationMinutes: params.durationMinutes,
    totalMarks: params.totalMarks,
    negativeMark: params.negativeMark,
    difficulty: params.difficulty,
    maxQuestions: qi.showCount || params.count,
    createdBy: userId,
    extraBackup: qi.backupQuestions || [],
  });

  return {
    ...created,
    questionIntelligence: {
      sessionId: qi.sessionId,
      status: qi.status,
      stats: qi.stats,
      concepts: qi.concepts,
      generation: qi.generation,
      showCount: qi.showCount,
      poolTarget: qi.poolTarget,
    },
  };
}

/**
 * Async build with live generationProgress for Topic Practice UI.
 * Returns draft test immediately; fills questions in background.
 */
export async function startBuildAndCreateTest(params = {}, userId = null) {
  const { showCount, poolTarget } = resolvePoolCounts(params.count || 50);
  const genBatch = Math.max(5, Math.min(15, parseInt(process.env.QI_GEN_BATCH_SIZE, 10) || 12));
  const totalBatches = Math.max(1, Math.ceil(poolTarget / genBatch));
  const subject = String(params.subject || "").trim() || "General Studies";
  const topic = String(params.topic || params.query || "").trim() || "Practice";
  const title =
    String(params.title || "").trim() || `${subject} — ${topic} (${showCount}Q)`;

  const record = await AssignedPracticeTest.create({
    subject,
    topic,
    chapter: String(params.chapter || "").trim(),
    title,
    reference: "Knowledge Base · Question Intelligence",
    difficulty: normalizeDifficulty(params.difficulty || "moderate"),
    totalQuestions: showCount,
    durationMinutes: Number(params.durationMinutes) || 60,
    totalMarks: Number(params.totalMarks) || showCount * 2,
    negativeMark: Number(params.negativeMark) ?? 0.66,
    questions: [],
    backupQuestions: [],
    status: "generating",
    generationProgress: {
      totalBatches,
      completedBatches: 0,
      currentBatch: 0,
      generatedQuestions: 0,
      failedBatches: 0,
      isComplete: false,
      currentStep: "searching_knowledge",
      readingNotes: false,
      cleaningHtml: false,
      approved: false,
    },
    generationStats: {
      notesSource: "question_intelligence",
      ragSources: { showCount, poolTarget },
    },
    builderSource: "question_intelligence",
    createdBy: userId || null,
    assignedStudentIds: [],
  });

  setImmediate(() => {
    runAsyncBuild(record._id, params, userId, showCount, poolTarget).catch(async (err) => {
      console.error("[test-builder] async build failed:", err?.message || err);
      try {
        await AssignedPracticeTest.findByIdAndUpdate(record._id, {
          $set: {
            status: "failed",
            errorMessage: err?.message || "Build failed",
            "generationProgress.isComplete": true,
            "generationProgress.currentStep": "failed",
          },
        });
      } catch {
        /* ignore */
      }
    });
  });

  return {
    async: true,
    test: record,
    showCount,
    poolTarget,
    message: `Generating ${poolTarget} unique questions (showing ${showCount})`,
  };
}

async function runAsyncBuild(testId, params, userId, showCount, poolTarget) {
  const genBatch = Math.max(5, Math.min(15, parseInt(process.env.QI_GEN_BATCH_SIZE, 10) || 12));
  const updateProgress = async (p) => {
    const step =
      p.phase === "complete"
        ? "complete"
        : p.phase === "failed"
          ? "failed"
          : p.phase === "finalizing"
            ? "finalizing"
            : p.phase === "generating"
              ? "generating_questions"
              : p.phase || "pending";

    const patch = {
      "generationProgress.totalBatches": p.totalBatches || Math.ceil(poolTarget / genBatch),
      "generationProgress.completedBatches": p.completedBatches || 0,
      "generationProgress.currentBatch": p.currentBatch || 0,
      "generationProgress.generatedQuestions": Math.min(
        poolTarget,
        Number(p.uniqueCount) || 0
      ),
      "generationProgress.isComplete": Boolean(p.isComplete),
      "generationProgress.currentStep": step,
      "generationProgress.readingNotes": Boolean(p.readingNotes),
      "generationProgress.cleaningHtml": Boolean(p.cleaningHtml),
    };

    // Live preview: save partial unique questions as they arrive
    if (Array.isArray(p.previewQuestions) && p.previewQuestions.length) {
      const mapped = [];
      for (const q of p.previewQuestions) {
        const item = qiQuestionToPractice(q);
        const filled = ["A", "B", "C", "D"].filter((k) =>
          String(item.options[k] || "").trim()
        ).length;
        if (item.question.length >= 20 && filled >= 4) {
          mapped.push({ ...item, explanation: item.explanation || "—" });
        }
      }
      if (mapped.length) {
        patch.questions = mapped.slice(0, showCount);
      }
    }

    await AssignedPracticeTest.findByIdAndUpdate(testId, { $set: patch });
  };

  const qi = await buildQuestionSet(
    {
      subject: params.subject,
      topic: params.topic,
      chapter: params.chapter,
      query: params.query,
      count: showCount,
      allowGeneration: params.allowGeneration !== false,
      preferExtracted: params.preferExtracted !== false,
      difficulty: params.difficulty,
      difficultyMix: params.difficultyMix,
      onProgress: updateProgress,
    },
    userId
  );

  if (!qi.sessionId || !qi.questions?.length) {
    await AssignedPracticeTest.findByIdAndUpdate(testId, {
      $set: {
        status: "failed",
        errorMessage: qi.generation?.message || "Could not build questions",
        "generationProgress.isComplete": true,
        "generationProgress.currentStep": "failed",
      },
    });
    return;
  }

  const session = await QiSession.findById(qi.sessionId);
  // Map show + backup pool, then hard-dedupe so same-test clones (e.g. IMF/WTO match) drop
  const primary = mapQiSessionToPracticeQuestions(session, { maxQuestions: undefined });
  const fromBackupQi = mapBackupFromQi(qi.backupQuestions || []);
  const mergedPool = [
    ...primary.questions,
    ...sanitizeBackup(primary.rejected),
    ...fromBackupQi,
  ];
  const { questions: uniquePool, duplicatesRemoved: finalDups } = dedupePracticeQuestions(
    mergedPool,
    { threshold: parseFloat(process.env.QI_DEDUPE_THRESHOLD || "0.75") || 0.75 }
  );
  let questions = uniquePool.slice(0, showCount);
  let backup = uniquePool.slice(showCount, showCount + 30).map((q) => ({
    ...q,
    backupReason: q.backupReason || "pool_extra",
  }));

  // Hard guarantee: keep topping up until we have exactly showCount (e.g. 50)
  let guaranteeRound = 0;
  while (questions.length < showCount && guaranteeRound < 6) {
    guaranteeRound += 1;
    const before = questions.length;
    const need = showCount - questions.length;
    console.log(
      `[testBuilder] guarantee fill ${guaranteeRound}: have ${questions.length}/${showCount}, need ${need}`
    );
    try {
      const { generateIfRequired } = await import(
        "../../questionIntelligence/services/generationGate.service.js"
      );
      const { rankSources } = await import(
        "../../questionIntelligence/services/sourceRanking.service.js"
      );
      const ranked = await rankSources({
        query: params.query || params.topic,
        subject: params.subject,
        topic: params.topic,
        chapter: params.chapter,
        topK: 12,
      });
      const gen = await generateIfRequired({
        shortfall: need + 4,
        contextText: ranked.contextText,
        sources: ranked.sources,
        subject: params.subject,
        topic: params.topic,
        chapter: params.chapter,
        difficulty: params.difficulty || "medium",
        allowGeneration: true,
        practiceMode: true,
      });
      if (!gen.questions?.length) break;
      const extra = [];
      for (const q of gen.questions) {
        const item = qiQuestionToPractice(q);
        const filled = ["A", "B", "C", "D"].filter((k) =>
          String(item.options[k] || "").trim()
        ).length;
        if (item.question.length >= 20 && filled >= 4) {
          extra.push({ ...item, explanation: item.explanation || "—" });
        }
      }
      if (!extra.length) break;
      const merged = dedupePracticeQuestions([...questions, ...backup, ...extra], {
        threshold: parseFloat(process.env.QI_DEDUPE_THRESHOLD || "0.75") || 0.75,
      });
      questions = merged.questions.slice(0, showCount);
      backup = merged.questions.slice(showCount, showCount + 30).map((q) => ({
        ...q,
        backupReason: q.backupReason || "pool_extra",
      }));
      if (questions.length <= before) break;
    } catch (err) {
      console.warn("[testBuilder] guarantee fill failed:", err?.message || err);
      break;
    }
  }

  if (!questions.length) {
    await AssignedPracticeTest.findByIdAndUpdate(testId, {
      $set: {
        status: "failed",
        errorMessage: "No valid MCQs after dedupe/mapping",
        "generationProgress.isComplete": true,
        "generationProgress.currentStep": "failed",
      },
    });
    return;
  }

  if (questions.length < showCount) {
    console.warn(
      `[testBuilder] only ${questions.length}/${showCount} after guarantee fill — marking partial`
    );
  }

  // Hindi: no OpenRouter translate here — student UI shows Hindi via free client translate (zero tokens)

  await AssignedPracticeTest.findByIdAndUpdate(testId, {
    $set: {
      status: questions.length >= Math.floor(showCount * 0.9) ? "ready" : "failed",
      errorMessage:
        questions.length < Math.floor(showCount * 0.9)
          ? `Only ${questions.length} of ${showCount} questions could be generated`
          : undefined,
      questions: questions.map((q) =>
        pickBilingualQuestionFields({ ...q, explanation: q.explanation || "—" })
      ),
      backupQuestions: backup,
      totalQuestions: questions.length,
      qiSessionId: qi.sessionId,
      "generationProgress.totalBatches": Math.ceil(poolTarget / genBatch),
      "generationProgress.completedBatches": Math.ceil(poolTarget / genBatch),
      "generationProgress.currentBatch": Math.ceil(poolTarget / genBatch),
      "generationProgress.generatedQuestions": questions.length,
      "generationProgress.isComplete": true,
      "generationProgress.currentStep":
        questions.length >= showCount ? "complete" : "complete",
      "generationProgress.readingNotes": true,
      "generationProgress.cleaningHtml": true,
      generationStats: {
        generationTimeMs: qi.durationMs || 0,
        chunksRetrieved: qi.stats?.sourcesRanked || 0,
        modelUsed: qi.stats?.generationTriggered ? "qi+llm" : "qi-bank",
        notesSource: "question_intelligence",
        ragSources: {
          extractedUsed: qi.stats?.extractedUsed || 0,
          generatedUsed: qi.stats?.generatedUsed || 0,
          avgConfidence: qi.stats?.avgConfidence,
          poolTarget,
          showCount,
          actualCount: questions.length,
          duplicatesRemoved:
            (qi.stats?.duplicatesRemoved || 0) +
            (primary.duplicatesRemoved || 0) +
            (finalDups || 0),
          backupCount: backup.length,
          hindiMode: "client_free_ui",
          guaranteeRounds: guaranteeRound,
        },
      },
    },
  });
}

export async function listBuilderTests({ page = 1, limit = 20 } = {}) {
  const filter = { builderSource: "question_intelligence" };
  const [items, total] = await Promise.all([
    AssignedPracticeTest.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select(
        "title subject topic status totalQuestions durationMinutes totalMarks assignedStudentIds qiSessionId createdAt generationStats"
      )
      .lean(),
    AssignedPracticeTest.countDocuments(filter),
  ]);

  return {
    items: items.map((t) => ({
      ...t,
      assignedCount: t.assignedStudentIds?.length || 0,
    })),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getBuilderStats() {
  const [agg] = await AssignedPracticeTest.aggregate([
    { $match: { builderSource: "question_intelligence" } },
    {
      $group: {
        _id: null,
        totalTests: { $sum: 1 },
        ready: { $sum: { $cond: [{ $eq: ["$status", "ready"] }, 1, 0] } },
        totalQuestions: { $sum: "$totalQuestions" },
        assignedTests: {
          $sum: {
            $cond: [{ $gt: [{ $size: { $ifNull: ["$assignedStudentIds", []] } }, 0] }, 1, 0],
          },
        },
      },
    },
  ]);

  return (
    agg || {
      totalTests: 0,
      ready: 0,
      totalQuestions: 0,
      assignedTests: 0,
    }
  );
}
