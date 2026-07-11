/**
 * Generate original UPSC Prelims Current Affairs MCQs from temporary article context.
 * Copyright: never copy article sentences; article is temporary context only.
 */

import { callOpenRouterAPI } from "../openRouterService.js";
import { getPracticeGenerationModel } from "../../config/openRouterConfig.js";
import { prepareContextForBatch } from "../ai/contextReducer.service.js";
import { ensureEnglishBilingualFields } from "../questionTranslationService.js";

const SYSTEM_PROMPT = `You are an expert UPSC CSE Prelims question setter for MentorsDaily Current Affairs.

COPYRIGHT (MANDATORY):
- The article is TEMPORARY CONTEXT only.
- NEVER copy or closely paraphrase article sentences, options, or explanations.
- Write EVERYTHING in original language.
- Do not invent unverifiable precise statistics.

QUALITY:
- Real UPSC Prelims style (statement-based, elimination, conceptual + current affairs).
- Exactly 4 options A–D, one correct answer.
- Original explanations.

Return ONLY a JSON array (no markdown). Each object:
{
  "question": string,
  "options": {"A":"","B":"","C":"","D":""},
  "correctAnswer": "A"|"B"|"C"|"D",
  "explanation": string,
  "difficulty": "easy"|"moderate"|"hard",
  "questionType": "statement_based"|"direct_conceptual"|"assertion_reason"|"pair_matching"|"chronology"|"multi_statement_elimination"
}`;

function parseQuestions(aiContent, expectedCount) {
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
        parsed = null;
      }
    }
  }

  const rows = Array.isArray(parsed) ? parsed : parsed?.questions || [];
  if (!Array.isArray(rows)) return [];

  return rows
    .map((raw) => {
      const question = String(raw.question || "").trim();
      const options = {
        A: String(raw.options?.A || "").trim(),
        B: String(raw.options?.B || "").trim(),
        C: String(raw.options?.C || "").trim(),
        D: String(raw.options?.D || "").trim(),
      };
      if (question.length < 20 || !options.A || !options.B || !options.C || !options.D) {
        return null;
      }
      const unique = new Set(
        Object.values(options).map((o) => o.toLowerCase().replace(/\s+/g, " "))
      );
      if (unique.size < 4) return null;

      let correctAnswer = String(raw.correctAnswer || raw.answer || "A")
        .trim()
        .toUpperCase()
        .slice(0, 1);
      if (!["A", "B", "C", "D"].includes(correctAnswer)) correctAnswer = "A";

      const diff = String(raw.difficulty || "moderate").toLowerCase();
      const difficulty = ["easy", "moderate", "hard"].includes(diff) ? diff : "moderate";

      return {
        question,
        options,
        correctAnswer,
        explanation: String(raw.explanation || "").trim() || "See option analysis.",
        difficulty,
        questionType: String(raw.questionType || "direct_conceptual").trim(),
        conceptualSource: "current_affairs_url",
      };
    })
    .filter(Boolean)
    .slice(0, expectedCount);
}

/**
 * @param {{ content: string, title: string, questionCount?: number, difficulty?: string }} params
 */
export async function generateCaMcqsFromArticle({
  content,
  title,
  questionCount = 10,
  difficulty = "moderate",
}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured");

  const count = Math.min(15, Math.max(5, parseInt(questionCount, 10) || 10));
  const prepared = prepareContextForBatch(content, {
    targetTokens: parseInt(process.env.CA_MCQ_CONTEXT_TOKENS, 10) || 1400,
  });
  const contextBlock = prepared.context || content;

  const model = getPracticeGenerationModel();
  const userPrompt = `Exam: UPSC Prelims
Subject: Current Affairs
Topic: ${title}
Difficulty: ${difficulty}
Generate exactly ${count} ORIGINAL MCQs.

--- TEMPORARY ARTICLE CONTEXT (DO NOT COPY) ---
${contextBlock}
--- END CONTEXT ---

Return JSON array only.`;

  const response = await callOpenRouterAPI({
    apiKey,
    model,
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    temperature: 0.45,
    maxTokens: Math.min(7000, count * 380 + 400),
  });

  let questions = parseQuestions(response?.content, count);
  if (!questions.length) {
    throw new Error("AI returned no valid questions. Try another URL or retry.");
  }

  // Match AssignedPracticeTest bilingual shape (English fields)
  questions = questions.map((q) => {
    const withBi = ensureEnglishBilingualFields({
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      questionType: q.questionType,
      conceptualSource: q.conceptualSource,
    });
    // Keep a plain string explanation for preview UI (bilingual map still on explanation_en)
    return {
      ...withBi,
      explanation: q.explanation,
      explanation_en: q.explanation,
    };
  });

  return { questions, model, generated: questions.length };
}

export default { generateCaMcqsFromArticle };
