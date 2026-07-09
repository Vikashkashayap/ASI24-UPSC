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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const BATCH_RETRIES = Math.max(1, Math.min(4, parseInt(process.env.PRACTICE_BATCH_RETRIES, 10) || 3));

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
      if (!q.question || !q.options.A || !q.options.B || !q.options.C || !q.options.D || !q.correctAnswer) return false;
      const normalizedOptions = [q.options.A, q.options.B, q.options.C, q.options.D]
        .map((v) => String(v || "").toLowerCase().replace(/\s+/g, " ").trim());
      return new Set(normalizedOptions).size === 4;
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

  const questionEn = String(q.question ?? q.question_en ?? "").trim();
  const explanationRaw = String(q.explanation ?? q.explanation_en ?? "").trim();
  const explanation = explanationRaw
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .join(" ")
    .trim();
  const sourceChunk = String(q.sourceParagraph || q.sourceChunk || q.source_chunk || q.source || "").trim();
  const subject = String(q.subject || meta.subject || "").trim();
  const chapter = String(q.chapter || meta.chapter || "").trim();
  const topic = String(q.topic || meta.topic || "").trim();
  const questionType = String(q.questionType || q.type || "").trim() || "direct_conceptual";
  const answerAlias = correct;

  return ensureEnglishBilingualFields({
    question: questionEn,
    question_en: questionEn,
    options: {
      A: optionsArr[0] || "",
      B: optionsArr[1] || "",
      C: optionsArr[2] || "",
      D: optionsArr[3] || "",
    },
    options_en: {
      A: optionsArr[0] || "",
      B: optionsArr[1] || "",
      C: optionsArr[2] || "",
      D: optionsArr[3] || "",
    },
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
}) {
  if (!contextText || contextText.length < 40) {
    console.warn(`⚠️ Notes batch ${batchLabel}: empty context, skipping`);
    return [];
  }

  const systemPrompt = buildNotesQuestionSystemPrompt({
    difficulty,
    questionCount: batchSize,
    patternsToInclude,
    batchIndex,
    generationPlan,
  });
  const userPrompt = buildNotesQuestionUserPrompt({
    context: contextText,
    topic,
    subject,
    chapter,
    difficulty,
    questionCount: batchSize,
    patternsToInclude,
    batchIndex,
    generationPlan,
  });
  const maxTokens = getMaxTokensForPracticeGeneration(batchSize);

  for (let attempt = 1; attempt <= BATCH_RETRIES; attempt += 1) {
    const startedAt = Date.now();
    const result = await callOpenRouterAPI({
      apiKey,
      model,
      systemPrompt,
      userPrompt,
      temperature: 0.2,
      maxTokens,
    });

    if (!result.success) {
      console.warn(`⚠️ Notes batch ${batchLabel} attempt ${attempt}: API error — ${result.error}`);
      if (attempt < BATCH_RETRIES) await sleep(800 * attempt);
      continue;
    }

    const parsed = parseNotesQuestions(result.content, batchSize, { subject, chapter, topic });
    if (parsed.length > 0) {
      console.log(`✅ Notes batch ${batchLabel}: ${parsed.length}/${batchSize} questions (attempt ${attempt})`);
      return {
        questions: parsed,
        usage: result.usage || {},
        model: result.model || model,
        durationMs: Date.now() - startedAt,
      };
    }

    console.warn(
      `⚠️ Notes batch ${batchLabel} attempt ${attempt}: 0 valid questions (content ${String(result.content || "").length} chars)`
    );
    if (attempt < BATCH_RETRIES) await sleep(800 * attempt);
  }

  return { questions: [], usage: {}, model, durationMs: 0 };
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
}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = getPracticeGenerationModel();
  if (!apiKey) {
    return { success: false, error: "Missing OPENROUTER_API_KEY", questions: [] };
  }
  const result = await generateNotesBatch({
    apiKey,
    model,
    batchSize,
    contextText,
    topic,
    difficulty,
    batchLabel: `Batch ${batchIndex + 1}`,
    patternsToInclude,
    batchIndex,
    generationPlan,
    subject,
    chapter,
  });
  return {
    success: result.questions.length > 0,
    questions: result.questions,
    usage: result.usage || {},
    model: result.model || model,
    durationMs: result.durationMs || 0,
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
        contextText,
        topic: activeTopicName,
        difficulty,
        batchLabel: `${label} [${activeTopicName}]`,
        patternsToInclude: activePatterns,
        batchIndex: batchIndex - 1,
        generationPlan,
        subject: subjectStr,
        chapter,
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

    if (isPracticeEnglishOnly() && isPracticeBatchHindiEnabled()) {
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
