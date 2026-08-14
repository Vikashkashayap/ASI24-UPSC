/**
 * Generate UPSC Prelims MCQs ONLY from retrieved Knowledge Base context.
 * Caches results in GeneratedQuestion so duplicate topic+difficulty skips the LLM.
 */

import { SKIP_KB_RAG_RETRIEVAL } from "../../config/generationMode.js";
import { callOpenRouterAPI } from "../../services/openRouterService.js";
import { getPracticeGenerationModel } from "../../config/openRouterConfig.js";
import { searchKnowledgeBase } from "./search.service.js";
import GeneratedQuestion, { buildQuestionCacheKey } from "../models/GeneratedQuestion.js";
import { RAG_CONFIG } from "../config/rag.config.js";
import { ragLogger } from "../utils/logger.js";
import { withRetry } from "../utils/retry.js";
import { lockPlainExplanationToAnswer } from "../../services/qg/utils/consistency.js";
import { filterQuestionsByTopic } from "../../services/qg/utils/topicRelevance.js";
import { isMetadataQuestion } from "../../services/content/frontMatterFilter.js";

function normalizeDifficulty(d) {
  const v = String(d || "Medium").trim().toLowerCase();
  if (v === "easy") return "Easy";
  if (v === "hard") return "Hard";
  if (v === "moderate") return "Medium";
  return "Medium";
}

function buildSystemPrompt() {
  return `You are an expert UPSC Civil Services Prelims question setter.
Generate MCQs STRICTLY from the provided CONTEXT only.

SOURCE RULES:
- Never invent facts, dates, articles, or figures not present in CONTEXT.
- If CONTEXT is insufficient for a question, omit that question.
- NEVER generate questions from preface, foreword, publisher/edition info, table of contents, index listings, bibliography, or other book metadata. Test substantive subject matter only.
- If CONTEXT cannot support ANY question, respond exactly: {"insufficient":true,"message":"Insufficient context."}
- Return ONLY valid JSON (no markdown).

CRITICAL CONSISTENCY LOCK (students must never see a mismatch):
1. Decide the SINGLE correct OPTION TEXT from CONTEXT first.
2. Put that text under exactly one letter in options A–D.
3. Set correctAnswer to THAT letter only (A|B|C|D).
4. explanation MUST open with: Option {correctAnswer} ("{exact option text}") is correct.
5. Then explain WHY it is right AND WHY EACH of the other three options is wrong (student concept clarity).
6. Target 50–70 English words; hard max 100. Dense, no fluff.
7. Never mark letter X if option Y's text is the real answer. Never shuffle texts after setting correctAnswer.
8. Self-check: options[correctAnswer] === the factually correct text; explanation defends the same letter.

JSON shape:
{"questions":[{"question":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"correctAnswer":"A","explanation":"..."}]}`;
}

function buildUserPrompt({ topic, subject, difficulty, count, contextText }) {
  return `Subject: ${subject || "UPSC"}
Topic: ${topic}
Difficulty: ${difficulty}
Count: ${count}

CONTEXT (retrieved Knowledge Base chunks — sole source of truth):
"""
${contextText}
"""

Generate exactly ${count} UPSC Prelims MCQs grounded ONLY in CONTEXT.
HARD RULES:
- correctAnswer letter MUST match the option text that CONTEXT supports.
- explanation (50–100 words) MUST start with Option {correctAnswer} ("…") is correct; then why correct AND why EACH wrong option fails.
- Never invent outside CONTEXT.`;
}

