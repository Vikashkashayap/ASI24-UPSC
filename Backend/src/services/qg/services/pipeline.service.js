/**
 * Enterprise UPSC Prelims Question Generation Pipeline
 *
 * Hybrid Retrieve → Rerank → Context Merge → Generate → Verify → Explain → Fact-Check → Score → Persist
 *
 * Never generates without retrieved context. Never skips verification.
 */

import { QG_CONFIG } from "../config/qg.config.js";
import { hybridRetrieve } from "./hybridRetrieval.service.js";
import { rerankChunks } from "./rerank.service.js";
import { buildMergedContext } from "./contextBuilder.service.js";
import { generateQuestionsStage } from "./questionGen.service.js";
import { verifyAnswerStage } from "./answerVerifier.service.js";
import { generateExplanationStage } from "./explanationGen.service.js";
import { formatExplanationText } from "../prompts/explanation.prompt.js";
import { factCheckStage } from "./factVerifier.service.js";
import { scoreQuestionQuality } from "./qualityScorer.service.js";
import {
  findSimilarQuestion,
  questionFingerprint,
} from "./duplicateDetector.service.js";
import { recordPipelineMetrics } from "./metrics.service.js";
import { saveGeneratedSet, findCachedSet } from "../repositories/generatedMcq.repository.js";
import { getModelForStage } from "../providers/llmRouter.js";
import { ensureEnglishBilingualFields } from "../../questionTranslationService.js";
import {
  lockAnswerToOptions,
  lockExplanationToAnswer,
  checkAnswerExplanationConsistency,
} from "../utils/consistency.js";
import { buildInlinePracticeExplanation } from "../utils/practiceExplain.js";

function normalizeDifficultyLabel(d) {
  const v = String(d || "medium").toLowerCase();
  if (v === "easy") return "Easy";
  if (v === "hard") return "Hard";
  return "Medium";
}

