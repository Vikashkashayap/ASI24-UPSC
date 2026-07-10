import AssignedPracticeTest from "../../models/AssignedPracticeTest.js";
import { generateQuestionsFromContextBatch } from "./questionGenerator.service.js";
import { ALL_PATTERN_IDS, resolveNotesPatterns } from "../../config/questionPatterns.js";
import { questionPatternEngine } from "./questionPatternEngine.js";
import { pickBilingualQuestionFields } from "../questionTranslationService.js";
import { notesService } from "../notes/notes.service.js";
import {
  getPracticeTranslationModel,
  isPracticeEnglishOnly,
  isPracticeBatchHindiEnabled,
} from "../../config/openRouterConfig.js";
import { countWords } from "./tokenEstimator.service.js";
import { prepareContextForBatch } from "./contextReducer.service.js";

const QUESTIONS_PER_BATCH = 10;
const TOTAL_BATCHES = 5;
const TARGET_QUESTIONS = 50;
const MIN_ACCEPTABLE_QUESTIONS = parseInt(process.env.PRACTICE_MIN_ACCEPTABLE_QUESTIONS, 10) || 50;
const MAX_TOPUP_BATCHES = parseInt(process.env.PRACTICE_MAX_TOPUP_BATCHES, 10) || 20;
const ESTIMATED_COST_PER_1K_TOKENS_USD = parseFloat(process.env.PRACTICE_COST_PER_1K_TOKENS_USD || "0.00035");

function usageTotals(usage = {}) {
  const input = usage.prompt_tokens || 0;
  const output = usage.completion_tokens || 0;
  return { input, output, total: usage.total_tokens || input + output };
}

