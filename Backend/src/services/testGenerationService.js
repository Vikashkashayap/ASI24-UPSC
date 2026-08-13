import fetch from "node-fetch";
import crypto from "crypto";
import { getFrontendOrigin } from "../config/urlConfig.js";
import { getOpenRouterAppTitle } from "../config/openRouterAppTitle.js";
import { buildMatchQuestionTextForTranslation, parseMatchFollowingFromText, buildMatchColumnsPayload } from "../utils/matchQuestionFormat.js";
import { assertOpenRouterAllowed } from "../middleware/examAiGuard.js";
import {
  getTestGenerationModel,
  getPracticeGenerationModel,
  getPracticeTranslationModel,
  getMaxTokensForTestGeneration,
  getMaxTokensForPracticeGeneration,
  getMaxTokensForPracticeHindiBatch,
  getMixBatchSize,
  getMixGenerateBuffer,
  getPracticeBatchSize,
  getPracticeGenerateBuffer,
  getPracticeMaxRefillBatches,
  getPracticeHindiBatchSize,
  isPracticeEnglishOnly,
  isPracticeBatchHindiEnabled,
} from "../config/openRouterConfig.js";
import {
  ensureEnglishBilingualFields,
  pickBilingualQuestionFields,
  coerceListItemText,
  filterStudentReadyQuestions,
} from "./questionTranslationService.js";
import { ALL_PATTERN_IDS, PYQ_HARD_PATTERN_IDS, resolveNotesPatterns } from "../config/questionPatterns.js";
import { generateQuestionsFromContextBatch } from "./ai/questionGenerator.service.js";
import { questionPatternEngine } from "./ai/questionPatternEngine.js";
import {
  generateUpscPrelimsMockPaper,
  isUpscPrelimsRagEnabled,
} from "./ai/upscPrelimsGenerator.service.js";
import {
  sanitizeHindiMcqFormat,
  sanitizeHindiAssertionReason,
  sanitizeHindiOptions,
} from "../utils/sanitizeHindiMcqFormat.js";
import { getContextForPractice } from "./ai/kbContext.service.js";
import {
  extractClaimedCorrectLetter,
  lockPlainExplanationToAnswer,
} from "./qg/utils/consistency.js";
import {
  filterQuestionsByTopic,
  filterQuestionsByPyqHardness,
} from "./qg/utils/topicRelevance.js";
import {
  getHindiTranslateProvider,
  mtTranslateManyToHindi,
  shouldSkipServerHindiTranslation,
  shouldUseFreeMtHindi,
  shouldUseLlmHindi,
} from "./mtTranslateToHindi.js";

/** GS Prelims uses Admin Knowledge Base RAG (Intelligence hybrid). Set PRELIMS_USE_RAG=false for legacy open LLM. */
export function isPrelimsRagEnabled(examType) {
  return examType === "GS" && process.env.PRELIMS_USE_RAG !== "false";
}

function normalizePrelimsDifficulty(difficulty) {
  const d = String(difficulty || "moderate").toLowerCase();
  if (d === "easy") return "easy";
  if (d === "hard") return "hard";
  return "moderate";
}

/**
 * GS Prelims: prefer Admin Knowledge Base (Intelligence hybrid RAG) for the selected
 * subject + topic. If RAG is empty/short, LLM fills the remainder when allowLlmFallback
 * is true (kbOnly still uses strict topic RAG + PYQ-Hard patterns).
 */
async function generateTestQuestionsFromKnowledgeBase({
  subjects,
  subjectKey,
  subjectName,
  siblingTopics = [],
  topic,
  questionCount,
  difficulty = "Moderate",
  batchSize: batchSizeOverride,
  minAcceptable,
  kbOnly = false,
  /** Prefer KB/RAG first; if missing or short, always allow LLM (overrides PRELIMS_FORCE_KB_ONLY). */
  allowLlmFallback = false,
  /** Force bilingual Hindi even when PRACTICE_GEN_BATCH_HINDI=false. */
  ensureHindi = false,
}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY in environment variables");
  }

  const count = parseInt(questionCount, 10) || 20;
  const minKeep = Math.min(
    count,
    Math.max(1, parseInt(minAcceptable != null ? minAcceptable : count, 10) || count)
  );
  const subjectsList = Array.isArray(subjects) ? subjects : [subjects];
  const primarySubject = String(subjectsList[0] || "").trim();
  const syllabusLabel = String(subjectName || primarySubject).trim();
  const topicQuery = String(topic || "").trim();
  const difficultyKey = normalizePrelimsDifficulty(difficulty);
  // kbOnly / PRELIMS_FORCE_KB_ONLY = strict RAG + PYQ-Hard. LLM fill is a separate switch.
  const forceKbOnly =
    Boolean(kbOnly) ||
    String(process.env.PRELIMS_FORCE_KB_ONLY || "").toLowerCase() === "true";
  const allowOpenKnowledge = !forceKbOnly || Boolean(allowLlmFallback);

  if (!primarySubject || !topicQuery) {
    throw new Error("Subject and topic are required for knowledge-base generation");
  }

  // Admin KB + Intelligence hybrid (same stack as QI / Test Builder)
  // Chapter Targets (kbOnly): pull deeper RAG context for UPSC-Hard grounded stems
  const ragTopK = forceKbOnly
    ? Number(process.env.CHAPTER_KB_TOP_K || process.env.PRELIMS_KB_TOP_K || 20) || 20
    : undefined;
  const ragMaxTokens = forceKbOnly
    ? Number(process.env.CHAPTER_KB_CONTEXT_TOKENS || process.env.PRELIMS_KB_CONTEXT_TOKENS || 3600) ||
      3600
    : undefined;

  const probe = await getContextForPractice({
    subject: primarySubject,
    subjectKey,
    subjectName: syllabusLabel,
    topic: topicQuery,
    siblingTopics,
    batchIndex: 0,
    strictTopic: forceKbOnly,
    ...(ragTopK ? { topK: ragTopK } : {}),
    ...(ragMaxTokens ? { maxTokens: ragMaxTokens } : {}),
  });
  const probeHasOnTopicKb = Boolean(probe.contextText && probe.contextText.length >= 80);
  // Keyword/mongo-only retrieval is often weakly related — prefer LLM sooner
  const probeSource = String(probe.source || "");
  const probeWeakRetrieval =
    probeHasOnTopicKb &&
    !/knowledge_intelligence|knowledge_hybrid|qdrant|hybrid|vector|notes/i.test(probeSource) &&
    /keyword|metadata|mongo/i.test(probeSource);

  if (!probeHasOnTopicKb) {
    if (!allowOpenKnowledge) {
      throw new Error(
        `No matching content found in Knowledge Base for "${topicQuery}" under ${primarySubject}. Upload PDFs in Admin → Knowledge Base (and wait for processing), then try again.`
      );
    }
    console.warn(
      `📭 No on-topic Admin KB for "${topicQuery}" (${primarySubject}) — using LLM open-syllabus fallback`
    );
  } else if (probeWeakRetrieval && allowOpenKnowledge) {
    console.warn(
      `📭 Weak KB retrieval for "${topicQuery}" (source=${probeSource}) — preferring LLM open-syllabus`
    );
  } else if (probeHasOnTopicKb) {
    console.log(
      `📚 Admin KB probe OK for "${topicQuery}" (${probe.subject || primarySubject}) source=${probeSource} chunks=${probe.chunks?.length || 0}`
    );
  }

  let preferOpenKnowledge = !probeHasOnTopicKb || (probeWeakRetrieval && allowOpenKnowledge);
  let openKnowledgeUsed = preferOpenKnowledge;

  // Hard + KB-only (Module Targets): real UPSC Prelims / PYQ pattern mix
  const pyqHardMode = forceKbOnly && difficultyKey === "hard";
  const selectedPatterns = resolveNotesPatterns(
    pyqHardMode ? PYQ_HARD_PATTERN_IDS : ALL_PATTERN_IDS
  );
  const planState = questionPatternEngine.createPlan({
    questionCount: count + Math.min(5, count),
    patternsToInclude: selectedPatterns,
    difficultyProfile: pyqHardMode ? "pyq_hard" : "balanced",
  });
  if (pyqHardMode) {
    console.log(
      `🎯 PYQ-Hard mode ON for "${topicQuery}" — patterns=${selectedPatterns.join(",")} | easy≈0 moderate≈15% hard≈85%`
    );
  }

  const forcedBatch =
    batchSizeOverride != null && Number.isFinite(Number(batchSizeOverride))
      ? Math.min(Math.max(1, parseInt(batchSizeOverride, 10)), count)
      : null;
  const batchSize =
    forcedBatch ||
    Math.min(
      count,
      Math.max(5, parseInt(process.env.TEST_GEN_BATCH_SIZE, 10) || 8),
      parseInt(process.env.QG_MAX_QUESTIONS_PER_CALL, 10) || 10
    );
  const maxBatchRoundsBase = getTestGenMaxBatchRounds(count, batchSize);
  const maxBatchRounds = preferOpenKnowledge
    ? Math.min(maxBatchRoundsBase, Math.ceil(count / Math.min(batchSize, 8)) + 3)
    : maxBatchRoundsBase;
  const usedChunkIds = new Set();
  let validatedQuestions = [];
  let stallRounds = 0;

  if (forceKbOnly && !allowOpenKnowledge) {
    console.warn("⚠️ PRELIMS_FORCE_KB_ONLY / kbOnly — LLM fallback disabled (KB-only)");
  } else if (allowLlmFallback) {
    console.log("ℹ️ LLM fallback enabled — RAG first, then open-syllabus fills any shortfall");
  }

  console.log(
    `📚 Prelims gen: ${count}Q | batchSize=${batchSize} | subject=${primarySubject} | topic="${topicQuery}" | difficulty=${difficultyKey} | mode=${preferOpenKnowledge ? "LLM-fallback" : "KB+LLM-fallback"} | openKnowledge=${allowOpenKnowledge} | maxRounds=${maxBatchRounds} | patterns=${selectedPatterns.length}`
  );

  const runBatch = async ({ need, round, openKnowledge, contextText, ragSource }) => {
    // Ask for extra Qs to absorb incomplete-stem + soft topic drops (caps at 10)
    const askCount = Math.min(10, Math.max(need, Math.ceil(need * 1.35)));
    const batchResult = await generateQuestionsFromContextBatch({
      contextText: openKnowledge ? "" : contextText,
      topic: topicQuery,
      difficulty: difficultyKey,
      batchSize: askCount,
      patternsToInclude: selectedPatterns,
      batchIndex: round,
      generationPlan: questionPatternEngine.nextBatchPlan({
        plan: planState,
        batchSize: askCount,
      }),
      subject: primarySubject,
      chapter: topicQuery,
      siblingTopics,
      ragOptimized: !openKnowledge,
      openKnowledge,
    });

    if (!batchResult?.success || !batchResult.questions?.length) {
      return [];
    }

    const mapped = batchResult.questions.slice(0, askCount).map((q) =>
      pickBilingualQuestionFields({
        ...q,
        topic: q.topic || topicQuery,
        subject: q.subject || primarySubject,
        conceptualSource:
          q.conceptualSource ||
          q.sourceParagraph ||
          (openKnowledge ? "open_knowledge" : ragSource || "kb"),
      })
    );

    // LLM open-syllabus already has TOPIC LOCK in the prompt — soft filter only
    // (strict keyword filter was dropping valid Economy Qs that don't say "evolution")
    // Abstract chapter titles (e.g. "The Geographical Setting") also use soft via isQuestionOnTopic
    let onTopic = filterQuestionsByTopic(mapped, topicQuery, {
      soft: Boolean(openKnowledge),
      subjectKey,
      subjectName: syllabusLabel,
      siblingTopics,
    });
    // KB strict filter — do not relax to soft for chapter practice (kbOnly)
    if (
      !openKnowledge &&
      !forceKbOnly &&
      mapped.length > 0 &&
      onTopic.dropped > 0 &&
      onTopic.questions.length < Math.ceil(mapped.length * 0.5)
    ) {
      const softPass = filterQuestionsByTopic(mapped, topicQuery, {
        soft: true,
        subjectKey,
        subjectName: syllabusLabel,
        siblingTopics,
      });
      if (softPass.questions.length > onTopic.questions.length) {
        console.warn(
          `⚠️ Prelims batch ${round + 1}: relaxed topic filter ${onTopic.questions.length}→${softPass.questions.length} for "${topicQuery}" (KB soft)`
        );
        onTopic = softPass;
      }
    }
    if (onTopic.dropped > 0) {
      console.warn(
        `⚠️ Prelims batch ${round + 1}: dropped ${onTopic.dropped} off-topic question(s) for "${topicQuery}" (${openKnowledge ? "LLM-soft" : "KB"})`
      );
    }

    let kept = onTopic.questions;
    if (pyqHardMode && kept.length) {
      const hardPass = filterQuestionsByPyqHardness(kept);
      if (hardPass.dropped > 0) {
        console.warn(
          `⚠️ Prelims batch ${round + 1}: dropped ${hardPass.dropped} easy/one-liner Q(s) (PYQ-Hard filter)`
        );
      }
      // If filter wiped the batch, keep softest survivors only when nothing else remains
      if (hardPass.questions.length) kept = hardPass.questions;
      else if (kept.length) {
        console.warn(
          `⚠️ Prelims batch ${round + 1}: PYQ-Hard filter emptied batch — keeping ${kept.length} for refill`
        );
      }
    }
    return kept;
  };

  for (let round = 0; validatedQuestions.length < count && round < maxBatchRounds; round += 1) {
    const beforeLen = validatedQuestions.length;
    const need = Math.min(batchSize, count - validatedQuestions.length);

    let openKnowledge = preferOpenKnowledge;
    let contextText = "";
    let ragSource = "";

    if (!openKnowledge) {
      const rag = await getContextForPractice({
        subject: primarySubject,
        subjectKey,
        subjectName: syllabusLabel,
        topic: topicQuery,
        siblingTopics,
        batchIndex: round,
        excludeChunkIds: [...usedChunkIds],
        strictTopic: forceKbOnly,
        ...(ragTopK ? { topK: ragTopK } : {}),
        ...(ragMaxTokens ? { maxTokens: ragMaxTokens } : {}),
      });
      for (const id of rag.chunkIds || []) usedChunkIds.add(id);

      const kbEmpty = !rag.contextText || rag.contextText.length < 80;
      if (kbEmpty) {
        if (!allowOpenKnowledge) {
          console.warn(
            `⚠️ Prelims batch ${round + 1}: no on-topic Admin KB chunks — skipping (open knowledge disabled)`
          );
          stallRounds += 1;
          if (stallRounds >= 5) break;
          continue;
        }
        openKnowledge = true;
        preferOpenKnowledge = true;
        openKnowledgeUsed = true;
        console.warn(
          `⚠️ Prelims batch ${round + 1}: no on-topic Admin KB — switching to LLM open-syllabus`
        );
      } else {
        contextText = rag.contextText || "";
        ragSource = rag.source || "knowledge_intelligence";
        console.log(
          `📚 Prelims batch ${round + 1}: Admin KB source=${ragSource} chunks=${rag.chunks?.length || 0} ~${rag.tokens || 0} tokens`
        );
      }
    } else {
      openKnowledgeUsed = true;
      console.log(`🤖 Prelims batch ${round + 1}: LLM open-syllabus for "${topicQuery}"`);
    }

    let kept = await runBatch({
      need,
      round,
      openKnowledge,
      contextText,
      ragSource,
    });

    // KB returned nothing useful / all off-topic → LLM retry for this round
    if (!kept.length && !openKnowledge && allowOpenKnowledge) {
      console.warn(
        `⚠️ Prelims batch ${round + 1}: KB produced 0 on-topic Qs — retrying via LLM`
      );
      preferOpenKnowledge = true;
      openKnowledgeUsed = true;
      kept = await runBatch({
        need,
        round,
        openKnowledge: true,
        contextText: "",
        ragSource: "",
      });
    }

    if (!kept.length) {
      console.warn(`⚠️ Prelims batch ${round + 1} returned 0 on-topic questions`);
      stallRounds += 1;
      if (stallRounds >= 5) break;
      continue;
    }

    validatedQuestions = dedupeMockPaperQuestions([...validatedQuestions, ...kept], {
      csat: false,
    }).slice(0, count);

    console.log(
      `📈 Prelims progress: ${validatedQuestions.length}/${count} on-topic (batch ${round + 1}/${maxBatchRounds})`
    );

    // Prefer filling toward count. Do not early-stop on a tiny minKeep (e.g. 1 of 8).
    if (
      validatedQuestions.length >= minKeep &&
      minKeep < count &&
      minKeep >= Math.ceil(count * 0.8)
    ) {
      console.log(
        `✅ Early stop at ${validatedQuestions.length}/${count} (minKeep=${minKeep}) — enough for paper`
      );
      break;
    }

    if (validatedQuestions.length === beforeLen) {
      stallRounds += 1;
    } else {
      stallRounds = 0;
    }
  }

  // KB/RAG shortfall → LLM open-syllabus top-up (deduped against already-kept stems)
  const fillTarget = allowLlmFallback ? count : minKeep;
  if (validatedQuestions.length < fillTarget && allowOpenKnowledge) {
    const shortfall = fillTarget - validatedQuestions.length;
    const topUpRounds = Math.min(8, Math.ceil(shortfall / Math.max(1, batchSize)) + 3);
    console.warn(
      `⚠️ Prelims short ${validatedQuestions.length}/${fillTarget} for "${topicQuery}" — LLM top-up (${topUpRounds} rounds, no repeats)`
    );
    preferOpenKnowledge = true;
    openKnowledgeUsed = true;
    for (let i = 0; i < topUpRounds && validatedQuestions.length < fillTarget; i += 1) {
      const need = Math.min(batchSize, count - validatedQuestions.length);
      const kept = await runBatch({
        need,
        round: maxBatchRounds + i,
        openKnowledge: true,
        contextText: "",
        ragSource: "",
      });
      if (!kept.length) continue;
      validatedQuestions = dedupeMockPaperQuestions([...validatedQuestions, ...kept], {
        csat: false,
      }).slice(0, count);
      console.log(
        `📈 Prelims LLM top-up: ${validatedQuestions.length}/${count} unique (round ${i + 1}/${topUpRounds})`
      );
    }
  }

  if (validatedQuestions.length === 0) {
    throw new Error(
      `Could not generate on-topic questions for "${topicQuery}". Please try again or refine the topic.`
    );
  }

  if (validatedQuestions.length < minKeep) {
    if (allowLlmFallback) {
      console.warn(
        `⚠️ Prelims gen: ${validatedQuestions.length}/${minKeep} after RAG+LLM for "${topicQuery}" — returning unique set for caller top-up`
      );
    } else {
      throw new Error(
        `Only ${validatedQuestions.length} of ${count} on-topic questions could be generated for "${topicQuery}". Please try again.`
      );
    }
  }

  if (validatedQuestions.length < count) {
    console.warn(
      `⚠️ Prelims gen: got ${validatedQuestions.length}/${count} (acceptable ≥${minKeep}) — continuing`
    );
  }

  console.log(
    `✅ Prelims generated ${validatedQuestions.length} on-topic questions` +
      (openKnowledgeUsed ? " (LLM open-syllabus used)" : " (KB-grounded)")
  );

  let readyQuestions = finalizeGeneratedQuestions(validatedQuestions);

  // Practice-style: keep generation explanations; LLM polish only for stubs
  readyQuestions = await ensurePrelimsExplanationsPracticeStyle(apiKey, readyQuestions);

  if (isPracticeBatchHindiEnabled() || ensureHindi) {
    const provider = getHindiTranslateProvider();
    if (shouldSkipServerHindiTranslation()) {
      console.log(
        `🌐 Prelims RAG: Hindi skipped (HINDI_TRANSLATE_PROVIDER=${provider}) — exam UI free Google translate, 0 OpenRouter tokens`
      );
    } else {
      console.log(
        `🌐 Prelims RAG: translating ${readyQuestions.length} questions to Hindi via ${provider}…`
      );
      readyQuestions = await batchTranslatePracticeQuestionsToHindi(
        apiKey,
        getPracticeTranslationModel(),
        readyQuestions
      );
      readyQuestions = readyQuestions.map((q) => pickBilingualQuestionFields(q));
    }
  }

  const withHi = readyQuestions.filter((q) =>
    /[\u0900-\u097F]/.test(String(q.question_hi || ""))
  ).length;
  console.log(
    `✅ Prelims RAG ready: ${readyQuestions.length}Q (${withHi} with Hindi, explanations 50–100 words, all-option teaching)`
  );

  return {
    success: true,
    questions: readyQuestions,
    count: readyQuestions.length,
    source: openKnowledgeUsed ? "knowledge_base+open" : "knowledge_base",
  };
}

