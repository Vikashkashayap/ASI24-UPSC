import AssignedPracticeTest from "../../models/AssignedPracticeTest.js";
import { generateQuestionsFromContextBatch } from "./questionGenerator.service.js";
import { ALL_PATTERN_IDS, resolveNotesPatterns } from "../../config/questionPatterns.js";
import { questionPatternEngine } from "./questionPatternEngine.js";
import { pickBilingualQuestionFields, ensureFullQuestionStem } from "../questionTranslationService.js";
import { notesService } from "../notes/notes.service.js";
import { retrieverService } from "./retriever.service.js";
import {
  getPracticeTranslationModel,
  getPracticeBatchSize,
  isPracticeBatchHindiEnabled,
} from "../../config/openRouterConfig.js";

const QUESTIONS_PER_BATCH = getPracticeBatchSize();
const DEFAULT_TARGET_QUESTIONS = 50;
const MAX_TARGET_QUESTIONS = 100;
const MAX_TOPUP_BATCHES = parseInt(process.env.PRACTICE_MAX_TOPUP_BATCHES, 10) || 20;
const ESTIMATED_COST_PER_1K_TOKENS_USD = parseFloat(process.env.PRACTICE_COST_PER_1K_TOKENS_USD || "0.00035");

function normalizeTargetQuestionCount(value) {
  const n = parseInt(value, 10);
  if (n === 100) return 100;
  if (n === 50) return 50;
  // Allow other multiples of 10 between 10–100 for flexibility
  if (Number.isFinite(n) && n >= 10 && n <= MAX_TARGET_QUESTIONS) {
    return Math.round(n / 10) * 10;
  }
  return DEFAULT_TARGET_QUESTIONS;
}

function usageTotals(usage = {}) {
  const input = usage.prompt_tokens || 0;
  const output = usage.completion_tokens || 0;
  return { input, output, total: usage.total_tokens || input + output };
}

function questionFingerprint(q) {
  return String(q.question || q.question_en || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097f]+/g, " ")
    .trim()
    .slice(0, 140);
}

function partitionUniqueAndDupes(questions = []) {
  const seen = new Set();
  const unique = [];
  const duplicates = [];
  for (const q of questions) {
    const key = questionFingerprint(q);
    if (!key) continue;
    if (seen.has(key)) {
      duplicates.push({ ...q, backupReason: "duplicate" });
    } else {
      seen.add(key);
      unique.push(q);
    }
  }
  return { unique, duplicates };
}

function isCompletePracticeQuestion(q) {
  const fixed = ensureFullQuestionStem(q);
  const text = String(fixed.question_en || fixed.question || "").trim();
  if (text.length < 40) return false;
  const opts = fixed.options_en || fixed.options || {};
  const filled = ["A", "B", "C", "D"].filter((k) => String(opts[k] || "").trim().length >= 1).length;
  if (filled < 4) return false;
  if (!["A", "B", "C", "D"].includes(String(q.correctAnswer || q.answer || "").toUpperCase())) {
    return false;
  }

  const type = String(q.questionType || "").toLowerCase();
  const looksMatch =
    type.includes("pair") ||
    type.includes("match") ||
    /match\s+(the\s+)?following|list-i|सूची/i.test(text);
  if (looksMatch) {
    const a = (fixed.matchColumns?.columnA || []).filter((x) => String(x || "").trim());
    const b = (fixed.matchColumns?.columnB || []).filter((x) => String(x || "").trim());
    const letters = (text.match(/(?:^|\n)\s*[A-D][.)]\s+\S+/gi) || []).length;
    const numbers = (text.match(/(?:^|\n)\s*\d+[.)]\s+\S+/g) || []).length;
    // Require lists in the visible stem (not only structured columns)
    if (letters >= 2 && numbers >= 2) return true;
    return a.length >= 2 && b.length >= 2 && text.length >= 60;
  }
  return true;
}

function dedupeByQuestion(questions = []) {
  return partitionUniqueAndDupes(questions).unique;
}

async function updateProgress(assignedPracticeId, patch) {
  await AssignedPracticeTest.findByIdAndUpdate(assignedPracticeId, { $set: patch });
}

/**
 * BatchGenerator — N × 10 questions via RAG (top-k knowledge chunks only).
 * Modes:
 *  A) topicIds — retrieve per selected ContentTopic
 *  B) searchQuery + subject — free-text topic keyword search across knowledge
 * Never sends whole PDF to the LLM.
 * Open-knowledge LLM is used ONLY when KB returns zero chunks (PRACTICE_ALLOW_OPEN_KNOWLEDGE).
 */
