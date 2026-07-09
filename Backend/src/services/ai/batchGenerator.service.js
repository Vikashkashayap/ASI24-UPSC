import AssignedPracticeTest from "../../models/AssignedPracticeTest.js";
import { retrieverService } from "./retriever.service.js";
import { generateQuestionsFromContextBatch } from "./questionGenerator.service.js";
import { ALL_PATTERN_IDS, resolveNotesPatterns } from "../../config/questionPatterns.js";
import { questionPatternEngine } from "./questionPatternEngine.js";
import { pickBilingualQuestionFields } from "../questionTranslationService.js";
import { syncTopicFromUrl } from "../notes/notesSync.service.js";
import ContentTopic from "../../models/ContentTopic.js";
import {
  getPracticeTranslationModel,
  isPracticeEnglishOnly,
  isPracticeBatchHindiEnabled,
} from "../../config/openRouterConfig.js";

const QUESTIONS_PER_BATCH = 10;
const TOTAL_BATCHES = 5;
const MIN_ACCEPTABLE_QUESTIONS = parseInt(process.env.PRACTICE_MIN_ACCEPTABLE_QUESTIONS, 10) || 45;
const MAX_TOPUP_BATCHES = parseInt(process.env.PRACTICE_MAX_TOPUP_BATCHES, 10) || 4;
const ESTIMATED_COST_PER_1K_TOKENS_USD = parseFloat(process.env.PRACTICE_COST_PER_1K_TOKENS_USD || "0.00035");
const MAX_BATCH_RETRIES = Math.max(1, Math.min(4, parseInt(process.env.PRACTICE_BATCH_RETRIES, 10) || 2));

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
    questionCount: 50,
    patternsToInclude: selectedPatterns,
  });
  let inputTokens = 0;
  let outputTokens = 0;
  let totalTokens = 0;
  let chunksRetrieved = 0;
  let modelUsed = "";
  const generatedQuestions = [];

  for (let batch = 0; batch < TOTAL_BATCHES; batch += 1) {
    const activeTopicId = topicIds[batch % topicIds.length];
    await AssignedPracticeTest.findByIdAndUpdate(assignedPracticeId, {
      $set: { "generationProgress.currentBatch": batch + 1 },
    });

    let contextText = await retrieverService.getContextForBatch({
      topicId: activeTopicId,
      batchIndex: batch,
      topicName,
      subject,
    });
    let retrievedChunks = await retrieverService.retrieveTopChunks({
      topicId: activeTopicId,
      query: `${subject} ${topicName}`,
      topK: 5,
    });

    // If selected topic has missing/empty content, auto re-sync from Notes source and retry once.
    if (!contextText || !retrievedChunks.length) {
      try {
        const topic = await ContentTopic.findById(activeTopicId).lean();
        if (topic?.sourceUrl) {
          await syncTopicFromUrl({ topicId: activeTopicId, topicUrl: topic.sourceUrl });
          contextText = await retrieverService.getContextForBatch({
            topicId: activeTopicId,
            batchIndex: batch,
            topicName,
            subject,
          });
          retrievedChunks = await retrieverService.retrieveTopChunks({
            topicId: activeTopicId,
            query: `${subject} ${topicName}`,
            topK: 5,
          });
        }
      } catch (syncErr) {
        console.warn(`⚠️ Topic auto-resync failed for ${activeTopicId}: ${syncErr.message}`);
      }
    }

    if (!contextText || !retrievedChunks.length) {
      await AssignedPracticeTest.findByIdAndUpdate(assignedPracticeId, {
        $inc: { "generationProgress.failedBatches": 1 },
      });
      continue;
    }

    chunksRetrieved += retrievedChunks.length;

    let batchResult = null;
    for (let attempt = 1; attempt <= MAX_BATCH_RETRIES; attempt += 1) {
      batchResult = await generateQuestionsFromContextBatch({
        contextText,
        topic: topicName,
        difficulty,
        batchSize: QUESTIONS_PER_BATCH,
        patternsToInclude: selectedPatterns,
        batchIndex: batch,
        generationPlan: questionPatternEngine.nextBatchPlan({ plan: planState, batchSize: QUESTIONS_PER_BATCH }),
        subject,
        chapter,
      });
      if (batchResult.success && batchResult.questions.length) break;
    }

    if (!batchResult?.success || !batchResult.questions?.length) {
      await AssignedPracticeTest.findByIdAndUpdate(assignedPracticeId, {
        $inc: { "generationProgress.failedBatches": 1 },
      });
      continue;
    }

    modelUsed = batchResult.model || modelUsed;
    const totals = usageTotals(batchResult.usage || {});
    inputTokens += totals.input;
    outputTokens += totals.output;
    totalTokens += totals.total;
    const strictContextQuestions = (batchResult.questions || []).filter(
      (q) => String(q.conceptualSource || q.sourceChunk || "").trim().length > 0
    );
    generatedQuestions.push(
      ...strictContextQuestions.map((q) =>
        pickBilingualQuestionFields({
          ...q,
          conceptualSource: q.conceptualSource || q.sourceChunk || q.questionType || "",
        })
      )
    );
    const uniq = dedupeByQuestion(generatedQuestions);
    generatedQuestions.length = 0;
    generatedQuestions.push(...uniq);

    await AssignedPracticeTest.findByIdAndUpdate(assignedPracticeId, {
      $set: {
        questions: generatedQuestions,
        totalQuestions: generatedQuestions.length,
        "generationProgress.completedBatches": batch + 1,
        "generationProgress.generatedQuestions": generatedQuestions.length,
      },
    });
  }

  // Top-up pass: if any batch under-produced, request only remaining count.
  let topup = 0;
  while (generatedQuestions.length < 50 && topup < MAX_TOPUP_BATCHES) {
    const need = Math.min(10, 50 - generatedQuestions.length);
    const activeTopicId = topicIds[(TOTAL_BATCHES + topup) % topicIds.length];
    const contextText = await retrieverService.getContextForBatch({
      topicId: activeTopicId,
      batchIndex: TOTAL_BATCHES + topup,
      topicName,
      subject,
    });
    if (!contextText) break;
    const batchResult = await generateQuestionsFromContextBatch({
      contextText,
      topic: topicName,
      difficulty,
      batchSize: need,
      patternsToInclude: selectedPatterns,
      batchIndex: TOTAL_BATCHES + topup,
      generationPlan: questionPatternEngine.nextBatchPlan({ plan: planState, batchSize: need }),
      subject,
      chapter,
    });
    if (!batchResult?.success || !batchResult.questions?.length) {
      topup += 1;
      continue;
    }
    const totals = usageTotals(batchResult.usage || {});
    inputTokens += totals.input;
    outputTokens += totals.output;
    totalTokens += totals.total;
    const strictContextQuestions = (batchResult.questions || []).filter(
      (q) => String(q.conceptualSource || q.sourceChunk || "").trim().length > 0
    );
    generatedQuestions.push(
      ...strictContextQuestions.map((q) =>
        pickBilingualQuestionFields({
          ...q,
          conceptualSource: q.conceptualSource || q.sourceChunk || q.questionType || "",
        })
      )
    );
    const uniq = dedupeByQuestion(generatedQuestions);
    generatedQuestions.length = 0;
    generatedQuestions.push(...uniq);
    topup += 1;
  }

  const generationTimeMs = Date.now() - startedAt;
  const estimatedCostUsd = Number(((totalTokens / 1000) * ESTIMATED_COST_PER_1K_TOKENS_USD).toFixed(6));
  let finalQuestions = generatedQuestions;
  if (isPracticeEnglishOnly() && isPracticeBatchHindiEnabled()) {
    finalQuestions = await translatePracticeQuestionsToHindi(finalQuestions);
  }
  const isReady = generatedQuestions.length >= MIN_ACCEPTABLE_QUESTIONS;
  const errorMessage = isReady
    ? finalQuestions.length < 50
      ? `Generated ${finalQuestions.length}/50 questions from notes (acceptable threshold reached).`
      : ""
    : `Only ${finalQuestions.length}/50 questions generated from notes.`;

  await AssignedPracticeTest.findByIdAndUpdate(assignedPracticeId, {
    $set: {
      status: isReady ? "ready" : "failed",
      errorMessage,
      totalQuestions: finalQuestions.length,
      questions: finalQuestions,
      "generationProgress.isComplete": true,
      "generationStats.inputTokens": inputTokens,
      "generationStats.outputTokens": outputTokens,
      "generationStats.totalTokens": totalTokens,
      "generationStats.estimatedCostUsd": estimatedCostUsd,
      "generationStats.generationTimeMs": generationTimeMs,
      "generationStats.chunksRetrieved": chunksRetrieved,
      "generationStats.modelUsed": modelUsed,
    },
  });

  console.log(
    `✅ Assigned practice ${assignedPracticeId}: q=${finalQuestions.length}, in=${inputTokens}, out=${outputTokens}, total=${totalTokens}, chunks=${chunksRetrieved}, model=${modelUsed}, cost~$${estimatedCostUsd}, time=${generationTimeMs}ms`
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