function parseLlmJson(raw) {
  let content = String(raw || "").trim();
  if (!content) return null;
  if (content.startsWith("```")) {
    content = content.replace(/^```\s*(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  }
  try {
    return JSON.parse(content);
  } catch {
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(content.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function normalizeQuestion(q, meta) {
  const options = q?.options || {};
  const correct = String(q?.correctAnswer || q?.answer || "")
    .trim()
    .toUpperCase()
    .slice(0, 1);
  if (!["A", "B", "C", "D"].includes(correct)) return null;
  if (!q?.question || !options.A || !options.B || !options.C || !options.D) return null;

  const optionsObj = {
    A: String(options.A).trim(),
    B: String(options.B).trim(),
    C: String(options.C).trim(),
    D: String(options.D).trim(),
  };

  const locked = lockPlainExplanationToAnswer(String(q.explanation || "").trim(), {
    correctAnswer: correct,
    options: optionsObj,
  });

  return {
    question: String(q.question).trim(),
    options: optionsObj,
    correctAnswer: correct,
    explanation: locked.explanation || String(q.explanation || "").trim(),
    difficulty: meta.difficulty,
    subject: meta.subject,
    topic: meta.topic,
    source: meta.source || "knowledge-base",
    similarityScore: meta.avgSimilarity,
    chunkIds: meta.chunkIds || [],
  };
}

/**
 * @param {{
 *   topic: string,
 *   subject?: string,
 *   difficulty?: string,
 *   count?: number,
 *   force?: boolean,
 *   filters?: object,
 *   createdBy?: string,
 * }} params
 */
export async function generateQuestionsFromRag(params = {}) {
  if (SKIP_KB_RAG_RETRIEVAL) {
    ragLogger.info("rag.generate.skipped", { reason: "SKIP_KB_RAG_RETRIEVAL" });
    return {
      cached: false,
      skipped: true,
      insufficient: true,
      message: "KB/RAG question generation is paused — use LLM Prelims generator.",
      subject: String(params.subject || "").trim(),
      topic: String(params.topic || "").trim(),
      questions: [],
      count: 0,
    };
  }

  const topic = String(params.topic || "").trim();
  const subject = String(params.subject || "").trim();
  const difficulty = normalizeDifficulty(params.difficulty);
  const count = Math.min(Math.max(Number(params.count) || 20, 1), 50);
  const force = Boolean(params.force);

  if (!topic) {
    const err = new Error("topic is required");
    err.status = 400;
    throw err;
  }

  const cacheKey = buildQuestionCacheKey({ subject, topic, difficulty, count });

  if (!force) {
    const cached = await GeneratedQuestion.findOne({ cacheKey }).lean();
    if (cached?.questions?.length) {
      ragLogger.info("rag.generate.cacheHit", { cacheKey, count: cached.questions.length });
      return {
        cached: true,
        message: "Returning cached questions for same topic + difficulty",
        subject,
        topic,
        difficulty,
        count: cached.questions.length,
        matchedChunks: cached.matchedChunks,
        retrievalSource: cached.retrievalSource,
        questions: cached.questions,
      };
    }
  }

  const searchQuery = subject ? `${subject} ${topic}` : topic;
  const retrieval = await searchKnowledgeBase({
    query: searchQuery,
    topK: Math.max(RAG_CONFIG.generateTopK, 8),
    filters: {
      subject: subject || undefined,
      topic,
      ...(params.filters || {}),
    },
  });

  if (!retrieval.chunks.length) {
    if (!RAG_CONFIG.allowOpenKnowledge) {
      return {
        cached: false,
        insufficient: true,
        message: "Insufficient context.",
        subject,
        topic,
        difficulty,
        count: 0,
        matchedChunks: 0,
        retrievalSource: retrieval.source,
        questions: [],
      };
    }
    ragLogger.warn("rag.generate.noChunks", { topic, subject });
  }

  const contextText = retrieval.chunks
    .map((c, i) => `[Chunk ${i + 1} | score=${c.score ?? "?"}${c.page != null ? ` | p.${c.page}` : ""}]\n${c.heading ? c.heading + "\n" : ""}${c.text}`)
    .join("\n\n")
    .slice(0, 14000);

  if (!contextText.trim()) {
    return {
      cached: false,
      insufficient: true,
      message: "Insufficient context.",
      subject,
      topic,
      difficulty,
      count: 0,
      matchedChunks: 0,
      retrievalSource: retrieval.source,
      questions: [],
    };
  }

  const avgSimilarity =
    retrieval.chunks.reduce((s, c) => s + (typeof c.score === "number" ? c.score : 0), 0) /
      (retrieval.chunks.filter((c) => typeof c.score === "number").length || 1) || null;

  const chunkIds = retrieval.chunks.map((c) => String(c.chunkId || "")).filter(Boolean);
  const model = getPracticeGenerationModel();
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    const err = new Error("OPENROUTER_API_KEY is not configured");
    err.status = 500;
    throw err;
  }

  const timer = ragLogger.timed("rag.generate.llm");

  const result = await withRetry(
    async () => {
      const res = await callOpenRouterAPI({
        apiKey,
        model,
        systemPrompt: buildSystemPrompt(),
        userPrompt: buildUserPrompt({
          topic,
          subject,
          difficulty,
          count,
          contextText,
        }),
        temperature: 0.35,
        maxTokens: Math.min(4000, 180 * count + 400),
      });
      if (!res?.success) {
        throw new Error(res?.error || "LLM request failed");
      }
      return res.content;
    },
    { retries: RAG_CONFIG.retry.llm, label: "rag.llm" }
  );

  const llmMs = timer.end({ topic, count });
  const parsed = parseLlmJson(result);

  if (parsed?.insufficient || String(parsed?.message || "").toLowerCase().includes("insufficient")) {
    return {
      cached: false,
      insufficient: true,
      message: "Insufficient context.",
      subject,
      topic,
      difficulty,
      count: 0,
      matchedChunks: retrieval.count,
      retrievalSource: retrieval.source,
      questions: [],
      llmMs,
    };
  }

  const meta = {
    difficulty,
    subject,
    topic,
    source: "knowledge-base",
    avgSimilarity,
    chunkIds,
  };

  const questions = (parsed?.questions || [])
    .map((q) => normalizeQuestion(q, meta))
    .filter(Boolean)
    .filter((q) => !isMetadataQuestion(q))
    .slice(0, count);

  const onTopic = filterQuestionsByTopic(questions, topic, { soft: false });
  const finalQuestions = onTopic.questions.length
    ? onTopic.questions
    : questions.filter((q) => !isMetadataQuestion(q));

  if (!finalQuestions.length) {
    return {
      cached: false,
      insufficient: true,
      message: "Insufficient context.",
      subject,
      topic,
      difficulty,
      count: 0,
      matchedChunks: retrieval.count,
      retrievalSource: retrieval.source,
      questions: [],
      llmMs,
    };
  }

  await GeneratedQuestion.findOneAndUpdate(
    { cacheKey },
    {
      $set: {
        cacheKey,
        subject: subject || "",
        topic,
        difficulty,
        count: finalQuestions.length,
        questions: finalQuestions,
        retrievalSource: retrieval.source,
        matchedChunks: retrieval.count,
        avgSimilarity,
        createdBy: params.createdBy || undefined,
        llmMs,
        fromCache: false,
      },
    },
    { upsert: true, new: true }
  );

  ragLogger.info("rag.generate.saved", {
    topic,
    subject,
    generated: finalQuestions.length,
    matchedChunks: retrieval.count,
    llmMs,
  });

  return {
    cached: false,
    subject,
    topic,
    difficulty,
    count: finalQuestions.length,
    matchedChunks: retrieval.count,
    retrievalSource: retrieval.source,
    avgSimilarity,
    questions: finalQuestions,
    llmMs,
  };
}

export default { generateQuestionsFromRag };