export async function runAssignedPracticeGeneration({
  assignedPracticeId,
  topicIds = [],
  topicName = "",
  subject = "",
  chapter = "",
  difficulty = "moderate",
  patternsToInclude = [],
  chapterId = null,
  searchQuery = "",
  questionCount = DEFAULT_TARGET_QUESTIONS,
}) {
  const startedAt = Date.now();
  const TARGET_QUESTIONS = normalizeTargetQuestionCount(questionCount);
  /** Small spare pool for incomplete/dupe replacement — keep low so Finalizing is fast */
  const BUFFER_EXTRA = Math.max(
    0,
    Math.min(40, parseInt(process.env.PRACTICE_POOL_BUFFER || "8", 10) || 8)
  );
  const GENERATE_POOL = TARGET_QUESTIONS + BUFFER_EXTRA;
  const TOTAL_BATCHES = Math.ceil(GENERATE_POOL / QUESTIONS_PER_BATCH);
  const ALLOW_OPEN_KNOWLEDGE = process.env.PRACTICE_ALLOW_OPEN_KNOWLEDGE !== "false";
  const selectedPatterns = resolveNotesPatterns(patternsToInclude?.length ? patternsToInclude : ALL_PATTERN_IDS);
  const planState = questionPatternEngine.createPlan({
    questionCount: GENERATE_POOL,
    patternsToInclude: selectedPatterns,
  });
  let inputTokens = 0;
  let outputTokens = 0;
  let totalTokens = 0;
  let modelUsed = "";
  let chunksUsed = 0;
  const sourceCounts = {
    qdrant: 0,
    mongo: 0,
    stored_chunks: 0,
    live_fallback: 0,
    open_knowledge: 0,
    empty: 0,
  };
  const usedChunkIds = new Set();
  const generatedQuestions = [];
  let openKnowledgeUsed = false;

  const keyword = String(searchQuery || "").trim();
  // Subject-wide keyword RAG (PDF + website). chapterId optional hint only.
  const keywordMode = Boolean(keyword && subject);

  const uniqueTopicIds = [...new Set((topicIds || []).map((id) => String(id)).filter(Boolean))];
  if (!keywordMode && !uniqueTopicIds.length) {
    await updateProgress(assignedPracticeId, {
      status: "failed",
      errorMessage: "Select at least one topic, or type a topic keyword to search PDF + notes knowledge",
      "generationProgress.isComplete": true,
      "generationProgress.currentStep": "failed",
    });
    return;
  }

  await updateProgress(assignedPracticeId, {
    totalQuestions: TARGET_QUESTIONS,
    "generationProgress.totalBatches": TOTAL_BATCHES,
    "generationProgress.currentStep": keywordMode ? "searching_knowledge" : "reading_notes",
    "generationProgress.readingNotes": true,
    "generationProgress.cleaningHtml": false,
  });

  let topicMetas = [];
  let topicMetaById = new Map();

  if (!keywordMode) {
    try {
      topicMetas = await notesService.assertTopicsHaveContent(uniqueTopicIds);
    } catch (assertErr) {
      await updateProgress(assignedPracticeId, {
        status: "failed",
        errorMessage: assertErr.message || "Selected topics have no usable content",
        "generationProgress.isComplete": true,
        "generationProgress.currentStep": "failed",
      });
      return;
    }
    topicMetaById = new Map(topicMetas.map((n) => [String(n.topic._id), n]));
  } else {
    const probe = await retrieverService.getContextForSubjectQuery({
      subject,
      query: keyword,
      batchIndex: 0,
    });
    if (!probe.contextText || probe.contextText.length < 80) {
      await updateProgress(assignedPracticeId, {
        status: "failed",
        errorMessage: `No matching content found in PDF/notes knowledge for "${keyword}". Upload more PDFs or sync website notes.`,
        "generationProgress.isComplete": true,
        "generationProgress.currentStep": "failed",
      });
      return;
    }
  }

  await updateProgress(assignedPracticeId, {
    "generationProgress.currentStep": "retrieving_chunks",
    "generationProgress.readingNotes": true,
    "generationProgress.cleaningHtml": true,
  });

  const displayTopicName = keywordMode ? keyword : topicName;

  /**
   * ONE retrieval context per batch — never send whole PDF / chapter.
   */
  const pickRagContext = async (batchIndex) => {
    if (keywordMode) {
      const rag = await retrieverService.getContextForSubjectQuery({
        subject,
        query: keyword,
        batchIndex,
        excludeChunkIds: [...usedChunkIds],
      });
      for (const id of rag.chunkIds || []) usedChunkIds.add(id);
      sourceCounts[rag.source] = (sourceCounts[rag.source] || 0) + 1;
      console.log(
        `📚 Subject keyword RAG: "${keyword}" [${subject}] source=${rag.source} chunks=${rag.chunks?.length || 0} ~${rag.tokens} tokens`
      );
      return {
        topicId: null,
        topicName: keyword,
        contextText: rag.contextText,
        source: rag.source,
        tokens: rag.tokens,
        chunksRetrieved: rag.chunks?.length || 0,
      };
    }

    const usable = uniqueTopicIds.filter((id) => {
      const n = topicMetaById.get(String(id));
      return (n?.chunks?.length > 0) || /^https?:\/\//i.test(n?.topic?.sourceUrl || "");
    });
    const pool = usable.length ? usable : uniqueTopicIds;
    const activeTopicId = pool[batchIndex % pool.length];
    const meta = topicMetaById.get(String(activeTopicId));
    const activeTopicName = meta?.topic?.name || topicName;

    const rag = await retrieverService.getContextForBatch({
      topicId: activeTopicId,
      batchIndex,
      topicName: activeTopicName,
      subject: subject || meta?.topic?.subject || "",
      excludeChunkIds: [...usedChunkIds],
      // Never pull raw live HTML into the LLM — chunks only
      allowLiveFallback: false,
    });

    for (const id of rag.chunkIds || []) usedChunkIds.add(id);
    sourceCounts[rag.source] = (sourceCounts[rag.source] || 0) + 1;

    console.log(
      `📚 RAG batch context: topic="${activeTopicName}" source=${rag.source} chunks=${rag.chunks?.length || 0} ~${rag.tokens} tokens (top-${retrieverService.getTopK()})`
    );

    return {
      topicId: activeTopicId,
      topicName: activeTopicName,
      contextText: rag.contextText,
      source: rag.source,
      tokens: rag.tokens,
      chunksRetrieved: rag.chunks?.length || 0,
    };
  };

  const runOneBatch = async ({ batchSize, batchIndex, label }) => {
    const picked = await pickRagContext(batchIndex);
    const contextText = picked.contextText;
    const activeTopicName = picked.topicName || displayTopicName;
    const kbEmpty = !contextText || contextText.length < 80;

    // Knowledge base empty → optional open-syllabus LLM (once policy allows)
    if (kbEmpty) {
      if (!ALLOW_OPEN_KNOWLEDGE) {
        console.warn(`⚠️ ${label}: no KB chunks for "${activeTopicName}" — skipping (open knowledge disabled)`);
        return { success: false, questions: [], contextEmpty: true, source: "empty" };
      }
      console.warn(
        `⚠️ ${label}: no KB chunks for "${activeTopicName}" — falling back to open LLM syllabus knowledge`
      );
      openKnowledgeUsed = true;
      sourceCounts.open_knowledge = (sourceCounts.open_knowledge || 0) + 1;

      const target = Math.min(QUESTIONS_PER_BATCH, batchSize);
      const batchResult = await generateQuestionsFromContextBatch({
        contextText: "",
        topic: activeTopicName,
        difficulty,
        batchSize: target,
        patternsToInclude: selectedPatterns,
        batchIndex,
        generationPlan: questionPatternEngine.nextBatchPlan({
          plan: planState,
          batchSize: target,
        }),
        subject,
        chapter,
        ragOptimized: false,
        openKnowledge: true,
      });

      if (!batchResult?.success || !batchResult.questions?.length) {
        return { success: false, questions: [], activeTopicName, source: "open_knowledge" };
      }

      console.log(`📦 ${label}: ${batchResult.questions.length}/${target} (rag=open_knowledge)`);
      return {
        success: true,
        questions: batchResult.questions.slice(0, target).map((q) =>
          pickBilingualQuestionFields({
            ...q,
            topic: q.topic || activeTopicName,
            conceptualSource: q.conceptualSource || "open_knowledge",
          })
        ),
        usage: batchResult.usage || {},
        model: batchResult.model || "",
        activeTopicName,
        label,
        source: "open_knowledge",
      };
    }

    chunksUsed += Math.max(1, picked.chunksRetrieved || 1);

    const target = Math.min(QUESTIONS_PER_BATCH, batchSize);
    const batchResult = await generateQuestionsFromContextBatch({
      contextText,
      topic: activeTopicName,
      difficulty,
      batchSize: target,
      patternsToInclude: selectedPatterns,
      batchIndex,
      generationPlan: questionPatternEngine.nextBatchPlan({
        plan: planState,
        batchSize: target,
      }),
      subject,
      chapter,
      ragOptimized: true,
      openKnowledge: false,
    });

    if (!batchResult?.success || !batchResult.questions?.length) {
      return { success: false, questions: [], activeTopicName, source: picked.source };
    }

    console.log(`📦 ${label}: ${batchResult.questions.length}/${target} (rag=${picked.source})`);

    return {
      success: true,
      questions: batchResult.questions.slice(0, target).map((q) =>
        pickBilingualQuestionFields({
          ...q,
          topic: q.topic || activeTopicName,
          conceptualSource: q.conceptualSource || q.sourceChunk || q.sourceParagraph || activeTopicName,
        })
      ),
      usage: batchResult.usage || {},
      model: batchResult.model || "",
      activeTopicName,
      label,
      source: picked.source,
    };
  };

  const mergeBatch = async (batchResult, completedBatches) => {
    if (!batchResult.success) {
      await AssignedPracticeTest.findByIdAndUpdate(assignedPracticeId, {
        $inc: { "generationProgress.failedBatches": 1 },
      });
      return;
    }

    modelUsed = batchResult.model || modelUsed;
    const totals = usageTotals(batchResult.usage || {});
    inputTokens += totals.input;
    outputTokens += totals.output;
    totalTokens += totals.total;

    generatedQuestions.push(...batchResult.questions);
    const uniq = dedupeByQuestion(generatedQuestions);
    generatedQuestions.length = 0;
    generatedQuestions.push(...uniq);

    // Keep totalQuestions = TARGET (not live pool size) so UI target stays 50/100
    const patch = {
      "generationProgress.generatedQuestions": Math.min(
        TARGET_QUESTIONS,
        generatedQuestions.filter(isCompletePracticeQuestion).length
      ),
      totalQuestions: TARGET_QUESTIONS,
    };
    if (typeof completedBatches === "number") {
      patch["generationProgress.completedBatches"] = completedBatches;
      patch[`generationProgress.batchSteps.${completedBatches - 1}`] = true;
    }
    // Live preview: only COMPLETE stems, capped at target (extras stay in-memory until finalize)
    const completePreview = generatedQuestions
      .filter(isCompletePracticeQuestion)
      .slice(0, TARGET_QUESTIONS)
      .map((q) => pickBilingualQuestionFields(q));
    patch.questions = completePreview;
    await AssignedPracticeTest.findByIdAndUpdate(assignedPracticeId, { $set: patch });
  };

  for (let batch = 0; batch < TOTAL_BATCHES; batch += 1) {
    // Fill the unique pool (e.g. 70) so we can drop duplicates and still show 50
    if (generatedQuestions.length >= GENERATE_POOL) {
      console.log(
        `✅ Pool filled early (${generatedQuestions.length}/${GENERATE_POOL}) — skipping planned batch ${batch + 1}/${TOTAL_BATCHES}`
      );
      break;
    }

    await updateProgress(assignedPracticeId, {
      "generationProgress.currentBatch": batch + 1,
      "generationProgress.currentStep": `batch_${batch + 1}`,
      "generationProgress.readingNotes": true,
      "generationProgress.cleaningHtml": true,
      "generationProgress.completedBatches": batch,
      "generationProgress.generatedQuestions": Math.min(TARGET_QUESTIONS, generatedQuestions.length),
    });

    const batchResult = await runOneBatch({
      batchSize: QUESTIONS_PER_BATCH,
      batchIndex: batch,
      label: `Batch ${batch + 1}`,
    });

    if (batchResult.contextEmpty) {
      await AssignedPracticeTest.findByIdAndUpdate(assignedPracticeId, {
        $inc: { "generationProgress.failedBatches": 1 },
      });
      continue;
    }

    await mergeBatch(batchResult, batch + 1);

    if (generatedQuestions.length >= GENERATE_POOL) {
      console.log(
        `✅ Pool filled after batch ${batch + 1} (${generatedQuestions.length}/${GENERATE_POOL}, show ${TARGET_QUESTIONS}) — finishing`
      );
      break;
    }

    const completeAfterBatch = generatedQuestions.filter((q) => isCompletePracticeQuestion(q)).length;
    if (completeAfterBatch >= TARGET_QUESTIONS) {
      console.log(
        `✅ Target complete after batch ${batch + 1} (${completeAfterBatch}/${TARGET_QUESTIONS}) — skipping remaining planned batches`
      );
      break;
    }
  }

  await updateProgress(assignedPracticeId, {
    "generationProgress.generatedQuestions": Math.min(TARGET_QUESTIONS, generatedQuestions.length),
    "generationProgress.currentStep":
      generatedQuestions.length >= TARGET_QUESTIONS ? "finalizing" : "topup",
  });
  // Mark steps complete in UI when target is met (or finished planned batches)
  const batchStepPatch = {};
  const doneBatches =
    generatedQuestions.length >= TARGET_QUESTIONS
      ? TOTAL_BATCHES
      : Math.min(
          TOTAL_BATCHES,
          Math.max(1, Math.ceil(generatedQuestions.length / QUESTIONS_PER_BATCH))
        );
  for (let i = 0; i < doneBatches; i += 1) {
    batchStepPatch[`generationProgress.batchSteps.${i}`] = true;
  }
  batchStepPatch["generationProgress.completedBatches"] = doneBatches;
  await updateProgress(assignedPracticeId, batchStepPatch);

  let topup = 0;
  let stallRounds = 0;
  const countCompleteNow = () =>
    generatedQuestions.filter((q) => isCompletePracticeQuestion(q)).length;

  while (generatedQuestions.length < GENERATE_POOL && topup < MAX_TOPUP_BATCHES) {
    // Once we already have enough COMPLETE stems for the test, skip buffer fill
    // (UI shows Finalizing; extra top-ups were making it feel stuck for minutes)
    const completeNow = countCompleteNow();
    if (completeNow >= TARGET_QUESTIONS) {
      console.log(
        `⏭️ Have ${completeNow} complete (≥${TARGET_QUESTIONS}) — skipping buffer top-up (pool ${generatedQuestions.length}/${GENERATE_POOL})`
      );
      break;
    }

    const gap = GENERATE_POOL - generatedQuestions.length;
    const need = Math.min(
      QUESTIONS_PER_BATCH,
      Math.max(3, TARGET_QUESTIONS - completeNow + 1),
      gap <= 2 ? Math.min(QUESTIONS_PER_BATCH, gap + 2) : Math.min(QUESTIONS_PER_BATCH, gap)
    );
    const before = generatedQuestions.length;

    console.log(
      `📝 RAG top-up ${topup + 1}/${MAX_TOPUP_BATCHES}: complete=${completeNow}/${TARGET_QUESTIONS}, pool=${before}/${GENERATE_POOL}, requesting ${need}...`
    );

    await updateProgress(assignedPracticeId, {
      "generationProgress.currentStep": `topup_${topup + 1}`,
      "generationProgress.generatedQuestions": Math.min(TARGET_QUESTIONS, completeNow),
    });

    const batchResult = await runOneBatch({
      batchSize: need,
      batchIndex: TOTAL_BATCHES + topup * 2 + stallRounds,
      label: `Top-up ${topup + 1}`,
    });

    await mergeBatch(batchResult, undefined);
    topup += 1;

    if (generatedQuestions.length >= GENERATE_POOL) break;
    if (countCompleteNow() >= TARGET_QUESTIONS) break;

    if (generatedQuestions.length === before) {
      stallRounds += 1;
      if (stallRounds >= 4) {
        console.warn(`⚠️ RAG top-up stalled after ${stallRounds} rounds with no new unique questions`);
        break;
      }
    } else {
      stallRounds = 0;
    }
  }

  // Guarantee user-facing count (e.g. 50) — keep RAG-refilling until complete uniques exist
  if (generatedQuestions.length < TARGET_QUESTIONS) {
    const hardRounds = Math.min(
      20,
      Math.max(8, TARGET_QUESTIONS - generatedQuestions.length + 5)
    );
    console.log(
      `🔁 Hard refill: ${generatedQuestions.length}/${TARGET_QUESTIONS}, up to ${hardRounds} more RAG batches...`
    );
    for (let h = 0; h < hardRounds && generatedQuestions.length < TARGET_QUESTIONS; h += 1) {
      const gap = TARGET_QUESTIONS - generatedQuestions.length;
      const need = Math.min(QUESTIONS_PER_BATCH, Math.max(3, gap));
      const before = generatedQuestions.length;
      const batchResult = await runOneBatch({
        batchSize: need,
        batchIndex: 30 + h * 2,
        label: `Hard-refill ${h + 1}`,
      });
      await mergeBatch(batchResult, undefined);
      if (generatedQuestions.length === before) {
        console.warn(`⚠️ Hard-refill ${h + 1}: no new uniques (still ${before}/${TARGET_QUESTIONS})`);
      }
    }
  } else if (generatedQuestions.length < GENERATE_POOL) {
    console.log(
      `⏭️ Stopping at ${generatedQuestions.length}/${GENERATE_POOL} uniquely (show ${TARGET_QUESTIONS}; buffer optional)`
    );
  }

  const rebuildPools = () => {
    const { unique, duplicates } = partitionUniqueAndDupes(generatedQuestions);
    const complete = [];
    const incomplete = [];
    for (const q of unique) {
      if (isCompletePracticeQuestion(q)) complete.push(q);
      else incomplete.push({ ...q, backupReason: "incomplete" });
    }
    return { unique, duplicates, complete, incomplete };
  };

  let pools = rebuildPools();

  // After filtering incomplete stems, top up again until TARGET complete questions
  let guarantee = 0;
  const MAX_GUARANTEE = 15;
  while (pools.complete.length < TARGET_QUESTIONS && guarantee < MAX_GUARANTEE) {
    const gap = TARGET_QUESTIONS - pools.complete.length;
    const need = Math.min(QUESTIONS_PER_BATCH, Math.max(3, gap + 1));
    console.log(
      `🧱 Guarantee refill ${guarantee + 1}: complete=${pools.complete.length}/${TARGET_QUESTIONS}, requesting ${need}...`
    );
    await updateProgress(assignedPracticeId, {
      "generationProgress.currentStep": `guarantee_${guarantee + 1}`,
      "generationProgress.generatedQuestions": Math.min(TARGET_QUESTIONS, pools.complete.length),
    });
    const before = pools.complete.length;
    const batchResult = await runOneBatch({
      batchSize: need,
      batchIndex: 80 + guarantee * 3,
      label: `Guarantee ${guarantee + 1}`,
    });
    await mergeBatch(batchResult, undefined);
    pools = rebuildPools();
    guarantee += 1;
    if (pools.complete.length === before) {
      console.warn(`⚠️ Guarantee ${guarantee}: no new complete questions`);
      if (guarantee >= 3 && pools.complete.length === before) {
        // Allow open knowledge only if still short and KB keeps failing to add completes
        break;
      }
    }
  }

  const completePool = pools.complete;
  const incompletePool = pools.incomplete;
  const duplicatePool = pools.duplicates;

  let poolForFinal = completePool.map((q) => ensureFullQuestionStem(q));
  let finalQuestions = poolForFinal
    .map((q) => pickBilingualQuestionFields(q))
    .slice(0, TARGET_QUESTIONS);

  // Hindi only for the final set (not the buffer) — huge token savings
  if (isPracticeBatchHindiEnabled() && finalQuestions.length > 0) {
    await updateProgress(assignedPracticeId, {
      "generationProgress.currentStep": "translating_hindi",
      "generationProgress.generatedQuestions": finalQuestions.length,
      "generationProgress.completedBatches": TOTAL_BATCHES,
    });
    console.log(`🌐 Translating ${finalQuestions.length} final questions to Hindi (not buffer)…`);
    finalQuestions = await translatePracticeQuestionsToHindi(finalQuestions);
  }

  const extraBackups = poolForFinal.slice(TARGET_QUESTIONS).map((q) => ({
    ...q,
    backupReason: q.backupReason || "extra",
  }));
  const backupQuestions = [
    ...extraBackups,
    ...duplicatePool,
    ...incompletePool,
  ].map((q) => pickBilingualQuestionFields(q));

  const generationTimeMs = Date.now() - startedAt;
  const estimatedCostUsd = Number(((totalTokens / 1000) * ESTIMATED_COST_PER_1K_TOKENS_USD).toFixed(6));

  // Must hit the exact user target (50/100) — partial sets are failed so admin regenerates/refills
  const isReady = finalQuestions.length >= TARGET_QUESTIONS;
  const errorMessage = isReady
    ? backupQuestions.length
      ? `Removed/held ${backupQuestions.length} duplicate/incomplete/extra question(s) in backup. Showing ${finalQuestions.length}.`
      : openKnowledgeUsed
        ? "Some batches used open syllabus knowledge because knowledge base had no matching chunks."
        : ""
    : `Only ${finalQuestions.length}/${TARGET_QUESTIONS} complete questions after RAG refill. Sync more PDF/notes chunks or try again.`;

  const primarySource =
    sourceCounts.qdrant > 0
      ? "rag_qdrant"
      : sourceCounts.mongo > 0 || sourceCounts.stored_chunks > 0
        ? "rag_mongo"
        : sourceCounts.open_knowledge > 0
          ? "open_knowledge"
          : sourceCounts.live_fallback > 0
            ? "live_fallback"
            : "rag";

  await AssignedPracticeTest.findByIdAndUpdate(assignedPracticeId, {
    $set: {
      status: isReady ? "ready" : "failed",
      errorMessage,
      totalQuestions: finalQuestions.length,
      questions: finalQuestions,
      backupQuestions,
      "generationProgress.isComplete": true,
      "generationProgress.currentStep": isReady ? "completed" : "failed",
      "generationProgress.generatedQuestions": finalQuestions.length,
      "generationStats.inputTokens": inputTokens,
      "generationStats.outputTokens": outputTokens,
      "generationStats.totalTokens": totalTokens,
      "generationStats.estimatedCostUsd": estimatedCostUsd,
      "generationStats.generationTimeMs": generationTimeMs,
      "generationStats.chunksRetrieved": chunksUsed,
      "generationStats.modelUsed": modelUsed,
      "generationStats.notesSource": primarySource,
      "generationStats.ragSources": sourceCounts,
      "generationStats.backupCount": backupQuestions.length,
      "generationStats.poolGenerated": generatedQuestions.length,
    },
  });

  console.log(
    `✅ Assigned practice ${assignedPracticeId}: q=${finalQuestions.length}/${TARGET_QUESTIONS} (+${backupQuestions.length} backup), pool=${generatedQuestions.length}, in=${inputTokens}, out=${outputTokens}, total=${totalTokens}, model=${modelUsed}, cost~$${estimatedCostUsd}, time=${generationTimeMs}ms, source=${primarySource}, rag=${JSON.stringify(sourceCounts)}`
  );
}

