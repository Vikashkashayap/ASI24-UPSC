import QiSession from "../models/QiSession.js";
import { rankSources } from "./sourceRanking.service.js";
import { loadBankCandidates, selectFromBank } from "./questionSelection.service.js";
import { generateIfRequired } from "./generationGate.service.js";
import { validateSet } from "./validation.service.js";
import { analyzePatterns } from "./patternAnalysis.service.js";
import { removeDuplicates } from "./duplicateRemoval.service.js";
import { balanceByDifficulty } from "./difficultyBalance.service.js";

/** Show N questions, generate N+buffer pool so duplicates can be dropped. */
export function resolvePoolCounts(requested) {
  const showCount = Math.min(100, Math.max(1, Number(requested) || 10));
  const buffer = Math.max(
    8,
    Math.min(20, parseInt(process.env.QI_POOL_BUFFER || process.env.PRACTICE_POOL_BUFFER || "10", 10) || 10)
  );
  const poolTarget = showCount + buffer;
  return { showCount, poolTarget };
}

const GEN_BATCH = Math.max(5, Math.min(15, parseInt(process.env.QI_GEN_BATCH_SIZE, 10) || 12));
/** Run up to N generation jobs in parallel when pool still needs many Qs */
const PARALLEL_GENS = Math.max(1, Math.min(3, parseInt(process.env.QI_PARALLEL_GENS, 10) || 2));
/** Stricter near-duplicate cutoff for practice sets */
const DEDUPE_THRESHOLD = parseFloat(process.env.QI_DEDUPE_THRESHOLD || "0.75") || 0.75;

function mapFinalQuestion(q, subject, topic, chapter) {
  return {
    questionText: q.questionText,
    options: q.options || [],
    correctAnswer: q.correctAnswer || "",
    explanation: q.explanation || "",
    difficulty: q.difficulty || "Medium",
    subject: q.subject || subject,
    topic: q.topic || topic,
    chapter: q.chapter || chapter,
    sourceType: q.sourceType || "extracted",
    sourceId: q.sourceId || null,
    pattern: q.pattern || "",
    confidence: q.confidence,
    validated: q.validated,
    validationNotes: q.validationNotes || "",
    rankScore: q.rankScore || 0,
  };
}

/**
 * Main Question Intelligence pipeline with pool buffer (+10) and batched generation.
 * onProgress({ phase, completedBatches, totalBatches, uniqueCount, poolTarget, showCount })
 */
