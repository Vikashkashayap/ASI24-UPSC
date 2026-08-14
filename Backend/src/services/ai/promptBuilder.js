/**
 * PromptBuilder — RAG-grounded UPSC MCQs from retrieved syllabus chunks only.
 * Static rules live in SYSTEM. USER prompt is dynamic only.
 *
 * Critical student-facing rule: answer letter ↔ option text ↔ explanation
 * must never disagree (no confusion in practice tests).
 */

import { resolveNotesPatterns } from "../../config/questionPatterns.js";

const QUESTION_TYPES =
  "statement_based|statement_not_correct|how_many_correct|how_many_pairs|pair_matching|assertion_reason|direct_conceptual|chronology|sequence_arrangement|map_location|multi_statement_elimination";

const SHARED_MCQ_RULES = `Return ONLY a JSON array (no markdown, no prose). Never copy or paraphrase an exact UPSC PYQ stem.

CONSISTENCY (never reverse):
1) Decide the single correct OPTION TEXT.
2) Put it under exactly one of A–D (all four options required, non-empty, mutually exclusive).
3) Set "answer" to that letter.
4) Explain that same letter only. First sentence: Option {answer} ("{exact option text}") is correct. Then why it is right + one clause why each wrong option fails. 80–140 English words. Never shuffle texts after setting answer. If another letter is actually right, change "answer".

FORBIDDEN: answer/explanation mismatch; identical options; intro-only stems; blank/"—" numbered lines; "Who was…/What is…" trivia; all/none of the above unless clearly justified.

OUTPUT fields: question (complete stem), options {A,B,C,D}, answer (A|B|C|D), explanation, sourceParagraph, difficulty (easy|moderate|hard), questionType.

STEM (full text inside "question"; skip the item if you cannot fill it):
- statement_based / statement_not_correct / multi_statement_elimination: intro = "Consider the following statements:" (optionally regarding X). Numbered statements. ONE ask AFTER the statements — never also in the intro.
  statement_based: "Which of the statements given above is/are correct?"
  statement_not_correct: "Which of the statements given above is/are not correct?"
  Never mix "NOT correct" in the intro with "is/are correct" after the statements.
- how_many_correct: 3–4 statements; ask "How many of the above statements are correct?"; options: Only one / Only two / Only three / All four (adjust to statement count).
- how_many_pairs: 3–4 pairs as "1. X — Y"; ask "How many of the above pairs are correctly matched?"; options Only one / Only two / Only three / All four. Not List-I/II codes.
- pair_matching: List-I (A.) and List-II (1.) in question AND matchColumns{columnA,columnB}. Options are match codes (A-1, B-2…).
- assertion_reason: full Assertion (A) and Reason (R) + assertionReason{}. Standard UPSC A–D codes.
- chronology: full event names + chronologyItems[]. Options A–D are four distinct order codes (never omit D; never 3-option papers).
- map_location: location logic in words (no image). Close distractors from neighbouring places/features.
- direct_conceptual: conceptual stem, not one-fact recall.

QUALITY (official CSE 2013–2025 toughness — harder than typical coaching sectionals):
- Frames: "With reference to…", "Consider the following statements:", "Which of the following pairs is/are correctly matched?", "Which of the statements given above is/are not correct?", "How many of the above…".
- Hard: ≥80% analytical (statements / how-many / A-R / matching / chronology / elimination). Cap recall. 30–60 seconds of elimination.
- Cover Mix counts exactly. One concept per question. Near-miss traps (wrong year/article, partial truth, swapped cause/effect) — never absurd.
- questionType one of: ${QUESTION_TYPES}`;

/**
 * Gold-standard single-call system prompt.
 * Forces: decide correct OPTION TEXT → assign letter → explain that same letter.
 */
const SYSTEM_PROMPT = `You are a senior UPSC CSE Prelims setter (official 2013–2025 PYQ toughness).

SOURCE: Use ONLY user CONTEXT. Never invent facts, dates, articles, figures, names, or schemes. Skip book apparatus (preface, TOC, index, glossary, exercises, page lists). If CONTEXT cannot support a question, skip it. If CONTEXT is mostly junk, return [].
Facts in CONTEXT must be copied exactly — never approximate years/articles/schemes.
${SHARED_MCQ_RULES}
sourceParagraph: ≤20 words verbatim from CONTEXT supporting the answer.
Wrong options = near-miss distractors grounded in CONTEXT.`;