async function translatePracticeQuestionsToHindi(questions) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || !Array.isArray(questions) || questions.length === 0) return questions;

  // Skip questions that already have Devanagari stems
  const needHi = [];
  const keepIdx = [];
  questions.forEach((q, i) => {
    if (/[\u0900-\u097F]/.test(String(q.question_hi || ""))) return;
    needHi.push(q);
    keepIdx.push(i);
  });
  if (!needHi.length) {
    console.log(`🌐 Practice Hindi: all ${questions.length} already have Hindi — skip`);
    return questions;
  }

  try {
    const { batchTranslatePracticeQuestionsToHindi } = await import("../testGenerationService.js");
    if (typeof batchTranslatePracticeQuestionsToHindi !== "function") return questions;
    console.log(`🌐 Practice Hindi: translating ${needHi.length}/${questions.length} missing…`);
    const translated = await batchTranslatePracticeQuestionsToHindi(
      apiKey,
      getPracticeTranslationModel(),
      needHi
    );
    const withHi = translated.filter((q) => /[\u0900-\u097F]/.test(String(q.question_hi || ""))).length;
    console.log(`🌐 Practice Hindi attached: ${withHi}/${translated.length}`);

    const out = questions.map((q) =>
      pickBilingualQuestionFields({
        ...q,
        conceptualSource: q.conceptualSource || q.sourceChunk || q.questionType || "",
      })
    );
    translated.forEach((tq, j) => {
      const idx = keepIdx[j];
      if (idx == null) return;
      out[idx] = pickBilingualQuestionFields({
        ...out[idx],
        ...tq,
        conceptualSource: tq.conceptualSource || out[idx].conceptualSource || "",
      });
    });
    return out;
  } catch (err) {
    console.warn("Practice Hindi translation skipped:", err.message);
    return questions;
  }
}

export default { runAssignedPracticeGeneration };