export async function buildQuestionSet(params = {}, userId = null) {
  const started = Date.now();
  const subject = String(params.subject || "").trim();
  const topic = String(params.topic || "").trim();
  const chapter = String(params.chapter || "").trim();
  const query = String(params.query || "").trim() || [subject, topic].filter(Boolean).join(" ");
  const { showCount, poolTarget } = resolvePoolCounts(params.count);
  const allowGeneration = params.allowGeneration !== false;
  const difficultyMix = params.difficultyMix || undefined;
  const preferExtracted = params.preferExtracted !== false;
  const onProgress = typeof params.onProgress === "function" ? params.onProgress : null;

  const totalBatches = Math.max(1, Math.ceil(poolTarget / GEN_BATCH));

  const session = await QiSession.create({
    query,
    subject,
    topic,
    chapter,
    requestedCount: showCount,
    status: "building",
    createdBy: userId,
    difficultyMix: difficultyMix || { Easy: 0, Medium: 0, Hard: 0 },
  });

  const notify = async (patch) => {
    if (!onProgress) return;
    try {
      await onProgress({
        showCount,
        poolTarget,
        totalBatches,
        ...patch,
      });
    } catch {
      /* non-fatal */
    }
  };

  try {
    await notify({
      phase: "searching_knowledge",
      completedBatches: 0,
      currentBatch: 0,
      uniqueCount: 0,
      readingNotes: true,
    });

    const ranked = await rankSources({
      query,
      subject,
      topic,
      chapter,
      topK: Number(params.topK || 12),
    });

    await notify({
      phase: "reading_notes",
      readingNotes: true,
      cleaningHtml: true,
      uniqueCount: 0,
    });

    let selected = [];
    let duplicatesRemoved = 0;
    let generationTriggered = false;
    let genMessage = "";

    // 1) Prefer extracted bank toward pool
    if (preferExtracted) {
      const bank = await loadBankCandidates({
        subject,
        topic,
        chapter,
        limit: poolTarget * 6,
      });
      const pick = selectFromBank(bank, { count: poolTarget, difficultyMix });
      selected = pick.questions;
      duplicatesRemoved += pick.duplicatesRemoved;
    }

    selected = removeDuplicates(selected, { threshold: DEDUPE_THRESHOLD }).questions;
    await notify({
      phase: "generating",
      uniqueCount: selected.length,
      completedBatches: 0,
      currentBatch: 0,
      readingNotes: true,
      cleaningHtml: true,
      previewQuestions: selected
        .slice(0, showCount)
        .map((q) => mapFinalQuestion(q, subject, topic, chapter)),
    });

    // 2) Batched AI generation until pool filled — hard floor: at least showCount unique Qs
    let batchIdx = 0;
    let emptyRounds = 0;
    const maxRounds = Math.max(totalBatches + 12, Math.ceil(poolTarget / GEN_BATCH) * 3);

    while (selected.length < poolTarget && allowGeneration && batchIdx < maxRounds) {
      // Never stop early while still below the shown paper size
      const hardNeed = Math.max(0, showCount - selected.length);
      const remaining = Math.max(hardNeed, poolTarget - selected.length) + (hardNeed > 0 ? 4 : 2);
      if (remaining <= 0) break;

      const jobNeeds = [];
      let allocated = 0;
      const parallelSlots =
        remaining > GEN_BATCH && selected.length >= showCount ? PARALLEL_GENS : 1;
      for (let p = 0; p < parallelSlots && allocated < remaining; p += 1) {
        const need = Math.min(GEN_BATCH, remaining - allocated);
        if (need <= 0) break;
        jobNeeds.push(need);
        allocated += need;
      }

      batchIdx += 1;
      const progressBatches = Math.min(
        totalBatches,
        Math.max(1, Math.ceil((selected.length / Math.max(1, poolTarget)) * totalBatches))
      );
      await notify({
        phase: "generating",
        currentBatch: Math.min(totalBatches, batchIdx),
        completedBatches: Math.max(0, progressBatches - 1),
        uniqueCount: selected.length,
        readingNotes: true,
        cleaningHtml: true,
        previewQuestions: selected
          .slice(0, showCount)
          .map((q) => mapFinalQuestion(q, subject, topic, chapter)),
      });

      const gens = await Promise.all(
        jobNeeds.map((need) =>
          generateIfRequired({
            shortfall: need,
            contextText: ranked.contextText,
            sources: ranked.sources,
            subject,
            topic,
            chapter,
            difficulty: params.difficulty || "medium",
            allowGeneration: true,
            practiceMode: true,
          })
        )
      );

      let gotAny = false;
      const beforeCount = selected.length;
      for (const gen of gens) {
        if (gen.triggered) generationTriggered = true;
        if (gen.message) genMessage = gen.message;
        if (!gen.questions?.length) continue;
        gotAny = true;
        const merged = removeDuplicates([...selected, ...gen.questions], {
          threshold: DEDUPE_THRESHOLD,
        });
        duplicatesRemoved += merged.duplicatesRemoved;
        selected = merged.questions;
      }

      const gained = selected.length - beforeCount;
      if (!gotAny || gained <= 0) {
        emptyRounds += 1;
        // Allow more empty rounds when still short of the paper size
        const emptyLimit = selected.length < showCount ? 6 : 3;
        if (emptyRounds >= emptyLimit) {
          if (selected.length >= showCount) break;
          // Still short — one more push with larger ask then stop
          if (emptyRounds >= emptyLimit + 2) break;
        }
        continue;
      }

      emptyRounds = 0;
      const completed = Math.min(
        totalBatches,
        Math.max(1, Math.ceil((Math.min(selected.length, poolTarget) / poolTarget) * totalBatches))
      );
      await notify({
        phase: "generating",
        currentBatch: Math.min(totalBatches, batchIdx),
        completedBatches: completed,
        uniqueCount: Math.min(selected.length, poolTarget),
        readingNotes: true,
        cleaningHtml: true,
        previewQuestions: selected
          .slice(0, showCount)
          .map((q) => mapFinalQuestion(q, subject, topic, chapter)),
      });

      // Early exit once pool is full
      if (selected.length >= poolTarget) break;
    }

    // 2b) Guarantee showCount: keep topping up if validation/dedupe left us short
    let topUp = 0;
    while (selected.length < showCount && allowGeneration && topUp < 8) {
      topUp += 1;
      const need = showCount - selected.length + 3;
      console.log(
        `[qi] top-up ${topUp}: have ${selected.length}/${showCount}, asking ${need}`
      );
      const gen = await generateIfRequired({
        shortfall: need,
        contextText: ranked.contextText,
        sources: ranked.sources,
        subject,
        topic,
        chapter,
        difficulty: params.difficulty || "medium",
        allowGeneration: true,
        practiceMode: true,
      });
      if (gen.triggered) generationTriggered = true;
      if (!gen.questions?.length) break;
      const merged = removeDuplicates([...selected, ...gen.questions], {
        threshold: DEDUPE_THRESHOLD,
      });
      duplicatesRemoved += merged.duplicatesRemoved;
      if (merged.questions.length <= selected.length) break;
      selected = merged.questions;
    }

    await notify({
      phase: "finalizing",
      completedBatches: totalBatches,
      currentBatch: totalBatches,
      uniqueCount: selected.length,
      readingNotes: true,
      cleaningHtml: true,
    });

    // 3) Final dedupe + balance for pool, then split show / backup
    // Prefer keeping enough valid Qs for showCount — validate softly when short
    const finalDedup = removeDuplicates(selected, { threshold: DEDUPE_THRESHOLD });
    duplicatesRemoved += finalDedup.duplicatesRemoved;
    const rebalanced = balanceByDifficulty(finalDedup.questions, poolTarget, difficultyMix);
    const patterns = analyzePatterns(rebalanced.questions).counts;
    let validated = validateSet(rebalanced.questions);

    // If strict validation dropped below showCount, keep best unvalidated fillers
    if (validated.questions.length < showCount && rebalanced.questions.length > validated.questions.length) {
      const keptIds = new Set(
        validated.questions.map((q) => q._uid || q.questionText || q.question)
      );
      const fillers = rebalanced.questions.filter((q) => {
        const key = q._uid || q.questionText || q.question;
        return !keptIds.has(key);
      });
      validated = {
        ...validated,
        questions: [...validated.questions, ...fillers].slice(0, Math.max(showCount, poolTarget)),
      };
      console.warn(
        `[qi] validation shortfall: padded to ${validated.questions.length} (need show ${showCount})`
      );
    }

    const allUnique = validated.questions.map((q) =>
      mapFinalQuestion(q, subject, topic, chapter)
    );
    const finalQuestions = allUnique.slice(0, showCount);
    const backupPool = allUnique.slice(showCount);

    if (finalQuestions.length < showCount) {
      console.warn(
        `[qi] WARNING: only ${finalQuestions.length}/${showCount} unique questions after refill+validate`
      );
    }

    const extractedUsed = finalQuestions.filter((q) => q.sourceType === "extracted").length;
    const generatedUsed = finalQuestions.filter((q) => q.sourceType === "generated").length;

    session.questions = finalQuestions;
    session.sourceChunks = ranked.sources.slice(0, 12).map((s) => ({
      chunkId: String(s.chunkId || ""),
      score: s.score,
      subject: s.subject,
      topic: s.topic,
      page: s.page,
    }));
    session.stats = {
      extractedUsed,
      generatedUsed,
      duplicatesRemoved,
      sourcesRanked: ranked.sources.length,
      patterns,
      avgConfidence: validated.avgConfidence,
      generationTriggered,
      poolTarget,
      showCount,
      backupCount: backupPool.length,
    };
    session.difficultyMix = rebalanced.targets;
    session.status =
      finalQuestions.length >= showCount
        ? "completed"
        : finalQuestions.length > 0
          ? "partial"
          : "failed";
    session.durationMs = Date.now() - started;
    if (session.status === "failed") {
      session.errorMessage = genMessage || "No questions available from bank or generation";
    }
    await session.save();

    await notify({
      phase: "complete",
      completedBatches: totalBatches,
      currentBatch: totalBatches,
      uniqueCount: finalQuestions.length,
      isComplete: true,
      readingNotes: true,
      cleaningHtml: true,
    });

    return {
      sessionId: session._id,
      status: session.status,
      requestedCount: showCount,
      showCount,
      poolTarget,
      count: finalQuestions.length,
      questions: finalQuestions,
      backupQuestions: backupPool,
      stats: session.stats,
      concepts: ranked.concepts,
      sources: ranked.sources.slice(0, 8),
      generation: {
        triggered: generationTriggered,
        reason: generationTriggered ? "generated" : "bank",
        message: genMessage || undefined,
      },
      durationMs: session.durationMs,
    };
  } catch (err) {
    session.status = "failed";
    session.errorMessage = err?.message || "Build failed";
    session.durationMs = Date.now() - started;
    await session.save();
    await notify({
      phase: "failed",
      isComplete: true,
      error: err?.message || "Build failed",
    });
    throw err;
  }
}