/** Run async work over items with a fixed concurrency pool. */
async function mapWithConcurrency(items, concurrency, fn) {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return [];
  const results = new Array(list.length);
  let next = 0;
  const workers = Math.max(1, Math.min(concurrency || 1, list.length));

  async function worker() {
    while (true) {
      const i = next;
      next += 1;
      if (i >= list.length) break;
      results[i] = await fn(list[i], i);
    }
  }

  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

function mergeTimings(target, local = {}) {
  for (const [k, v] of Object.entries(local)) {
    target[k] = (target[k] || 0) + (Number(v) || 0);
  }
}

/**
 * Retrieve + rerank + merge context (shared by batch & full pipeline).
 */
export async function retrieveAndBuildContext(params = {}) {
  const query =
    String(params.query || "").trim() ||
    [params.subject, params.topic].filter(Boolean).join(" ").trim();

  const retrieval = await hybridRetrieve({
    query,
    subject: params.subject,
    topic: params.topic,
    topicId: params.topicId,
    sourceUrlId: params.sourceUrlId || params.chapterId,
    chapterId: params.chapterId,
    bookId: params.bookId,
    book: params.book,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    excludeChunkIds: params.excludeChunkIds,
  });

  const reranked = await rerankChunks({
    query,
    chunks: retrieval.chunks,
    topN: QG_CONFIG.hybrid.finalTopK,
  });

  const merged = buildMergedContext(reranked.chunks, {
    maxTokens: params.maxTokens || QG_CONFIG.context.maxTokens,
  });

  return {
    query,
    contextText: merged.contextText,
    chunks: reranked.chunks,
    chunkIds: merged.chunkIds,
    tokens: merged.tokens,
    retrieval,
    rerank: reranked,
    source: retrieval.source,
    durationMs: (retrieval.durationMs || 0) + (reranked.durationMs || 0),
  };
}

async function processOneQuestion({
  draft,
  contextText,
  chunks,
  meta,
  timings,
}) {
  const started = Date.now();
  const localTimings = {
    generationMs: 0,
    verificationMs: 0,
    explanationMs: 0,
    factCheckMs: 0,
  };
  let regenerations = 0;
  let question = { ...draft };
  let verification = null;
  let explanation = null;
  let factCheck = null;
  const practiceMode = Boolean(meta.practiceMode);

  const finish = (payload) => {
    if (timings) mergeTimings(timings, localTimings);
    return { ...payload, durationMs: Date.now() - started };
  };

  // Duplicate gate
  const dup = await findSimilarQuestion({
    questionText: question.question,
    subject: meta.subject,
    topic: meta.topic,
  });
  if (dup.isDuplicate) {
    return finish({
      accepted: false,
      reason: "duplicate",
      duplicate: dup,
      regenerations: 0,
    });
  }

  for (let attempt = 0; attempt <= QG_CONFIG.generation.maxRegenerateAttempts; attempt += 1) {
    if (attempt > 0) {
      regenerations += 1;
      const regen = await generateQuestionsStage({
        contextText,
        count: 1,
        topic: meta.topic,
        subject: meta.subject,
        chapter: meta.chapter,
        book: meta.book,
        difficulty: meta.difficulty,
        patternsToInclude: meta.patternsToInclude,
        existingFingerprints: [questionFingerprint(question.question)],
      });
      if (!regen.questions?.length) {
        return finish({
          accepted: false,
          reason: "regeneration_failed",
          regenerations,
        });
      }
      question = regen.questions[0];
      localTimings.generationMs += regen.durationMs || 0;
    }

    const verifyStarted = Date.now();
    verification = await verifyAnswerStage({ question, contextText });
    localTimings.verificationMs += Date.now() - verifyStarted;

    if (verification.verdict === "reject") {
      if (attempt < QG_CONFIG.generation.maxRegenerateAttempts) continue;
      return finish({
        accepted: false,
        reason: "verification_rejected",
        verification,
        regenerations,
      });
    }

    // Lock verified letter onto the question BEFORE explanation
    if (
      verification.correctAnswer &&
      ["A", "B", "C", "D"].includes(verification.correctAnswer)
    ) {
      question.correctAnswer = verification.correctAnswer;
      question.answer = verification.correctAnswer;
    }

    const optionLock = lockAnswerToOptions(question);
    if (!optionLock.ok) {
      if (attempt < QG_CONFIG.generation.maxRegenerateAttempts) continue;
      return finish({
        accepted: false,
        reason: "option_answer_mismatch",
        verification,
        regenerations,
      });
    }
    question.options = optionLock.options;
    question.options_en = { ...optionLock.options };
    question.correctAnswer = optionLock.correctAnswer;
    question.answer = optionLock.correctAnswer;

    const explainStarted = Date.now();
    if (practiceMode && QG_CONFIG.quality.practiceInlineExplain !== false) {
      explanation = buildInlinePracticeExplanation(question, verification, contextText);
    } else {
      explanation = await generateExplanationStage({
        question,
        contextText,
        meta,
      });
    }
    localTimings.explanationMs += Date.now() - explainStarted;

    if (!explanation.success) {
      if (attempt < QG_CONFIG.generation.maxRegenerateAttempts) continue;
      return finish({
        accepted: false,
        reason: "explanation_failed",
        verification,
        regenerations,
      });
    }

    // Force explanation ↔ answer lock (fixes letter/explain drift)
    const expLock = lockExplanationToAnswer(explanation.structured, question);
    if (!expLock.ok) {
      if (attempt < QG_CONFIG.generation.maxRegenerateAttempts) continue;
      return finish({
        accepted: false,
        reason: "explanation_answer_mismatch",
        verification,
        regenerations,
      });
    }
    explanation.structured = expLock.structured;
    explanation.text = formatExplanationText(expLock.structured, question.correctAnswer);

    const consistency = checkAnswerExplanationConsistency(question, explanation.structured);
    if (!consistency.ok) {
      if (attempt < QG_CONFIG.generation.maxRegenerateAttempts) continue;
      return finish({
        accepted: false,
        reason: consistency.reason || "consistency_failed",
        verification,
        regenerations,
      });
    }

    const skipFact =
      practiceMode &&
      QG_CONFIG.quality.practiceSkipFactCheck &&
      Number(verification.confidence || 0) >= QG_CONFIG.quality.practiceSkipFactConfidence &&
      !(verification.optionIssues || []).length &&
      !verification.hallucinationDetected;

    if (skipFact) {
      factCheck = {
        verdict: "accept",
        confidence: verification.confidence,
        skipped: true,
        reason: "practice_high_confidence_verify",
      };
    } else {
      const factStarted = Date.now();
      factCheck = await factCheckStage({
        question,
        explanation: explanation.structured,
        contextText,
      });
      localTimings.factCheckMs += Date.now() - factStarted;

      if (factCheck.verdict === "reject") {
        if (attempt < QG_CONFIG.generation.maxRegenerateAttempts) continue;
        return finish({
          accepted: false,
          reason: "fact_check_rejected",
          verification,
          factCheck,
          regenerations,
        });
      }
    }

    break;
  }

  const scores = scoreQuestionQuality({
    chunks,
    verification,
    factCheck,
    question,
    explanation: explanation?.structured,
  });

  if (!scores.passesThreshold) {
    return finish({
      accepted: false,
      reason: scores.consistencyOk === false || scores.answerOptionOk === false
        ? "consistency_below_threshold"
        : "quality_below_threshold",
      scores,
      verification,
      factCheck,
      regenerations,
    });
  }

  const generationTimeMs = Date.now() - started;
  const enriched = ensureEnglishBilingualFields({
    ...question,
    explanation: explanation.text,
    explanation_en: explanation.text,
    explanationStructured: explanation.structured,
    qualityScores: scores,
    contextRelevanceScore: scores.contextRelevanceScore,
    factConfidenceScore: scores.factConfidenceScore,
    optionQualityScore: scores.optionQualityScore,
    explanationQualityScore: scores.explanationQualityScore,
    overallAiConfidence: scores.overallAiConfidence,
    similarityScore: scores.similarityScore,
    verification,
    factCheck,
    chunkIds: (chunks || []).map((c) => String(c._id || c.mongoChunkId || "")).filter(Boolean),
    subject: meta.subject || question.subject || "",
    topic: meta.topic || question.topic || "",
    subtopic: meta.subtopic || "",
    book: meta.book || question.book || "",
    chapter: meta.chapter || question.chapter || "",
    difficulty: question.difficulty || meta.difficulty || "medium",
    language: meta.language || QG_CONFIG.language,
    exam: meta.exam || QG_CONFIG.exam,
    generationTimeMs,
    modelUsed: {
      question: getModelForStage("question"),
      verification: verification?.model || getModelForStage("verification"),
      explanation: explanation?.model || getModelForStage("explanation"),
      factCheck: factCheck?.model || getModelForStage("factCheck"),
    },
  });

  return finish({
    accepted: true,
    question: enriched,
    scores,
    verification,
    factCheck,
    regenerations,
  });
}

/**
 * Full pipeline: retrieve → generate N verified questions.
 *
 * @param {{
 *   query?: string,
 *   topic: string,
 *   subject?: string,
 *   topicId?: string,
 *   chapterId?: string,
 *   sourceUrlId?: string,
 *   book?: string,
 *   chapter?: string,
 *   difficulty?: string,
 *   count?: number,
 *   patternsToInclude?: string[],
 *   force?: boolean,
 *   persist?: boolean,
 *   createdBy?: string,
 *   contextText?: string,
 *   chunks?: object[],
 *   skipRetrieval?: boolean,
 * }} params
 */
export async function runQuestionPipeline(params = {}) {
  const overallStarted = Date.now();
  const topic = String(params.topic || "").trim();
  const subject = String(params.subject || "").trim();
  const difficulty = String(params.difficulty || "medium").toLowerCase();
  const count = Math.min(50, Math.max(1, Number(params.count) || 5));
  const persist = params.persist !== false;

  if (!topic && !params.contextText && !params.query) {
    const err = new Error("topic or query or contextText is required");
    err.status = 400;
    throw err;
  }

  const difficultyLabel = normalizeDifficultyLabel(difficulty);

  // Cache short-circuit for full RAG generate API
  if (persist && !params.force && !params.skipRetrieval && topic) {
    const cached = await findCachedSet({
      subject,
      topic,
      difficulty: difficultyLabel,
      count,
    });
    if (cached?.questions?.length) {
      recordPipelineMetrics({ cacheHits: 1, overallMs: Date.now() - overallStarted });
      return {
        cached: true,
        insufficient: false,
        subject,
        topic,
        difficulty: difficultyLabel,
        count: cached.questions.length,
        questions: cached.questions,
        matchedChunks: cached.matchedChunks,
        retrievalSource: cached.retrievalSource,
        message: "Returning cached verified questions",
      };
    }
  }

  const timings = {
    retrievalMs: 0,
    generationMs: 0,
    verificationMs: 0,
    explanationMs: 0,
    factCheckMs: 0,
  };

  let contextText = String(params.contextText || "").trim();
  let chunks = params.chunks || [];
  let retrievalMeta = { source: params.retrievalSource || "provided", breakdown: null };

  if (!params.skipRetrieval || !contextText) {
    const built = await retrieveAndBuildContext({
      query: params.query || `${subject} ${topic}`.trim(),
      subject,
      topic,
      topicId: params.topicId,
      sourceUrlId: params.sourceUrlId,
      chapterId: params.chapterId,
      book: params.book,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      excludeChunkIds: params.excludeChunkIds,
    });
    timings.retrievalMs = built.durationMs;
    contextText = built.contextText;
    chunks = built.chunks;
    retrievalMeta = {
      source: built.source,
      breakdown: built.retrieval?.breakdown,
      rerankProvider: built.rerank?.provider,
      query: built.query,
    };
  }

  if (!contextText || contextText.length < QG_CONFIG.generation.minContextChars) {
    if (!QG_CONFIG.generation.allowOpenKnowledge) {
      return {
        cached: false,
        insufficient: true,
        message: "Insufficient retrieved context. Refusing to generate without knowledge-base evidence.",
        subject,
        topic,
        difficulty: difficultyLabel,
        count: 0,
        questions: [],
        matchedChunks: chunks.length,
        retrievalSource: retrievalMeta.source,
      };
    }
  }

  const meta = {
    subject,
    topic: topic || params.query || "",
    chapter: params.chapter || "",
    book: params.book || "",
    subtopic: params.subtopic || "",
    difficulty,
    language: params.language || QG_CONFIG.language,
    exam: QG_CONFIG.exam,
    patternsToInclude: params.patternsToInclude || [],
    practiceMode: Boolean(params.practiceMode),
  };

  const accepted = [];
  const rejected = [];
  let regenerations = 0;
  let duplicatesSkipped = 0;
  const fingerprints = [];
  const verifyConcurrency = Math.max(
    1,
    Math.min(8, Number(QG_CONFIG.generation.verifyConcurrency) || 4)
  );

  // Generate in batches, then verify/explain in parallel (major speed win)
  while (accepted.length < count) {
    const need = Math.min(
      QG_CONFIG.generation.maxQuestionsPerCall,
      count - accepted.length + 1
    );

    const genStarted = Date.now();
    const generated = await generateQuestionsStage({
      contextText,
      count: need,
      topic: meta.topic,
      subject: meta.subject,
      chapter: meta.chapter,
      book: meta.book,
      difficulty,
      patternsToInclude: meta.patternsToInclude,
      existingFingerprints: fingerprints,
    });
    timings.generationMs += Date.now() - genStarted;

    if (!generated.questions?.length) {
      console.warn("[qg.pipeline] generation returned 0 questions; stopping");
      break;
    }

    const drafts = generated.questions.slice(0, Math.max(need, count - accepted.length + 2));
    const batchResults = await mapWithConcurrency(drafts, verifyConcurrency, (draft) =>
      processOneQuestion({
        draft,
        contextText,
        chunks,
        meta,
        timings,
      })
    );

    for (const result of batchResults) {
      if (!result) continue;
      regenerations += result.regenerations || 0;

      if (result.accepted && accepted.length < count) {
        accepted.push(result.question);
        fingerprints.push(questionFingerprint(result.question.question));
      } else if (!result.accepted) {
        if (result.reason === "duplicate") duplicatesSkipped += 1;
        rejected.push({
          reason: result.reason,
          question: result.question?.question?.slice?.(0, 120) || drafts[0]?.question?.slice?.(0, 120),
        });
      }
    }

    // Safety: avoid infinite loops when everything rejects
    if (rejected.length >= count * 3 && accepted.length === 0) break;
    if (generated.questions.length === 0) break;
  }

  const avgSimilarity =
    chunks.reduce((s, c) => s + (c.rerankScore ?? c.hybridScore ?? c.score ?? 0), 0) /
      (chunks.length || 1) || null;

  const avgConfidence =
    accepted.reduce((s, q) => s + (q.overallAiConfidence || 0), 0) / (accepted.length || 1) || null;

  if (persist && accepted.length && topic) {
    await saveGeneratedSet({
      subject,
      topic,
      difficulty: difficultyLabel,
      count: accepted.length,
      questions: accepted.map((q) => ({
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        explanationStructured: q.explanationStructured,
        difficulty: normalizeDifficultyLabel(q.difficulty),
        subject: q.subject,
        topic: q.topic,
        source: q.sourceParagraph || q.conceptualSource || "",
        similarityScore: q.similarityScore,
        chunkIds: q.chunkIds,
        qualityScores: q.qualityScores,
        overallAiConfidence: q.overallAiConfidence,
        generationTimeMs: q.generationTimeMs,
        modelUsed: q.modelUsed,
        book: q.book,
        chapter: q.chapter,
        exam: q.exam,
        language: q.language,
        questionType: q.questionType,
      })),
      meta: {
        retrievalSource: retrievalMeta.source,
        matchedChunks: chunks.length,
        avgSimilarity,
        createdBy: params.createdBy,
        llmMs: timings.generationMs + timings.verificationMs + timings.explanationMs + timings.factCheckMs,
        pipelineMeta: {
          timings,
          rerankProvider: retrievalMeta.rerankProvider,
          breakdown: retrievalMeta.breakdown,
          rejected: rejected.length,
          regenerations,
        },
      },
    });
  }

  const overallMs = Date.now() - overallStarted;
  recordPipelineMetrics({
    retrievalMs: timings.retrievalMs,
    generationMs: timings.generationMs,
    verificationMs: timings.verificationMs,
    explanationMs: timings.explanationMs,
    factCheckMs: timings.factCheckMs,
    overallMs,
    confidence: avgConfidence,
    similarity: avgSimilarity,
    questionsGenerated: accepted.length,
    questionsRejected: rejected.length,
    duplicatesSkipped,
    regenerations,
  });

  return {
    cached: false,
    insufficient: accepted.length === 0,
    message:
      accepted.length === 0
        ? "No questions passed verification / fact-check against retrieved context."
        : undefined,
    subject,
    topic: meta.topic,
    difficulty: difficultyLabel,
    count: accepted.length,
    questions: accepted,
    rejected,
    matchedChunks: chunks.length,
    retrievalSource: retrievalMeta.source,
    avgSimilarity,
    avgConfidence,
    timings,
    models: {
      question: getModelForStage("question"),
      verification: getModelForStage("verification"),
      explanation: getModelForStage("explanation"),
      factCheck: getModelForStage("factCheck"),
    },
    qualityProfile: QG_CONFIG.qualityProfile,
    contextTokens: undefined,
    regenerations,
    duplicatesSkipped,
    durationMs: overallMs,
  };
}

/**
 * Compatibility entry for Topic Practice batches that already have context.
 * Runs generate → verify → explain → fact-check (skips retrieval).
 * practiceMode=true: parallel verify + skip fact-check when verifier is confident.
 */
export async function generateVerifiedFromContext({
  contextText,
  chunks = [],
  topic = "",
  subject = "",
  chapter = "",
  book = "",
  difficulty = "medium",
  batchSize = 5,
  patternsToInclude = [],
  retrievalSource = "provided",
  practiceMode = false,
} = {}) {
  return runQuestionPipeline({
    contextText,
    chunks,
    skipRetrieval: true,
    topic,
    subject,
    chapter,
    book,
    difficulty,
    count: batchSize,
    patternsToInclude,
    persist: false,
    retrievalSource,
    practiceMode,
  });
}

export default {
  runQuestionPipeline,
  retrieveAndBuildContext,
  generateVerifiedFromContext,
};
