/**
 * Generate UPSC Prelims MCQs ONLY from retrieved Knowledge Base context.
 * Caches results in GeneratedQuestion so duplicate topic+difficulty skips the LLM.
 */

import { callOpenRouterAPI } from "../../services/openRouterService.js";
import { getPracticeGenerationModel } from "../../config/openRouterConfig.js";
import { searchKnowledgeBase } from "./search.service.js";
import GeneratedQuestion, { buildQuestionCacheKey } from "../models/GeneratedQuestion.js";
import { RAG_CONFIG } from "../config/rag.config.js";
import { ragLogger } from "../utils/logger.js";
import { withRetry } from "../utils/retry.js";

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
Rules:
- Never invent facts, dates, articles, or figures not present in CONTEXT.
- If CONTEXT is insufficient for a question, omit that question.
- If CONTEXT cannot support ANY question, respond exactly: {"insufficient":true,"message":"Insufficient context."}
- Return ONLY valid JSON (no markdown).
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
Each explanation must cite the relevant fact from CONTEXT in 2–4 sentences.`;
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

  return {
    question: String(q.question).trim(),
    options: {
      A: String(options.A).trim(),
      B: String(options.B).trim(),
      C: String(options.C).trim(),
      D: String(options.D).trim(),
    },
    correctAnswer: correct,
    explanation: String(q.explanation || "").trim(),
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
    .slice(0, count);

  if (!questions.length) {
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
        count: questions.length,
        questions,
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
    generated: questions.length,
    matchedChunks: retrieval.count,
    llmMs,
  });

  return {
    cached: false,
    subject,
    topic,
    difficulty,
    count: questions.length,
    matchedChunks: retrieval.count,
    retrievalSource: retrieval.source,
    avgSimilarity,
    questions,
    llmMs,
  };
}

export default { generateQuestionsFromRag };