/** True when explanation teaches the correct answer (compact 50–100 word style is enough). */
export function hasTeachingExplanation(q) {
  const minTeach = Math.max(40, parseInt(process.env.QG_EXPLAIN_MIN_WORDS, 10) || 50);
  const raw = q?.explanation_en ?? q?.explanation;
  if (raw && typeof raw === "object") {
    const keys = ["A", "B", "C", "D"];
    const answer = String(q.correctAnswer || q.answer || "A").toUpperCase();
    const correctWords = String(raw[answer] || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
    if (correctWords >= minTeach) return true;
    const filled = keys.filter((k) => {
      const t = String(raw[k] || "").trim();
      if (!t || /common distractor|see the correct option/i.test(t)) return false;
      return t.split(/\s+/).filter(Boolean).length >= 12;
    });
    return filled.length >= 2;
  }
  const text = String(raw || "").replace(/\s+/g, " ").trim();
  if (!text) return false;
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words < minTeach) return false;
  const mentionsWrong =
    /\boption\s+[a-d]\b.*\b(incorrect|wrong|not|fail|eliminat|distract)/i.test(text) ||
    (/\boption\s+[a-d]\b/gi.test(text) && (text.match(/\boption\s+[a-d]\b/gi) || []).length >= 2);
  return mentionsWrong || words >= minTeach;
}

/** Combined English explanation text from string or per-option object. */
function getPlainExplanationText(q) {
  const raw = q?.explanation_en ?? q?.explanation;
  if (!raw) return "";
  if (typeof raw === "string") return raw.replace(/\s+/g, " ").trim();
  if (typeof raw === "object") {
    const keys = ["A", "B", "C", "D"];
    const parts = keys
      .map((k) => {
        const t = String(raw[k] || "").trim();
        return t ? `Option ${k}: ${t}` : "";
      })
      .filter(Boolean);
    if (parts.length) return parts.join(" ").replace(/\s+/g, " ").trim();
    const ca = String(q.correctAnswer || q.answer || "A").toUpperCase();
    return String(raw[ca] || raw.A || "").replace(/\s+/g, " ").trim();
  }
  return "";
}

function countExplanationWords(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

/** Cap explanation length (default 100 words — matches generation prompt, saves polish tokens). */
function clampExplanationToSeventy(text) {
  const cleaned = String(text || "").replace(/\s+/g, " ").trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  const maxW = Math.max(70, parseInt(process.env.QG_EXPLAIN_MAX_WORDS, 10) || 100);
  if (words.length <= maxW) return cleaned;
  return `${words.slice(0, maxW).join(" ").replace(/[.,;:]+$/, "")}.`;
}

function isGenericStubExplanation(text) {
  const t = String(text || "").trim();
  if (!t) return true;
  if (
    /see the correct option explanation above|common distractor for this topic|does not match the notes and is a common/i.test(
      t
    )
  ) {
    return true;
  }
  return t.split(/\s+/).filter(Boolean).length < 18;
}

/** Build {A,B,C,D} teaching explanations — full text on CORRECT only; distinct wrong reasons kept. */
function toPerOptionExplanations(q, explanationText) {
  const answer = String(q.correctAnswer || q.answer || "A").toUpperCase().charAt(0) || "A";
  const existing = q.explanation_en ?? q.explanation;

  // Prefer a single teaching paragraph on the correct option
  const locked = lockPlainExplanationToAnswer(
    explanationText || getPlainExplanationText(q),
    q
  );
  const text = clampExplanationToSeventy(locked.explanation || explanationText || "");

  const out = { A: "", B: "", C: "", D: "" };

  // If existing already has DISTINCT wrong-option reasons, keep them; drop duplicates of correct
  if (existing && typeof existing === "object") {
    const correctExisting = String(existing[answer] || "").trim();
    const correctNorm = correctExisting.toLowerCase().replace(/\s+/g, " ");
    for (const k of ["A", "B", "C", "D"]) {
      if (k === answer) continue;
      const t = String(existing[k] || "").trim();
      if (!t || isGenericStubExplanation(t)) continue;
      const n = t.toLowerCase().replace(/\s+/g, " ");
      if (
        correctNorm &&
        (n === correctNorm ||
          (correctNorm.length >= 40 && n.includes(correctNorm.slice(0, 80))) ||
          (n.length >= 40 && correctNorm.includes(n.slice(0, 80))))
      ) {
        continue;
      }
      // Keep only short distinct elimination reasons
      out[k] = clampExplanationToSeventy(t);
    }
  }

  out[answer] =
    text ||
    (existing && typeof existing === "object"
      ? clampExplanationToSeventy(String(existing[answer] || "").trim())
      : "");

  return out;
}

function applyLockedPrelimsExplanation(q, explanationText) {
  const perOpt = toPerOptionExplanations(q, explanationText);
  // Clear useless "generated" source noise
  const src = String(q.conceptualSource || "").trim();
  const cleanSrc =
    !src || /^(generated|ai|llm|n\/?a|none)$/i.test(src) ? undefined : q.conceptualSource;
  return {
    ...q,
    explanation: perOpt,
    explanation_en: perOpt,
    ...(cleanSrc === undefined ? { conceptualSource: undefined } : {}),
  };
}

/**
 * Only polish when explanation is missing/stub/wrong-letter.
 * Generation already asks for 50–100 word teaching paragraphs — do NOT force
 * a second expansion pass (that was burning OpenRouter tokens).
 */
function needsPrelimsExplanationRewrite(q) {
  const answer = String(q.correctAnswer || q.answer || "").toUpperCase();
  const minW = Math.max(40, parseInt(process.env.QG_EXPLAIN_MIN_WORDS, 10) || 50);
  const text = getPlainExplanationText(q);
  const words = countExplanationWords(text);

  if (!answer) return true;
  if (!text || isGenericStubExplanation(text) || words < minW) return true;

  const claimed = extractClaimedCorrectLetter(text);
  if (claimed && claimed !== answer) return true;

  // Compact teaching paragraph from generation is enough — skip LLM polish
  return false;
}

/**
 * Practice-style explanations: keep generation's 50–100 word teaching text.
 * LLM polish only for missing/stub/wrong-letter cases (token-cheap).
 */
export async function ensurePrelimsExplanationsPracticeStyle(apiKey, questions) {
  if (!Array.isArray(questions) || questions.length === 0) return questions;

  let out = questions.map((q) => applyLockedPrelimsExplanation(q, getPlainExplanationText(q)));

  const rewriteIdx = [];
  out.forEach((q, i) => {
    if (needsPrelimsExplanationRewrite(q)) rewriteIdx.push(i);
  });

  if (!rewriteIdx.length) {
    console.log(
      `📝 Prelims explanations: all ${out.length} already OK (50–100 words) — skipped polish (0 API calls)`
    );
    return out.map((q) => pickBilingualQuestionFields(q));
  }

  console.log(
    `📝 Prelims explanations: polishing ${rewriteIdx.length}/${out.length} weak stubs (compact 50–80 words)…`
  );

  const payload = rewriteIdx.map((i) => {
    const q = out[i];
    const opts = q.options_en || q.options || {};
    const answer = String(q.correctAnswer || q.answer || "A").toUpperCase();
    return {
      id: i,
      answer,
      correctOptionText: String(opts[answer] || "").slice(0, 100),
      question: String(q.question_en || q.question || "").slice(0, 220),
      options: {
        A: String(opts.A || "").slice(0, 80),
        B: String(opts.B || "").slice(0, 80),
        C: String(opts.C || "").slice(0, 80),
        D: String(opts.D || "").slice(0, 80),
      },
    };
  });

  const systemPrompt = `You write concise UPSC CSE Prelims MCQ explanations.
Return ONLY a JSON array. Each item: { "id": number, "explanation": string }

HARD RULES:
1. ONE English paragraph only — 50–80 words total (hard max 90). Do NOT write separate A/B/C/D essays.
2. Start with: Option {answer} ("{correctOptionText}") is correct.
3. Why it is right (1–2 facts) + one short clause why each wrong option fails.
4. Answer letter + correctOptionText are LOCKED — never claim another letter is correct.
5. No markdown, no Hindi, no bullets. Same id order/count as input.`;

  const chunkSize = Math.max(
    4,
    Math.min(10, parseInt(process.env.QG_EXPLAIN_POLISH_CHUNK, 10) || 8)
  );
  for (let start = 0; start < payload.length; start += chunkSize) {
    const chunk = payload.slice(start, start + chunkSize);
    try {
      const { aiContent } = await callOpenRouterTestGeneration({
        apiKey,
        model: getPracticeTranslationModel(),
        systemPrompt,
        userPrompt: `Write compact 50–80 word explanations. Match answer letter+text:\n${JSON.stringify(chunk)}`,
        // ~120 tokens out per Q → keep ceiling low
        maxTokens: Math.min(2200, 160 * chunk.length + 200),
        apiTitle: getOpenRouterAppTitle("UPSC Mentor - Prelims Explanation Polish"),
      });

      let parsed = null;
      try {
        parsed = JSON.parse(
          String(aiContent || "")
            .trim()
            .replace(/^```\s*(?:json)?\s*/i, "")
            .replace(/\s*```\s*$/, "")
        );
      } catch (_) {
        parsed = extractJsonFromContent(aiContent);
      }
      const rows = Array.isArray(parsed) ? parsed : parsed?.explanations || [];
      for (const row of rows) {
        const id = Number(row?.id);
        if (!Number.isInteger(id) || !out[id]) continue;
        const per =
          row?.explanations && typeof row.explanations === "object"
            ? row.explanations
            : null;
        if (per && ["A", "B", "C", "D"].some((k) => String(per[k] || "").trim().length >= 20)) {
          // Rare legacy shape — collapse to one teaching paragraph on correct
          out[id] = applyLockedPrelimsExplanation(
            { ...out[id], explanation: per, explanation_en: per },
            getPlainExplanationText({ ...out[id], explanation: per })
          );
          continue;
        }
        const polished = String(row?.explanation || "").trim();
        if (countExplanationWords(polished) < 40) continue;
        out[id] = applyLockedPrelimsExplanation(out[id], polished);
      }
    } catch (err) {
      console.warn("Prelims explanation polish batch failed:", err?.message || err);
    }
  }

  // Final lock + clamp for every item
  out = out.map((q) => applyLockedPrelimsExplanation(q, getPlainExplanationText(q)));

  const stillBad = out.filter((q) => needsPrelimsExplanationRewrite(q)).length;
  if (stillBad) {
    console.warn(`⚠️ Prelims explanations: ${stillBad} still weak after compact polish`);
  } else {
    console.log(`✅ Prelims explanations: ${out.length} ready (compact; polish only when needed)`);
  }

  return out.map((q) => pickBilingualQuestionFields(q));
}

function usesFullBilingualExplanations() {
  return process.env.TEST_GEN_FULL_BILINGUAL_EXPLANATIONS === "true";
}

/** Compact prompts for admin Prelims Mock (default). Set TEST_GEN_FULL_MOCK_VERBOSE=true for legacy long prompts. */
function usesCompactFullMockPrompts() {
  return process.env.TEST_GEN_FULL_MOCK_VERBOSE !== "true";
}

/** Compact but strict: answer letter ↔ option text ↔ explanation must never disagree. */
const ANSWER_OPTION_LOCK = `
ANSWER↔OPTION LOCK (mandatory — never ship a mismatch):
1. Decide the correct OPTION TEXT first, then place it under one letter (A|B|C|D).
2. Set "answer" to THAT letter only. Do not pick a letter first then invent text.
3. explanation MUST open with: Option {answer} ("{exact options text}") is correct.
4. Then explain WHY correct is right AND WHY each of the other three options is wrong (teaching style).
5. Target 50–70 words; hard max 100. Never say Option X is correct when answer is Y.
6. Self-check before emit: options[answer] is the true correct text.`;

const PRELIMS_ENGLISH_JSON_RULES = `
JSON array only. Each object (English only — no Hindi fields):
- question (complete stem)
- options: { "A","B","C","D" }
- answer: A|B|C|D — letter of the correct option text
- explanation: 50–100 English words teaching explanation — correct reason + why each wrong option fails.
${ANSWER_OPTION_LOCK}`;

const PRELIMS_COMPACT_JSON_RULES = `
JSON array only. Each object (no extra text):
- question_en, question_hi (Devanagari, same meaning)
- options_en, options_hi: { "A","B","C","D" } — letter mapping identical in EN/HI (A_hi translates A_en, never reorder)
- answer: A|B|C|D — letter of the correct option text
- explanation: 50–100 English words teaching explanation — correct reason + why each wrong option fails. Do NOT include explanation_hi.
${ANSWER_OPTION_LOCK}`;

const BILINGUAL_JSON_RULES_FULL = `
BILINGUAL OUTPUT (English + Hindi in the SAME object):
- question_en, question_hi, options_en, options_hi (same meaning in Hindi; same letter→text mapping)
- explanation_en, explanation_hi: { "A","B","C","D" } — one brief sentence per option; correct letter's sentence must defend that letter
- answer: A|B|C|D
${ANSWER_OPTION_LOCK}`;

/** Full bilingual schema for full-mock generators. */
const BILINGUAL_JSON_RULES = BILINGUAL_JSON_RULES_FULL;

function getPrelimsJsonRules() {
  // Default: English-only generation (Hindi filled later by exam UI / optional batch translate)
  if (isPracticeEnglishOnly()) {
    return PRELIMS_ENGLISH_JSON_RULES;
  }
  return usesFullBilingualExplanations() ? BILINGUAL_JSON_RULES_FULL : PRELIMS_COMPACT_JSON_RULES;
}

function getPracticeJsonRules() {
  if (isPracticeEnglishOnly()) {
    return `Each object: question (stem), options{"A","B","C","D"}, answer (A-D = letter of correct option text), explanation (50–100 English words: open with Option {answer} is correct; justify why correct AND why EACH of the other three options is wrong — student concept clarity).
${ANSWER_OPTION_LOCK}`;
  }
  return usesFullBilingualExplanations() ? BILINGUAL_JSON_RULES_FULL : PRELIMS_COMPACT_JSON_RULES;
}

function practiceBatchJsonNote() {
  if (isPracticeEnglishOnly()) return "English only.";
  return bilingualBatchJsonNote();
}

/**
 * Normalize bilingual fields from the generation prompt (no separate Hindi translation API).
 */
function finalizeGeneratedQuestions(questions) {
  const normalized = questions.map(ensureEnglishBilingualFields);
  const ready = filterStudentReadyQuestions(normalized);
  const withHindi = ready.filter(
    (q) => String(q.question_hi || "").trim() && String(q.options_hi?.A || "").trim()
  ).length;
  console.log(
    `✅ ${ready.length}/${normalized.length} question(s) student-ready (${withHindi} with Hindi; blank/incomplete stems dropped)`
  );
  return ready;
}

/** Generate unique question ID for deduplication (hash of normalized question text). */
function hashQuestion(questionText) {
  const normalized = String(questionText || "").trim().replace(/\s+/g, " ");
  return crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 24);
}

/** Strip HTML tags for fingerprinting (LLMs often wrap stems in <p>, <b>, etc.). */
function stripHtmlForFingerprint(html) {
  return String(html || "").replace(/<[^>]+>/g, " ");
}

function getQuestionText(q) {
  if (!q || typeof q !== "object") return "";
  return String(q.question_en ?? q.question ?? q.questionText ?? "").trim();
}

function getQuestionOptions(q) {
  if (!q || typeof q !== "object") return {};
  return q.options_en ?? q.options ?? {};
}

const UPSC_STEM_PREFIX_RE =
  /^(consider the following statements?[:\.]?\s*|with reference to .*?[,\.]?\s*|which of the following (statements?|is\/are correct|is\/are incorrect|is\/are not correct)[:\.]?\s*|how many of the above.*?[:\.]?\s*|match the following.*?[:\.]?\s*)/i;

/**
 * Normalize text so two visually identical stems (HTML vs plain, extra spaces) dedupe together.
 */
