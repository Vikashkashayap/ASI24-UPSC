import { callOpenRouterAPI } from "../openRouterService.js";
import {
  getPracticeGenerationModel,
  getPracticeTranslationModel,
  getPracticeBatchSize,
  getPracticeGenerateBuffer,
  getPracticeMaxRefillBatches,
  getMaxTokensForPracticeGeneration,
  isPracticeEnglishOnly,
  isPracticeBatchHindiEnabled,
} from "../../config/openRouterConfig.js";
import { ensureEnglishBilingualFields } from "../questionTranslationService.js";
import { notesService } from "../notes/notes.service.js";
import { retrieverService } from "./retriever.service.js";
import {
  buildNotesQuestionSystemPrompt,
  buildNotesQuestionUserPrompt,
} from "./promptBuilder.js";
import { resolveNotesPatterns } from "../../config/questionPatterns.js";
import {
  estimateRequestTokens,
  logTokenEstimates,
  estimateTokens,
} from "./tokenEstimator.service.js";
import { prepareContextForBatch, ABORT_CONTEXT_TOKENS } from "./contextReducer.service.js";
import { filterQuestionsByTopic } from "../qg/utils/topicRelevance.js";
import { isMetadataQuestion } from "../content/frontMatterFilter.js";
import { MAX_PROMPT_TOKENS, MAX_CONTEXT_TOKENS } from "./retriever.service.js";
import { lockPlainExplanationToAnswer } from "../qg/utils/consistency.js";
import {
  countSubstantiveLetterItems,
  countSubstantiveNumberedItems,
  isCompleteUpscStem,
  isPlaceholderItemText,
  sanitizeStemText,
} from "./stemQuality.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const BATCH_RETRIES = Math.max(1, Math.min(3, parseInt(process.env.PRACTICE_BATCH_RETRIES, 10) || 2));
const TARGET_INPUT_TOKENS = parseInt(process.env.PRACTICE_TARGET_CONTEXT_TOKENS, 10) || 420;

/**
 * Parse compact notes-grounded JSON array from LLM response.
 */
