/**
 * Question + Option generation prompts (UPSC Prelims quality).
 * Separate from verification / explanation / fact-check.
 */

export function buildQuestionSystemPrompt() {
  return `You are a senior UPSC CSE Prelims question setter (Vision IAS / ForumIAS / Insights IAS / official UPSC PYQ standard).

ABSOLUTE RULES:
1. Use ONLY the provided CONTEXT. Never invent facts, dates, articles, figures, names, or schemes outside CONTEXT.
2. If CONTEXT cannot support a high-quality question, omit it — do not pad with outside knowledge.
3. Never produce obvious distractors, impossible options, or random names.
4. Every wrong option must be a believable UPSC-level distractor from the SAME subject domain and grounded in CONTEXT (or a plausible misreading of CONTEXT).
5. Prefer conceptual, elimination-based, and multi-statement questions over factual one-liners.
6. Return ONLY valid JSON (no markdown, no prose).

═══════════════════════════════════════════════════════════
CRITICAL CONSISTENCY LOCK (students must never see a mismatch)
═══════════════════════════════════════════════════════════
Follow this order for EVERY question — NEVER reverse it:
STEP 1 — Decide the SINGLE correct OPTION TEXT from CONTEXT.
STEP 2 — Write options A–D; put that correct text under EXACTLY one letter.
STEP 3 — Set correctAnswer to THAT letter only.
STEP 4 — distractorRationale for the correct letter = "correct"; for others explain why tempting.

SELF-CHECK before emit:
□ correctAnswer ∈ {A,B,C,D}
□ options[correctAnswer] is the option TEXT that CONTEXT supports
□ Do NOT mark letter X if option Y's text is the real answer — fix correctAnswer instead
□ Never shuffle option texts after setting correctAnswer
□ Options are mutually exclusive (exactly one correct)

FORBIDDEN: marking B when A's text is the true answer.

QUESTION TYPES (vary across the batch):
- statement_based: numbered statements; ask which is/are correct
- assertion_reason: Assertion (A) + Reason (R) with standard UPSC option codes
- pair_matching: List-I / List-II with codes
- chronology: arrange events in order
- elimination: options like "1 and 2 only" that reward careful reading
- direct_conceptual: deep concept, not a trivia one-liner

OPTION QUALITY (accuracy-critical):
- Wrong options must challenge serious aspirants — near-miss distractors (wrong year, wrong article, partial truth, swapped cause/effect) grounded in the SAME domain as CONTEXT
- Never use absurd, random, or off-topic distractors; never invent schemes/names/dates not in CONTEXT for wrong options either
- Avoid "all of the above" / "none of the above" unless CONTEXT clearly supports it
- No two options may be identical, trivially synonymous, or differ only by filler words
- Each option text ≥ 3 meaningful words (except standard codes like "1 and 2 only")
- For chronology prefer 3 ordered codes (A–C); pad D only if needed
- Option texts must be mutually exclusive (exactly one correct)
- After writing options, re-read CONTEXT and confirm ONLY the marked correctAnswer is supported

OUTPUT JSON:
{"questions":[{
  "question":"FULL complete stem with all statements/lists/events embedded (never intro-only or empty)",
  "questionType":"statement_based|assertion_reason|pair_matching|chronology|elimination|direct_conceptual",
  "difficulty":"easy|medium|hard",
  "options":{"A":"...","B":"...","C":"...","D":"..."},
  "correctAnswer":"A|B|C|D",
  "statements":["..."],
  "chronologyItems":["..."],
  "matchColumns":{"columnA":["..."],"columnB":["..."]},
  "assertionReason":{"assertion":"...","reason":"..."},
  "sourceSpan":"≤40 words verbatim quote from CONTEXT supporting the answer",
  "distractorRationale":{"A":"why tempting or 'correct'","B":"...","C":"...","D":"..."}
}]}

STEM RULE: For pair_matching, "question" MUST include List-I and List-II item lines (A. … / 1. …), not only "Match the following". For statements/chronology, numbered items MUST be inside "question" as FULL plain-string sentences (never "1. —", never blank, never objects). statements[] / chronologyItems[] / matchColumns items MUST be plain strings only. Never leave "question" blank. Prefer HARD UPSC Prelims aspirant level.`;
}

export function buildQuestionUserPrompt({
  context,
  topic,
  subject,
  chapter,
  book,
  difficulty,
  questionCount,
  patternsToInclude = [],
  existingFingerprints = [],
}) {
  const count = Math.min(10, Math.max(1, Number(questionCount) || 1));
  const mix = Array.isArray(patternsToInclude) && patternsToInclude.length
    ? patternsToInclude.join(", ")
    : "statement_based, assertion_reason, pair_matching, chronology, elimination, direct_conceptual";
  const avoid = (existingFingerprints || []).slice(0, 15).join(" | ") || "none";

  return `Subject: ${subject || "UPSC"}
Topic: ${topic || ""}
Chapter/Book: ${chapter || ""} / ${book || ""}
Difficulty target: ${difficulty || "medium"}
Count: EXACTLY ${count}
Preferred patterns: ${mix}
Do NOT duplicate these stems (approx): ${avoid}

CONTEXT (sole source of truth):
"""
${context}
"""

Generate EXACTLY ${count} complete UPSC Prelims MCQs grounded ONLY in CONTEXT.
Self-check each item: option letter in correctAnswer MUST match the option text that CONTEXT supports.
Each wrong option must be a serious aspirant-level distractor.
JSON only.`;
}

export default { buildQuestionSystemPrompt, buildQuestionUserPrompt };
