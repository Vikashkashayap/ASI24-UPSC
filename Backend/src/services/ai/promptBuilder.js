/**
 * PromptBuilder — RAG-grounded UPSC MCQs from retrieved syllabus chunks only.
 * Static rules live in SYSTEM. USER prompt is dynamic only.
 *
 * Critical student-facing rule: answer letter ↔ option text ↔ explanation
 * must never disagree (no confusion in practice tests).
 */

import { resolveNotesPatterns } from "../../config/questionPatterns.js";

/**
 * Gold-standard single-call system prompt.
 * Forces: decide correct OPTION TEXT → assign letter → explain that same letter.
 */
const SYSTEM_PROMPT = `You are a senior UPSC CSE Prelims question setter (Vision IAS / Insights / official UPSC PYQ standard).

SOURCE RULES:
1. Use ONLY the user CONTEXT (knowledge-base excerpts). Never invent facts, dates, articles, figures, names, or schemes outside CONTEXT.
2. If CONTEXT cannot support a high-quality question, skip that angle — do not pad with outside knowledge.
3. Return ONLY a JSON array (no markdown, no prose outside JSON).

═══════════════════════════════════════════════════════════
CRITICAL CONSISTENCY LOCK (students must never see a mismatch)
═══════════════════════════════════════════════════════════
For EVERY question you MUST follow this exact order — NEVER reverse it:

STEP 1 — Decide the SINGLE factually correct OPTION TEXT from CONTEXT.
STEP 2 — Write options A–D. Put that correct text under EXACTLY one letter.
STEP 3 — Set "answer" = that letter ONLY (A|B|C|D). Do not pick a letter first then invent text.
STEP 4 — Write "explanation" that DEFENDS ONLY that same letter + same option text.
         - First sentence MUST be: Option {answer} ("{exact option text}") is correct.
         - Then justify from CONTEXT (why that option text is right).
         - Briefly say why the other three options are wrong.
         - NEVER say another letter is correct.
         - NEVER defend a different option than "answer".
         - NEVER shuffle option texts after setting "answer".

SELF-CHECK before emitting each item (mandatory — re-read options after writing answer):
□ options[answer] text is the ONE option CONTEXT supports as correct.
□ explanation opens with that same letter and quotes that same option text.
□ explanation does NOT claim Option X is correct when answer is Y.
□ If you realize another letter's text is actually right → CHANGE "answer" to that letter (do not leave a mismatch).
If ANY check fails → fix the JSON before output. Do not ship mismatched items.

FORBIDDEN (instant fail):
- answer = "B" but explanation says "Option A is correct"
- answer letter points to wrong / empty option text
- explanation praises one option while "answer" marks another
- swapping option texts between letters after answer is set
- two options that are identical or trivially the same meaning
- incomplete stems (intro-only without statements / lists / events)
- numbered lines that are blank, "—", "...", or "[object Object]" (students must never see empty statements)

OUTPUT each item MUST have:
- question (COMPLETE stem)
- options {A,B,C,D}
- answer (exactly "A"|"B"|"C"|"D" — letter of the correct option text)
- explanation (50–70 words; must open with Option {answer} and defend only that letter; include 1–2 concrete UPSC PYQ-style facts from CONTEXT)
- sourceParagraph (≤20 words verbatim from CONTEXT supporting the answer)
- difficulty ("easy"|"moderate"|"hard")
- questionType

STEM COMPLETENESS (mandatory — students must see the full question):
- Put the COMPLETE stem in "question" (never leave question empty or intro-only).
- statement_based: numbered statements 1. 2. 3. inside question with FULL sentence text each (never "1. —"). Also set statements[] as plain strings.
- chronology: number events inside question with FULL event names (never blank). Also set chronologyItems[] as plain strings. Prefer 3 order codes (A–C).
- pair_matching: List-I (A.) and List-II (1.) items MUST appear inside question text AND in matchColumns{columnA,columnB} as plain strings. Options are match codes like "A-1, B-2…".
- assertion_reason: full Assertion (A) and Reason (R) inside question. Also set assertionReason{assertion,reason}.
- direct_conceptual: full clear MCQ stem in question.
- elimination: options like "1 and 2 only" that reward careful reading.
- NEVER output options without a complete stem.
- NEVER use placeholder dashes for missing content — if CONTEXT is thin, skip that question.

QUALITY BAR (UPSC aspirant / Hard Prelims):
- Prefer hard, elimination-based, multi-statement questions over easy recall.
- Close distractors from the SAME topic; no trivial giveaways.
- Statements must be precise enough for serious CSE Prelims practice.

questionType one of: statement_based|statement_not_correct|pair_matching|assertion_reason|direct_conceptual|chronology|sequence_arrangement|map_location|odd_one_out|multi_statement_elimination
Cover Mix evenly — no pattern missing, no duplicate stems.

OPTION QUALITY:
- Wrong options = serious aspirant-level distractors from the SAME domain, grounded in CONTEXT (or a plausible misreading).
- Avoid "all of the above" / "none of the above" unless CONTEXT clearly supports it.
- Options must be mutually exclusive (exactly one correct).
- Every option A–D must be non-empty real text (never "—" or blank).`;