function normalizeTextForFingerprint(raw) {
  let s = stripHtmlForFingerprint(raw);
  s = s.replace(/&nbsp;/gi, " ").replace(/&[a-z]+;/gi, " ");
  try {
    s = s.normalize("NFKC");
  } catch (_) {}
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Stable key for "same MCQ" within one paper: stem + structured parts + all four options.
 * Using options avoids collapsing different items that share an intro line only.
 */
export function canonicalDedupeKey(q) {
  if (!q || typeof q !== "object") return "";
  const stem = normalizeTextForFingerprint(getQuestionText(q));
  const ar = q.assertionReason;
  let arKey = "";
  if (ar && typeof ar === "object" && (ar.assertion || ar.reason)) {
    arKey = `${normalizeTextForFingerprint(ar.assertion)}|${normalizeTextForFingerprint(ar.reason)}`;
  }
  let matchKey = "";
  if (q.matchColumns && (q.matchColumns.columnA?.length || q.matchColumns.columnB?.length)) {
    const a = (q.matchColumns.columnA || []).map((x) => normalizeTextForFingerprint(x)).join(";");
    const b = (q.matchColumns.columnB || []).map((x) => normalizeTextForFingerprint(x)).join(";");
    matchKey = `${a}||${b}`;
  }
  let tableKey = "";
  if (q.tableData && (q.tableData.headers?.length || q.tableData.rows?.length)) {
    const h = (q.tableData.headers || []).map((x) => normalizeTextForFingerprint(x)).join(";");
    const r = (q.tableData.rows || [])
      .map((row) => (Array.isArray(row) ? row.map((c) => normalizeTextForFingerprint(c)).join(",") : ""))
      .join("|");
    tableKey = `${h}##${r}`;
  }
  const opts = getQuestionOptions(q);
  const optKey = ["A", "B", "C", "D"].map((k) => normalizeTextForFingerprint(opts[k] ?? "")).join("|");
  return [stem, arKey, matchKey, tableKey, optKey].filter(Boolean).join("##");
}

/**
 * Remove duplicate questions within array by canonical stem+options fingerprint.
 * Reassigns questionId from the canonical key so IDs stay aligned with dedupe logic.
 */
export function dedupeQuestions(questions) {
  if (!Array.isArray(questions) || questions.length === 0) return questions;
  const seen = new Set();
  return questions
    .filter((q) => {
      const key = canonicalDedupeKey(q);
      if (!key) return false;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((q) => ({
      ...q,
      questionId: hashQuestion(canonicalDedupeKey(q)),
    }));
}

/**
 * Stem-level key: catches near-repeat where same concept is asked again with option tweaks.
 */
function canonicalStemKey(q) {
  if (!q || typeof q !== "object") return "";
  const stem = normalizeTextForFingerprint(getQuestionText(q));
  const ar = q.assertionReason;
  const arKey =
    ar && typeof ar === "object"
      ? `${normalizeTextForFingerprint(ar.assertion)}|${normalizeTextForFingerprint(ar.reason)}`
      : "";
  return [stem, arKey].filter(Boolean).join("##");
}

/** Loose stem key — catches paraphrased repeats after stripping UPSC boilerplate. */
function looseStemKey(q) {
  let stem = normalizeTextForFingerprint(getQuestionText(q));
  stem = stem.replace(UPSC_STEM_PREFIX_RE, "");
  stem = stem.replace(/\b[1234]\.\s/g, " ");
  return stem.trim().slice(0, 120);
}

/** Content used for near-dupe similarity (stem + AR + statements, no UPSC filler). */
function nearDupeContent(q) {
  if (!q || typeof q !== "object") return "";
  let stem = normalizeTextForFingerprint(getQuestionText(q));
  stem = stem.replace(UPSC_STEM_PREFIX_RE, "");
  stem = stem.replace(/\b([1-5])\.\s+/g, " ");
  const ar = q.assertionReason;
  if (ar && typeof ar === "object") {
    stem += ` ${normalizeTextForFingerprint(ar.assertion)} ${normalizeTextForFingerprint(ar.reason)}`;
  }
  return stem.trim().replace(/\s+/g, " ");
}

function tokenSetForSim(text) {
  return new Set(
    String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\u0900-\u097f]+/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2)
  );
}

function jaccardSim(a, b) {
  if (!a?.size || !b?.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  return inter / (a.size + b.size - inter);
}

function optionTokenSet(q) {
  const opts = getQuestionOptions(q);
  const joined = ["A", "B", "C", "D"]
    .map((k) => normalizeTextForFingerprint(opts[k] ?? ""))
    .join(" ");
  return tokenSetForSim(joined);
}

/** Within-paper near-dupe: stem overlap and/or near-identical options. */
const WITHIN_PAPER_STEM_SIM = 0.72;
const WITHIN_PAPER_OPT_SIM = 0.9;
const WITHIN_PAPER_STEM_WITH_OPTS = 0.55;

function isNearDuplicateOf(q, kept) {
  const content = nearDupeContent(q);
  if (!content || content.length < 24) return false;
  const qTokens = tokenSetForSim(content);
  const qOpts = optionTokenSet(q);
  const qLoose = looseStemKey(q);

  for (const other of kept) {
    const otherLoose = looseStemKey(other);
    if (qLoose && otherLoose && qLoose === otherLoose) return true;

    const stemSim = jaccardSim(qTokens, tokenSetForSim(nearDupeContent(other)));
    if (stemSim >= WITHIN_PAPER_STEM_SIM) return true;

    const optSim = jaccardSim(qOpts, optionTokenSet(other));
    if (optSim >= WITHIN_PAPER_OPT_SIM && stemSim >= WITHIN_PAPER_STEM_WITH_OPTS) {
      return true;
    }
  }
  return false;
}

/**
 * Build fingerprint sets from stored/generated questions (for cross-paper dedupe).
 */
export function buildQuestionFingerprints(questions) {
  const fullKeys = new Set();
  const stemKeys = new Set();
  const looseKeys = new Set();
  const snippets = [];

  for (const q of questions || []) {
    const plain = {
      question: getQuestionText(q),
      question_en: getQuestionText(q),
      options: getQuestionOptions(q),
      options_en: getQuestionOptions(q),
      matchColumns: q.matchColumns,
      assertionReason: q.assertionReason,
      tableData: q.tableData,
    };
    const fk = canonicalDedupeKey(plain);
    const sk = canonicalStemKey(plain);
    const lk = looseStemKey(plain);
    if (fk) fullKeys.add(fk);
    if (sk) stemKeys.add(sk);
    if (lk) looseKeys.add(lk);
    const stem = getQuestionText(q);
    if (stem) snippets.push(stem.slice(0, 100));
  }

  return { fullKeys, stemKeys, looseKeys, snippets: [...new Set(snippets)] };
}

export function isQuestionRepeatOfPrior(q, priorFingerprints) {
  if (!priorFingerprints || !q) return false;
  const plain = {
    question: getQuestionText(q),
    question_en: getQuestionText(q),
    options: getQuestionOptions(q),
    options_en: getQuestionOptions(q),
    matchColumns: q.matchColumns,
    assertionReason: q.assertionReason,
    tableData: q.tableData,
  };
  const fk = canonicalDedupeKey(plain);
  const sk = canonicalStemKey(plain);
  const lk = looseStemKey(plain);
  if (fk && priorFingerprints.fullKeys?.has(fk)) return true;
  if (sk && priorFingerprints.stemKeys?.has(sk)) return true;
  if (lk && priorFingerprints.looseKeys?.has(lk)) return true;

  // Near-paraphrase vs prior snippets (same chapter bank / prior papers)
  const snippets = priorFingerprints.snippets || [];
  if (snippets.length) {
    const qTokens = tokenSetForSim(nearDupeContent(q));
    for (const snip of snippets) {
      const sim = jaccardSim(qTokens, tokenSetForSim(normalizeTextForFingerprint(snip)));
      if (sim >= WITHIN_PAPER_STEM_SIM) return true;
    }
  }
  return false;
}

export function filterOutPriorRepeats(questions, priorFingerprints) {
  if (!priorFingerprints || !Array.isArray(questions)) return questions;
  return questions.filter((q) => !isQuestionRepeatOfPrior(q, priorFingerprints));
}

/**
 * Remove repeated / near-duplicate stems in one paper.
 * Exact match + loose stem key + Jaccard near-paraphrase (why we generate 30 to show 20).
 */
export function dedupeQuestionsByStem(questions) {
  if (!Array.isArray(questions) || questions.length === 0) return questions;
  const seenExact = new Set();
  const seenLoose = new Set();
  const kept = [];

  for (const q of questions) {
    const exact = canonicalStemKey(q);
    if (!exact) continue;
    if (seenExact.has(exact)) continue;

    const loose = looseStemKey(q);
    if (loose && seenLoose.has(loose)) continue;

    if (isNearDuplicateOf(q, kept)) continue;

    seenExact.add(exact);
    if (loose) seenLoose.add(loose);
    kept.push(q);
  }
  return kept;
}

/**
 * Compact system prompt for Prelims test generator only (~low token input).
 */
function buildPrelimsGSSystemPrompt(subjects, topic, difficulty, currentAffairsPeriod) {
  const subjectsText = Array.isArray(subjects) ? subjects.join(", ") : subjects;
  let extra = "";
  if (subjects.includes("Current Affairs")) {
    extra += " Include current-affairs linkage where relevant.";
    if (currentAffairsPeriod?.month || currentAffairsPeriod?.year) {
      extra += ` Period hint: ${[currentAffairsPeriod.month, currentAffairsPeriod.year].filter(Boolean).join("/")}.`;
    }
  }
  if (subjects.includes("Art & Culture")) {
    extra += " Art & Culture: architecture, heritage, literature, performing arts.";
  }

  const explLine = usesFullBilingualExplanations()
    ? "Include explanation_en and explanation_hi for all four options (one short sentence each). Correct letter's sentence must defend that letter only."
    : 'Include "explanation": one short English sentence defending ONLY the answer letter + its option text.';

  return `UPSC Prelims GS Paper-I MCQ generator. Subjects: ${subjectsText}. Topic: ${topic}. Difficulty: ${difficulty}.${extra}

Rules: UPSC-standard, eliminable options, at least one trap. Mix statement-based (2–5 statements, options like "1 only", "1 and 2 only"), assertion-reason, match/pair, chronology (3 options only), which correct/incorrect. Concise stems.
TOPIC LOCK: Every question MUST be directly about "${topic}". Do not drift to other areas of the same subject.
${ANSWER_OPTION_LOCK}

${getPrelimsJsonRules()}
${explLine}
Return ONLY a JSON array. No markdown. No duplicate questions.`;
}

function buildPrelimsCSATSystemPrompt(csatCategories, topic) {
  const categoriesText =
    Array.isArray(csatCategories) && csatCategories.length > 0
      ? csatCategories.join(", ")
      : "Quantitative Aptitude, Logical Reasoning, Reading Comprehension, Data Interpretation";

  const explLine = usesFullBilingualExplanations()
    ? "Include explanation_en and explanation_hi per option. Correct letter must defend that letter only."
    : 'Include "explanation": one short English sentence defending ONLY the answer letter.';

  return `UPSC Prelims CSAT MCQ generator. Categories: ${categoriesText}. Topic: ${topic}.

Rules: 4 options, single correct answer, clear exam-style wording.
${ANSWER_OPTION_LOCK}

${getPrelimsJsonRules()}
${explLine}
Return ONLY a JSON array. No markdown.`;
}

function buildPrelimsBatchUserPrompt({ examType, need, topic, subjectsText, difficulty }) {
  const jsonNote = isPracticeEnglishOnly()
    ? "English only (question + options + explanation). No Hindi. JSON array only."
    : usesFullBilingualExplanations()
      ? "Bilingual question, options, and explanations. JSON array only."
      : "Bilingual question and options (EN+HI). English explanation only. JSON array only.";

  if (examType === "CSAT") {
    return `Generate EXACTLY ${need} UPSC Prelims CSAT MCQs. Topic: ${topic}. ${jsonNote}`;
  }
  return `Generate EXACTLY ${need} UPSC Prelims GS MCQs. Subjects: ${subjectsText}. Topic: ${topic}. Difficulty: ${difficulty}. ${jsonNote}`;
}

/**
 * Map compact or full explanation fields to option-wise explanation object for DB/UI.
 */
function normalizePrelimsExplanation(raw, correctAnswer) {
  const key = ["A", "B", "C", "D"].includes(correctAnswer) ? correctAnswer : "A";
  if (usesFullBilingualExplanations()) {
    return normalizeExplanation(raw, key);
  }

  const empty = { A: "", B: "", C: "", D: "" };

  if (typeof raw === "string" && raw.trim()) {
    return { ...empty, [key]: raw.trim() };
  }

  if (typeof raw === "object" && raw !== null) {
    return normalizeExplanation(raw, key);
  }

  return empty;
}

/**
 * Build GS Paper 1 system prompt with optional Current Affairs and Art & Culture emphasis.
 * @param {string[]} subjects
 * @param {string} topic
 * @param {string} difficulty
 * @param {Object} [currentAffairsPeriod]
 * @param {string[]} [patternsToInclude] - If non-empty, use ONLY these question patterns in balanced proportion.
 */
function buildGSSystemPrompt(subjects, topic, difficulty, currentAffairsPeriod, patternsToInclude = []) {
  const subjectsText = Array.isArray(subjects) ? subjects.join(", ") : subjects;
  let contentRules = `- Subjects: ${subjectsText}\n- Topic: ${topic}\n- Difficulty: ${difficulty}\n- Stay within UPSC GS-I syllabus.\n- Avoid direct factual recall.\n- At least one option must be a close UPSC-style trap.\n- Options must be logically eliminable.`;

  if (subjects.includes("Current Affairs")) {
    contentRules += `

CURRENT AFFAIRS FOCUS (when this subject is selected):
- Generate dynamic, recent-type UPSC questions.
- Include: government schemes, reports, international relations, environment updates.
- Mix static concepts with current linkage (test static concept via current relevance).`;
    if (currentAffairsPeriod && (currentAffairsPeriod.month || currentAffairsPeriod.year)) {
      const period = [currentAffairsPeriod.month, currentAffairsPeriod.year].filter(Boolean).join("/");
      contentRules += `\n- Prefer relevance to period: ${period} (where applicable).`;
    }
  }

  if (subjects.includes("Art & Culture")) {
    contentRules += `

ART & CULTURE FOCUS (when this subject is selected):
- Cover: Architecture, Sculpture, Painting, Literature, Dance, Music, UNESCO Heritage Sites.
- Difficulty: UPSC standard analytical level (not just factual recall).`;
  }

  return `You are an UPSC CSE Prelims GS Paper-I MCQ Generator.

OBJECTIVE:
Generate UPSC-standard MCQs for mock tests. Questions must feel like real Prelims — conceptual, eliminable, and trap-based.

MANDATORY QUESTION PATTERNS:
${Array.isArray(patternsToInclude) && patternsToInclude.length > 0 ? `Use ONLY these patterns in balanced proportion: ${patternsToInclude.map((id) => PATTERN_LABELS[id] || id).join("; ")}. Still follow format rules below for each type.\n\n` : ""}
1. Statement-based questions: Use 2 or 3 statements. Options must be statement-type combinations, e.g. "1 only", "2 only", "1 and 2 only", "1 and 3 only", "1, 2 and 3" (for 3 statements). Do NOT use generic options; use only statement-number combinations.
2. Assertion-Reason: Use exactly 2 statements (Assertion + Reason). Options: (a) Both correct, A explains R (b) Both correct, A does not explain R (c) A correct, R wrong (d) A wrong, R correct. Keep assertion-type questions with 2 or 3 statement-type options as above where applicable.
3. "How many of the above are correct?" structure (with 2–4 statements)
4. Match the following / Pair-based
5. "Which of the following is correct / incorrect?"
6. Concept + Current Affairs integrated (test a static concept via current relevance) where suitable

CONTENT RULES:
${contentRules}

DIFFICULTY CONTROL:
- Easy: Direct concept understanding
- Moderate: Mixed statements + elimination
- Hard: Closely worded statements, high confusion

OUTPUT FORMAT (STRICT – JSON array only):
${BILINGUAL_JSON_RULES}
Each object:
{
  "pattern": "STATEMENT_BASED | ASSERTION_REASON | HOW_MANY_CORRECT | MATCH | WHICH_CORRECT | CONCEPT_CURRENT",
  "question_en": "English question text",
  "question_hi": "Hindi question text (Devanagari)",
  "options_en": { "A": "", "B": "", "C": "", "D": "" },
  "options_hi": { "A": "", "B": "", "C": "", "D": "" },
  "answer": "A | B | C | D",
  "explanation_en": { "A": "", "B": "", "C": "", "D": "" },
  "explanation_hi": { "A": "", "B": "", "C": "", "D": "" },
  "subject": "One of: ${subjectsText}"
}

EXPLANATION (OPTION-WISE, MANDATORY in both languages):
- explanation_en and explanation_hi MUST be objects { "A", "B", "C", "D" }.
- CORRECT option: one short sentence why it is right. INCORRECT: one short sentence why it is wrong.
- Keep each explanation brief (1 sentence) to save tokens.

IMPORTANT:
- Do NOT add any introductory or closing text.
- Do NOT repeat questions.
- For assertion-type and statement-based questions: always use 2 or 3 statements, and options must be statement-type (e.g. "1 only", "2 only", "1 and 2 only", "1, 2 and 3"). Do not use unrelated option text.
- Include assertion-reason type where suitable.
- Keep language concise, formal, and exam-oriented.`;
}

/**
 * Build CSAT system prompt with categories.
 */
function buildCSATSystemPrompt(csatCategories, topic) {
  const categoriesText = Array.isArray(csatCategories) && csatCategories.length > 0
    ? csatCategories.join(", ")
    : "Quantitative Aptitude, Logical Reasoning, Reading Comprehension, Data Interpretation";

  return `You are an UPSC CSE Prelims CSAT (Paper-II) MCQ Generator.

OBJECTIVE:
Generate UPSC-standard CSAT MCQs for mock tests. CSAT is qualifying in nature; focus on clarity and standard exam patterns.

CATEGORIES TO COVER: ${categoriesText}
Topic/Focus: ${topic}

RULES:
- 4 options per question, single correct answer.
- Quantitative Aptitude: numerical problems, shortcuts, approximation.
- Logical Reasoning: sequences, arrangements, syllogisms, puzzles.
- Reading Comprehension: short passages with inference and factual questions.
- Data Interpretation: tables, graphs, caselets with calculation and inference.

OUTPUT FORMAT (STRICT – JSON array only):
${BILINGUAL_JSON_RULES}
Each object:
{
  "pattern": "QUANTITATIVE | LOGICAL_REASONING | READING_COMPREHENSION | DATA_INTERPRETATION",
  "question_en": "English (passage + question for RC/DI if needed)",
  "question_hi": "Hindi (same content)",
  "options_en": { "A": "", "B": "", "C": "", "D": "" },
  "options_hi": { "A": "", "B": "", "C": "", "D": "" },
  "answer": "A | B | C | D",
  "explanation_en": { "A": "", "B": "", "C": "", "D": "" },
  "explanation_hi": { "A": "", "B": "", "C": "", "D": "" },
  "subject": "CSAT"
}

EXPLANATION (OPTION-WISE, MANDATORY in both languages):
- explanation_en and explanation_hi as { "A", "B", "C", "D" }; one brief sentence per option.

IMPORTANT:
- Do NOT add any introductory or closing text.
- Keep language concise and exam-oriented.`;
}

/**
 * Build system prompt for FULL-LENGTH UPSC Prelims GS Paper 1 Mock (100 questions).
 * Subject is provided by admin (SUBJECT_FROM_ADMIN).
 */
function buildFullMockGSSystemPrompt(subject) {
  const subjectText = typeof subject === "string" ? subject : (Array.isArray(subject) ? subject.join(", ") : "General Studies");
  return `You are an expert UPSC Civil Services Examination Prelims Question Paper Setter.

Your task is to generate a FULL-LENGTH UPSC Prelims GS Paper 1 Mock Test strictly based on the real UPSC pattern.

Follow these rules VERY STRICTLY:

--------------------------------------------
EXAM STRUCTURE:
--------------------------------------------
• Total Questions: 100
• Total Marks: 200
• Each Question: 2 Marks
• Negative Marking: 1/3rd (0.66)
• Difficulty Level: Moderate to Tough (UPSC standard)
• Avoid very direct factual questions
• Focus on conceptual clarity and elimination-based logic

--------------------------------------------
QUESTION TYPES (Must Mix These):
--------------------------------------------
1. Multi-statement based questions:
   Example format:
   Consider the following statements:
   1. ...
   2. ...
   3. ...
   Which of the above is/are correct?

2. Assertion and Reason

3. Match the Following

4. Analytical / Conceptual MCQs

--------------------------------------------
SUBJECT INPUT:
--------------------------------------------
Generate questions from the following subject: ${subjectText}

--------------------------------------------
QUESTION FORMAT (STRICT JSON OUTPUT):
--------------------------------------------

Return response ONLY in JSON format like below:

{
  "test_name": "Prelims Mock - Full Length",
  "total_questions": 100,
  "total_marks": 200,
  "negative_marking": 0.66,
  "duration_minutes": 120,
  "questions": [
    {
      "question_number": 1,
      "type": "multi-statement",
      "question": "Full UPSC standard question text here",
      "options": {
        "A": "Option text",
        "B": "Option text",
        "C": "Option text",
        "D": "Option text"
      },
      "correct_answer": "B",
      "explanation": { "A": "", "B": "", "C": "", "D": "" }
    }
  ]
}

--------------------------------------------
EXPLANATION (OPTION-WISE, MANDATORY – same as CSAT):
--------------------------------------------
• explanation MUST be an object: { "A": "...", "B": "...", "C": "...", "D": "..." }.
• For the CORRECT option: write "correct statement" — WHY it is correct (reason, fact, concept).
• For EACH INCORRECT option: write "wrong statement" — WHY it is wrong (wrong fact, trap, common mistake).
• At least 1–2 sentences per option. No empty explanation for any option.

--------------------------------------------
IMPORTANT RULES:
--------------------------------------------
• Do NOT skip question numbers. Number questions 1 to 100.
• Do NOT reduce total questions. Must generate exactly 100 questions.
• Maintain UPSC language tone.
• Avoid repetition.
• Output MUST be valid JSON.
• Do NOT add extra commentary outside JSON.
• "type" for each question must be one of: "multi-statement", "assertion-reason", "match", "analytical".
• For assertion-reason: options must be (a) Both correct, A explains R (b) Both correct, A does not explain R (c) A correct, R wrong (d) A wrong, R correct.`;
}

/** Human-readable labels for pattern IDs (for prompt text). */
const PATTERN_LABELS = {
  statement_based: "Statement-based (which are correct)",
  statement_not_correct: "Statement-based (NOT correct)",
  pair_matching: "Pair matching / Match the following",
  assertion_reason: "Assertion–Reason",
  direct_conceptual: "Direct conceptual MCQs",
  chronology: "Chronology-based",
  sequence_arrangement: "Sequence arrangement",
  map_location: "Map/location-based",
  odd_one_out: "Odd one out",
  multi_statement_elimination: "Multi-statement elimination",
};

/**
 * Compact system prompt for admin Prelims Mock GS Mix (~low tokens).
 */
function buildCompactFullMockMixSystemPrompt(
  difficulty = "moderate",
  excludeSnippets = [],
  patternsToInclude = []
) {
  const avoidLine =
    Array.isArray(excludeSnippets) && excludeSnippets.length > 0
      ? `\nAvoid repeating:\n${excludeSnippets.slice(0, 5).map((s) => `- ${String(s).slice(0, 60)}`).join("\n")}\n`
      : "";
  const difficultyMix =
    difficulty === "moderate"
      ? "50% moderate, 35% hard, 15% easy"
      : difficulty === "hard"
        ? "80% hard, 20% moderate"
        : "50% easy, 50% moderate";
  const patterns =
    Array.isArray(patternsToInclude) && patternsToInclude.length > 0
      ? patternsToInclude.map((id) => PATTERN_LABELS[id] || id).join(", ")
      : "statement, match, assertion, pair, chronology, map, direct";
  const explLine = usesFullBilingualExplanations()
    ? "explanation_en + explanation_hi per option (brief)."
    : '"explanation": one short English sentence for the correct option only.';

  return `UPSC GS Paper 1 full-mock batch generator.${avoidLine}
Subjects: Polity, History, Geography, Economy, Environment, Science & Tech, Art & Culture + Current Affairs.
Patterns (balanced): ${patterns}. Difficulty: ${difficultyMix}.
${getPrelimsJsonRules()}
Per question also: subject, questionType (statement|match|assertion|chronology|pair|map|direct). Use matchColumns or assertionReason only when needed.
${explLine}
Return ONLY JSON: { "examTitle": "...", "questions": [ ... ] } or a raw array. No markdown.`;
}

function buildCompactFullMockCsatSystemPrompt(excludeSnippets = []) {
  const avoidLine =
    Array.isArray(excludeSnippets) && excludeSnippets.length > 0
      ? `\nAvoid repeating:\n${excludeSnippets.slice(0, 5).map((s) => `- ${String(s).slice(0, 60)}`).join("\n")}\n`
      : "";
  const explLine = usesFullBilingualExplanations()
    ? "explanation_en/hi per option."
    : '"explanation": one short English sentence (correct option).';
  return `UPSC CSAT Paper 2 batch generator. Mix RC, logical reasoning, numeracy, DI.${avoidLine}
For RC: each item must include the passage plus a distinct sub-question (do not output multiple MCQs with identical question text).
${getPrelimsJsonRules()}
${explLine}
Return ONLY JSON with "test_name" and "questions" array.`;
}

/** CSAT papers use passage-based sets; stem-only dedupe would drop valid RC siblings. */
function dedupeMockPaperQuestions(questions, { csat = false, priorFingerprints = null } = {}) {
  let base = dedupeQuestions(questions);
  if (!csat) base = dedupeQuestionsByStem(base);
  if (priorFingerprints) base = filterOutPriorRepeats(base, priorFingerprints);
  return base;
}

function bilingualBatchJsonNote() {
  return usesFullBilingualExplanations()
    ? "Bilingual Q/options/explanations."
    : "Bilingual Q/options (EN+HI). English explanation only.";
}

/**
 * Shared generate → dedupe → refill → top-up loop (GS Mix, CSAT, PYQ, subject mocks).
 */
async function runFullMockPaperGenerationLoop({
  apiKey,
  model,
  displayCount,
  csatPaper = false,
  logPrefix,
  generateBatch,
  generateBuffer,
  perBatch: perBatchOverride,
  maxRefillBatches: maxRefillBatchesOverride,
  estimateMaxTokens,
  priorFingerprints = null,
  rollingExcludeLimit = 5,
}) {
  const perBatch = perBatchOverride ?? getMixBatchSize();
  const generateCount = displayCount + (generateBuffer ?? getMixGenerateBuffer());
  const batches = Math.ceil(generateCount / perBatch);
  const tokenEst = estimateMaxTokens ?? getMaxTokensForTestGeneration;
  const all = [];
  let testName = null;

  const applyDedupe = (qs) =>
    dedupeMockPaperQuestions(qs, { csat: csatPaper, priorFingerprints });

  const collectExcludeSnippets = (qs) =>
    [
      ...new Set(
        applyDedupe(qs)
          .map((q) => getQuestionText(q).slice(0, 100))
          .filter(Boolean)
      ),
    ].slice(0, rollingExcludeLimit);

  for (let b = 1; b <= batches; b += 1) {
    const rollingExclude = collectExcludeSnippets(all);
    console.log(
      `📝 ${logPrefix}: batch ${b}/${batches} (${perBatch} Q, max_tokens≈${tokenEst(perBatch)})...`
    );
    const { questions: batchQuestions, testName: batchTestName } = await generateBatch(
      apiKey,
      model,
      perBatch,
      `Part ${b}`,
      rollingExclude
    );
    if (batchTestName) testName = batchTestName;
    if (batchQuestions?.length) all.push(...batchQuestions);
  }

  let deduped = applyDedupe(all);
  const maxRefills = maxRefillBatchesOverride ?? getMixMaxRefillBatches();
  let refill = 0;
  let stallRounds = 0;

  while (deduped.length < displayCount && refill < maxRefills) {
    const beforeCount = deduped.length;
    const need = Math.max(1, Math.min(perBatch, displayCount - deduped.length));
    const snippetPool = collectExcludeSnippets(deduped);
    console.log(
      `📝 ${logPrefix}: refill ${refill + 1}/${maxRefills} (unique ${deduped.length}/${displayCount}, requesting ${need})...`
    );
    const { questions: batchQuestions, testName: batchTestName } = await generateBatch(
      apiKey,
      model,
      need,
      `Refill ${refill + 1}`,
      snippetPool
    );
    if (batchTestName) testName = batchTestName;
    if (batchQuestions?.length) all.push(...batchQuestions);
    deduped = applyDedupe(all);
    refill += 1;
    if (deduped.length === beforeCount) stallRounds += 1;
    else stallRounds = 0;
    if (stallRounds >= 4) {
      console.warn(`📝 ${logPrefix}: stopping refill after ${stallRounds} rounds with no new unique questions`);
      break;
    }
  }

  let finalQuestions = deduped.slice(0, displayCount);

  if (finalQuestions.length < displayCount) {
    const gap = displayCount - finalQuestions.length;
    console.log(`📝 ${logPrefix}: short by ${gap}, running up to ${gap + 2} micro top-up batches...`);
    for (let t = 0; t < gap + 2 && finalQuestions.length < displayCount; t += 1) {
      const need = displayCount - finalQuestions.length;
      const snippets = collectExcludeSnippets(finalQuestions);
      const { questions: extra } = await generateBatch(apiKey, model, need, `Top-up ${t + 1}`, snippets);
      if (extra?.length) {
        all.push(...extra);
        deduped = applyDedupe(all);
        finalQuestions = deduped.slice(0, displayCount);
      }
    }
  }

  return { deduped, finalQuestions, testName };
}

function buildCompactFullMockSubjectSystemPrompt(subjectsList, excludeSnippets = [], patternsToInclude = []) {
  const avoidLine =
    Array.isArray(excludeSnippets) && excludeSnippets.length > 0
      ? `\nAvoid repeating:\n${excludeSnippets.slice(0, 5).map((s) => `- ${String(s).slice(0, 60)}`).join("\n")}\n`
      : "";
  const subjects = subjectsList.join(", ");
  const patterns =
    Array.isArray(patternsToInclude) && patternsToInclude.length > 0
      ? patternsToInclude.map((id) => PATTERN_LABELS[id] || id).join(", ")
      : "statement, match, assertion, pair, chronology, map, direct";
  const explLine = usesFullBilingualExplanations()
    ? "explanation_en + explanation_hi per option (brief)."
    : '"explanation": one short English sentence for the correct option only.';
  return `UPSC GS Paper 1 subject mock (${subjects}).${avoidLine}
Patterns (balanced): ${patterns}. Difficulty: 50% moderate, 35% hard, 15% easy.
${getPrelimsJsonRules()}
Per question: subject, questionType. Use matchColumns or assertionReason only when needed.
${explLine}
Return ONLY JSON: { "examTitle": "...", "questions": [ ... ] } or a raw array. No markdown.`;
}

function buildCompactFullMockPyoSystemPrompt(yearFrom, yearTo, excludeSnippets = []) {
  const avoidLine =
    Array.isArray(excludeSnippets) && excludeSnippets.length > 0
      ? `\nAvoid repeating:\n${excludeSnippets.slice(0, 5).map((s) => `- ${String(s).slice(0, 60)}`).join("\n")}\n`
      : "";
  const explLine = usesFullBilingualExplanations()
    ? "explanation_en/hi per option."
    : '"explanation": one short English sentence (correct option).';
  return `UPSC PYQ-style (${yearFrom}–${yearTo}) batch generator. Multi-statement heavy. Do not copy exact PYQs.${avoidLine}
${getPrelimsJsonRules()}
${explLine}
Return ONLY JSON with "test_name" and "questions" array.`;
}

/**
 * Build system prompt for FULL-LENGTH UPSC Prelims GS Paper 1 MIX.
 * Uses structured output: tableData, matchColumns, assertionReason, questionType, difficulty mix 50% Moderate / 35% Hard / 15% Easy.
 * @param {string} [difficulty]
 * @param {string[]} [excludeSnippets]
 * @param {string[]} [patternsToInclude] - If non-empty, use ONLY these patterns in balanced proportion.
 */
function buildFullMockMixSystemPrompt(difficulty = "moderate", excludeSnippets = [], patternsToInclude = []) {
  const avoidLine =
    Array.isArray(excludeSnippets) && excludeSnippets.length > 0
      ? `\nAVOID repeating or closely mimicking these previous question snippets (do not duplicate themes/wording):\n${excludeSnippets.map((s) => `- ${s}`).join("\n")}\n`
      : "";
  const difficultyMix =
    difficulty === "moderate"
      ? "50% Moderate, 35% Hard, 15% Easy"
      : difficulty === "hard"
        ? "80% Hard, 20% Moderate"
        : "50% Easy, 50% Moderate";

  const questionTypeSection =
    Array.isArray(patternsToInclude) && patternsToInclude.length > 0
      ? `Question types to use (ONLY these, in balanced proportion): ${patternsToInclude.map((id) => PATTERN_LABELS[id] || id).join(" | ")}. Map to questionType as: statement_based/statement_not_correct/multi_statement_elimination/odd_one_out → "statement" where appropriate; pair_matching → "match" or "pair"; assertion_reason → "assertion"; direct_conceptual → "direct"; chronology/sequence_arrangement → "chronology"; map_location → "map".`
      : "Question Type Distribution (same for 100 and 50): 60% Statement Based | 12% Match the Following | 6% Assertion–Reason | 8% Pair Matching | 4% Chronology | 5% Map Conceptual | 5% Direct (concept-linked only)";

  return `You are an expert UPSC Prelims GS Paper 1 question setter and structured exam formatter.

Generate a full-length UPSC Prelims mock test strictly following the 2015–2024 trend.

VERY IMPORTANT:
Output MUST be structured JSON array.
Each question must be UI-renderable.
Support table-based and column-based formatting.
${avoidLine}
---------------------------------------------------
EXAM CONFIGURATION
---------------------------------------------------
Total Questions: as requested per batch. For 100-question full-length: 20 per batch × 5. For 50-question sectional: 25 per batch × 2. Same format and same question types for both; only count changes.

Subject Distribution (scale proportionally for 50Q sectional):
Full 100: Polity 14 | History 14 | Geography 11 | Economy 14 | Environment 16 | Science & Tech 10 | Art & Culture 6 | Current Affairs integrated.
Sectional 50: roughly half each (e.g. Polity 7, History 7, Geography 6, Economy 7, Environment 8, Science & Tech 5, Art & Culture 3, rest Current Affairs).

${questionTypeSection}

Difficulty: ${difficultyMix}

---------------------------------------------------
STRUCTURED OUTPUT FORMAT (MANDATORY)
---------------------------------------------------
Return output in this exact structure:

{
  "examTitle": "UPSC GS Paper 1 Full Mock",
  "totalQuestions": 100,
  "questions": [
    {
      "id": 1,
      "subject": "",
      "questionType": "statement | match | assertion | chronology | pair | map | direct",
      "difficulty": "easy | moderate | hard",
      "questionText": "",
      "tableData": null OR { "headers": [], "rows": [[]] },
      "matchColumns": null OR { "columnA": [], "columnB": [] },
      "assertionReason": null OR { "assertion": "", "reason": "" },
      "options": [ { "key": "A", "text": "" }, { "key": "B", "text": "" }, { "key": "C", "text": "" }, { "key": "D", "text": "" } ],
      "correctAnswer": "A|B|C|D",
      "explanation": { "A": "", "B": "", "C": "", "D": "" },
      "eliminationLogic": "",
      "conceptualSource": ""
    }
  ]
}

---------------------------------------------------
FORMAT RULES
---------------------------------------------------
1. If questionType = "match": Fill matchColumns with two arrays. UI will render side-by-side.
2. If questionType = "statement": Write statements numbered 1, 2, 3. Options: A. 1 only | B. 2 only | C. 1 and 2 only | D. 1, 2 and 3
3. If questionType = "assertion": Use assertionReason object. Options: A. Both A and R true and R correct explanation | B. Both true but R not explanation | C. A true, R false | D. A false, R true
4. If questionType = "chronology": Provide events list in question. Options must show correct order.
5. If questionType = "pair": Provide list of pairs. Use elimination logic.
6. If questionType = "map": Concept-based location logic. Avoid actual image.
7. If table needed: Fill tableData with headers and rows.

---------------------------------------------------
EXPLANATION (MANDATORY – OPTION-WISE, same as CSAT)
---------------------------------------------------
- For EVERY question, explanation MUST be an object: { "A": "...", "B": "...", "C": "...", "D": "..." }.
- For the CORRECT option: write "correct statement" — WHY it is correct (reason, facts, chronology, concept). User should see sahi hai toh kyu.
- For EACH INCORRECT option: write "wrong statement" — WHY it is wrong (wrong order, wrong fact, trap, common mistake). User should see galat hai toh kyu.
- At least 2-3 sentences per option. No empty explanation for any option.
- At least 120 words total per question explanation (across all four options combined).

---------------------------------------------------
QUALITY CONTROL
---------------------------------------------------
- Avoid repetition. Use elimination traps. Integrate current + static. Deep conceptual reasoning.
- Mention eliminationLogic (how to eliminate wrong options). Mention conceptualSource (e.g. NCERT, Laxmikanth, Spectrum).

OUTPUT MUST BE CLEAN JSON. NO EXTRA TEXT. NO MARKDOWN. NO COMMENTS. ONLY JSON.
Generate exactly the number of questions requested in this batch.`;
}

/**
 * Build system prompt for PYQ-style mock (Previous Year Question reconstruction, 2010–2025).
 * Recreate questions based on trends/themes; do not copy exact PYQs. Same JSON structure.
 */
function buildFullMockPyoSystemPrompt(yearFrom, yearTo) {
  const range = `${yearFrom}–${yearTo}`;
  return `You are a UPSC Previous Year Question Reconstruction Engine.

Generate a practice paper inspired by UPSC Prelims from ${range}.

DO NOT copy exact previous year questions.
Recreate questions based on trends, themes, and conceptual patterns.

STRICT STRUCTURE:

• Total Questions: 100 (this batch: generate exactly the number requested)
• Total Marks: 200
• Negative Marking: 0.66
• Difficulty: Same as actual PYQs
• Include multi-statement heavy pattern (2018–2023 style)

Subjects mixed like real UPSC (Polity, History, Geography, Economy, Environment, Science & Tech, Current Affairs).

Return ONLY valid JSON in this format. No commentary outside JSON.

{
  "test_name": "UPSC PYQ Style Mock ${range}",
  "type": "PYQ Reconstruction",
  "total_questions": 100,
  "total_marks": 200,
  "negative_marking": 0.66,
  "duration_minutes": 120,
  "questions": [
    {
      "question_number": 1,
      "subject": "",
      "type": "statement | assertion | match | pair | direct",
      "question": "",
      "options": {
        "A": "",
        "B": "",
        "C": "",
        "D": ""
      },
      "correct_answer": "A|B|C|D",
      "explanation": { "A": "", "B": "", "C": "", "D": "" }
    }
  ]
}

EXPLANATION (option-wise, mandatory – same as CSAT):
- explanation MUST be an object: { "A": "...", "B": "...", "C": "...", "D": "..." }.
- For the CORRECT option: write "correct statement" — WHY it is correct (sahi hai toh kyu — reason, facts, concept).
- For EACH INCORRECT option: write "wrong statement" — WHY it is wrong (galat hai toh kyu — wrong fact, trap, common mistake).
- At least 1-2 sentences per option. No empty explanation for any option.

Generate exactly the number of questions requested in this batch (20 per batch).
Do not write anything outside JSON.`;
}

/**
 * Build system prompt for FULL-LENGTH UPSC CSAT Paper 2 (80 questions).
 * Sections: RC 25-30, Logical Reasoning 15-20, Analytical 10-15, Numeracy 10-15, DI 5-10.
 */
function buildFullMockCsatSystemPrompt() {
  return `You are an expert UPSC Civil Services CSAT Paper 2 examiner and question setter.

Generate a FULL-LENGTH UPSC CSAT Paper 2 exactly like the real UPSC exam.

Follow STRICT UPSC structure:

----------------------------------------
EXAM STRUCTURE
----------------------------------------
• Total Questions: 80
• Total Marks: 200
• Each Question: 2.5 Marks
• Negative Marking: 0.83 (1/3rd)
• Duration: 120 Minutes
• Difficulty: Moderate to Tough (UPSC standard)
• Maintain elimination-based logic

----------------------------------------
SECTION DISTRIBUTION (REALISTIC MIX)
----------------------------------------
1. Reading Comprehension – 25 to 30 Questions
2. Logical Reasoning – 15 to 20 Questions
3. Analytical Ability – 10 to 15 Questions
4. Basic Numeracy (Class X Level) – 10 to 15 Questions
5. Data Interpretation – 5 to 10 Questions

----------------------------------------
IMPORTANT RULES
----------------------------------------
• Include 4 options (A, B, C, D) for every question
• Include correct_answer
• Include short but clear explanation
• Maintain UPSC-style language
• Avoid very easy or coaching-type questions
• Ensure mathematical questions have correct logic
• Ensure reading comprehension includes passage-based MCQs
• Do NOT repeat similar question patterns

----------------------------------------
OUTPUT FORMAT (STRICT JSON ONLY)
----------------------------------------

Return ONLY valid JSON. For real exam-style rendering:
- Reading Comprehension: put passage in question text, then the question.
- Data Interpretation: when a table is needed, use "tableData": { "headers": ["Col1","Col2",...], "rows": [["r1c1","r1c2"],...] } so the UI can render a table.
- Other sections: standard question + options.

{
  "test_name": "UPSC CSAT Full Mock",
  "type": "CSAT Paper 2",
  "total_questions": 80,
  "total_marks": 200,
  "negative_marking": 0.83,
  "duration_minutes": 120,
  "questions": [
    {
      "question_number": 1,
      "section": "Reading Comprehension | Logical Reasoning | Analytical Ability | Basic Numeracy | Data Interpretation",
      "question": "Full question text (or passage + question for RC)",
      "tableData": null OR { "headers": [], "rows": [[]] },
      "options": { "A": "", "B": "", "C": "", "D": "" },
      "correct_answer": "A",
      "explanation": { "A": "", "B": "", "C": "", "D": "" }
    }
  ]
}

----------------------------------------
EXPLANATION (OPTION-WISE, MANDATORY)
----------------------------------------
• explanation MUST be an object: { "A": "...", "B": "...", "C": "...", "D": "..." }.
• For the CORRECT option: write "correct statement" — WHY it is correct (sahi hai toh kyu — reason, logic, fact).
• For EACH INCORRECT option: write "wrong statement" — WHY it is wrong (galat hai toh kyu — wrong step, trap, common mistake).
• At least 1-2 sentences per option. No empty explanation for any option.

----------------------------------------
CRITICAL INSTRUCTIONS
----------------------------------------
• Generate exactly the number of questions requested in this batch (20 per batch when splitting).
• Do NOT skip question numbers.
• Do NOT output anything outside JSON.
• Ensure JSON is valid and properly formatted.
• No markdown.
• No commentary.`;
}

/**
 * Generate one batch of CSAT Paper 2 questions (20 per batch).
 */
async function generateFullMockCsatBatch(apiKey, model, batchSize, batchLabel, excludeSnippets = []) {
  const systemPrompt = usesCompactFullMockPrompts()
    ? buildCompactFullMockCsatSystemPrompt(excludeSnippets)
    : buildFullMockCsatSystemPrompt();
  const userPrompt = `Generate EXACTLY ${batchSize} UPSC CSAT Paper 2 questions (${batchLabel}). Mix RC, LR, numeracy, DI. ${bilingualBatchJsonNote()} JSON only.`;

  const maxTokens = getMaxTokensForTestGeneration(batchSize);
  const { aiContent, finishReason } = await callOpenRouterTestGeneration({
    apiKey,
    model,
    systemPrompt,
    userPrompt,
    maxTokens,
    apiTitle: "UPSC Mentor - CSAT Mock",
  });

  if (finishReason === "length") {
    console.warn(`⚠️ Full mock CSAT batch truncated (max_tokens=${maxTokens}, need=${batchSize})`);
  }

  try {
    const { validatedQuestions, testName } = parseFullMockResponse(aiContent);
    if (validatedQuestions.length > 0) {
      return { questions: validatedQuestions, testName, finishReason };
    }
    console.warn(`Full mock CSAT: parseFullMockResponse returned 0 valid questions (finish=${finishReason}); trying compact array parser`);
  } catch (parseErr) {
    console.warn("Full mock CSAT: parseFullMockResponse failed:", parseErr.message);
  }

  const validated = parseAndValidateQuestions(aiContent, batchSize);
  if (validated.length > 0) {
    return { questions: validated, testName: "UPSC CSAT Full Mock", finishReason };
  }

  console.error("Full mock CSAT batch: no valid questions. Raw (first 600 chars):", aiContent.slice(0, 600));
  return { questions: [], testName: "UPSC CSAT Full Mock", finishReason };
}

const CSAT_DISPLAY_COUNT = 80;

/**
 * Generate full-length (80 questions) CSAT Paper 2 mock with refill/top-up (same pattern as GS Mix).
 * @returns {Promise<Object>} - { success, questions?, count?, testName?, error? }
 */
export const generateFullMockCsatTestQuestions = async () => {
  const displayCount = CSAT_DISPLAY_COUNT;

  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = getTestGenerationModel();

    if (!apiKey) {
      throw new Error("Missing OPENROUTER_API_KEY in environment variables");
    }

    const { deduped, finalQuestions, testName } = await runFullMockPaperGenerationLoop({
      apiKey,
      model,
      displayCount,
      csatPaper: true,
      logPrefix: "Full mock CSAT",
      generateBatch: (key, m, size, label, exclude) =>
        generateFullMockCsatBatch(key, m, size, label, exclude),
    });

    if (finalQuestions.length === 0) {
      throw new Error("No valid CSAT questions generated. Please try again.");
    }

    if (finalQuestions.length < displayCount) {
      throw new Error(
        `Full mock CSAT: only ${finalQuestions.length} unique questions (need ${displayCount}). Try Go Live again.`
      );
    }

    console.log(`✅ Full mock CSAT: ${deduped.length} unique generated, showing ${finalQuestions.length} questions`);

    const translatedQuestions = finalizeGeneratedQuestions(finalQuestions);

    return {
      success: true,
      questions: translatedQuestions,
      count: translatedQuestions.length,
      testName: testName || "Prelims Mock - CSAT Paper 2",
    };
  } catch (error) {
    console.error("Error generating full mock CSAT questions:", error);
    return {
      success: false,
      error: error.message || "Failed to generate CSAT mock questions",
      questions: [],
    };
  }
};

/**
 * Generate one batch of PYQ-style questions (20 per batch).
 */
async function generateFullMockPyoBatch(apiKey, model, batchSize, batchLabel, yearFrom, yearTo, excludeSnippets = []) {
  const systemPrompt = usesCompactFullMockPrompts()
    ? buildCompactFullMockPyoSystemPrompt(yearFrom, yearTo, excludeSnippets)
    : buildFullMockPyoSystemPrompt(yearFrom, yearTo);
  const userPrompt = `Generate EXACTLY ${batchSize} PYQ-style questions (${yearFrom}–${yearTo}, ${batchLabel}). ${bilingualBatchJsonNote()} JSON only.`;

  const maxTokens = getMaxTokensForTestGeneration(batchSize);
  const { aiContent, finishReason } = await callOpenRouterTestGeneration({
    apiKey,
    model,
    systemPrompt,
    userPrompt,
    maxTokens,
    apiTitle: "UPSC Mentor - PYQ Mock",
  });

  if (finishReason === "length") {
    console.warn(`⚠️ Full mock PYQ batch truncated (max_tokens=${maxTokens}, need=${batchSize})`);
  }

  const defaultName = `UPSC PYQ Style Mock ${yearFrom}–${yearTo}`;
  try {
    const { validatedQuestions, testName } = parseFullMockResponse(aiContent);
    if (validatedQuestions.length > 0) {
      return { questions: validatedQuestions, testName: testName || defaultName, finishReason };
    }
    console.warn(`Full mock PYQ: parseFullMockResponse returned 0 (finish=${finishReason}); trying compact parser`);
  } catch (parseErr) {
    console.warn("Full mock PYQ: parseFullMockResponse failed:", parseErr.message);
  }

  const validated = parseAndValidateQuestions(aiContent, batchSize);
  if (validated.length > 0) {
    return { questions: validated, testName: defaultName, finishReason };
  }

  console.error("Full mock PYQ batch: no valid questions. Raw (first 600 chars):", aiContent.slice(0, 600));
  return { questions: [], testName: defaultName, finishReason };
}

const PYQ_DISPLAY_COUNT = 100;

/**
 * Generate full-length (100 questions) PYQ-style mock: generate 120 (6 batches of 20), show 100. Gemini 2.0.
 * @param {Object} params
 * @param {number} params.yearFrom - e.g. 2010
 * @param {number} params.yearTo - e.g. 2025
 */
export const generateFullMockPyoTestQuestions = async ({ yearFrom, yearTo }) => {
  const displayCount = PYQ_DISPLAY_COUNT;

  try {
    // Common path: same KB+RAG+LLM + system prompt as Topic Practice, with PYQ-style topic framing
    if (isUpscPrelimsRagEnabled()) {
      const ragResult = await generateUpscPrelimsMockPaper({
        mode: "pyo",
        questionCount: displayCount,
        difficulty: "moderate",
        yearFrom,
        yearTo,
        testName: `Prelims Mock - PYQ ${yearFrom}-${yearTo}`,
      });
      if (ragResult.success && ragResult.questions?.length >= displayCount) {
        const translatedQuestions = finalizeGeneratedQuestions(ragResult.questions.slice(0, displayCount));
        if (translatedQuestions.length >= displayCount) {
          console.log(
            `✅ Full mock PYQ via common KB+RAG: ${translatedQuestions.length}Q (same prompt as Topic Practice)`
          );
          return {
            success: true,
            questions: translatedQuestions,
            count: translatedQuestions.length,
            testName: ragResult.testName || `Prelims Mock - PYQ ${yearFrom}-${yearTo}`,
            source: "kb_rag_common",
          };
        }
      }
      if (ragResult.skippedRag) {
        console.warn("⚠️ PRELIMS_USE_RAG disabled — falling back to open-LLM PYQ mock");
      } else {
        console.warn(
          `⚠️ Common KB+RAG PYQ mock short/failed (${ragResult.error || "unknown"}) — falling back to open-LLM`
        );
      }
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = getTestGenerationModel();

    if (!apiKey) {
      throw new Error("Missing OPENROUTER_API_KEY in environment variables");
    }

    const { deduped, finalQuestions, testName } = await runFullMockPaperGenerationLoop({
      apiKey,
      model,
      displayCount,
      csatPaper: false,
      logPrefix: "Full mock PYQ",
      generateBatch: (key, m, size, label, exclude) =>
        generateFullMockPyoBatch(key, m, size, label, yearFrom, yearTo, exclude),
    });

    if (finalQuestions.length === 0) {
      throw new Error("No valid UPSC questions generated for PYQ mock. Please try again.");
    }

    if (finalQuestions.length < displayCount) {
      throw new Error(
        `Full mock PYQ: only ${finalQuestions.length} unique questions (need ${displayCount}). Try Go Live again.`
      );
    }

    console.log(`✅ Full mock PYQ: ${deduped.length} unique generated, showing ${finalQuestions.length} questions`);

    const translatedQuestions = finalizeGeneratedQuestions(finalQuestions);

    return {
      success: true,
      questions: translatedQuestions,
      count: translatedQuestions.length,
      testName: testName || `Prelims Mock - PYQ ${yearFrom}-${yearTo}`,
    };
  } catch (error) {
    console.error("Error generating full mock PYQ questions:", error);
    return {
      success: false,
      error: error.message || "Failed to generate PYQ mock questions",
      questions: [],
    };
  }
};

/**
 * Generate one batch of mixed full-mock questions (20 per batch for 100Q, or 25 per batch for 50-question sectional).
 * @param {string[]} [patternsToInclude] - If provided, use only these question patterns in balanced proportion.
 */
async function generateFullMockMixBatch(apiKey, model, batchSize, batchLabel, difficulty = "moderate", excludeSnippets = [], totalQuestions = 100, patternsToInclude = []) {
  const systemPrompt = usesCompactFullMockPrompts()
    ? buildCompactFullMockMixSystemPrompt(difficulty, excludeSnippets, patternsToInclude)
    : buildFullMockMixSystemPrompt(difficulty, excludeSnippets, patternsToInclude);

  const jsonNote = usesFullBilingualExplanations()
    ? "Bilingual Q/options/explanations."
    : "Bilingual Q/options (EN+HI). English explanation only.";
  const userPrompt = `Generate EXACTLY ${batchSize} UPSC GS Paper 1 questions (${batchLabel}, ${totalQuestions}Q mock). ${jsonNote} JSON only.`;

  const maxTokens = getMaxTokensForTestGeneration(batchSize);
  const { aiContent, finishReason } = await callOpenRouterTestGeneration({
    apiKey,
    model,
    systemPrompt,
    userPrompt,
    maxTokens,
    apiTitle: "UPSC Mentor - Full Mock Mix",
  });

  if (finishReason === "length") {
    console.warn(`⚠️ Full mock MIX batch truncated (max_tokens=${maxTokens}, need=${batchSize})`);
  }

  try {
    const { validatedQuestions, testName } = parseFullMockResponse(aiContent);
    if (validatedQuestions.length > 0) {
      return { questions: validatedQuestions, testName, finishReason };
    }
    console.warn(
      `Full mock MIX: parseFullMockResponse returned 0 valid questions (finish=${finishReason}); trying compact array parser`
    );
  } catch (parseErr) {
    console.warn("Full mock MIX: parseFullMockResponse failed:", parseErr.message);
  }

  const validated = parseAndValidateQuestions(aiContent, batchSize);
  if (validated.length > 0) {
    return { questions: validated, testName: "UPSC Real Prelims Mock", finishReason };
  }

  console.error("Full mock MIX batch: no valid questions. Raw (first 600 chars):", aiContent.slice(0, 600));
  return { questions: [], testName: "UPSC Real Prelims Mock", finishReason };
}

const MIX_DISPLAY_100 = 100;
const MIX_DISPLAY_50 = 50;
/** Max extra API batches if dedupe leaves us short of display count. */
function getMixMaxRefillBatches() {
  return Math.max(5, Math.min(25, parseInt(process.env.MIX_MAX_REFILL_BATCHES, 10) || 15));
}

/**
 * Generate full-length or sectional UPSC Prelims GS Paper 1 MIX mock (100 or 50 questions).
 * Generates more than display count to avoid duplicate questions in the same paper; returns only display count.
 * @param {Object} [opts]
 * @param {number} [opts.totalQuestions=100] - 100 full-length or 50 sectional (display count)
 * @param {string} [opts.difficulty=moderate] - easy | moderate | hard (moderate = 60% moderate + 40% hard)
 * @param {boolean} [opts.avoidPreviouslyUsed=false] - if true, pass hint to avoid repeating themes (prompt-level)
 */
export const generateFullMockMixTestQuestions = async (opts = {}) => {
  const displayCount = Math.min(100, Math.max(50, parseInt(opts.totalQuestions, 10) || 100));
  const isSectional = displayCount === 50;
  const generateCount = displayCount + getMixGenerateBuffer();
  const difficulty = ["easy", "moderate", "hard"].includes(String(opts.difficulty || "").toLowerCase())
    ? String(opts.difficulty).toLowerCase()
    : "moderate";
  const excludeSnippets = Array.isArray(opts.excludeSnippets) ? opts.excludeSnippets : [];
  const patternsToInclude = Array.isArray(opts.patternsToInclude) && opts.patternsToInclude.length > 0 ? opts.patternsToInclude : [];

  try {
    // Common path: same KB+RAG+LLM + system prompt as Topic Practice / chapter practice
    if (isUpscPrelimsRagEnabled()) {
      const ragResult = await generateUpscPrelimsMockPaper({
        mode: "mix",
        questionCount: displayCount,
        difficulty,
        patternsToInclude,
        excludeSnippets,
        testName: isSectional ? "UPSC GS Sectional Mock (50 Q)" : "UPSC Real Prelims Mock",
      });
      if (ragResult.success && ragResult.questions?.length >= displayCount) {
        const translatedQuestions = finalizeGeneratedQuestions(ragResult.questions.slice(0, displayCount));
        if (translatedQuestions.length >= displayCount) {
          console.log(
            `✅ Full mock MIX via common KB+RAG: ${translatedQuestions.length}Q (same prompt as Topic Practice)`
          );
          return {
            success: true,
            questions: translatedQuestions,
            count: translatedQuestions.length,
            testName:
              ragResult.testName ||
              (isSectional ? "Prelims Mock - Sectional 50" : "Prelims Mock - Full Length GS Mix"),
            source: "kb_rag_common",
          };
        }
      }
      if (ragResult.skippedRag) {
        console.warn("⚠️ PRELIMS_USE_RAG disabled — falling back to open-LLM mix generator");
      } else {
        console.warn(
          `⚠️ Common KB+RAG mix short/failed (${ragResult.error || "unknown"}) — falling back to open-LLM`
        );
      }
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = getTestGenerationModel();

    if (!apiKey) {
      throw new Error("Missing OPENROUTER_API_KEY in environment variables");
    }

    const perBatch = getMixBatchSize();
    const batches = Math.ceil(generateCount / perBatch);
    const all = [];
    let testName = isSectional ? "UPSC GS Sectional Mock (50 Q)" : "UPSC Real Prelims Mock";

    for (let b = 1; b <= batches; b++) {
      const fromAll = dedupeQuestionsByStem(dedupeQuestions(all))
        .map((q) => String(q.question_en || q.question || q.questionText || "").trim().slice(0, 60))
        .filter(Boolean);
      const rollingExclude = [...new Set([...excludeSnippets, ...fromAll])].slice(0, 5);
      console.log(
        `📝 Full mock MIX: batch ${b}/${batches} (${perBatch} Q, max_tokens≈${getMaxTokensForTestGeneration(perBatch)}, difficulty=${difficulty})...`
      );
      const { questions: batchQuestions, testName: batchTestName } = await generateFullMockMixBatch(
        apiKey,
        model,
        perBatch,
        `Part ${b}`,
        difficulty,
        rollingExclude,
        displayCount,
        patternsToInclude
      );
      if (batchTestName) testName = batchTestName;
      if (batchQuestions && batchQuestions.length) all.push(...batchQuestions);
    }

    let deduped = dedupeQuestionsByStem(dedupeQuestions(all));
    const maxRefills = getMixMaxRefillBatches();
    let refill = 0;
    let stallRounds = 0;

    while (deduped.length < displayCount && refill < maxRefills) {
      const beforeCount = deduped.length;
      const need = Math.max(1, Math.min(perBatch, displayCount - deduped.length));
      const fromDeduped = deduped
        .map((q) => String(q.question_en || q.question || q.questionText || "").trim().slice(0, 60))
        .filter(Boolean);
      const snippetPool = [...new Set([...excludeSnippets, ...fromDeduped])].slice(0, 5);
      console.log(
        `📝 Full mock MIX: refill ${refill + 1}/${maxRefills} (unique ${deduped.length}/${displayCount}, requesting ${need})...`
      );
      const { questions: batchQuestions, testName: batchTestName } = await generateFullMockMixBatch(
        apiKey,
        model,
        need,
        `Refill ${refill + 1}`,
        difficulty,
        snippetPool,
        displayCount,
        patternsToInclude
      );
      if (batchTestName) testName = batchTestName;
      if (batchQuestions && batchQuestions.length) all.push(...batchQuestions);
      deduped = dedupeQuestionsByStem(dedupeQuestions(all));
      refill += 1;
      if (deduped.length === beforeCount) stallRounds += 1;
      else stallRounds = 0;
      if (stallRounds >= 4) {
        console.warn(`📝 Full mock MIX: stopping refill after ${stallRounds} rounds with no new unique questions`);
        break;
      }
    }

    let finalQuestions = deduped.slice(0, displayCount);

    if (finalQuestions.length === 0) {
      throw new Error("No valid UPSC questions generated for full mock mix. Please try again.");
    }

    if (finalQuestions.length < displayCount) {
      const gap = displayCount - finalQuestions.length;
      console.log(`📝 Full mock MIX: short by ${gap}, running up to ${gap + 2} micro top-up batches...`);
      for (let t = 0; t < gap + 2 && finalQuestions.length < displayCount; t += 1) {
        const need = displayCount - finalQuestions.length;
        const snippets = finalQuestions
          .map((q) => String(q.question_en || q.question || "").trim().slice(0, 60))
          .filter(Boolean)
          .slice(0, 8);
        const { questions: extra } = await generateFullMockMixBatch(
          apiKey,
          model,
          need,
          `Top-up ${t + 1}`,
          difficulty,
          snippets,
          displayCount,
          patternsToInclude
        );
        if (extra && extra.length) {
          all.push(...extra);
          deduped = dedupeQuestionsByStem(dedupeQuestions(all));
          finalQuestions = deduped.slice(0, displayCount);
        }
      }
    }

    if (finalQuestions.length < displayCount) {
      throw new Error(
        `Full mock MIX: only ${finalQuestions.length} unique questions after ${batches + refill} batches (need ${displayCount}). Try Go Live again.`
      );
    }

    console.log(`✅ Full mock MIX: ${deduped.length} unique generated, showing ${finalQuestions.length} questions (no duplicates in paper)`);

    const translatedQuestions = finalizeGeneratedQuestions(finalQuestions);

    return {
      success: true,
      questions: translatedQuestions,
      count: translatedQuestions.length,
      testName: testName || (isSectional ? "Prelims Mock - Sectional 50" : "Prelims Mock - Full Length GS Mix"),
    };
  } catch (error) {
    console.error("Error generating full mock MIX questions:", error);
    return {
      success: false,
      error: error.message || "Failed to generate full mock mix questions",
      questions: [],
    };
  }
};

/**
 * Normalize explanation: object { A,B,C,D } or string (legacy).
 * Full teaching text lives on the correct letter only — never paste onto all four.
 */
function normalizeExplanation(raw, correctAnswer = "A") {
  const answer = String(correctAnswer || "A")
    .toUpperCase()
    .charAt(0);
  const letter = ["A", "B", "C", "D"].includes(answer) ? answer : "A";
  const out = { A: "", B: "", C: "", D: "" };

  if (typeof raw === "object" && raw !== null && (raw.A != null || raw.B != null || raw.C != null || raw.D != null)) {
    const texts = ["A", "B", "C", "D"].map((k) => String(raw[k] ?? "").trim()).filter(Boolean);
    const unique = new Set(texts.map((t) => t.toLowerCase().replace(/\s+/g, " ")));
    if (unique.size <= 1) {
      out[letter] = String(raw[letter] ?? texts[0] ?? "").trim() || "No explanation provided.";
      return out;
    }
    for (const k of ["A", "B", "C", "D"]) {
      out[k] = String(raw[k] ?? "").trim();
    }
    // Drop duplicates of correct
    const cNorm = out[letter].toLowerCase().replace(/\s+/g, " ");
    for (const k of ["A", "B", "C", "D"]) {
      if (k === letter || !out[k]) continue;
      const n = out[k].toLowerCase().replace(/\s+/g, " ");
      if (cNorm && (n === cNorm || (cNorm.length >= 40 && n.includes(cNorm.slice(0, 80))))) {
        out[k] = "";
      }
    }
    return out;
  }
  const str = String(raw ?? "").trim() || "No explanation provided.";
  out[letter] = str;
  return out;
}

/**
 * Normalize options from options_en, options (object/array), or [{ key, text }].
 */
function normalizeOptions(q) {
  const optionsObj = { A: "", B: "", C: "", D: "" };

  const fillFromObject = (obj) => {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
    optionsObj.A = String(obj.A ?? obj.a ?? "").trim();
    optionsObj.B = String(obj.B ?? obj.b ?? "").trim();
    optionsObj.C = String(obj.C ?? obj.c ?? "").trim();
    optionsObj.D = String(obj.D ?? obj.d ?? "").trim();
    return Boolean(optionsObj.A && optionsObj.B && optionsObj.C && optionsObj.D);
  };

  const fillFromStringArray = (arr) => {
    if (!Array.isArray(arr) || arr.length < 4 || typeof arr[0] !== "string") return false;
    optionsObj.A = String(arr[0] ?? "").trim();
    optionsObj.B = String(arr[1] ?? "").trim();
    optionsObj.C = String(arr[2] ?? "").trim();
    optionsObj.D = String(arr[3] ?? "").trim();
    return Boolean(optionsObj.A && optionsObj.B && optionsObj.C && optionsObj.D);
  };

  if (fillFromObject(q.options_en)) return optionsObj;
  if (fillFromObject(q.options)) return optionsObj;
  if (fillFromStringArray(q.options_en)) return optionsObj;
  if (fillFromStringArray(q.options)) return optionsObj;

  if (Array.isArray(q.options) && q.options.length >= 4) {
    q.options.forEach((opt) => {
      if (typeof opt === "string") return;
      const key = (opt.key || opt.Key || "").toUpperCase().charAt(0);
      if (["A", "B", "C", "D"].includes(key)) {
        optionsObj[key] = String(opt.text ?? opt.value ?? "").trim();
      }
    });
  }

  return optionsObj;
}

/**
 * Normalize raw question items to app schema.
 * Supports new structured format (questionText, tableData, matchColumns, assertionReason, options array) and legacy format.
 */
function normalizeFullMockQuestions(questions) {
  if (!Array.isArray(questions)) return [];
  return questions
    .map((q) => {
      const questionEn = String(q.question_en ?? q.questionText ?? q.question ?? "").trim();
      const questionHi = String(q.question_hi ?? "").trim();
      const optionsObj = normalizeOptions(q);
      const optionsHi = { A: "", B: "", C: "", D: "" };
      const sourceHi = q.options_hi;
      if (sourceHi && typeof sourceHi === "object" && !Array.isArray(sourceHi)) {
        optionsHi.A = String(sourceHi.A ?? sourceHi.a ?? "").trim();
        optionsHi.B = String(sourceHi.B ?? sourceHi.b ?? "").trim();
        optionsHi.C = String(sourceHi.C ?? sourceHi.c ?? "").trim();
        optionsHi.D = String(sourceHi.D ?? sourceHi.d ?? "").trim();
      } else if (Array.isArray(sourceHi) && sourceHi.length >= 4) {
        optionsHi.A = String(sourceHi[0] ?? "").trim();
        optionsHi.B = String(sourceHi[1] ?? "").trim();
        optionsHi.C = String(sourceHi[2] ?? "").trim();
        optionsHi.D = String(sourceHi[3] ?? "").trim();
      }
      if (!optionsObj.A && optionsHi.A) {
        optionsObj.A = optionsHi.A;
        optionsObj.B = optionsHi.B;
        optionsObj.C = optionsHi.C;
        optionsObj.D = optionsHi.D;
      }
      const correct = (q.correct_answer || q.correctAnswer || q.answer || "").toUpperCase().charAt(0);
      const difficulty = ["easy", "moderate", "hard"].includes(String(q.difficulty || "").toLowerCase())
        ? String(q.difficulty).toLowerCase()
        : "moderate";
      const questionType = q.questionType || q.type || "direct";
      const correctKey = ["A", "B", "C", "D"].includes(correct) ? correct : null;
      const explanationEn = normalizePrelimsExplanation(
        q.explanation_en ?? q.explanation,
        correctKey
      );
      const base = ensureEnglishBilingualFields({
        subject: q.subject != null && String(q.subject).trim() ? String(q.subject).trim() : undefined,
        difficulty,
        question: questionEn,
        question_en: questionEn,
        question_hi: questionHi,
        options: optionsObj,
        options_en: optionsObj,
        options_hi: optionsHi,
        correctAnswer: correctKey,
        explanation: explanationEn,
        explanation_en: explanationEn,
        ...(usesFullBilingualExplanations() && q.explanation_hi
          ? { explanation_hi: normalizeExplanation(q.explanation_hi, correctKey) }
          : {}),
        patternType: questionType,
        questionType,
      });
      if (q.tableData && typeof q.tableData === "object" && (q.tableData.headers?.length || q.tableData.rows?.length)) {
        base.tableData = { headers: q.tableData.headers || [], rows: q.tableData.rows || [] };
      }
      if (q.matchColumns && typeof q.matchColumns === "object" && (q.matchColumns.columnA?.length || q.matchColumns.columnB?.length)) {
        base.matchColumns = { columnA: q.matchColumns.columnA || [], columnB: q.matchColumns.columnB || [] };
      }
      if (q.matchColumns_hi && typeof q.matchColumns_hi === "object" && (q.matchColumns_hi.columnA?.length || q.matchColumns_hi.columnB?.length)) {
        base.matchColumns_hi = { columnA: q.matchColumns_hi.columnA || [], columnB: q.matchColumns_hi.columnB || [] };
      }
      if (q.assertionReason && typeof q.assertionReason === "object" && (q.assertionReason.assertion || q.assertionReason.reason)) {
        base.assertionReason = {
          assertion: String(q.assertionReason.assertion ?? "").trim(),
          reason: String(q.assertionReason.reason ?? "").trim(),
        };
      }
      if (!usesCompactFullMockPrompts()) {
        if (q.eliminationLogic != null && String(q.eliminationLogic).trim()) {
          base.eliminationLogic = String(q.eliminationLogic).trim();
        }
        if (q.conceptualSource != null && String(q.conceptualSource).trim()) {
          base.conceptualSource = String(q.conceptualSource).trim();
        }
      }
      base.questionId = hashQuestion(canonicalDedupeKey(base));
      return base;
    })
    .filter(
      (q) =>
        q.question &&
        q.options.A &&
        q.options.B &&
        q.options.C &&
        q.options.D &&
        q.correctAnswer
    );
}

/**
 * Parse full-mock AI response. Accepts:
 * - Full object { test_name, questions: [...] }
 * - Raw array of question objects
 * - JSON wrapped in markdown code blocks (single or with leading text)
 * - Uses extractJsonFromContent when direct parse fails
 */
function parseFullMockResponse(aiContent) {
  let content = aiContent.trim();
  // Strip markdown code blocks (allow leading text before ```)
  const codeBlockStart = content.indexOf("```");
  if (codeBlockStart >= 0) {
    const afterStart = content.slice(codeBlockStart).replace(/^```\s*(?:json)?\s*/i, "").trim();
    const endBlock = afterStart.indexOf("```");
    content = (endBlock >= 0 ? afterStart.slice(0, endBlock) : afterStart).trim();
  }
  const jsonStart = content.indexOf("{");
  const arrayStart = content.indexOf("[");
  let data = null;
  let testName = "Prelims Mock - Full Length";

  // Try parse full content
  try {
    data = JSON.parse(content);
  } catch (_) {}

  if (data !== null) {
    if (Array.isArray(data)) {
      return { validatedQuestions: normalizeFullMockQuestions(data), testName };
    }
    if (data && typeof data.questions !== "undefined") {
      testName = data.test_name || data.title || data.examTitle || testName;
      return { validatedQuestions: normalizeFullMockQuestions(data.questions), testName };
    }
  }

  // Try extractJsonFromContent (finds first { or [ and matching bracket)
  data = extractJsonFromContent(content);
  if (data !== null) {
    if (Array.isArray(data)) {
      return { validatedQuestions: normalizeFullMockQuestions(data), testName };
    }
    if (data && typeof data.questions !== "undefined") {
      testName = data.test_name || data.title || data.examTitle || testName;
      return { validatedQuestions: normalizeFullMockQuestions(data.questions), testName };
    }
  }

  // Truncated array: content is just "[ { ... }, { ... }"
  if (content.charAt(0) === "[") {
    const extracted = extractCompleteObjectsFromTruncatedArray(content);
    if (extracted && extracted.length > 0) {
      return { validatedQuestions: normalizeFullMockQuestions(extracted), testName };
    }
  }

  // Truncated object: content is "{ "test_name": ..., "questions": [ { ... }, ..." (cut off before ] })
  const questionsLabel = '"questions"';
  const qIdx = content.indexOf(questionsLabel);
  if (qIdx >= 0) {
    const arrayStart = content.indexOf("[", qIdx);
    if (arrayStart >= 0) {
      const arrayPart = content.slice(arrayStart);
      const extracted = extractCompleteObjectsFromTruncatedArray(arrayPart);
      if (extracted && extracted.length > 0) {
        const nameMatch = content.match(/"test_name"\s*:\s*"([^"]*)"/);
        if (nameMatch) testName = nameMatch[1];
        return { validatedQuestions: normalizeFullMockQuestions(extracted), testName };
      }
    }
  }

  throw new Error("AI response did not contain a valid full-mock JSON object or questions array");
}

/**
 * One batch for subject-based Prelims mock (same bilingual + parse path as GS Mix).
 */
async function generateFullMockSubjectBatch(
  apiKey,
  model,
  subject,
  batchLabel,
  batchSize,
  excludeSnippets = [],
  patternsToInclude = []
) {
  const subjectsList = typeof subject === "string" ? subject.split(",").map((s) => s.trim()) : [subject];
  const systemPrompt = usesCompactFullMockPrompts()
    ? buildCompactFullMockSubjectSystemPrompt(subjectsList, excludeSnippets, patternsToInclude)
    : buildGSSystemPrompt(subjectsList, `Full Mock - ${batchLabel}`, "Moderate", null, patternsToInclude);
  const userPrompt = `Generate EXACTLY ${batchSize} UPSC GS questions (${batchLabel}, subjects: ${subjectsList.join(", ")}). ${bilingualBatchJsonNote()} JSON only.`;

  const maxTokens = getMaxTokensForTestGeneration(batchSize);
  const { aiContent, finishReason } = await callOpenRouterTestGeneration({
    apiKey,
    model,
    systemPrompt,
    userPrompt,
    maxTokens,
    apiTitle: "UPSC Mentor - Full Mock Subject",
  });

  if (finishReason === "length") {
    console.warn(`⚠️ Full mock Subject batch truncated (max_tokens=${maxTokens}, need=${batchSize})`);
  }

  const defaultName = `Prelims Mock - ${subjectsList.join(", ")}`;
  try {
    const { validatedQuestions, testName } = parseFullMockResponse(aiContent);
    if (validatedQuestions.length > 0) {
      return { questions: validatedQuestions, testName: testName || defaultName, finishReason };
    }
    console.warn(`Full mock Subject: parseFullMockResponse returned 0 (finish=${finishReason}); trying compact parser`);
  } catch (parseErr) {
    console.warn("Full mock Subject: parseFullMockResponse failed:", parseErr.message);
  }

  const validated = parseAndValidateQuestions(aiContent, batchSize);
  if (validated.length > 0) {
    return { questions: validated, testName: defaultName, finishReason };
  }

  console.error("Full mock Subject batch: no valid questions. Raw (first 600 chars):", aiContent.slice(0, 600));
  return { questions: [], testName: defaultName, finishReason };
}

const SUBJECT_FULL_DISPLAY_COUNT = 100;

/**
 * Generate full-length (100 questions) UPSC Prelims GS Paper 1 mock: 6 batches of 20 (120 generated), show 100.
 * @param {Object} params
 * @param {string} params.subject - Subject from admin (e.g. "Polity", "History, Geography")
 * @returns {Promise<Object>} - { success, questions?, count?, testName?, error? }
 */
export const generateFullMockTestQuestions = async ({ subject, patternsToInclude = [] }) => {
  const displayCount = SUBJECT_FULL_DISPLAY_COUNT;
  const patterns = Array.isArray(patternsToInclude) && patternsToInclude.length > 0 ? patternsToInclude : [];

  try {
    // Common path: same KB+RAG+LLM + system prompt as Topic Practice
    if (isUpscPrelimsRagEnabled()) {
      const ragResult = await generateUpscPrelimsMockPaper({
        mode: "subject",
        subject,
        questionCount: displayCount,
        difficulty: "moderate",
        patternsToInclude: patterns,
        testName: `Prelims Mock - ${subject}`,
      });
      if (ragResult.success && ragResult.questions?.length >= displayCount) {
        const translatedQuestions = finalizeGeneratedQuestions(ragResult.questions.slice(0, displayCount));
        if (translatedQuestions.length >= displayCount) {
          console.log(
            `✅ Full mock Subject via common KB+RAG: ${translatedQuestions.length}Q (same prompt as Topic Practice)`
          );
          return {
            success: true,
            questions: translatedQuestions,
            count: translatedQuestions.length,
            testName: ragResult.testName || `Prelims Mock - ${subject}`,
            source: "kb_rag_common",
          };
        }
      }
      if (ragResult.skippedRag) {
        console.warn("⚠️ PRELIMS_USE_RAG disabled — falling back to open-LLM subject mock");
      } else {
        console.warn(
          `⚠️ Common KB+RAG subject mock short/failed (${ragResult.error || "unknown"}) — falling back to open-LLM`
        );
      }
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = getTestGenerationModel();

    if (!apiKey) {
      throw new Error("Missing OPENROUTER_API_KEY in environment variables");
    }

    const { deduped, finalQuestions, testName } = await runFullMockPaperGenerationLoop({
      apiKey,
      model,
      displayCount,
      csatPaper: false,
      logPrefix: "Full mock Subject",
      generateBatch: (key, m, size, label, exclude) =>
        generateFullMockSubjectBatch(key, m, subject, label, size, exclude, patterns),
    });

    if (finalQuestions.length === 0) {
      throw new Error("No valid UPSC questions generated for full mock. Please try again.");
    }

    if (finalQuestions.length < displayCount) {
      throw new Error(
        `Full mock Subject: only ${finalQuestions.length} unique questions (need ${displayCount}). Try Go Live again.`
      );
    }

    console.log(`✅ Full mock Subject: ${deduped.length} unique generated, showing ${finalQuestions.length} questions`);

    const translatedQuestions = finalizeGeneratedQuestions(finalQuestions);

    return {
      success: true,
      questions: translatedQuestions,
      count: translatedQuestions.length,
      testName: testName || `Prelims Mock - ${subject}`,
    };
  } catch (error) {
    console.error("Error generating full mock questions:", error);
    return {
      success: false,
      error: error.message || "Failed to generate full mock questions",
      questions: [],
    };
  }
};

/**
 * Extract a JSON array or object from content by finding first [ or { and matching bracket.
 */
function extractJsonFromContent(content) {
  const trim = content.trim();
  const arrayStart = trim.indexOf("[");
  const objectStart = trim.indexOf("{");
  const start = arrayStart >= 0 && (objectStart < 0 || arrayStart < objectStart) ? arrayStart : objectStart;
  if (start < 0) return null;
  const open = trim[start];
  const close = open === "[" ? "]" : "}";
  let depth = 0;
  for (let i = start; i < trim.length; i++) {
    const c = trim[i];
    if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(trim.slice(start, i + 1));
        } catch (_) {
          return null;
        }
      }
    }
  }
  return null;
}

/**
 * When AI response is truncated (starts with [ but no closing ]), extract every complete
 * {...} object so we can still use the questions we got. Respects strings so we don't
 * count { or } inside quoted values.
 */
function extractCompleteObjectsFromTruncatedArray(content) {
  const s = content.trim();
  if (s.charAt(0) !== "[") return null;
  const results = [];
  let i = s.indexOf("{");
  while (i >= 0 && i < s.length) {
    let depth = 0;
    let inString = false;
    let escape = false;
    let end = -1;
    for (let j = i; j < s.length; j++) {
      const c = s[j];
      if (escape) {
        escape = false;
        continue;
      }
      if (c === "\\" && inString) {
        escape = true;
        continue;
      }
      if (c === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (c === "{") depth++;
        else if (c === "}") {
          depth--;
          if (depth === 0) {
            end = j;
            break;
          }
        }
      }
    }
    if (end < 0) break;
    try {
      const obj = JSON.parse(s.slice(i, end + 1));
      results.push(obj);
    } catch (_) {}
    i = s.indexOf("{", end + 1);
  }
  return results.length > 0 ? results : null;
}

/**
 * Parse AI response and map to application question schema.
 * Tolerates markdown code blocks, leading text, and both array + object-with-questions formats.
 */
function parseAndValidateQuestions(aiContent, count) {
  let content = aiContent.trim();
  if (content.startsWith("```")) {
    content = content.replace(/^```\s*(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  }

  let questions = [];
  let parsed = null;
  try {
    parsed = JSON.parse(content);
  } catch (_) {
    parsed = extractJsonFromContent(content);
  }
  // Truncated response: starts with [ but no closing ] – extract each complete {...} object
  if (parsed === null && content.charAt(0) === "[") {
    const extracted = extractCompleteObjectsFromTruncatedArray(content);
    if (extracted && extracted.length > 0) {
      parsed = extracted;
      console.log(`parseAndValidateQuestions: used ${extracted.length} questions from truncated response`);
    }
  }

  if (parsed !== null) {
    questions = Array.isArray(parsed) ? parsed : (parsed.questions || []);
  }

  if (!Array.isArray(questions) || questions.length === 0) {
    console.warn(
      "parseAndValidateQuestions: no parseable questions (truncated or invalid JSON). Preview:",
      content.slice(0, 200)
    );
    return [];
  }

  const validatedQuestions = questions
    .map((q) => {
      const optionsObj = {};
      const optionsHi = { A: "", B: "", C: "", D: "" };
      const sourceEn = q.options_en ?? (Array.isArray(q.options) ? null : q.options);
      const sourceHi = q.options_hi;

      if (sourceEn && typeof sourceEn === "object" && !Array.isArray(sourceEn)) {
        optionsObj.A = String(sourceEn.A ?? sourceEn.a ?? "").trim();
        optionsObj.B = String(sourceEn.B ?? sourceEn.b ?? "").trim();
        optionsObj.C = String(sourceEn.C ?? sourceEn.c ?? "").trim();
        optionsObj.D = String(sourceEn.D ?? sourceEn.d ?? "").trim();
      } else if (Array.isArray(q.options) && q.options.length >= 4) {
        optionsObj.A = String(q.options[0] ?? "").trim();
        optionsObj.B = String(q.options[1] ?? "").trim();
        optionsObj.C = String(q.options[2] ?? "").trim();
        optionsObj.D = String(q.options[3] ?? "").trim();
      } else if (typeof q.options === "object" && q.options !== null) {
        optionsObj.A = String(q.options.A ?? q.options.a ?? "").trim();
        optionsObj.B = String(q.options.B ?? q.options.b ?? "").trim();
        optionsObj.C = String(q.options.C ?? q.options.c ?? "").trim();
        optionsObj.D = String(q.options.D ?? q.options.d ?? "").trim();
      }

      if (sourceHi && typeof sourceHi === "object" && !Array.isArray(sourceHi)) {
        optionsHi.A = String(sourceHi.A ?? sourceHi.a ?? "").trim();
        optionsHi.B = String(sourceHi.B ?? sourceHi.b ?? "").trim();
        optionsHi.C = String(sourceHi.C ?? sourceHi.c ?? "").trim();
        optionsHi.D = String(sourceHi.D ?? sourceHi.d ?? "").trim();
      } else if (Array.isArray(sourceHi) && sourceHi.length >= 4) {
        optionsHi.A = String(sourceHi[0] ?? "").trim();
        optionsHi.B = String(sourceHi[1] ?? "").trim();
        optionsHi.C = String(sourceHi[2] ?? "").trim();
        optionsHi.D = String(sourceHi[3] ?? "").trim();
      }

      let correct = q.answer ?? q.correctAnswer ?? q.correct_answer ?? "";
      correct = String(correct).toUpperCase().trim().charAt(0);
      if (["1", "2", "3", "4"].includes(correct)) correct = ["A", "B", "C", "D"][parseInt(correct, 10) - 1];
      if (!["A", "B", "C", "D"].includes(correct)) correct = null;
      const questionEn = String(q.question_en ?? q.question ?? q.questionText ?? "").trim();
      const questionHi = String(q.question_hi ?? "").trim();
      const difficulty = ["easy", "moderate", "hard"].includes(String(q.difficulty || "").toLowerCase())
        ? String(q.difficulty).toLowerCase()
        : "moderate";
      const explanationEn = normalizePrelimsExplanation(
        q.explanation_en ?? q.explanation,
        correct
      );
      const explanationHiRaw = usesFullBilingualExplanations() ? q.explanation_hi : null;
      const row = ensureEnglishBilingualFields({
        difficulty,
        question: questionEn,
        question_en: questionEn,
        question_hi: questionHi,
        options: optionsObj,
        options_en: optionsObj,
        options_hi: optionsHi,
        correctAnswer: correct,
        explanation: explanationEn,
        explanation_en: explanationEn,
        ...(explanationHiRaw ? { explanation_hi: normalizeExplanation(explanationHiRaw, correct) } : {}),
        patternType: q.pattern || "GENERAL",
        subject: q.subject,
      });
      row.questionId = hashQuestion(canonicalDedupeKey(row));
      return row;
    })
    .filter(
      (q) =>
        q.question &&
        q.options.A &&
        q.options.B &&
        q.options.C &&
        q.options.D &&
        q.correctAnswer
    )
    .slice(0, parseInt(count, 10) || 999);

  return validatedQuestions;
}

/**
 * One OpenRouter chat completion for prelims MCQ JSON.
 */
async function callOpenRouterTestGeneration({
  apiKey,
  model,
  systemPrompt,
  userPrompt,
  maxTokens,
  apiTitle,
}) {
  assertOpenRouterAllowed("callOpenRouterTestGeneration");
  const title = apiTitle || getOpenRouterAppTitle("UPSC Mentor");
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": getFrontendOrigin(),
      "X-Title": title,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`OpenRouter API error: ${response.status}`, errorBody);
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const aiContent = data?.choices?.[0]?.message?.content?.trim();
  const finishReason = data?.choices?.[0]?.finish_reason;
  const usage = data?.usage;

  if (usage) {
    console.log(
      `📊 OpenRouter usage: prompt=${usage.prompt_tokens ?? "?"} completion=${usage.completion_tokens ?? "?"} total=${usage.total_tokens ?? "?"} finish=${finishReason ?? "?"} max_tokens=${maxTokens}`
    );
  }

  if (!aiContent) {
    throw new Error("No response received from AI model");
  }

  return { aiContent, finishReason, usage };
}

/**
 * Fetch one batch of MCQs; top-up within the batch if the response was truncated.
 */
async function fetchQuestionBatch({
  apiKey,
  model,
  systemPrompt,
  userPrompt,
  need,
  avoidSnippets = [],
  csatPaper = false,
}) {
  let apiCalls = 0;
  const avoidBlock =
    avoidSnippets.length > 0
      ? `\nDo not repeat or closely paraphrase these stems:\n${avoidSnippets.map((s) => `- ${s}`).join("\n")}`
      : "";

  const runOnce = async (prompt, n) => {
    const maxTokens = getMaxTokensForTestGeneration(n);
    const { aiContent, finishReason } = await callOpenRouterTestGeneration({
      apiKey,
      model,
      systemPrompt,
      userPrompt: prompt,
      maxTokens,
    });
    apiCalls += 1;
    if (finishReason === "length") {
      console.warn(`⚠️ Batch response truncated (max_tokens=${maxTokens}, need=${n})`);
    }
    const questions = parseAndValidateQuestions(aiContent, n);
    return { questions, finishReason };
  };

  let { questions: batch, finishReason: lastFinish } = await runOnce(`${userPrompt}${avoidBlock}`, need);

  if (batch.length < need) {
    const missing = need - batch.length;
    const stems = batch
      .map((q) => String(q.question_en || q.question || "").trim().slice(0, 60))
      .filter(Boolean);
    const topUpPrompt = `${userPrompt}${avoidBlock}\n\nGenerate EXACTLY ${missing} ADDITIONAL questions (not ${need} total). Return ONLY a JSON array of ${missing} new objects.${stems.length ? `\nAvoid repeating:\n${stems.map((s) => `- ${s}`).join("\n")}` : ""}`;
    const { questions: more, finishReason: topFinish } = await runOnce(topUpPrompt, missing);
    batch = dedupeMockPaperQuestions([...batch, ...more], { csat: csatPaper }).slice(0, need);
    if (batch.length < need && lastFinish !== "length" && topFinish !== "length") {
      console.warn(
        `⚠️ Batch parsed ${batch.length}/${need} questions after top-up (finish_reason=${topFinish ?? lastFinish ?? "unknown"})`
      );
    }
  }

  return { questions: batch, apiCalls };
}

const TOPIC_PRACTICE_DEFAULT_PATTERNS = Object.keys(PATTERN_LABELS);

function resolveTopicPracticePatterns(patternsToInclude = []) {
  const valid = Array.isArray(patternsToInclude)
    ? patternsToInclude.filter((id) => PATTERN_LABELS[id])
    : [];
  return valid.length > 0 ? valid : TOPIC_PRACTICE_DEFAULT_PATTERNS;
}

/** Compact topic-practice prompt — same token profile as Prelims Mock batches. */
function buildCompactTopicPracticeSystemPrompt(
  subject,
  topic,
  difficulty,
  excludeSnippets = [],
  patternsToInclude = []
) {
  const avoidLine =
    Array.isArray(excludeSnippets) && excludeSnippets.length > 0
      ? `\nAvoid repeating:\n${excludeSnippets.slice(0, 5).map((s) => `- ${String(s).slice(0, 60)}`).join("\n")}\n`
      : "";
  const diffNorm = String(difficulty || "moderate").toLowerCase();
  const diffLine = diffNorm === "easy" ? "Easy" : diffNorm === "hard" ? "Hard" : "Moderate";
  const activePatterns = resolveTopicPracticePatterns(patternsToInclude);
  const patterns = activePatterns.map((id) => PATTERN_LABELS[id] || id).join(", ");
  const bilingualNote = isPracticeEnglishOnly() ? "" : " Bilingual EN+HI question and options.";

  return `UPSC GS topic-practice batch generator.${avoidLine}
Subject: ${subject}. Topic: "${topic}". Difficulty: ${diffLine}.
Patterns (balanced, topic-focused): ${patterns}.
${getPracticeJsonRules()}
Per question: questionType (statement|match|assertion|chronology|pair|map|direct|odd_one_out). Use matchColumns or assertionReason only when needed.
"explanation": 50–100 English words for student concept clarity — MUST start with Option {answer} ("…") is correct; then why it is right AND why EACH of the other three options is wrong.${bilingualNote}
Return ONLY a JSON array. No markdown. Unique concept per question.`;
}

function practiceQuestionHasHindiStem(q) {
  const hi = String(q?.question_hi || "");
  if (!/[\u0900-\u097F]/.test(hi)) return false;
  const en = String(q?.question_en || q?.question || "");
  const isMatch =
    Boolean(q?.matchColumns?.columnA?.length >= 2) ||
    /match\s+the\s+following|list\s*[-–—]?\s*i\b/i.test(en);
  if (isMatch) {
    const a = (q.matchColumns_hi?.columnA || []).filter((x) => String(x || "").trim());
    const b = (q.matchColumns_hi?.columnB || []).filter((x) => String(x || "").trim());
    if (a.length < 2 || b.length < 2) return false;
    return [...a, ...b].some((t) => /[\u0900-\u097F]/.test(String(t || "")));
  }
  const isAR =
    Boolean(q?.assertionReason?.assertion) ||
    (/assertion\s*\(A\)/i.test(en) && /reason\s*\(R\)/i.test(en));
  if (isAR) {
    return (
      /(?:अभिकथन|कथन|assertion)\s*\(A\)/i.test(hi) &&
      /(?:कारण|reason)\s*\(R\)/i.test(hi)
    );
  }
  const enNums = (en.match(/(?:^|\n)\s*\d+[.)]\s+\S+/g) || []).length;
  if (enNums >= 2) {
    const hiNums = (hi.match(/(?:^|\n)\s*\d+[.)]\s+\S+/g) || []).length;
    if (hiNums < Math.min(2, enNums)) return false;
  }
  return true;
}

function buildPracticeHindiTranslatePayload(q, idx) {
  const matchColumns = buildMatchColumnsPayload(q);
  const enQ = String(q.question_en || q.question || "").replace(/\\n/g, "\n").trim();
  // Match questions: List-II uses 1. 2. 3. — never send those as numberedItems or Hindi becomes fake "statements"
  const isMatch =
    Boolean(matchColumns) ||
    /match\s+the\s+following|list\s*[-–—]?\s*i\b|सूची\s*[-–—]?\s*i/i.test(enQ);
  const isAR =
    Boolean(q.assertionReason?.assertion && q.assertionReason?.reason) ||
    (/assertion\s*\(A\)/i.test(enQ) && /reason\s*\(R\)/i.test(enQ));
  const numbered = isMatch || isAR
    ? []
    : (enQ.match(/(?:^|\n)\s*\d+[.)]\s+.+/g) || []).map((l) =>
        l.replace(/^\s*\d+[.)]\s+/, "").trim()
      );

  let assertionReason = null;
  if (isAR) {
    let assertion = String(q.assertionReason?.assertion || "").trim();
    let reason = String(q.assertionReason?.reason || "").trim();
    if (!assertion || !reason) {
      const aM = enQ.match(/Assertion\s*\(A\)\s*:\s*([\s\S]*?)(?=Reason\s*\(R\)|$)/i);
      const rM = enQ.match(/Reason\s*\(R\)\s*:\s*([\s\S]*?)(?=\n(?:In the context|Which of the)|$)/i);
      assertion = assertion || String(aM?.[1] || "").trim();
      reason = reason || String(rM?.[1] || "").trim();
    }
    if (assertion && reason) assertionReason = { assertion, reason };
  }

  return {
    id: idx,
    question: matchColumns
      ? enQ.split("\n")[0].trim() || "Match the following:"
      : assertionReason
        ? `Assertion (A): ${assertionReason.assertion}\nReason (R): ${assertionReason.reason}`
        : enQ,
    options: q.options_en || q.options,
    explanation: String(q.explanation_en || q.explanation || "").trim().slice(0, 500),
    ...(matchColumns ? { matchColumns } : {}),
    ...(assertionReason ? { assertionReason } : {}),
    ...(numbered.length >= 2 ? { numberedItems: numbered } : {}),
  };
}

function applyPracticeHindiRow(mergedQ, row, srcLabel) {
  if (!row || !mergedQ) return false;
  let appliedStem = false;

  const questionHi = sanitizeHindiMcqFormat(String(row.question_hi || row.question || "").trim());
  const optionsHi = sanitizeHindiOptions(row.options_hi || row.options);
  const explanationHi = sanitizeHindiMcqFormat(String(row.explanation_hi || "").trim());
  const enFull = String(mergedQ.question_en || mergedQ.question || "").replace(/\\n/g, "\n");
  const enIsMatch =
    Boolean(mergedQ.matchColumns?.columnA?.length >= 2) ||
    /match\s+the\s+following|list\s*[-–—]?\s*i\b/i.test(enFull);

  // Structured match columns first (prevents List-I/II merge bug)
  const mcHi = row.matchColumns_hi || row.matchColumns;
  if (mcHi && typeof mcHi === "object") {
    const columnA = (mcHi.columnA || []).map((x) => coerceListItemText(x)).filter(Boolean);
    const columnB = (mcHi.columnB || []).map((x) => coerceListItemText(x)).filter(Boolean);
    if (columnA.length >= 2 && columnB.length >= 2) {
      mergedQ.matchColumns_hi = { columnA, columnB };
      const intro = questionHi.split("\n")[0] || "निम्नलिखित का मिलान कीजिए:";
      const lines = [intro.replace(/:$/, "") + ":"];
      lines.push("सूची-I");
      columnA.forEach((item, idx) => lines.push(`${String.fromCharCode(65 + idx)}. ${item}`));
      lines.push("सूची-II");
      columnB.forEach((item, idx) => lines.push(`${idx + 1}. ${item}`));
      lines.push("नीचे दिए गए कूट का प्रयोग कर सही उत्तर चुनिए:");
      mergedQ.question_hi = lines.join("\n");
      appliedStem = true;
    }
  }

  // Assertion-reason structured Hindi
  const arHiRaw = row.assertionReason_hi || row.assertionReason;
  const arHi = arHiRaw ? sanitizeHindiAssertionReason(arHiRaw) : null;
  if (
    !appliedStem &&
    arHi &&
    String(arHi.assertion || "").trim() &&
    String(arHi.reason || "").trim()
  ) {
    const a = coerceListItemText(arHi.assertion);
    const r = coerceListItemText(arHi.reason);
    if (/[\u0900-\u097F]/.test(a) && /[\u0900-\u097F]/.test(r)) {
      mergedQ.assertionReason_hi = { assertion: a, reason: r };
      mergedQ.question_hi = [
        `अभिकथन (A): ${a}`,
        `कारण (R): ${r}`,
        "उपर्युक्त के संदर्भ में निम्नलिखित में से कौन-सा सही है?",
      ].join("\n");
      appliedStem = true;
    }
  }

  // English is match → never rebuild Hindi as statement/chronology from numberedItems
  if (!appliedStem && enIsMatch) {
    const enCols = buildMatchColumnsPayload(mergedQ);
    if (enCols?.columnA?.length >= 2 && enCols?.columnB?.length >= 2) {
      // Prefer LLM Hindi columns when present but incomplete path above failed; else keep EN lists
      // and still build a full Hindi stem shell so UI can show सूची-I/II (EN items until translated).
      const columnA = (mergedQ.matchColumns_hi?.columnA?.length >= 2
        ? mergedQ.matchColumns_hi.columnA
        : enCols.columnA
      ).map((x) => coerceListItemText(x)).filter(Boolean);
      const columnB = (mergedQ.matchColumns_hi?.columnB?.length >= 2
        ? mergedQ.matchColumns_hi.columnB
        : enCols.columnB
      ).map((x) => coerceListItemText(x)).filter(Boolean);
      if (columnA.length >= 2 && columnB.length >= 2) {
        if (!mergedQ.matchColumns_hi?.columnA?.length) {
          // Leave matchColumns_hi empty so UI can prefer EN structured + Hindi labels,
          // but do NOT save a fake "statements correct?" Hindi stem.
          console.warn(
            `⚠️ ${srcLabel}: match Q missing matchColumns_hi — skipping broken statement-style Hindi stem`
          );
        } else {
          const lines = ["निम्नलिखित का मिलान कीजिए:"];
          lines.push("सूची-I");
          columnA.forEach((item, idx) => lines.push(`${String.fromCharCode(65 + idx)}. ${item}`));
          lines.push("सूची-II");
          columnB.forEach((item, idx) => lines.push(`${idx + 1}. ${item}`));
          lines.push("नीचे दिए गए कूट का प्रयोग कर सही उत्तर चुनिए:");
          mergedQ.question_hi = lines.join("\n");
          appliedStem = true;
        }
      }
    }
    // Do not fall through to numberedItems statement rebuild for match questions
  } else if (!appliedStem) {
    // Rebuild statement/chronology Hindi stem from numberedItems_hi when present
    const numberedHi = Array.isArray(row.numberedItems_hi)
      ? row.numberedItems_hi.map((x) => coerceListItemText(x)).filter(Boolean)
      : [];
    const enHasNumbers = ((enFull.match(/(?:^|\n)\s*\d+[.)]\s+\S+/g) || []).length) >= 2;

    if (numberedHi.length >= 2) {
      const intro =
        (questionHi && !/^\d+[.)]/.test(questionHi.split("\n")[0])
          ? questionHi.split("\n")[0]
          : enFull.split("\n")[0]) || "निम्नलिखित पर विचार करें:";
      const lines = [intro.replace(/:$/, "") + ":"];
      numberedHi.forEach((item, idx) => lines.push(`${idx + 1}. ${item}`));
      if (/chronolog|arrange|कालानुक्रम/i.test(enFull)) {
        lines.push("सही कालानुक्रमिक क्रम चुनिए:");
      } else if (/statement|कथन/i.test(enFull)) {
        lines.push("उपर्युक्त कथनों में से कौन-सा/से सही है/हैं?");
      }
      mergedQ.question_hi = lines.join("\n");
      appliedStem = true;
    } else if (questionHi && /[\u0900-\u097F]/.test(questionHi) && !/\[object Object\]/i.test(questionHi)) {
      const hiNums = (questionHi.match(/(?:^|\n)\s*\d+[.)]\s+\S+/g) || []).length;
      // Do not save intro-only Hindi when English stem has numbered items
      if (enHasNumbers && hiNums < 2) {
        console.warn(
          `⚠️ Skipping incomplete Hindi stem for ${srcLabel} (EN has lists, HI intro-only)`
        );
      } else {
        mergedQ.question_hi = questionHi.replace(/\\n/g, "\n");
        appliedStem = true;
        if (mergedQ.matchColumns?.columnA?.length) {
          const parsedHi = parseMatchFollowingFromText(mergedQ.question_hi);
          if (parsedHi?.columnA?.length >= 2 && parsedHi?.columnB?.length >= 2) {
            mergedQ.matchColumns_hi = {
              columnA: parsedHi.columnA.map((t) =>
                coerceListItemText(t).replace(/\s+\d+[.)]\s+[\s\S]*$/, "").trim()
              ),
              columnB: parsedHi.columnB.map((t) => coerceListItemText(t)),
            };
          }
        }
      }
    } else if (/\[object Object\]/i.test(questionHi)) {
      console.warn(
        `⚠️ Skipping corrupted Hindi stem for ${srcLabel} ([object Object] in numbered items)`
      );
    }
  }

  if (optionsHi && typeof optionsHi === "object") {
    const hiOpts = {
      A: String(optionsHi.A ?? optionsHi.a ?? "").trim(),
      B: String(optionsHi.B ?? optionsHi.b ?? "").trim(),
      C: String(optionsHi.C ?? optionsHi.c ?? "").trim(),
      D: String(optionsHi.D ?? optionsHi.d ?? "").trim(),
    };
    if (Object.values(hiOpts).some((v) => /[\u0900-\u097F]/.test(v) || /[A-D]\s*[-–—]?\s*\d/.test(v))) {
      mergedQ.options_hi = hiOpts;
    }
  }

  if (explanationHi && /[\u0900-\u097F]/.test(explanationHi)) {
    const cleaned = explanationHi.replace(/\s+/g, " ").trim();
    const words = cleaned.split(/\s+/).filter(Boolean);
    mergedQ.explanation_hi =
      words.length <= 80 ? cleaned.slice(0, 900) : `${words.slice(0, 70).join(" ")}`.slice(0, 900);
  }

  // Final pass — normalize any remaining ए/बी/सी/डी and leaked A-R options
  if (mergedQ.question_hi) {
    mergedQ.question_hi = sanitizeHindiMcqFormat(mergedQ.question_hi);
  }
  if (mergedQ.options_hi) {
    mergedQ.options_hi = sanitizeHindiOptions(mergedQ.options_hi);
  }
  if (mergedQ.assertionReason_hi) {
    const cleanedAr = sanitizeHindiAssertionReason(mergedQ.assertionReason_hi);
    if (cleanedAr) mergedQ.assertionReason_hi = cleanedAr;
  }

  return appliedStem;
}

/**
 * Translate a subset of practice questions (by absolute index) into Hindi.
 * Returns how many stems were newly applied in this call.
 */
async function translatePracticeHindiIndexBatch(apiKey, model, merged, indices, label) {
  if (!indices.length) return 0;

  const slice = indices.map((i) => merged[i]);
  const payload = slice.map((q, idx) => buildPracticeHindiTranslatePayload(q, idx));

    const systemPrompt = `UPSC Hindi translator (formal Devanagari). Return JSON array only.
For each item return: id, question_hi, options_hi {A,B,C,D}, explanation_hi (50–70 Devanagari words; full teaching explanation, not one line).
LETTER LOCK: options_hi.A MUST translate options.A (same for B/C/D). Never swap, reorder, or move text between letters — correctAnswer letter stays valid.
MARKER LOCK: ALWAYS keep Latin letters A. B. C. D. and digits 1. 2. 3. 4. as list/option markers. NEVER transliterate to ए/बी/सी/डी. Match codes must look like "A-1, B-2, C-3, D-4" (Latin), never "ए-1, बी-2".
Complete Hindi only — every numbered statement / list item must be fully translated (never half lists, never leave English sentences inside question_hi).
If matchColumns present: this is a MATCH question (List-I / List-II). You MUST return matchColumns_hi:{columnA:[],columnB:[]} with the SAME lengths as English, each entry a PLAIN STRING (item text only — no A./B. prefixes inside the string). Also set question_hi to full stem with NEWLINES:
"निम्नलिखित का मिलान कीजिए:" + "सूची-I" + "A. …" lines + "सूची-II" + "1. …" lines + "नीचे दिए गए कूट का प्रयोग कर सही उत्तर चुनिए:"
NEVER turn a match question into statement-based Hindi (no "उपर्युक्त कथनों में से कौन-सा/से सही").
If English question is Assertion-Reason: return assertionReason_hi:{assertion,reason} as PLAIN bodies only (no options inside). question_hi MUST be exactly:
"अभिकथन (A): …\\nकारण (R): …\\nउपर्युक्त के संदर्भ में निम्नलिखित में से कौन-सा सही है?"
NEVER append options (A)(B)(C)(D) or "नीचे दिए गए कूट" into assertion/reason bodies — options go only in options_hi.
If numberedItems present (and NO matchColumns): return numberedItems_hi as PLAIN STRINGS only, same length. question_hi MUST include intro + "1. ..\\n2. .." lines (never intro-only, never "[object Object]").
Same count/order. No markdown. Complete Hindi only — never half/truncated lists.`;
  const userPrompt = `Translate to Hindi:\n${JSON.stringify(payload)}`;
  const maxTokens = getMaxTokensForPracticeHindiBatch(slice.length);

  console.log(`📝 ${label}: ${slice.length} Q, max_tokens≈${maxTokens}...`);

  let rows = [];
  const attempts = slice.length <= 2 ? 3 : 2;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const { aiContent, finishReason } = await callOpenRouterTestGeneration({
        apiKey,
        model,
        systemPrompt,
        userPrompt,
        maxTokens,
        apiTitle: getOpenRouterAppTitle("UPSC Mentor - Topic Practice Hindi"),
      });

      if (!aiContent || !String(aiContent).trim()) {
        console.warn(`${label} attempt ${attempt}: empty content (finish=${finishReason})`);
        continue;
      }

      if (finishReason === "length") {
        console.warn(`⚠️ ${label} truncated (max_tokens=${maxTokens}) — salvaging partial JSON`);
      }
      if (finishReason === "error") {
        console.warn(`⚠️ ${label} finish=error — will retry if parse incomplete`);
      }

      let parsed = null;
      try {
        parsed = JSON.parse(
          aiContent.trim().replace(/^```\s*(?:json)?\s*/i, "").replace(/\s*```\s*$/, "")
        );
      } catch (_) {
        parsed = extractJsonFromContent(aiContent);
      }
      if (!parsed) {
        const matches = String(aiContent).match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g) || [];
        const salvaged = [];
        for (const m of matches) {
          try {
            const obj = JSON.parse(m);
            if (obj && (obj.question_hi || obj.options_hi || obj.id != null)) salvaged.push(obj);
          } catch {
            /* skip */
          }
        }
        if (salvaged.length) parsed = salvaged;
      }

      rows = Array.isArray(parsed) ? parsed : parsed?.questions || [];
      if (rows.length > 0) break;
      console.warn(`${label} attempt ${attempt}: empty parse`);
    } catch (err) {
      console.warn(`${label} attempt ${attempt} failed:`, err.message);
    }
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    console.warn(`${label}: keeping English fallbacks`);
    return 0;
  }

  let applied = 0;
  for (let i = 0; i < indices.length; i += 1) {
    const srcIdx = indices[i];
    const row = rows.find((r) => r?.id === i) ?? rows[i];
    if (applyPracticeHindiRow(merged[srcIdx], row, `Q${srcIdx + 1}`)) applied += 1;
  }
  console.log(`✅ ${label}: ${applied}/${slice.length} questions translated`);
  return applied;
}

/**
 * Free MT path: translate stem / options / correct-only explanation (0 OpenRouter tokens).
 */
async function batchTranslatePracticeQuestionsViaMt(questions) {
  const merged = questions.map((q) => ({ ...q }));
  console.log(
    `🌐 Hindi free MT: translating ${merged.length} questions (no OpenRouter tokens)…`
  );

  for (let i = 0; i < merged.length; i += 1) {
    const q = merged[i];
    try {
      const answer = String(q.correctAnswer || q.answer || "A")
        .toUpperCase()
        .charAt(0);
      const enStem = String(q.question_en || q.question || "").trim();
      const opts = q.options_en || q.options || {};
      const explRaw = q.explanation_en ?? q.explanation;
      let explEn = "";
      if (typeof explRaw === "string") explEn = explRaw.trim();
      else if (explRaw && typeof explRaw === "object") {
        explEn = String(explRaw[answer] || "").trim();
      }

      const pieces = [
        enStem,
        String(opts.A || ""),
        String(opts.B || ""),
        String(opts.C || ""),
        String(opts.D || ""),
        explEn,
      ];
      const translated = await mtTranslateManyToHindi(pieces);

      if (/[\u0900-\u097F]/.test(translated[0] || "")) {
        q.question_hi = translated[0];
      } else {
        q.question_hi = q.question_hi || "";
      }
      const pickOptHi = (hi, en) =>
        /[\u0900-\u097F]/.test(String(hi || "")) ? String(hi).trim() : "";
      q.options_hi = {
        A: pickOptHi(translated[1], opts.A),
        B: pickOptHi(translated[2], opts.B),
        C: pickOptHi(translated[3], opts.C),
        D: pickOptHi(translated[4], opts.D),
      };

      // Correct option only — never duplicate onto A/B/C/D
      const explHi = { A: "", B: "", C: "", D: "" };
      if (translated[5] && /[\u0900-\u097F]/.test(translated[5])) {
        explHi[answer] = translated[5];
      }
      q.explanation_hi = explHi;

      // Match columns
      const cols = q.matchColumns;
      if (cols?.columnA?.length >= 2 && cols?.columnB?.length >= 2) {
        const aHi = await mtTranslateManyToHindi(cols.columnA.map((x) => String(x || "")));
        const bHi = await mtTranslateManyToHindi(cols.columnB.map((x) => String(x || "")));
        const aOk = aHi.filter((t) => /[\u0900-\u097F]/.test(String(t || "")));
        const bOk = bHi.filter((t) => /[\u0900-\u097F]/.test(String(t || "")));
        if (aOk.length >= 2 && bOk.length >= 2) {
          q.matchColumns_hi = { columnA: aHi, columnB: bHi };
          if (!/[\u0900-\u097F]/.test(q.question_hi || "")) {
            const lines = ["निम्नलिखित का मिलान कीजिए:", "सूची-I"];
            aHi.forEach((item, idx) => lines.push(`${String.fromCharCode(65 + idx)}. ${item}`));
            lines.push("सूची-II");
            bHi.forEach((item, idx) => lines.push(`${idx + 1}. ${item}`));
            lines.push("नीचे दिए गए कूट का प्रयोग कर सही उत्तर चुनिए:");
            q.question_hi = lines.join("\n");
          }
        }
      }

      // Assertion-reason
      const ar = q.assertionReason;
      if (ar?.assertion && ar?.reason) {
        const [aHi, rHi] = await mtTranslateManyToHindi([
          String(ar.assertion),
          String(ar.reason),
        ]);
        if (/[\u0900-\u097F]/.test(aHi || "") && /[\u0900-\u097F]/.test(rHi || "")) {
          q.assertionReason_hi = { assertion: aHi, reason: rHi };
          if (!/[\u0900-\u097F]/.test(q.question_hi || "")) {
            q.question_hi = [
              `अभिकथन (A): ${aHi}`,
              `कारण (R): ${rHi}`,
              "उपर्युक्त के संदर्भ में निम्नलिखित में से कौन-सा सही है?",
            ].join("\n");
          }
        }
      }

      merged[i] = q;
      if ((i + 1) % 5 === 0 || i === merged.length - 1) {
        console.log(`🌐 Hindi free MT progress: ${i + 1}/${merged.length}`);
      }
    } catch (err) {
      console.warn(`[mt-hi] Q${i + 1} failed:`, err?.message || err);
    }
  }

  const withHi = merged.filter((q) => practiceQuestionHasHindiStem(q)).length;
  console.log(`✅ Hindi free MT done: ${withHi}/${merged.length} have question_hi (0 OpenRouter tokens)`);
  return merged.map(ensureEnglishBilingualFields);
}

/**
 * One Hindi pass for English practice questions.
 * Default: OpenRouter LLM batches (HINDI_TRANSLATE_PROVIDER=llm).
 * Set provider=mt for free Google MT, or provider=client to skip server translate.
 */
export async function batchTranslatePracticeQuestionsToHindi(apiKey, model, questions) {
  if (!Array.isArray(questions) || questions.length === 0) return questions;

  if (shouldSkipServerHindiTranslation()) {
    console.log(
      "🌐 Hindi: server translate skipped (HINDI_TRANSLATE_PROVIDER=client) — exam UI free Google translate"
    );
    return questions;
  }

  // Explicit free MT only when opted in — never accidental Google path when llm is set
  if (shouldUseFreeMtHindi() && !shouldUseLlmHindi()) {
    return batchTranslatePracticeQuestionsViaMt(questions);
  }

  if (!shouldUseLlmHindi()) {
    console.warn(
      `🌐 Hindi: unknown provider — falling back to OpenRouter LLM for quality`
    );
  }

  if (!apiKey) {
    console.error(
      "🌐 Hindi OpenRouter: OPENROUTER_API_KEY missing — cannot translate; leaving Hindi empty"
    );
    return questions;
  }

  console.log(
    `🌐 Hindi via OpenRouter LLM (model=${model}) — ${questions.length} questions`
  );

  const merged = questions.map((q) => ({ ...q }));
  const allIndices = merged.map((_, i) => i);

  const runPass = async (indices, chunkSize, passLabel) => {
    let applied = 0;
    for (let start = 0; start < indices.length; start += chunkSize) {
      const batchIndices = indices.slice(start, start + chunkSize);
      const batchNo = Math.floor(start / chunkSize) + 1;
      applied += await translatePracticeHindiIndexBatch(
        apiKey,
        model,
        merged,
        batchIndices,
        `${passLabel} batch ${batchNo}`
      );
    }
    return applied;
  };

  await runPass(allIndices, getPracticeHindiBatchSize(), "Topic practice Hindi");

  const retrySizes = [3, 1, 1];
  for (let r = 0; r < retrySizes.length; r += 1) {
    const missing = allIndices.filter((i) => !practiceQuestionHasHindiStem(merged[i]));
    if (!missing.length) break;
    const size = retrySizes[r];
    console.log(
      `🔁 Hindi retry ${r + 1}: ${missing.length}/${merged.length} missing → batch size ${size}`
    );
    await runPass(missing, size, `Hindi retry-${size}`);
  }

  const withHi = allIndices.filter((i) => practiceQuestionHasHindiStem(merged[i])).length;
  console.log(`🌐 Hindi translation done: ${withHi}/${merged.length} questions have question_hi`);
  if (withHi < merged.length) {
    console.warn(
      `⚠️ Hindi still missing for ${merged.length - withHi} question(s) after retries — running structured fill`
    );
    await fillMissingStructuredHindi(merged);
  }
  return merged.map(ensureEnglishBilingualFields);
}

/** Last-resort: translate match/AR fields via cheap translateMany when LLM Hindi batch missed them.
 * Caps work so generation never hangs for minutes.
 */
async function fillMissingStructuredHindi(merged) {
  try {
    const { translateManyToHindi } = await import("./translateToHindi.js");
    const missingIdx = [];
    for (let i = 0; i < merged.length; i += 1) {
      if (!practiceQuestionHasHindiStem(merged[i])) missingIdx.push(i);
    }
    // Cap: at most 10 questions — rest stay English; client UI can fill
    const todo = missingIdx.slice(0, 10);
    if (!todo.length) return;
    console.log(`[hindi-fill] structured fill for ${todo.length}/${missingIdx.length} missing`);

    const started = Date.now();
    const HARD_MS = 45000;

    for (const i of todo) {
      if (Date.now() - started > HARD_MS) {
        console.warn("[hindi-fill] time budget exceeded — stopping early");
        break;
      }
      if (practiceQuestionHasHindiStem(merged[i])) continue;
      const q = merged[i];
      const en = String(q.question_en || q.question || "");

      const colA = (q.matchColumns?.columnA || []).map((x) => coerceListItemText(x)).filter(Boolean);
      const colB = (q.matchColumns?.columnB || []).map((x) => coerceListItemText(x)).filter(Boolean);
      if (colA.length >= 2 && colB.length >= 2) {
        const translated = await translateManyToHindi([...colA, ...colB]);
        const columnA = translated.slice(0, colA.length);
        const columnB = translated.slice(colA.length);
        q.matchColumns_hi = { columnA, columnB };
        q.question_hi = [
          "निम्नलिखित का मिलान कीजिए:",
          "सूची-I",
          ...columnA.map((item, idx) => `${String.fromCharCode(65 + idx)}. ${item}`),
          "सूची-II",
          ...columnB.map((item, idx) => `${idx + 1}. ${item}`),
          "नीचे दिए गए कूट का प्रयोग कर सही उत्तर चुनिए:",
        ].join("\n");
        continue;
      }

      let assertion = String(q.assertionReason?.assertion || "").trim();
      let reason = String(q.assertionReason?.reason || "").trim();
      if (!assertion || !reason) {
        const aM = en.match(/Assertion\s*\(A\)\s*:\s*([\s\S]*?)(?=Reason\s*\(R\)|$)/i);
        const rM = en.match(/Reason\s*\(R\)\s*:\s*([\s\S]*?)(?=\n(?:In the context|Which of the)|$)/i);
        assertion = assertion || String(aM?.[1] || "").trim();
        reason = reason || String(rM?.[1] || "").trim();
      }
      if (assertion && reason) {
        const [aHi, rHi] = await translateManyToHindi([assertion, reason]);
        q.assertionReason_hi = { assertion: aHi, reason: rHi };
        q.question_hi = [
          `अभिकथन (A): ${aHi}`,
          `कारण (R): ${rHi}`,
          "उपर्युक्त के संदर्भ में निम्नलिखित में से कौन-सा सही है?",
        ].join("\n");
        continue;
      }

      if (en.length >= 20) {
        const [hi] = await translateManyToHindi([en.slice(0, 800)]);
        if (/[\u0900-\u097F]/.test(hi)) q.question_hi = hi;
      }
    }
  } catch (err) {
    console.warn("fillMissingStructuredHindi failed:", err?.message || err);
  }
}

async function generateTopicPracticeBatch(
  apiKey,
  model,
  batchSize,
  batchLabel,
  subject,
  topic,
  difficulty,
  excludeSnippets = [],
  patternsToInclude = []
) {
  const systemPrompt = buildCompactTopicPracticeSystemPrompt(
    subject,
    topic,
    difficulty,
    excludeSnippets,
    patternsToInclude
  );
  const patternHint = resolveTopicPracticePatterns(patternsToInclude)
    .map((id) => PATTERN_LABELS[id] || id)
    .join(", ");
  const userPrompt = `Generate EXACTLY ${batchSize} UPSC-style MCQs (${batchLabel}). Topic: "${topic}". Balanced mix of: ${patternHint}. Each question unique concept. ${practiceBatchJsonNote()} JSON array only.`;

  const maxTokens = getMaxTokensForPracticeGeneration(batchSize);
  const { aiContent, finishReason } = await callOpenRouterTestGeneration({
    apiKey,
    model,
    systemPrompt,
    userPrompt,
    maxTokens,
    apiTitle: getOpenRouterAppTitle("UPSC Mentor - Topic Practice"),
  });

  if (finishReason === "length") {
    console.warn(`⚠️ Topic practice batch truncated (max_tokens=${maxTokens}, need=${batchSize})`);
  }

  const validated = dedupeMockPaperQuestions(parseAndValidateQuestions(aiContent, batchSize), { csat: false });
  if (validated.length > 0) {
    return { questions: validated, finishReason };
  }

  console.error("Topic practice batch: no valid questions. Raw (first 600 chars):", aiContent.slice(0, 600));
  return { questions: [], finishReason };
}

/**
 * Token-efficient 50Q generator for admin topic practice.
 * Same batch loop as Prelims Mock (compact prompts, ~6 batches for 50Q + buffer).
 */
export const generateAssignedPracticeQuestions = async ({
  subject,
  topic,
  difficulty = "Moderate",
  questionCount = 50,
  excludeSnippets = [],
  patternsToInclude = [],
  priorFingerprints = null,
}) => {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = getPracticeGenerationModel();

    if (!apiKey) {
      throw new Error("Missing OPENROUTER_API_KEY in environment variables");
    }

    const subjectStr = String(subject || "").trim();
    const topicStr = String(topic || "").trim();
    if (!subjectStr || !topicStr) {
      throw new Error("Subject and topic are required");
    }

    const displayCount = Math.max(10, Math.min(50, parseInt(questionCount, 10) || 50));
    const diffNorm = ["easy", "moderate", "hard"].includes(String(difficulty || "").toLowerCase())
      ? String(difficulty).toLowerCase()
      : "moderate";
    const prior =
      priorFingerprints ||
      (Array.isArray(excludeSnippets) && excludeSnippets.length > 0
        ? { fullKeys: new Set(), stemKeys: new Set(), looseKeys: new Set(), snippets: excludeSnippets }
        : null);
    const priorSnippets = prior?.snippets?.length ? prior.snippets : excludeSnippets;
    const priorCount = prior?.fullKeys?.size || 0;
    const patterns = resolveTopicPracticePatterns(patternsToInclude);
    if (patterns.length === 0) {
      throw new Error("Select at least one question pattern");
    }

    const perBatch = getPracticeBatchSize();
    const buffer = getPracticeGenerateBuffer();
    const maxRefillBatches =
      getPracticeMaxRefillBatches() + (priorCount > 0 ? Math.min(10, Math.floor(priorCount / 25) + 2) : 0);

    const costMode = isPracticeEnglishOnly()
      ? isPracticeBatchHindiEnabled()
        ? "english+batch-hindi"
        : "english-only"
      : "bilingual";

    console.log(
      `📝 Topic practice: ${displayCount}Q in ~${Math.ceil((displayCount + buffer) / perBatch)} batches (batch=${perBatch}, buffer=${buffer}), model=${model}, priorQ=${priorCount}, mode=${costMode}`
    );

    const generateBatch = async (key, mdl, batchSize, batchLabel, rollingExclude) => {
      const excludeMerged = [
        ...new Set([...(priorSnippets || []), ...(rollingExclude || [])]),
      ].slice(0, 5);
      return generateTopicPracticeBatch(
        key,
        mdl,
        batchSize,
        batchLabel,
        subjectStr,
        topicStr,
        diffNorm,
        excludeMerged,
        patterns
      );
    };

    const { finalQuestions } = await runFullMockPaperGenerationLoop({
      apiKey,
      model,
      displayCount,
      csatPaper: false,
      logPrefix: `Topic practice (${subjectStr} — ${topicStr})`,
      generateBatch,
      generateBuffer: buffer,
      perBatch,
      maxRefillBatches,
      estimateMaxTokens: getMaxTokensForPracticeGeneration,
      priorFingerprints: prior,
      rollingExcludeLimit: 5,
    });

    if (finalQuestions.length === 0) {
      throw new Error("No valid UPSC questions generated. Please try again.");
    }

    const minAcceptable = displayCount;
    if (finalQuestions.length < minAcceptable) {
      throw new Error(
        `Only ${finalQuestions.length} of ${displayCount} questions were generated. Please try again.`
      );
    }
    if (finalQuestions.length < displayCount) {
      console.warn(
        `⚠️ Topic practice: using ${finalQuestions.length}/${displayCount} questions after top-up`
      );
    }

    let translatedQuestions = finalizeGeneratedQuestions(finalQuestions);

    // After English gen: free MT → question_hi / options_hi stored in DB
    if (isPracticeBatchHindiEnabled()) {
      translatedQuestions = await batchTranslatePracticeQuestionsToHindi(
        apiKey,
        getPracticeTranslationModel(),
        translatedQuestions
      );
    }

    console.log(
      `✅ Topic practice: ${translatedQuestions.length} questions (${subjectStr} — ${topicStr}, model: ${model}, mode: ${costMode})`
    );

    return {
      success: true,
      questions: translatedQuestions,
      count: translatedQuestions.length,
    };
  } catch (error) {
    console.error("Error generating assigned practice questions:", error);
    return {
      success: false,
      error: error.message || "Failed to generate questions",
      questions: [],
    };
  }
};

/**
 * Max API batch rounds for topic-based generation (dedupe often drops questions).
 */
function getTestGenMaxBatchRounds(count, batchSize) {
  const minRounds = Math.ceil(count / batchSize);
  const envRefill = parseInt(process.env.TEST_GEN_MAX_REFILL_BATCHES, 10);
  if (count >= 50) {
    return minRounds + Math.max(10, Math.min(25, envRefill || 15));
  }
  if (count >= 20) {
    return minRounds + Math.max(4, Math.min(12, envRefill || 6));
  }
  return minRounds + 2;
}

/**
 * Generate UPSC Prelims MCQs.
 * GS (default): Knowledge Base RAG → same grounded generator as Topic Practice.
 * CSAT / PRELIMS_USE_RAG=false: legacy open LLM syllabus generation.
 * @param {Object} params
 * @param {string[]} params.subjects - Subject names (e.g. ["Polity", "History"])
 * @param {string} params.topic - Topic name
 * @param {"GS"|"CSAT"} params.examType - GS Paper 1 or CSAT
 * @param {number} params.questionCount - Number of questions
 * @param {string} [params.difficulty] - Easy | Moderate | Hard (GS only)
 * @param {string[]} [params.csatCategories] - For CSAT: Quantitative Aptitude, etc.
 * @param {Object} [params.currentAffairsPeriod] - { month?, year? } (future use)
 * @returns {Promise<Object>} - { success, questions?, count?, error? }
 */
export const generateTestQuestions = async ({
  subjects,
  subjectKey,
  subjectName,
  siblingTopics = [],
  topic,
  examType,
  questionCount,
  difficulty = "Moderate",
  csatCategories,
  currentAffairsPeriod,
  batchSize: batchSizeParam,
  minAcceptable,
  /** When true: strict topic RAG + PYQ-Hard. Pair with allowLlmFallback to fill shortfalls. */
  kbOnly = false,
  /** RAG first; if topic missing/short, LLM generates remaining unique questions. */
  allowLlmFallback = false,
  /** Force Hindi bilingual fields for practice (even if PRACTICE_GEN_BATCH_HINDI=false). */
  ensureHindi = false,
}) => {
  try {
    if (isPrelimsRagEnabled(examType)) {
      return await generateTestQuestionsFromKnowledgeBase({
        subjects,
        subjectKey,
        subjectName,
        siblingTopics,
        topic,
        questionCount,
        difficulty,
        batchSize: batchSizeParam,
        minAcceptable,
        kbOnly,
        allowLlmFallback,
        ensureHindi,
      });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = getTestGenerationModel();

    if (!apiKey) {
      throw new Error("Missing OPENROUTER_API_KEY in environment variables");
    }

    const count = parseInt(questionCount, 10) || 20;
    const subjectsList = Array.isArray(subjects) ? subjects : [subjects];
    const subjectsText = subjectsList.join(", ");

    const systemPrompt =
      examType === "CSAT"
        ? buildPrelimsCSATSystemPrompt(csatCategories || [], topic)
        : buildPrelimsGSSystemPrompt(subjectsList, topic, difficulty, currentAffairsPeriod);

    const batchSize =
      batchSizeParam != null && Number.isFinite(Number(batchSizeParam))
        ? Math.min(Math.max(1, parseInt(batchSizeParam, 10)), count)
        : Math.min(
            count,
            Math.max(5, parseInt(process.env.TEST_GEN_BATCH_SIZE, 10) || 8)
          );
    let validatedQuestions = [];
    let apiCalls = 0;
    const maxBatchRounds = getTestGenMaxBatchRounds(count, batchSize);
    let stallRounds = 0;

    for (let round = 0; validatedQuestions.length < count && round < maxBatchRounds; round += 1) {
      const beforeLen = validatedQuestions.length;
      const need = Math.min(batchSize, count - validatedQuestions.length);
      const avoidSnippets = validatedQuestions
        .map((q) => String(q.question_en || q.question || "").trim().slice(0, 60))
        .filter(Boolean)
        .slice(0, 8);

      const batchUserPrompt = buildPrelimsBatchUserPrompt({
        examType,
        need,
        topic,
        subjectsText,
        difficulty,
      });

      const isRefill = round >= Math.ceil(count / batchSize);
      console.log(
        `📝 Prelims batch ${round + 1}/${maxBatchRounds}${isRefill ? " (refill)" : ""}: requesting ${need} question(s) (${validatedQuestions.length}/${count} so far)...`
      );

      const { questions: batchQuestions, apiCalls: batchCalls } = await fetchQuestionBatch({
        apiKey,
        model,
        systemPrompt,
        userPrompt: batchUserPrompt,
        need,
        avoidSnippets,
        csatPaper: examType === "CSAT",
      });
      apiCalls += batchCalls;

      if (batchQuestions.length === 0) {
        console.warn(`⚠️ Batch ${round + 1} returned 0 parseable questions`);
        stallRounds += 1;
        if (stallRounds >= 5) {
          console.warn("⚠️ Too many empty batches; stopping early");
          break;
        }
        continue;
      }

      const onTopicBatch = filterQuestionsByTopic(batchQuestions, topic);
      if (onTopicBatch.dropped > 0) {
        console.warn(
          `⚠️ Prelims batch ${round + 1}: dropped ${onTopicBatch.dropped} off-topic question(s) for "${topic}"`
        );
      }

      validatedQuestions = dedupeMockPaperQuestions(
        [...validatedQuestions, ...onTopicBatch.questions],
        {
          csat: examType === "CSAT",
        }
      ).slice(0, count);

      if (validatedQuestions.length === beforeLen) {
        stallRounds += 1;
      } else {
        stallRounds = 0;
      }
    }

    // Last-resort top-up: request exactly the missing count in one small batch
    if (validatedQuestions.length > 0 && validatedQuestions.length < count) {
      const missing = count - validatedQuestions.length;
      console.log(`📝 Prelims final top-up: requesting ${missing} more question(s)...`);
      const avoidSnippets = validatedQuestions
        .map((q) => String(q.question_en || q.question || "").trim().slice(0, 60))
        .filter(Boolean)
        .slice(0, 8);
      const topUpPrompt = buildPrelimsBatchUserPrompt({
        examType,
        need: missing,
        topic,
        subjectsText,
        difficulty,
      });
      const { questions: topUp, apiCalls: topUpCalls } = await fetchQuestionBatch({
        apiKey,
        model,
        systemPrompt,
        userPrompt: topUpPrompt,
        need: missing,
        avoidSnippets,
        csatPaper: examType === "CSAT",
      });
      apiCalls += topUpCalls;
      if (topUp.length > 0) {
        const onTopicTopUp = filterQuestionsByTopic(topUp, topic);
        if (onTopicTopUp.dropped > 0) {
          console.warn(
            `⚠️ Prelims top-up: dropped ${onTopicTopUp.dropped} off-topic question(s) for "${topic}"`
          );
        }
        validatedQuestions = dedupeMockPaperQuestions(
          [...validatedQuestions, ...onTopicTopUp.questions],
          {
            csat: examType === "CSAT",
          }
        ).slice(0, count);
      }
    }

    if (validatedQuestions.length === 0) {
      throw new Error("No valid UPSC questions generated. Please try again.");
    }

    if (validatedQuestions.length < count) {
      throw new Error(
        `Only ${validatedQuestions.length} of ${count} questions were generated. Please try again.`
      );
    }

    console.log(
      `✅ Generated ${validatedQuestions.length} ${examType} questions (model: ${model}, ${apiCalls} API call(s), batchSize=${batchSize})`
    );

    const translatedQuestions = finalizeGeneratedQuestions(validatedQuestions);

    return {
      success: true,
      questions: translatedQuestions,
      count: translatedQuestions.length,
    };
  } catch (error) {
    console.error("Error generating test questions:", error);
    return {
      success: false,
      error: error.message || "Failed to generate questions",
      questions: [],
    };
  }
};

export default {
  generateTestQuestions,
  generateTestQuestionsFromKnowledgeBase,
  isPrelimsRagEnabled,
  generateAssignedPracticeQuestions,
  generateFullMockTestQuestions,
  generateFullMockMixTestQuestions,
  generateFullMockPyoTestQuestions,
  generateFullMockCsatTestQuestions,
  dedupeQuestions,
  dedupeQuestionsByStem,
  canonicalDedupeKey,
  buildQuestionFingerprints,
  filterOutPriorRepeats,
  isQuestionRepeatOfPrior,
};