function parseNotesQuestions(aiContent, expectedCount, meta = {}) {
  let content = String(aiContent || "").trim();
  if (!content) return [];

  if (content.startsWith("```")) {
    content = content.replace(/^```\s*(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    const start = content.indexOf("[");
    const end = content.lastIndexOf("]");
    if (start >= 0 && end > start) {
      try {
        parsed = JSON.parse(content.slice(start, end + 1));
      } catch {
        parsed = salvageJsonObjects(content);
      }
    } else {
      parsed = salvageJsonObjects(content);
    }
  }

  const rows = Array.isArray(parsed) ? parsed : parsed?.questions || [];
  if (!Array.isArray(rows)) return [];

  return rows
    .map((q) => normalizeNotesQuestion(q, meta))
    .filter((q) => {
      if (!q || !q.question || !q.correctAnswer) return false;
      const isChrono =
        String(q.questionType || "").includes("chronolog") ||
        String(q.questionType || "").includes("sequence") ||
        /arrange the following|chronological order/i.test(q.question);
      const requiredKeys = isChrono ? ["A", "B", "C"] : ["A", "B", "C", "D"];
      if (requiredKeys.some((k) => !q.options?.[k] || isPlaceholderItemText(q.options[k]))) {
        return false;
      }
      const normalizedOptions = requiredKeys
        .map((k) => String(q.options[k] || "").toLowerCase().replace(/\s+/g, " ").trim());
      if (new Set(normalizedOptions).size !== requiredKeys.length) return false;
      if (!isCompleteUpscStem(q)) {
        console.warn(
          `⚠️ Dropped incomplete UPSC stem (${q.questionType}): "${String(q.question).slice(0, 80)}..."`
        );
        return false;
      }
      return true;
    })
    .slice(0, expectedCount);
}

/** Salvage individual question objects when the array JSON is truncated. */
function salvageJsonObjects(content) {
  const matches = content.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g) || [];
  const out = [];
  for (const m of matches) {
    try {
      const obj = JSON.parse(m);
      if (obj && (obj.question || obj.question_en)) out.push(obj);
    } catch {
      /* skip malformed */
    }
  }
  return out.length ? out : null;
}

function cleanStringList(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((x) => {
      if (x == null) return "";
      if (typeof x === "string" || typeof x === "number" || typeof x === "boolean") {
        const s = String(x).trim();
        return isPlaceholderItemText(s) ? "" : s;
      }
      if (typeof x === "object") {
        for (const k of ["text", "en", "hi", "item", "statement", "content", "value", "label", "event"]) {
          if (typeof x[k] === "string" && x[k].trim() && !isPlaceholderItemText(x[k])) {
            return x[k].trim();
          }
        }
      }
      return "";
    })
    .filter((x) => x.length >= 8);
}

/** Match List-I/II items — keep short labels (e.g. UK, Goa); still drop blanks */
function cleanMatchList(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((x) => {
      if (x == null) return "";
      if (typeof x === "string" || typeof x === "number" || typeof x === "boolean") {
        const s = String(x).trim();
        return s === "[object Object]" ? "" : s;
      }
      if (typeof x === "object") {
        for (const k of ["text", "en", "hi", "item", "content", "value", "label", "name"]) {
          if (typeof x[k] === "string" && x[k].trim()) return x[k].trim();
        }
      }
      return "";
    })
    .filter((x) => x.length >= 1);
}

function normalizeMatchColumns(raw) {
  if (!raw || typeof raw !== "object") return null;
  const columnA = cleanMatchList(raw.columnA || raw.listI || raw.list1);
  const columnB = cleanMatchList(raw.columnB || raw.listII || raw.list2);
  if (columnA.length < 2 || columnB.length < 2) return null;
  // Pad shorter side so both lists render complete in UPSC layout
  const n = Math.max(columnA.length, columnB.length);
  while (columnA.length < n) columnA.push("");
  while (columnB.length < n) columnB.push("");
  // Require at least 2 real pairs on each side
  const aOk = columnA.filter((x) => x.length >= 1).length;
  const bOk = columnB.filter((x) => x.length >= 1).length;
  if (aOk < 2 || bOk < 2) return null;
  return { columnA, columnB };
}

function stripArTrailingPrompt(text) {
  return String(text || "")
    .replace(
      /(?:[.!?]?\s*)(?:In the context of the above,?\s*)?(?:Which of the following(?:\s+options?)?(?:\s+is\/are|\s+are|\s+is)?[^.?]*\??|Select the correct answer[^.?]*\??|उपर्युक्त के संदर्भ में[^.?]*\??|निम्नलिखित में से कौन[^.?]*\??)\s*$/i,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeAssertionReason(raw) {
  if (!raw || typeof raw !== "object") return null;
  const assertion = stripArTrailingPrompt(raw.assertion || raw.A || "");
  const reason = stripArTrailingPrompt(raw.reason || raw.R || "");
  if (assertion.length < 15 || reason.length < 15) return null;
  return { assertion, reason };
}

function countNumberedItems(text) {
  return countSubstantiveNumberedItems(text);
}

function hasLetterAndNumberLists(text) {
  return countSubstantiveLetterItems(text) >= 2 && countSubstantiveNumberedItems(text) >= 2;
}

function formatMatchStem(intro, columnA, columnB) {
  const lines = [String(intro || "Match the following:").replace(/\s+$/, "")];
  if (!/:$/.test(lines[0])) lines[0] += ":";
  lines.push("List-I");
  columnA.forEach((item, i) => {
    if (String(item || "").trim()) lines.push(`${String.fromCharCode(65 + i)}. ${item}`);
  });
  lines.push("List-II");
  columnB.forEach((item, i) => {
    if (String(item || "").trim()) lines.push(`${i + 1}. ${item}`);
  });
  lines.push("Select the correct answer using the code given below:");
  return lines.join("\n");
}

function formatStatementStem(intro, statements) {
  const head = String(intro || "Consider the following statements:").replace(/\s+$/, "");
  const lines = [head.endsWith(":") ? head : `${head}:`];
  statements.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
  lines.push("Which of the statements given above is/are correct?");
  return lines.join("\n");
}

function formatChronologyStem(intro, items) {
  const head = String(intro || "Arrange the following in chronological order:").replace(/\s+$/, "");
  const lines = [head.endsWith(":") ? head : `${head}:`];
  items.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
  lines.push("Select the correct chronological order:");
  return lines.join("\n");
}

function formatAssertionStem(ar) {
  return [
    `Assertion (A): ${stripArTrailingPrompt(ar.assertion)}`,
    `Reason (R): ${stripArTrailingPrompt(ar.reason)}`,
    "In the context of the above, which of the following is correct?",
  ].join("\n");
}

/**
 * Build a full UPSC stem from structured fields when the LLM only sent an intro.
 */
function assembleCompleteStem(q) {
  let questionEn = String(q.question ?? q.question_en ?? q.questionText ?? q.stem ?? "")
    .replace(/\\n/g, "\n")
    .trim();
  const questionType = String(q.questionType || q.type || "").toLowerCase();
  const matchColumns = normalizeMatchColumns(q.matchColumns);
  const assertionReason = normalizeAssertionReason(q.assertionReason);
  const statements = cleanStringList(q.statements);
  const chronologyItems = cleanStringList(q.chronologyItems || q.items || q.events);

  const looksMatch =
    questionType.includes("pair") ||
    questionType.includes("match") ||
    /match\s+(the\s+)?following|consider the following pairs/i.test(questionEn);
  const looksAR =
    questionType.includes("assertion") || /assertion\s*\(A\)/i.test(questionEn);
  const looksChrono =
    questionType.includes("chronolog") ||
    questionType.includes("sequence") ||
    /arrange the following|chronological order|कालानुक्रम/i.test(questionEn);
  const looksStatement =
    questionType.includes("statement") ||
    /consider the following statements|which of the following statements/i.test(questionEn);

  if (matchColumns && (looksMatch || !hasLetterAndNumberLists(questionEn))) {
    const intro = questionEn.split("\n")[0] || "Match the following:";
    if (!hasLetterAndNumberLists(questionEn)) {
      questionEn = formatMatchStem(intro, matchColumns.columnA, matchColumns.columnB);
    }
  }

  if (assertionReason && (looksAR || !/reason\s*\(R\)\s*:.+\S/i.test(questionEn))) {
    const hasFullAR =
      /assertion\s*\(A\)\s*:.+\S/i.test(questionEn) && /reason\s*\(R\)\s*:.+\S/i.test(questionEn);
    if (!hasFullAR) questionEn = formatAssertionStem(assertionReason);
  }

  if (statements.length >= 2 && countNumberedItems(questionEn) < 2) {
    const intro = questionEn.split("\n")[0] || "Consider the following statements:";
    questionEn = formatStatementStem(intro, statements);
  }

  if (chronologyItems.length >= 2 && countNumberedItems(questionEn) < 2) {
    const intro = questionEn.split("\n")[0] || "Arrange the following in chronological order:";
    questionEn = formatChronologyStem(intro, chronologyItems);
  }

  // If still incomplete but looks like statement/chrono, keep as-is for reject filter
  void looksStatement;
  void looksChrono;

  return {
    questionEn: sanitizeStemText(questionEn),
    matchColumns,
    assertionReason,
    questionType: questionType || "direct_conceptual",
  };
}

function filterGroundedQuestions(questions) {
  return (questions || []).filter((q) => {
    if (!q?.correctAnswer || !q?.options?.[q.correctAnswer]) return false;
    // Drop if explanation still clearly claims a different letter after lock
    const exp = String(q.explanation || "");
    const wrongClaim = exp.match(
      /\boption\s*([A-D])\b(?:\s*\([^)]*\))?\s+is\s+(?:the\s+)?(?:correct|right)\b/i
    );
    if (wrongClaim?.[1] && String(wrongClaim[1]).toUpperCase() !== q.correctAnswer) {
      console.warn(
        `⚠️ Dropped question with residual answer↔explanation mismatch (answer=${q.correctAnswer}, claimed=${wrongClaim[1]})`
      );
      return false;
    }
    return true;
  });
}

function normalizeNotesQuestion(q, meta = {}) {
  let optionsArr = [];
  if (Array.isArray(q.options)) {
    optionsArr = q.options.map((o) => String(o || "").trim());
  } else if (q.options && typeof q.options === "object") {
    optionsArr = ["A", "B", "C", "D"].map((k) => String(q.options[k] ?? q.options[k.toLowerCase()] ?? "").trim());
  }

  let correct = String(q.answer ?? q.correctAnswer ?? "").toUpperCase().trim().charAt(0);
  if (["1", "2", "3", "4"].includes(correct)) {
    correct = ["A", "B", "C", "D"][parseInt(correct, 10) - 1];
  }
  if (!["A", "B", "C", "D"].includes(correct)) correct = null;

  const assembled = assembleCompleteStem(q);
  const questionEn = assembled.questionEn;
  const questionType = assembled.questionType || "direct_conceptual";
  const isChrono =
    questionType.includes("chronolog") ||
    questionType.includes("sequence") ||
    /arrange the following|chronological order/i.test(questionEn);

  // Chronology UI shows 3 options; schema still stores D
  if (isChrono && optionsArr[0] && optionsArr[1] && optionsArr[2] && !optionsArr[3]) {
    optionsArr[3] = "None of the above";
  }
  if (isChrono && correct === "D") {
    // prefer A–C for chronology; if model marked D, keep only if text exists
  }

  const explanationRaw = String(q.explanation ?? q.explanation_en ?? "").trim();
  const optionsObj = {
    A: optionsArr[0] || "",
    B: optionsArr[1] || "",
    C: optionsArr[2] || "",
    D: optionsArr[3] || "",
  };

  // HARD LOCK: explanation must never disagree with answer letter (student safety)
  let explanation = "";
  if (correct && explanationRaw) {
    const locked = lockPlainExplanationToAnswer(explanationRaw, {
      correctAnswer: correct,
      options: optionsObj,
    });
    explanation = locked.explanation;
    if (locked.claimedLetter && locked.claimedLetter !== correct) {
      console.warn(
        `⚠️ Fixed answer↔explanation mismatch: answer=${correct} but explanation claimed ${locked.claimedLetter}`
      );
    }
  } else if (explanationRaw) {
    const cleaned = explanationRaw.replace(/\s+/g, " ").trim();
    const words = cleaned.split(/\s+/).filter(Boolean);
    const maxW = Math.max(70, parseInt(process.env.QG_EXPLAIN_MAX_WORDS, 10) || 100);
    explanation =
      words.length <= maxW
        ? cleaned.slice(0, 1200)
        : `${words.slice(0, maxW).join(" ").replace(/[.,;:]+$/, "")}.`.slice(0, 1200);
  }

  // Short source quote only — never dump long notes into UI "Source"
  let sourceChunk = String(q.sourceParagraph || q.sourceChunk || q.source_chunk || q.source || "").trim();
  sourceChunk = sourceChunk.replace(/\s+/g, " ").slice(0, 180);
  const subject = String(q.subject || meta.subject || "").trim();
  const chapter = String(q.chapter || meta.chapter || "").trim();
  const topic = String(q.topic || meta.topic || "").trim();
  const answerAlias = correct;

  const base = ensureEnglishBilingualFields({
    question: questionEn,
    question_en: questionEn,
    options: optionsObj,
    options_en: { ...optionsObj },
    correctAnswer: correct,
    answer: answerAlias,
    explanation,
    explanation_en: explanation,
    questionType,
    difficulty: ["easy", "moderate", "hard"].includes(String(q.difficulty || "").toLowerCase())
      ? String(q.difficulty).toLowerCase()
      : "moderate",
    conceptualSource: sourceChunk,
    sourceParagraph: sourceChunk,
    subject,
    chapter,
    topic,
  });

  if (assembled.matchColumns) base.matchColumns = assembled.matchColumns;
  if (assembled.assertionReason) base.assertionReason = assembled.assertionReason;
  return base;
}

function dedupeQuestions(questions) {
  const seen = new Set();
  const out = [];
  for (const q of questions) {
    const key = String(q.question || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .slice(0, 120);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(q);
  }
  return out;
}

/**
 * One OpenRouter call for `requestCount` questions using prepared context + prompts.
 */
async function callNotesBatchOnce({
  apiKey,
  model,
  requestCount,
  safeContext,
  topic,
  difficulty,
  batchLabel,
  patternsToInclude,
  batchIndex,
  generationPlan,
  subject,
  chapter,
  siblingTopics = [],
  temperature = 0.2,
  openKnowledge = false,
}) {
  const systemPrompt = buildNotesQuestionSystemPrompt({ openKnowledge });
  const userPrompt = buildNotesQuestionUserPrompt({
    context: safeContext,
    topic,
    subject,
    chapter,
    difficulty,
    questionCount: requestCount,
    patternsToInclude,
    batchIndex,
    generationPlan,
    siblingTopics,
    openKnowledge,
  });

  const estimates = estimateRequestTokens({
    systemPrompt,
    userPrompt,
    questionCount: requestCount,
  });
  logTokenEstimates(batchLabel, estimates);

  const maxTokens = getMaxTokensForPracticeGeneration(requestCount);
  const startedAt = Date.now();
  const diffNorm = String(difficulty || "").toLowerCase();
  const baseTemp =
    typeof temperature === "number"
      ? temperature
      : diffNorm === "hard"
        ? 0.15
        : 0.2;
  const result = await callOpenRouterAPI({
    apiKey,
    model,
    systemPrompt,
    userPrompt,
    temperature: baseTemp,
    maxTokens,
  });

  if (!result.success) {
    return {
      questions: [],
      usage: {},
      model,
      durationMs: Date.now() - startedAt,
      error: result.error,
    };
  }

  const parsed = filterGroundedQuestions(
    parseNotesQuestions(result.content, requestCount, { subject, chapter, topic })
  );

  return {
    questions: parsed,
    usage: result.usage || {},
    model: result.model || model,
    durationMs: Date.now() - startedAt,
  };
}

async function generateNotesBatch({
  apiKey,
  model,
  batchSize,
  contextText,
  topic,
  difficulty,
  batchLabel = "",
  patternsToInclude = [],
  batchIndex = 0,
  generationPlan = null,
  subject = "",
  chapter = "",
  siblingTopics = [],
  ragOptimized = false,
  openKnowledge = false,
}) {
  // Cap at 10 questions per request (Rule 5)
  const safeBatchSize = Math.min(10, Math.max(1, parseInt(batchSize, 10) || 10));
  // Honor PRACTICE_BATCH_FILL_ROUNDS exactly (clamp 1–8). Do NOT force a floor of 3/5.
  const parsedFillRounds = parseInt(process.env.PRACTICE_BATCH_FILL_ROUNDS, 10);
  const MAX_FILL_ROUNDS = Math.max(
    1,
    Math.min(8, Number.isFinite(parsedFillRounds) && parsedFillRounds > 0 ? parsedFillRounds : 5)
  );
  const promptCeiling = MAX_PROMPT_TOKENS || 900;
  // RAG: keep context at NOTES_BATCH_CONTEXT_TOKENS — never double the budget
  const contextTarget = ragOptimized
    ? Math.min(MAX_CONTEXT_TOKENS || 420, TARGET_INPUT_TOKENS || 420)
    : TARGET_INPUT_TOKENS;
  const abortTokens = ragOptimized ? promptCeiling : ABORT_CONTEXT_TOKENS;

  if (openKnowledge) {
    // No KB context — tiny prompt, open syllabus knowledge only
    console.log(`🧠 Open-knowledge batch ${batchLabel || `Batch ${batchIndex + 1}`}: topic="${topic}" (KB empty)`);
  } else if (!contextText || contextText.length < 40) {
    console.warn(`⚠️ Notes batch ${batchLabel}: empty context, skipping`);
    return { questions: [], usage: {}, model, durationMs: 0 };
  }

  let safeContext = openKnowledge ? "" : String(contextText || "");
  let prepared = {
    context: safeContext,
    chunkIndex: 0,
    totalChunks: 1,
    tokens: estimateTokens(safeContext),
    reduced: false,
    summarized: false,
  };

  // RAG path: context is already top-k chunks — only soft-trim to budget.
  // Live/full-text path: keep legacy word-chunk reduction.
  if (!openKnowledge && (!ragOptimized || estimateTokens(safeContext) > contextTarget)) {
    prepared = prepareContextForBatch(contextText, {
      batchIndex,
      targetTokens: contextTarget,
      abortTokens,
    });
    safeContext = prepared.context;
  }

  if (!openKnowledge && (!safeContext || safeContext.length < 40)) {
    console.warn(`⚠️ Notes batch ${batchLabel}: context empty after reduction, skipping`);
    return { questions: [], usage: {}, model, durationMs: 0 };
  }

  if (!openKnowledge && (prepared.reduced || prepared.summarized)) {
    console.log(
      `📉 Context ${batchLabel || `Batch ${batchIndex + 1}`}: chunk ${prepared.chunkIndex + 1}/${prepared.totalChunks || 1}, tokens=${prepared.tokens}, reduced=${prepared.reduced}, summarized=${prepared.summarized}, rag=${ragOptimized}`
    );
  }

  if (!openKnowledge && estimateTokens(safeContext) > abortTokens) {
    const { summarizeContext } = await import("./contextReducer.service.js");
    safeContext = summarizeContext(safeContext, contextTarget);
    console.log(
      `🛑 Context exceeded ${abortTokens} tokens — summarized to ${estimateTokens(safeContext)} before Gemini call`
    );
  }

  // Shrink notes if prompt overhead pushes total input over prompt ceiling
  if (!openKnowledge) {
    const systemPrompt = buildNotesQuestionSystemPrompt({ openKnowledge: false });
    const probeUser = buildNotesQuestionUserPrompt({
      context: safeContext,
      topic,
      subject,
      chapter,
      difficulty,
      questionCount: safeBatchSize,
      patternsToInclude,
      batchIndex,
      generationPlan,
      siblingTopics,
      openKnowledge: false,
    });
    const probe = estimateRequestTokens({
      systemPrompt,
      userPrompt: probeUser,
      questionCount: safeBatchSize,
    });
    if (probe.inputTokens > promptCeiling) {
      const { reduceToImportantContent } = await import("./contextReducer.service.js");
      const overhead = probe.systemTokens + (probe.userTokens - estimateTokens(safeContext)) + 80;
      const room = Math.max(280, promptCeiling - overhead);
      safeContext = reduceToImportantContent(safeContext, room);
      console.log(
        `📉 Prompt clamp to ≤${promptCeiling}: context → ${estimateTokens(safeContext)} tokens (overhead≈${overhead})`
      );
    }
  }

  const collected = [];
  let usageSum = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  let modelUsed = model;
  let durationMs = 0;
  let fill = 0;
  const MAX_FILL = MAX_FILL_ROUNDS;
  let lastFillContext = "";
  let identicalZeroStreak = 0;

  while (collected.length < safeBatchSize && fill < MAX_FILL) {
    const need = safeBatchSize - collected.length;
    // Modest cushion only — never jump to 5 when need is 1–2 (burns output tokens).
    const requestCount =
      fill === 0 ? need : Math.min(10, need + (need <= 2 ? 1 : Math.min(2, need)));
    const label = `${batchLabel || `Batch ${batchIndex + 1}`} fill ${fill + 1} (need ${need}, req ${requestCount})`;

    // Rotate context on stalled fills (RAG + legacy) so we don't re-pay the same prompt.
    let fillContext = safeContext;
    const shouldRotate = !openKnowledge && ((fill > 0 && collected.length === 0) || fill >= 2);
    if (shouldRotate) {
      const rotated = prepareContextForBatch(contextText, {
        batchIndex: batchIndex + fill + 3,
        targetTokens: contextTarget,
        abortTokens,
      });
      if (rotated.context && rotated.context.length >= 80) {
        fillContext = rotated.context;
      }
    }

    const identicalContext = fill > 0 && fillContext === lastFillContext;
    lastFillContext = fillContext;

    const once = await callNotesBatchOnce({
      apiKey,
      model,
      requestCount,
      safeContext: openKnowledge ? "" : fillContext,
      topic,
      difficulty,
      batchLabel: label,
      patternsToInclude,
      batchIndex: batchIndex + fill,
      generationPlan,
      subject,
      chapter,
      siblingTopics,
      temperature:
        fill === 0
          ? String(difficulty || "").toLowerCase() === "hard"
            ? 0.15
            : 0.2
          : Math.min(
              0.5,
              (String(difficulty || "").toLowerCase() === "hard" ? 0.22 : 0.3) + fill * 0.05
            ),
      openKnowledge,
    });

    durationMs += once.durationMs || 0;
    modelUsed = once.model || modelUsed;
    if (once.usage) {
      usageSum.prompt_tokens += once.usage.prompt_tokens || 0;
      usageSum.completion_tokens += once.usage.completion_tokens || 0;
      usageSum.total_tokens +=
        once.usage.total_tokens ||
        (once.usage.prompt_tokens || 0) + (once.usage.completion_tokens || 0);
    }

    if (once.error) {
      console.warn(`⚠️ Notes batch ${label}: API error — ${once.error}`);
      fill += 1;
      await sleep(400 * fill);
      continue;
    }

    const before = collected.length;
    collected.push(...(once.questions || []));
    const uniq = dedupeQuestions(collected);
    collected.length = 0;
    collected.push(...uniq);

    console.log(
      `✅ Notes batch ${label}: +${collected.length - before} unique → ${collected.length}/${safeBatchSize}`
    );

    if (collected.length >= safeBatchSize) break;
    fill += 1;
    if (collected.length === before) {
      identicalZeroStreak = identicalContext ? identicalZeroStreak + 1 : 1;
      // Same packed RAG slice twice with zero yield → stop (token storm guard)
      if (identicalZeroStreak >= 2) {
        console.warn(
          `⚠️ Notes batch ${label}: stopping fills — identical context twice with no new uniques`
        );
        break;
      }
      await sleep(350 * fill);
    } else {
      identicalZeroStreak = 0;
    }
  }

  const finalQs = collected.slice(0, safeBatchSize);
  if (finalQs.length < safeBatchSize) {
    console.warn(
      `⚠️ Notes batch ${batchLabel}: only ${finalQs.length}/${safeBatchSize} after ${fill} fill rounds`
    );
  } else {
    console.log(`✅ Notes batch ${batchLabel}: ${finalQs.length}/${safeBatchSize} questions ready`);
  }

  return {
    questions: finalQs,
    usage: usageSum,
    model: modelUsed,
    durationMs,
  };
}

export async function generateQuestionsFromContextBatch({
  contextText,
  topic,
  difficulty = "moderate",
  batchSize = 10,
  patternsToInclude = [],
  batchIndex = 0,
  generationPlan = null,
  subject = "",
  chapter = "",
  siblingTopics = [],
  ragOptimized = false,
  openKnowledge = false,
}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return { success: false, error: "Missing OPENROUTER_API_KEY", questions: [] };
  }

  const useEnterpriseQg =
    process.env.QG_ENTERPRISE_PIPELINE !== "false" && !openKnowledge;

  // Best Pro path: Pro generate + Flash verify + Pro explain + Flash fact-check
  if (useEnterpriseQg) {
    try {
      const { generateVerifiedFromContext, getModelForStage, QG_CONFIG } = await import(
        "../qg/index.js"
      );
      const target = Math.min(10, Math.max(1, Number(batchSize) || 5));
      console.log(
        `[qg.enterprise] batch ${batchIndex + 1}: ${target}Q | profile=${QG_CONFIG.qualityProfile} | Q=${getModelForStage("question")} V=${getModelForStage("verification")} E=${getModelForStage("explanation")} F=${getModelForStage("factCheck")}`
      );

      const result = await generateVerifiedFromContext({
        contextText,
        topic,
        subject,
        chapter,
        difficulty: difficulty === "moderate" ? "medium" : difficulty,
        batchSize: target,
        patternsToInclude,
        retrievalSource: ragOptimized ? "rag" : "provided",
      });

      let questions = (result.questions || []).map((q) => {
        const explanationText = String(q.explanation || q.explanation_en || "").trim();
        // Prefer 50–100 word teaching body for UI (correct + wrong options)
        const detail =
          q.explanationStructured?.detailedExplanation ||
          explanationText.split("\n").find((l) => l && !/^Correct Answer:/i.test(l)) ||
          explanationText;
        const words = String(detail).replace(/\s+/g, " ").trim().split(/\s+/).filter(Boolean);
        const maxW = Math.max(70, parseInt(process.env.QG_EXPLAIN_MAX_WORDS, 10) || 100);
        const compactExplain =
          words.length > maxW
            ? `${words.slice(0, maxW).join(" ").replace(/[.,;:]+$/, "")}.`
            : String(detail).replace(/\s+/g, " ").trim();

        return ensureEnglishBilingualFields({
          question: q.question,
          question_en: q.question_en || q.question,
          options: q.options,
          options_en: q.options_en || q.options,
          correctAnswer: q.correctAnswer,
          answer: q.correctAnswer,
          explanation: compactExplain,
          explanation_en: compactExplain,
          explanationStructured: q.explanationStructured,
          questionType: q.questionType || "direct_conceptual",
          difficulty:
            q.difficulty === "medium"
              ? "moderate"
              : ["easy", "moderate", "hard"].includes(String(q.difficulty || "").toLowerCase())
                ? String(q.difficulty).toLowerCase()
                : "moderate",
          conceptualSource: q.sourceParagraph || q.conceptualSource || "",
          sourceParagraph: q.sourceParagraph || "",
          subject: q.subject || subject,
          chapter: q.chapter || chapter,
          topic: q.topic || topic,
          statements: q.statements,
          chronologyItems: q.chronologyItems,
          matchColumns: q.matchColumns,
          assertionReason: q.assertionReason,
          overallAiConfidence: q.overallAiConfidence,
          qualityScores: q.qualityScores,
          modelUsed: q.modelUsed,
        });
      });

      questions = questions.filter((q) => !isMetadataQuestion(q));
      const onTopic = filterQuestionsByTopic(questions, topic, {
        soft: false,
        siblingTopics,
      });
      if (onTopic.questions.length) questions = onTopic.questions;

      return {
        success: questions.length > 0,
        questions,
        usage: {},
        model: getModelForStage("question"),
        models: result.models,
        qualityProfile: result.qualityProfile || QG_CONFIG.qualityProfile,
        durationMs: result.durationMs || 0,
        openKnowledge: false,
        enterpriseQg: true,
        rejected: result.rejected || [],
      };
    } catch (err) {
      console.error(
        `[qg.enterprise] batch failed, falling back to legacy generator:`,
        err?.message || err
      );
      // fall through to legacy
    }
  }

  const model = getPracticeGenerationModel();
  const result = await generateNotesBatch({
    apiKey,
    model,
    batchSize,
    contextText,
    topic,
    difficulty,
    batchLabel: openKnowledge ? `OpenKB ${batchIndex + 1}` : `Batch ${batchIndex + 1}`,
    patternsToInclude,
    batchIndex,
    generationPlan,
    subject,
    chapter,
    siblingTopics,
    ragOptimized,
    openKnowledge,
  });
  return {
    success: result.questions.length > 0,
    questions: result.questions,
    usage: result.usage || {},
    model: result.model || model,
    durationMs: result.durationMs || 0,
    openKnowledge: Boolean(openKnowledge),
    enterpriseQg: false,
  };
}

/**
 * Generate UPSC MCQs strictly from synced notes — RAG + token-optimized batches.
 */
export async function generateQuestionsFromNotes({
  notesTopicId,
  notesTopicIds,
  subject,
  chapter,
  topic,
  difficulty = "moderate",
  questionCount = 50,
  patternsToInclude = [],
  generationPlan = null,
}) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = getPracticeGenerationModel();
    if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY");

    const topicIds = Array.isArray(notesTopicIds) && notesTopicIds.length > 0
      ? [...new Set(notesTopicIds.map((id) => String(id)).filter(Boolean))]
      : notesTopicId
        ? [String(notesTopicId)]
        : [];

    const topicMetas = await notesService.assertTopicsHaveContent(topicIds);
    const topicStr =
      topic ||
      (topicMetas.length <= 3
        ? topicMetas.map((n) => n.topic.name).join(" · ")
        : `${topicMetas
            .slice(0, 2)
            .map((n) => n.topic.name)
            .join(" · ")} · +${topicMetas.length - 2} more`);
    const subjectStr = subject || topicMetas[0]?.topic.subject || "";
    const activePatterns = resolveNotesPatterns(patternsToInclude);
    const displayCount = Math.max(10, Math.min(50, parseInt(questionCount, 10) || 50));

    const perBatch = getPracticeBatchSize();
    const buffer = getPracticeGenerateBuffer();
    const target = displayCount + buffer;
    const plannedBatches = Math.ceil(target / perBatch);
    const maxRefills = getPracticeMaxRefillBatches();

    console.log(
      `📚 Notes-grounded RAG: ${displayCount}Q for "${topicStr}" | topics=${topicMetas.length} | batch=${perBatch} | patterns=${activePatterns.length} | planned=${plannedBatches} batches`
    );

    let allQuestions = [];
    let apiCalls = 0;
    let batchIndex = 0;

    const runBatch = async (size, label) => {
      const topicMeta = topicMetas[batchIndex % topicMetas.length];
      const activeTopicId = String(topicMeta.topic._id);
      const activeTopicName = topicMeta.topic.name;
      const contextText = await retrieverService.getContextForBatch({
        topicId: activeTopicId,
        batchIndex,
        topicName: activeTopicName,
        subject: subjectStr,
      });
      batchIndex += 1;
      apiCalls += 1;
      return generateNotesBatch({
        apiKey,
        model,
        batchSize: size,
        contextText: contextText.contextText || contextText,
        topic: activeTopicName,
        difficulty,
        batchLabel: `${label} [${activeTopicName}]`,
        patternsToInclude: activePatterns,
        batchIndex: batchIndex - 1,
        generationPlan,
        subject: subjectStr,
        chapter,
        ragOptimized: true,
      });
    };

    // Phase 1 — planned batches
    for (let b = 1; b <= plannedBatches; b += 1) {
      const need = Math.min(perBatch, target - allQuestions.length);
      if (need <= 0) break;
      console.log(`📝 Notes batch ${b}/${plannedBatches}: requesting ${need} question(s)...`);
      const batch = await runBatch(need, `Part ${b}`);
      if (batch.questions?.length) {
        allQuestions = dedupeQuestions([...allQuestions, ...batch.questions]);
      }
    }

    let deduped = dedupeQuestions(allQuestions);
    let refill = 0;
    let stallRounds = 0;

    // Phase 2 — refill until target unique count
    while (deduped.length < displayCount && refill < maxRefills) {
      const before = deduped.length;
      const need = Math.max(1, Math.min(perBatch, displayCount - deduped.length));
      console.log(
        `📝 Notes refill ${refill + 1}/${maxRefills}: unique ${deduped.length}/${displayCount}, requesting ${need}...`
      );
      const batch = await runBatch(need, `Refill ${refill + 1}`);
      if (batch.questions?.length) {
        allQuestions = dedupeQuestions([...allQuestions, ...batch.questions]);
        deduped = allQuestions;
      }
      refill += 1;
      stallRounds = deduped.length === before ? stallRounds + 1 : 0;
      if (stallRounds >= 5) {
        console.warn(`⚠️ Notes refill stalled after ${stallRounds} rounds with no new questions`);
        break;
      }
    }

    // Phase 3 — micro top-up for remaining gap
    if (deduped.length < displayCount) {
      const gap = displayCount - deduped.length;
      const topUpRounds = Math.min(gap + 2, 6);
      console.log(`📝 Notes top-up: short by ${gap}, up to ${topUpRounds} micro batches...`);
      for (let t = 0; t < topUpRounds && deduped.length < displayCount; t += 1) {
        const need = displayCount - deduped.length;
        const batch = await runBatch(need, `Top-up ${t + 1}`);
        if (batch.questions?.length) {
          allQuestions = dedupeQuestions([...allQuestions, ...batch.questions]);
          deduped = allQuestions;
        }
      }
    }

    if (deduped.length === 0) {
      throw new Error("No valid questions generated from notes. Please try again.");
    }

    let finalQuestions = deduped.slice(0, displayCount);

    const minAcceptable = Math.max(displayCount - 8, Math.floor(displayCount * 0.85));
    if (finalQuestions.length < minAcceptable) {
      throw new Error(
        `Only ${finalQuestions.length} of ${displayCount} questions were generated from notes. Please try again.`
      );
    }

    if (finalQuestions.length < displayCount) {
      console.warn(`⚠️ Returning ${finalQuestions.length}/${displayCount} questions (below target but acceptable)`);
    }

    if (isPracticeBatchHindiEnabled()) {
      finalQuestions = await translatePracticeBatch(apiKey, finalQuestions);
    }

    console.log(`✅ Notes-grounded: ${finalQuestions.length} questions for "${topicStr}" (${apiCalls} API calls)`);

    return {
      success: true,
      questions: finalQuestions,
      count: finalQuestions.length,
      meta: {
        notesTopicId: topicIds[0],
        notesTopicIds: topicIds,
        sourceUrl: topicMetas[0]?.topic.sourceUrl,
        apiCalls,
        ragBatches: batchIndex,
        patternsToInclude: activePatterns,
        topicCount: topicMetas.length,
      },
    };
  } catch (error) {
    console.error("generateQuestionsFromNotes:", error);
    return {
      success: false,
      error: error.message || "Failed to generate questions from notes",
      questions: [],
    };
  }
}

async function translatePracticeBatch(apiKey, questions) {
  try {
    const { batchTranslatePracticeQuestionsToHindi } = await import("../testGenerationService.js");
    if (typeof batchTranslatePracticeQuestionsToHindi === "function") {
      return batchTranslatePracticeQuestionsToHindi(apiKey, getPracticeTranslationModel(), questions);
    }
  } catch {
    /* fall through */
  }
  return questions.map(ensureEnglishBilingualFields);
}

export const questionGeneratorService = { generateQuestionsFromNotes, generateQuestionsFromContextBatch };
export default questionGeneratorService;