export async function getSession(sessionId) {
  const doc = await QiSession.findById(sessionId).lean();
  if (!doc) {
    const err = new Error("Session not found");
    err.statusCode = 404;
    throw err;
  }
  return doc;
}

export async function listSessions({ page = 1, limit = 20, subject } = {}) {
  const filter = {};
  if (subject) filter.subject = new RegExp(subject, "i");
  const [items, total] = await Promise.all([
    QiSession.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select("-questions.options")
      .lean(),
    QiSession.countDocuments(filter),
  ]);
  return {
    items,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getDashboardStats() {
  const [agg] = await QiSession.aggregate([
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
        partial: { $sum: { $cond: [{ $eq: ["$status", "partial"] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
        questionsBuilt: { $sum: { $size: "$questions" } },
        extractedUsed: { $sum: "$stats.extractedUsed" },
        generatedUsed: { $sum: "$stats.generatedUsed" },
      },
    },
  ]);
  const recent = await QiSession.find()
    .sort({ createdAt: -1 })
    .limit(8)
    .select("subject topic status requestedCount stats createdAt durationMs")
    .lean();

  return {
    stats: agg || {
      totalSessions: 0,
      completed: 0,
      partial: 0,
      failed: 0,
      questionsBuilt: 0,
      extractedUsed: 0,
      generatedUsed: 0,
    },
    recent,
  };
}
