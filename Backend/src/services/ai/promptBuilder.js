/**
 * PromptBuilder — compact context-only prompts (minimizes OpenRouter tokens).
 */

import { buildBatchPatternHint, resolveNotesPatterns, PATTERN_LABELS } from "../../config/questionPatterns.js";

const SYSTEM_PROMPT = `You are a UPSC CSE Prelims Question Paper Setter.
Generate questions exactly in UPSC style.
Use ONLY the supplied MentorsDaily Notes context.
Do NOT use your own knowledge.
Do NOT fabricate facts.
Do NOT use information outside the provided context.
If context is insufficient for a requested pattern, switch to another valid UPSC pattern from the same context.
Avoid repeated questions and repeated options.
Use elimination-friendly UPSC language and analytical framing.
Return valid JSON array only.`;

const COMPACT_SCHEMA = `Schema: {"question":"","options":{"A":"","B":"","C":"","D":""},"answer":"A|B|C|D","explanation":"max 2 sentences","sourceParagraph":"verbatim 1-3 lines from context","difficulty":"easy|moderate|hard","questionType":"statement_based|multi_statement_elimination|pair_matching|chronology|sequence_arrangement|map_location|assertion_reason|statement_not_correct|direct_conceptual|odd_one_out","subject":"","chapter":"","topic":""}`;

/**
 * @param {{ difficulty?: string, questionCount?: number, patternsToInclude?: string[], batchIndex?: number }} opts
 */
export function buildNotesQuestionSystemPrompt(opts = {}) {
  const difficulty = capitalizeDifficulty(opts.difficulty || "moderate");
  const count = opts.questionCount || 10;
  const patterns = resolveNotesPatterns(opts.patternsToInclude);
  const patternHint = buildBatchPatternHint(count, patterns, opts.batchIndex ?? 0);
  const patternList = patterns.map((id) => PATTERN_LABELS[id] || id).join("; ");
  const batchMix = serializeBatchMix(opts.generationPlan);

  return `${SYSTEM_PROMPT}
Difficulty: ${difficulty}. Generate exactly ${count} unique MCQs for the given topic.
Use ONLY these UPSC patterns (balanced this batch: ${patternHint}): ${patternList}.
Target pattern+difficulty mix for this batch: ${batchMix}.
Follow standard UPSC format per pattern (statements, pairs, assertion-reason, chronology order, etc.).
${COMPACT_SCHEMA}`;
}

/**
 * @param {{ context: string, topic: string, difficulty?: string, questionCount?: number, patternsToInclude?: string[], batchIndex?: number }} params
 */
export function buildNotesQuestionUserPrompt(params) {
  const difficulty = capitalizeDifficulty(params.difficulty || "moderate");
  const count = params.questionCount || 10;
  const patterns = resolveNotesPatterns(params.patternsToInclude);
  const patternHint = buildBatchPatternHint(count, patterns, params.batchIndex ?? 0);
  const batchMix = serializeBatchMix(params.generationPlan);
  const subject = String(params.subject || "").trim();
  const chapter = String(params.chapter || "").trim();
  const topic = String(params.topic || "").trim();

  return `Context:
${params.context}

Subject: ${subject}
Chapter: ${chapter}
Topic: ${topic}
Generate ${count} MCQs from the notes above only. Difficulty: ${difficulty}.
Pattern mix this batch: ${patternHint}.
Required batch quota: ${batchMix}.
For each question include short explanation and sourceParagraph quoted from context.
Avoid long explanations. JSON array only.`;
}

function capitalizeDifficulty(d) {
  const v = String(d || "moderate").toLowerCase();
  if (v === "easy") return "Easy";
  if (v === "hard") return "Hard";
  return "Moderate";
}

function serializeBatchMix(generationPlan) {
  if (!generationPlan) return "balanced";
  const p = Object.entries(generationPlan.patternCounts || {})
    .map(([k, v]) => `${k}:${v}`)
    .join(", ");
  const d = Object.entries(generationPlan.difficultyCounts || {})
    .map(([k, v]) => `${k}:${v}`)
    .join(", ");
  return `patterns[${p || "auto"}] difficulties[${d || "auto"}]`;
}

export const promptBuilder = {
  buildNotesQuestionSystemPrompt,
  buildNotesQuestionUserPrompt,
};

export default promptBuilder;
