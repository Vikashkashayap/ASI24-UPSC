/**
 * PromptBuilder — RAG-grounded UPSC MCQs from retrieved syllabus chunks only.
 * Static rules live in SYSTEM. USER prompt is dynamic only.
 */

import { resolveNotesPatterns } from "../../config/questionPatterns.js";

/**
 * Compact but explicit — flash-lite needs clear JSON/stem rules (Phase 2 slim + reliability).
 */
const SYSTEM_PROMPT = `You are a UPSC CSE Prelims question setter.
Use ONLY the user CONTEXT (knowledge base excerpts). Never invent facts outside CONTEXT.
If CONTEXT lacks a detail, skip that angle — do not use outside knowledge.
Return ONLY a JSON array (no markdown, no prose).
Each item MUST have: question, options {A,B,C,D}, answer (A|B|C|D), explanation (50–70 words, why correct answer is right; grounded in CONTEXT), sourceParagraph (≤20 words from CONTEXT), difficulty, questionType.
COMPLETE stems only — never intro-only.
statement_based: put numbered statements 1. 2. 3. inside question, then ask which are correct. Also set statements[].
chronology: number events inside question. Also set chronologyItems[].
pair_matching: List-I (A.) and List-II (1.) inside question. Also set matchColumns{columnA,columnB}.
assertion_reason: full Assertion (A) and Reason (R) inside question. Also set assertionReason{assertion,reason}.
direct_conceptual: full clear MCQ stem in question.
questionType one of: statement_based|pair_matching|chronology|assertion_reason|direct_conceptual`;

/** Used only when knowledge base returned zero chunks for the topic. */
const OPEN_KNOWLEDGE_SYSTEM_PROMPT = `You are a UPSC CSE Prelims question setter.
No knowledge-base CONTEXT was found. Use standard UPSC syllabus knowledge for the topic only.
Return ONLY a JSON array (no markdown).
Each item: question, options {A,B,C,D}, answer (A|B|C|D), explanation (50–70 words), sourceParagraph ("syllabus"), difficulty, questionType.
COMPLETE stems. questionType one of: statement_based|pair_matching|chronology|assertion_reason|direct_conceptual`;

function compactPatternMix(count, patternsToInclude, batchIndex = 0) {
  const active = resolveNotesPatterns(patternsToInclude);
  const counts = new Map();
  for (let i = 0; i < count; i += 1) {
    const id = active[(batchIndex * count + i) % active.length];
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  return [...counts.entries()].map(([id, n]) => `${n}x${id}`).join(",");
}

function compressContext(text) {
  return String(text || "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function buildNotesQuestionSystemPrompt({ openKnowledge = false } = {}) {
  return openKnowledge ? OPEN_KNOWLEDGE_SYSTEM_PROMPT : SYSTEM_PROMPT;
}

export function buildNotesQuestionUserPrompt(params) {
  const count = Math.min(10, Math.max(1, parseInt(params.questionCount, 10) || 10));
  const difficulty = String(params.difficulty || "moderate").toLowerCase();
  const mix = compactPatternMix(count, params.patternsToInclude, params.batchIndex ?? 0);
  const topic = String(params.topic || "").trim();
  const subject = String(params.subject || "").trim();
  const openKnowledge = Boolean(params.openKnowledge);
  const context = compressContext(params.context);

  if (openKnowledge) {
    return `Topic: ${topic}${subject ? ` | ${subject}` : ""}
Difficulty: ${difficulty}. Count: ${count}. Mix: ${mix}.
Knowledge base had no matching chunks. Generate EXACTLY ${count} complete UPSC MCQs from standard syllabus knowledge for this topic. Each explanation MUST be 50–70 words. JSON array only.`;
  }

  return `Topic: ${topic}${subject ? ` | ${subject}` : ""}
Difficulty: ${difficulty}. Count: ${count}. Mix: ${mix}.
Generate EXACTLY ${count} complete UPSC MCQs from CONTEXT only (knowledge base). Each explanation MUST be 50–70 words. JSON array only.

CONTEXT:
${context}`;
}

export const promptBuilder = {
  buildNotesQuestionSystemPrompt,
  buildNotesQuestionUserPrompt,
  SYSTEM_PROMPT,
  OPEN_KNOWLEDGE_SYSTEM_PROMPT,
  compressContext,
};

export default promptBuilder;