/** Used when Knowledge Base RAG is skipped — LLM writes official UPSC CSE Prelims MCQs. */
const OPEN_KNOWLEDGE_SYSTEM_PROMPT = `You are a senior UPSC CSE Prelims setter (official 2013–2025 PYQ toughness — conceptual and application-heavy, not coaching one-liners).
Do NOT use retrieved textbook chunks. Write from standard GS-I sources (NCERT, Laxmikanth, Spectrum, GC Leong, Shankar, Economic Survey).
Every item MUST stay on the user Topic — do not drift to a sibling syllabus area.
${SHARED_MCQ_RULES}
sourceParagraph: "standard UPSC syllabus".

ACCURACY — if not 100% sure, skip that fact (never guess):
- Articles, years, judgments, bodies, schemes, places must match standard sources.
- Polity: do not mix Arts 74/75, 123/213, 356/365, or Schedules.
- Economy: do not invent Budget / GDP / fiscal numbers.
- Environment: do not guess IUCN / Ramsar / CITES / species range.`;

function compactPatternMix(count, patternsToInclude, batchIndex = 0, generationPlan = null) {
  if (generationPlan?.patternCounts && typeof generationPlan.patternCounts === "object") {
    const entries = Object.entries(generationPlan.patternCounts).filter(([, n]) => Number(n) > 0);
    if (entries.length) {
      return entries.map(([id, n]) => `${n}x${id}`).join(",");
    }
  }
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
  const mix = compactPatternMix(
    count,
    params.patternsToInclude,
    params.batchIndex ?? 0,
    params.generationPlan
  );
  const topic = String(params.topic || "").trim();
  const subject = String(params.subject || "").trim();
  const openKnowledge = Boolean(params.openKnowledge);
  const context = compressContext(params.context);
  const excludeTopics = (Array.isArray(params.siblingTopics) ? params.siblingTopics : [])
    .map((t) => {
      let line = String(t || "").trim();
      const m = line.match(/^(?:Ch\.?\s*|अध्\.?\s*)\d+\s*[:.\-–—]\s*(.+)$/i);
      if (m) line = m[1].trim();
      return line;
    })
    .filter((t) => t && t.toLowerCase() !== topic.toLowerCase())
    .slice(0, 12);
  const chapterLock =
    excludeTopics.length > 0
      ? `CHAPTER LOCK: Questions MUST be ONLY about "${topic}". Do NOT ask about sibling chapters: ${excludeTopics
          .map((t) => `"${t}"`)
          .join(", ")}. If CONTEXT mixes those topics, ignore off-chapter passages.`
      : `TOPIC LOCK: Every question MUST be directly about "${topic}". Ignore CONTEXT about a different chapter/sub-topic.`;

  const hardLine =
    difficulty === "hard"
      ? `Hard: every item difficulty="hard". Follow Mix exactly. In this batch include 1–2 Topic items that test a well-known current linkage (scheme/report/judgment/institution) still about "${topic}". Never copy exact PYQs.`
      : "";

  if (openKnowledge) {
    return `Topic: ${topic}${subject ? ` | ${subject}` : ""}
Difficulty: ${difficulty}. Count: ${count}. Mix: ${mix}.
Generate EXACTLY ${count} UPSC CSE Prelims GS MCQs from standard syllabus knowledge.
${chapterLock}
Set questionType to the Mix ids (do not substitute). Skip any fact you are not sure of.
${hardLine}
JSON array only.`;
  }

  return `Topic: ${topic}${subject ? ` | ${subject}` : ""}
Difficulty: ${difficulty}. Count: ${count}. Mix: ${mix}.
Generate EXACTLY ${count} UPSC MCQs from CONTEXT only.
${chapterLock}
Ask about Topic substance, not "the provided context". Set questionType to Mix ids. If CONTEXT is TOC/index/exercises, return [].
${hardLine}

JSON array only.

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