function dedupeByQuestion(questions = []) {
  const seen = new Set();
  const out = [];
  for (const q of questions) {
    const key = String(q.question || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .slice(0, 140);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(q);
  }
  return out;
}

async function updateProgress(assignedPracticeId, patch) {
  await AssignedPracticeTest.findByIdAndUpdate(assignedPracticeId, { $set: patch });
}

/**
 * BatchGenerator — 5 × 10 questions.
 * Each request uses ONE topic only (never chapter / never multi-topic merge).
 */
export async function runAssignedPracticeGeneration({
  assignedPracticeId,
  topicIds = [],
  topicName = "",
  subject = "",
  chapter = "",
  difficulty = "moderate",
  patternsToInclude = [],
}) {
  const startedAt = Date.now();
  const selectedPatterns = resolveNotesPatterns(patternsToInclude?.length ? patternsToInclude : ALL_PATTERN_IDS);
  const planState = questionPatternEngine.createPlan({
    questionCount: TARGET_QUESTIONS,
    patternsToInclude: selectedPatterns,
  });
  let inputTokens = 0;
  let outputTokens = 0;
  let totalTokens = 0;
  let modelUsed = "";
  let chunksUsed = 0;
  const generatedQuestions = [];

  const uniqueTopicIds = [...new Set((topicIds || []).map((id) => String(id)).filter(Boolean))];
  if (!uniqueTopicIds.length) {
    await updateProgress(assignedPracticeId, {
      status: "failed",
      errorMessage: "Select at least one topic from Notes",
      "generationProgress.isComplete": true,
      "generationProgress.currentStep": "failed",
    });
    return;
  }

  // Step 1: Reading Notes — fetch each selected topic separately (never whole chapter)
  await updateProgress(assignedPracticeId, {
    "generationProgress.currentStep": "reading_notes",
    "generationProgress.readingNotes": true,
    "generationProgress.cleaningHtml": false,
  });

  let topicNotesMap;
  try {
    const topicNotesList = await notesService.fetchAndCleanTopicsNotes(uniqueTopicIds);
    topicNotesMap = new Map(topicNotesList.map((n) => [String(n.topic._id), n]));
  } catch (fetchErr) {
    await updateProgress(assignedPracticeId, {
      status: "failed",
      errorMessage: fetchErr.message || "Failed to fetch notes from website",
      "generationProgress.isComplete": true,
      "generationProgress.currentStep": "failed",
    });
    return;
  }

  await updateProgress(assignedPracticeId, {
    "generationProgress.currentStep": "cleaning_html",
    "generationProgress.readingNotes": true,
    "generationProgress.cleaningHtml": true,
  });

  /**
   * Pick ONE topic for this batch index — never concatenate topics (Rule 1).
   * Rotate across selected topics; prefer topics with enough notes text.
   */
  const pickSingleTopicContext = (batchIndex) => {
    const usable = uniqueTopicIds.filter((id) => {
      const t = topicNotesMap.get(String(id));
      return (t?.cleanText || "").length >= 80;
    });
    const pool = usable.length ? usable : uniqueTopicIds;
    const activeTopicId = pool[batchIndex % pool.length];
    const topicNotes = topicNotesMap.get(String(activeTopicId));
    const fullText = topicNotes?.cleanText || "";
    const activeTopicName = topicNotes?.topic?.name || topicName;

    const preview = prepareContextForBatch(fullText, { batchIndex });
    console.log(
      `📚 Batch context: topic="${activeTopicName}" words=${countWords(fullText)} → chunk ${preview.chunkIndex + 1}/${preview.totalChunks || 1} (~${preview.tokens} tokens)`
    );

    return {
      topicId: activeTopicId,
      topicName: activeTopicName,
      contextText: fullText,
      previewTokens: preview.tokens,
    };
  };

  const runOneBatch = async ({ batchSize, batchIndex, label }) => {
    const picked = pickSingleTopicContext(batchIndex);
    const contextText = picked.contextText;
    const activeTopicName = picked.topicName;

    if (!contextText || contextText.length < 80) {
      return { success: false, questions: [], contextEmpty: true };
    }

    chunksUsed += 1;

    // Single generator call (internally fills to target) — avoids nested API storms
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
    });

    if (!batchResult?.success || !batchResult.questions?.length) {
      return { success: false, questions: [], activeTopicName };
    }

    console.log(`📦 ${label}: ${batchResult.questions.length}/${target}`);

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

    const patch = {
      questions: generatedQuestions,
      totalQuestions: generatedQuestions.length,
      "generationProgress.generatedQuestions": generatedQuestions.length,
    };
    if (typeof completedBatches === "number") {
      patch["generationProgress.completedBatches"] = completedBatches;
      patch[`generationProgress.batchSteps.${completedBatches - 1}`] = true;
    }
    await AssignedPracticeTest.findByIdAndUpdate(assignedPracticeId, { $set: patch });
  };

  // Rule 5: exactly 5 batches × 10 questions
  for (let batch = 0; batch < TOTAL_BATCHES; batch += 1) {
    await updateProgress(assignedPracticeId, {
      "generationProgress.currentBatch": batch + 1,
      "generationProgress.currentStep": `batch_${batch + 1}`,
      "generationProgress.readingNotes": true,
      "generationProgress.cleaningHtml": true,
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
  }

  // Ensure UI shows all 5 batch steps done before top-up refill
  await updateProgress(assignedPracticeId, {
    "generationProgress.completedBatches": TOTAL_BATCHES,
    "generationProgress.batchSteps.0": true,
    "generationProgress.batchSteps.1": true,
    "generationProgress.batchSteps.2": true,
    "generationProgress.batchSteps.3": true,
    "generationProgress.batchSteps.4": true,
    "generationProgress.generatedQuestions": generatedQuestions.length,
    "generationProgress.currentStep":
      generatedQuestions.length >= TARGET_QUESTIONS ? "completed" : "topup",
  });

  // Top-up until exactly 50 — over-request to beat duplicates / incomplete-stem drops
  let topup = 0;
  let stallRounds = 0;
  while (generatedQuestions.length < TARGET_QUESTIONS && topup < MAX_TOPUP_BATCHES) {
    const gap = TARGET_QUESTIONS - generatedQuestions.length;
    // Ask for more than the gap so rejects/dupes still leave enough unique Qs
    const need = Math.min(
      QUESTIONS_PER_BATCH,
      gap <= 2 ? Math.min(QUESTIONS_PER_BATCH, gap + 4) : Math.min(QUESTIONS_PER_BATCH, gap + 2)
    );
    const before = generatedQuestions.length;

    console.log(
      `📝 Notes top-up ${topup + 1}/${MAX_TOPUP_BATCHES}: ${before}/${TARGET_QUESTIONS}, requesting ${need} (gap ${gap})...`
    );

    await updateProgress(assignedPracticeId, {
      "generationProgress.currentStep": `topup_${topup + 1}`,
      "generationProgress.generatedQuestions": generatedQuestions.length,
    });

    // Jump topic/chunk index so top-ups don't reuse the same thin slice
    const batchResult = await runOneBatch({
      batchSize: need,
      batchIndex: TOTAL_BATCHES + topup * 2 + stallRounds,
      label: `Top-up ${topup + 1}`,
    });

    await mergeBatch(batchResult, undefined);
    topup += 1;

    if (generatedQuestions.length === before) {
      stallRounds += 1;
      if (stallRounds >= 8) {
        console.warn(`⚠️ Notes top-up stalled after ${stallRounds} rounds with no new unique questions`);
        break;
      }
    } else {
      stallRounds = 0;
    }
  }

  // Final hard refill if still short (different topic rotation seed)
  if (generatedQuestions.length < TARGET_QUESTIONS) {
    const hardRounds = Math.min(10, TARGET_QUESTIONS - generatedQuestions.length + 3);
    console.log(
      `🔁 Hard refill: ${generatedQuestions.length}/${TARGET_QUESTIONS}, up to ${hardRounds} more batches...`
    );
    for (let h = 0; h < hardRounds && generatedQuestions.length < TARGET_QUESTIONS; h += 1) {
      const gap = TARGET_QUESTIONS - generatedQuestions.length;
      const need = Math.min(QUESTIONS_PER_BATCH, Math.max(3, gap + 2));
      const before = generatedQuestions.length;
      const batchResult = await runOneBatch({
        batchSize: need,
        batchIndex: 17 + h * 3,
        label: `Hard-refill ${h + 1}`,
      });
      await mergeBatch(batchResult, undefined);
      if (generatedQuestions.length === before) {
        // try next topic seed immediately
        continue;
      }
    }
  }

  const generationTimeMs = Date.now() - startedAt;
  const estimatedCostUsd = Number(((totalTokens / 1000) * ESTIMATED_COST_PER_1K_TOKENS_USD).toFixed(6));
  let finalQuestions = generatedQuestions.slice(0, TARGET_QUESTIONS);
  if (isPracticeEnglishOnly() && isPracticeBatchHindiEnabled()) {
    finalQuestions = await translatePracticeQuestionsToHindi(finalQuestions);
  }
  // Require full 50 — do not mark ready with a short set
  const isReady = finalQuestions.length >= Math.min(MIN_ACCEPTABLE_QUESTIONS, TARGET_QUESTIONS);
  const errorMessage = isReady
    ? finalQuestions.length < TARGET_QUESTIONS
      ? `Generated ${finalQuestions.length}/${TARGET_QUESTIONS} questions from notes (short of target).`
      : ""
    : `Only ${finalQuestions.length}/${TARGET_QUESTIONS} questions generated from notes. Please try again.`;

  await AssignedPracticeTest.findByIdAndUpdate(assignedPracticeId, {
    $set: {
      status: isReady ? "ready" : "failed",
      errorMessage,
      totalQuestions: finalQuestions.length,
      questions: finalQuestions,
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
      "generationStats.notesSource": "live_fetch",
    },
  });

  console.log(
    `✅ Assigned practice ${assignedPracticeId}: q=${finalQuestions.length}/${TARGET_QUESTIONS}, in=${inputTokens}, out=${outputTokens}, total=${totalTokens}, model=${modelUsed}, cost~$${estimatedCostUsd}, time=${generationTimeMs}ms (token-optimized, 1 topic/request)`
  );
}

async function translatePracticeQuestionsToHindi(questions) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || !Array.isArray(questions) || questions.length === 0) return questions;
  try {
    const { batchTranslatePracticeQuestionsToHindi } = await import("../testGenerationService.js");
    if (typeof batchTranslatePracticeQuestionsToHindi !== "function") return questions;
    const translated = await batchTranslatePracticeQuestionsToHindi(
      apiKey,
      getPracticeTranslationModel(),
      questions
    );
    const withHi = translated.filter((q) => /[\u0900-\u097F]/.test(String(q.question_hi || ""))).length;
    console.log(`🌐 Practice Hindi attached: ${withHi}/${translated.length}`);
    return translated.map((q) =>
      pickBilingualQuestionFields({
        ...q,
        conceptualSource: q.conceptualSource || q.sourceChunk || q.questionType || "",
      })
    );
  } catch (err) {
    console.warn("Practice Hindi translation skipped:", err.message);
    return questions;
  }
}

export default { runAssignedPracticeGeneration };