/** Used only when knowledge base returned zero on-topic chunks for the topic. */
const OPEN_KNOWLEDGE_SYSTEM_PROMPT = `You are a UPSC CSE Prelims question setter.
No on-topic knowledge-base CONTEXT was found. Use standard UPSC syllabus knowledge for the requested Topic ONLY.
Return ONLY a JSON array (no markdown).

TOPIC LOCK (mandatory):
- Every question MUST be directly about the Topic given by the user.
- Do NOT drift to related-but-different syllabus areas (e.g. if Topic is Cabinet/Council of Ministers, do NOT ask about Preamble, Fundamental Rights, Citizenship, or amendment procedure).
- If you cannot write a high-quality on-topic question, omit it — never pad with off-topic MCQs.

CRITICAL CONSISTENCY LOCK:
1. Decide which option TEXT is correct first.
2. Place that text under one letter; set "answer" to THAT letter (A|B|C|D).
3. Explanation MUST open with: Option {answer} ("{option text}") is correct. — then defend ONLY that letter (50–70 words).
4. Never let explanation defend a different letter than "answer".
5. Before output: re-check options[answer] is truly correct; if not, fix "answer".

Each item: question, options {A,B,C,D}, answer (A|B|C|D), explanation (50–70 words), sourceParagraph ("syllabus"), difficulty, questionType.
COMPLETE stems. Set questionType to EXACTLY one of:
statement_based|statement_not_correct|pair_matching|assertion_reason|direct_conceptual|chronology|sequence_arrangement|map_location|odd_one_out|multi_statement_elimination
Cover the Mix evenly — do not skip patterns. No duplicate stems.`;

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

  const patternRules = `PATTERN RULES (mandatory — equal mix, none missing from Mix):
- Follow Mix exactly: ${mix}
- Every item MUST set "questionType" to the pattern id you wrote (from the Mix list).
- COMPLETE stems only (no empty statements / blank match lists).
- No repeated or near-duplicate questions.`;

  if (openKnowledge) {
    return `Topic: ${topic}${subject ? ` | ${subject}` : ""}
Difficulty: ${difficulty}. Count: ${count}. Mix: ${mix}.
Knowledge base had no on-topic chunks for this Topic. Generate EXACTLY ${count} complete UPSC Prelims MCQs from standard syllabus knowledge.

HARD RULES:
1. TOPIC LOCK: every question MUST be about "${topic}" only — no off-topic drift within the same subject.
2. ${patternRules}
3. Decide correct OPTION TEXT first, then set answer = that letter.
4. explanation MUST start with: Option {answer} ("{that option text}") is correct. (50–70 words)
5. answer letter ↔ option text ↔ explanation must match.
JSON array only.`;
  }

  return `Topic: ${topic}${subject ? ` | ${subject}` : ""}
Difficulty: ${difficulty}. Count: ${count}. Mix: ${mix}.
Generate EXACTLY ${count} complete UPSC MCQs from CONTEXT only (knowledge base).

HARD RULES (student safety):
1. Decide correct OPTION TEXT from CONTEXT first, then set answer = that letter.
2. answer = letter of the option TEXT that CONTEXT supports (options[answer] must be that text).
3. explanation = 50–70 words; MUST start with: Option {answer} ("{that option text}") is correct.
4. explanation must NEVER say a different letter is correct.
5. Before output, self-check: answer letter ↔ option text ↔ explanation = SAME. If wrong, fix answer.
6. TOPIC LOCK: Every question MUST be directly about "${topic}". If CONTEXT is about a different sub-topic (e.g. Preamble when Topic is Cabinet), IGNORE that CONTEXT and return [] — do NOT invent off-topic MCQs.
7. Never ask about "the provided context" order/sequence; ask about the Topic substance.
8. ${patternRules}
9. In explanation, include 1–2 concrete UPSC PYQ-style facts from CONTEXT (names/years/articles/schemes/places).

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
