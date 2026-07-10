/**
 * PromptBuilder — notes-only UPSC MCQs with COMPLETE stems (never intro-only).
 */

import { buildBatchPatternHint, resolveNotesPatterns } from "../../config/questionPatterns.js";

const SYSTEM_PROMPT = `You are a UPSC CSE Question Setter.
Generate questions ONLY using the supplied MentorsDaily Notes.
Never use outside knowledge.
Never guess.
Return valid JSON only.
Never output intro-only stems.`;

const USER_TAIL = `CRITICAL — COMPLETE STEM (never break):
- statement_based: question MUST include numbered statements:
  "Consider the following statements:\\n1. ...\\n2. ...\\n3. ...\\nWhich of the statements given above is/are correct?"
  ALSO fill "statements":["...","..."]
- chronology: question MUST include numbered events:
  "Arrange the following in chronological order:\\n1. ...\\n2. ...\\n3. ...\\n4. ...\\nSelect the correct chronological order:"
  ALSO fill "chronologyItems":["...","..."]
- pair_matching: fill matchColumns.columnA + columnB (short items) AND put lists in question.
- assertion_reason: full Assertion (A) + Reason (R) sentences in question + assertionReason object.
- NEVER return only the intro line. Options like "1 and 2 only" or "1-2-3-4" are useless without the numbered list in question.
- explanation: 2-3 short sentences why the correct option is right.
- sourceParagraph: max 25 words quote.
- JSON array only.

Schema:{"question":"FULL stem with \\n and numbered items","options":{"A":"","B":"","C":"","D":""},"answer":"A|B|C|D","explanation":"2-3 sentences","sourceParagraph":"short quote","difficulty":"easy|moderate|hard","questionType":"statement_based|pair_matching|chronology|assertion_reason|direct_conceptual","statements":["s1","s2"]|null,"chronologyItems":["e1","e2"]|null,"matchColumns":null|{"columnA":[],"columnB":[]},"assertionReason":null|{"assertion":"","reason":""}}`;

export function buildNotesQuestionSystemPrompt() {
  return SYSTEM_PROMPT;
}

export function buildNotesQuestionUserPrompt(params) {
  const count = Math.min(10, Math.max(1, parseInt(params.questionCount, 10) || 10));
  const difficulty = String(params.difficulty || "moderate").toLowerCase();
  const patterns = resolveNotesPatterns(params.patternsToInclude);
  const patternHint = buildBatchPatternHint(count, patterns, params.batchIndex ?? 0);
  const topic = String(params.topic || "").trim();
  const subject = String(params.subject || "").trim();

  return `Topic: ${topic}${subject ? ` | ${subject}` : ""}
Difficulty: ${difficulty}. Patterns: ${patternHint}.
Generate EXACTLY ${count} COMPLETE UPSC MCQs from Notes. Every stem must be answerable without outside text.

NOTES:
${params.context}

${USER_TAIL}`;
}

export const promptBuilder = {
  buildNotesQuestionSystemPrompt,
  buildNotesQuestionUserPrompt,
  SYSTEM_PROMPT,
};

export default promptBuilder;
