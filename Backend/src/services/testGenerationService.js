import fetch from "node-fetch";
import crypto from "crypto";
import { getFrontendOrigin } from "../config/urlConfig.js";
import {
  getTestGenerationModel,
  getMaxTokensForTestGeneration,
  getMixBatchSize,
  getMixGenerateBuffer,
} from "../config/openRouterConfig.js";
import { ensureEnglishBilingualFields } from "./questionTranslationService.js";

function usesFullBilingualExplanations() {
  return process.env.TEST_GEN_FULL_BILINGUAL_EXPLANATIONS === "true";
}

/** Compact prompts for admin Prelims Mock (default). Set TEST_GEN_FULL_MOCK_VERBOSE=true for legacy long prompts. */
function usesCompactFullMockPrompts() {
  return process.env.TEST_GEN_FULL_MOCK_VERBOSE !== "true";
}

const PRELIMS_COMPACT_JSON_RULES = `
JSON array only. Each object (no extra text):
- question_en, question_hi (Devanagari, same meaning)
- options_en, options_hi: { "A","B","C","D" }
- answer: A|B|C|D
- explanation: one short English sentence why the correct option is right (max 25 words). Do NOT include explanation_hi.`;

const BILINGUAL_JSON_RULES_FULL = `
BILINGUAL OUTPUT (English + Hindi in the SAME object):
- question_en, question_hi, options_en, options_hi (same meaning in Hindi)
- explanation_en, explanation_hi: { "A","B","C","D" } — one brief sentence per option
- answer: A|B|C|D`;

/** Full bilingual schema for full-mock generators. */
const BILINGUAL_JSON_RULES = BILINGUAL_JSON_RULES_FULL;

function getPrelimsJsonRules() {
  return usesFullBilingualExplanations() ? BILINGUAL_JSON_RULES_FULL : PRELIMS_COMPACT_JSON_RULES;
}

/**
 * Normalize bilingual fields from the generation prompt (no separate Hindi translation API).
 */
function finalizeGeneratedQuestions(questions) {
  const normalized = questions.map(ensureEnglishBilingualFields);
  const withHindi = normalized.filter(
    (q) => String(q.question_hi || "").trim() && String(q.options_hi?.A || "").trim()
  ).length;
  console.log(
    `✅ ${normalized.length} question(s) ready (${withHindi} with Hindi from single API call, no translation pass)`
  );
  return normalized;
}

/** Generate unique question ID for deduplication (hash of normalized question text). */
function hashQuestion(questionText) {
  const normalized = String(questionText || "").trim().replace(/\s+/g, " ");
  return crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 24);
}

/** Strip HTML tags for fingerprinting (LLMs often wrap stems in <p>, <b>, etc.). */
function stripHtmlForFingerprint(html) {
  return String(html || "").replace(/<[^>]+>/g, " ");
}

/**
 * Normalize text so two visually identical stems (HTML vs plain, extra spaces) dedupe together.
 */
function normalizeTextForFingerprint(raw) {
  let s = stripHtmlForFingerprint(raw);
  s = s.replace(/&nbsp;/gi, " ").replace(/&[a-z]+;/gi, " ");
  try {
    s = s.normalize("NFKC");
  } catch (_) {}
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Stable key for "same MCQ" within one paper: stem + structured parts + all four options.
 * Using options avoids collapsing different items that share an intro line only.
 */
export function canonicalDedupeKey(q) {
  if (!q || typeof q !== "object") return "";
  const stem = normalizeTextForFingerprint(q.question ?? q.questionText ?? "");
  const ar = q.assertionReason;
  let arKey = "";
  if (ar && typeof ar === "object" && (ar.assertion || ar.reason)) {
    arKey = `${normalizeTextForFingerprint(ar.assertion)}|${normalizeTextForFingerprint(ar.reason)}`;
  }
  let matchKey = "";
  if (q.matchColumns && (q.matchColumns.columnA?.length || q.matchColumns.columnB?.length)) {
    const a = (q.matchColumns.columnA || []).map((x) => normalizeTextForFingerprint(x)).join(";");
    const b = (q.matchColumns.columnB || []).map((x) => normalizeTextForFingerprint(x)).join(";");
    matchKey = `${a}||${b}`;
  }
  let tableKey = "";
  if (q.tableData && (q.tableData.headers?.length || q.tableData.rows?.length)) {
    const h = (q.tableData.headers || []).map((x) => normalizeTextForFingerprint(x)).join(";");
    const r = (q.tableData.rows || [])
      .map((row) => (Array.isArray(row) ? row.map((c) => normalizeTextForFingerprint(c)).join(",") : ""))
      .join("|");
    tableKey = `${h}##${r}`;
  }
  const opts = q.options || {};
  const optKey = ["A", "B", "C", "D"].map((k) => normalizeTextForFingerprint(opts[k] ?? "")).join("|");
  return [stem, arKey, matchKey, tableKey, optKey].filter(Boolean).join("##");
}

/**
 * Remove duplicate questions within array by canonical stem+options fingerprint.
 * Reassigns questionId from the canonical key so IDs stay aligned with dedupe logic.
 */
export function dedupeQuestions(questions) {
  if (!Array.isArray(questions) || questions.length === 0) return questions;
  const seen = new Set();
  return questions
    .filter((q) => {
      const key = canonicalDedupeKey(q);
      if (!key) return false;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((q) => ({
      ...q,
      questionId: hashQuestion(canonicalDedupeKey(q)),
    }));
}

/**
 * Stem-level key: catches near-repeat where same concept is asked again with option tweaks.
 */
function canonicalStemKey(q) {
  if (!q || typeof q !== "object") return "";
  const stem = normalizeTextForFingerprint(q.question ?? q.questionText ?? "");
  const ar = q.assertionReason;
  const arKey = ar && typeof ar === "object" ? `${normalizeTextForFingerprint(ar.assertion)}|${normalizeTextForFingerprint(ar.reason)}` : "";
  return [stem, arKey].filter(Boolean).join("##");
}

/**
 * Remove repeated stems in one paper (strictly one variant of same question idea).
 */
export function dedupeQuestionsByStem(questions) {
  if (!Array.isArray(questions) || questions.length === 0) return questions;
  const seen = new Set();
  return questions.filter((q) => {
    const key = canonicalStemKey(q);
    if (!key) return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Compact system prompt for Prelims test generator only (~low token input).
 */
function buildPrelimsGSSystemPrompt(subjects, topic, difficulty, currentAffairsPeriod) {
  const subjectsText = Array.isArray(subjects) ? subjects.join(", ") : subjects;
  let extra = "";
  if (subjects.includes("Current Affairs")) {
    extra += " Include current-affairs linkage where relevant.";
    if (currentAffairsPeriod?.month || currentAffairsPeriod?.year) {
      extra += ` Period hint: ${[currentAffairsPeriod.month, currentAffairsPeriod.year].filter(Boolean).join("/")}.`;
    }
  }
  if (subjects.includes("Art & Culture")) {
    extra += " Art & Culture: architecture, heritage, literature, performing arts.";
  }

  const explLine = usesFullBilingualExplanations()
    ? "Include explanation_en and explanation_hi for all four options (one short sentence each)."
    : 'Include "explanation": one short English sentence for why the correct option is right.';

  return `UPSC Prelims GS Paper-I MCQ generator. Subjects: ${subjectsText}. Topic: ${topic}. Difficulty: ${difficulty}.${extra}

Rules: UPSC-standard, eliminable options, at least one trap. Mix statement-based (2–3 statements, options like "1 only", "1 and 2 only"), assertion-reason, match/pair, which correct/incorrect. Concise stems.

${getPrelimsJsonRules()}
${explLine}
Return ONLY a JSON array. No markdown. No duplicate questions.`;
}

function buildPrelimsCSATSystemPrompt(csatCategories, topic) {
  const categoriesText =
    Array.isArray(csatCategories) && csatCategories.length > 0
      ? csatCategories.join(", ")
      : "Quantitative Aptitude, Logical Reasoning, Reading Comprehension, Data Interpretation";

  const explLine = usesFullBilingualExplanations()
    ? "Include explanation_en and explanation_hi per option."
    : 'Include "explanation": one short English sentence for the correct option.';

  return `UPSC Prelims CSAT MCQ generator. Categories: ${categoriesText}. Topic: ${topic}.

Rules: 4 options, single correct answer, clear exam-style wording.

${getPrelimsJsonRules()}
${explLine}
Return ONLY a JSON array. No markdown.`;
}

function buildPrelimsBatchUserPrompt({ examType, need, topic, subjectsText, difficulty }) {
  const jsonNote = usesFullBilingualExplanations()
    ? "Bilingual question, options, and explanations. JSON array only."
    : "Bilingual question and options (EN+HI). English explanation only. JSON array only.";

  if (examType === "CSAT") {
    return `Generate EXACTLY ${need} UPSC Prelims CSAT MCQs. Topic: ${topic}. ${jsonNote}`;
  }
  return `Generate EXACTLY ${need} UPSC Prelims GS MCQs. Subjects: ${subjectsText}. Topic: ${topic}. Difficulty: ${difficulty}. ${jsonNote}`;
}

/**
 * Map compact or full explanation fields to option-wise explanation object for DB/UI.
 */
function normalizePrelimsExplanation(raw, correctAnswer) {
  if (usesFullBilingualExplanations()) {
    return normalizeExplanation(raw);
  }

  const empty = { A: "—", B: "—", C: "—", D: "—" };
  const key = ["A", "B", "C", "D"].includes(correctAnswer) ? correctAnswer : null;

  if (typeof raw === "string" && raw.trim()) {
    if (key) return { ...empty, [key]: raw.trim() };
    return { A: raw.trim(), B: raw.trim(), C: raw.trim(), D: raw.trim() };
  }

  if (typeof raw === "object" && raw !== null) {
    const obj = normalizeExplanation(raw);
    const filledKeys = ["A", "B", "C", "D"].filter((k) => obj[k] && obj[k] !== "—");
    if (filledKeys.length === 1) return obj;
    if (filledKeys.length > 1) return obj;
    if (key && obj[key]?.trim()) return obj;
  }

  return empty;
}

/**
 * Build GS Paper 1 system prompt with optional Current Affairs and Art & Culture emphasis.
 * @param {string[]} subjects
 * @param {string} topic
 * @param {string} difficulty
 * @param {Object} [currentAffairsPeriod]
 * @param {string[]} [patternsToInclude] - If non-empty, use ONLY these question patterns in balanced proportion.
 */
function buildGSSystemPrompt(subjects, topic, difficulty, currentAffairsPeriod, patternsToInclude = []) {
  const subjectsText = Array.isArray(subjects) ? subjects.join(", ") : subjects;
  let contentRules = `- Subjects: ${subjectsText}\n- Topic: ${topic}\n- Difficulty: ${difficulty}\n- Stay within UPSC GS-I syllabus.\n- Avoid direct factual recall.\n- At least one option must be a close UPSC-style trap.\n- Options must be logically eliminable.`;

  if (subjects.includes("Current Affairs")) {
    contentRules += `

CURRENT AFFAIRS FOCUS (when this subject is selected):
- Generate dynamic, recent-type UPSC questions.
- Include: government schemes, reports, international relations, environment updates.
- Mix static concepts with current linkage (test static concept via current relevance).`;
    if (currentAffairsPeriod && (currentAffairsPeriod.month || currentAffairsPeriod.year)) {
      const period = [currentAffairsPeriod.month, currentAffairsPeriod.year].filter(Boolean).join("/");
      contentRules += `\n- Prefer relevance to period: ${period} (where applicable).`;
    }
  }

  if (subjects.includes("Art & Culture")) {
    contentRules += `

ART & CULTURE FOCUS (when this subject is selected):
- Cover: Architecture, Sculpture, Painting, Literature, Dance, Music, UNESCO Heritage Sites.
- Difficulty: UPSC standard analytical level (not just factual recall).`;
  }

  return `You are an UPSC CSE Prelims GS Paper-I MCQ Generator.

OBJECTIVE:
Generate UPSC-standard MCQs for mock tests. Questions must feel like real Prelims — conceptual, eliminable, and trap-based.

MANDATORY QUESTION PATTERNS:
${Array.isArray(patternsToInclude) && patternsToInclude.length > 0 ? `Use ONLY these patterns in balanced proportion: ${patternsToInclude.map((id) => PATTERN_LABELS[id] || id).join("; ")}. Still follow format rules below for each type.\n\n` : ""}
1. Statement-based questions: Use 2 or 3 statements. Options must be statement-type combinations, e.g. "1 only", "2 only", "1 and 2 only", "1 and 3 only", "1, 2 and 3" (for 3 statements). Do NOT use generic options; use only statement-number combinations.
2. Assertion-Reason: Use exactly 2 statements (Assertion + Reason). Options: (a) Both correct, A explains R (b) Both correct, A does not explain R (c) A correct, R wrong (d) A wrong, R correct. Keep assertion-type questions with 2 or 3 statement-type options as above where applicable.
3. "How many of the above are correct?" structure (with 2–4 statements)
4. Match the following / Pair-based
5. "Which of the following is correct / incorrect?"
6. Concept + Current Affairs integrated (test a static concept via current relevance) where suitable

CONTENT RULES:
${contentRules}

DIFFICULTY CONTROL:
- Easy: Direct concept understanding
- Moderate: Mixed statements + elimination
- Hard: Closely worded statements, high confusion

OUTPUT FORMAT (STRICT – JSON array only):
${BILINGUAL_JSON_RULES}
Each object:
{
  "pattern": "STATEMENT_BASED | ASSERTION_REASON | HOW_MANY_CORRECT | MATCH | WHICH_CORRECT | CONCEPT_CURRENT",
  "question_en": "English question text",
  "question_hi": "Hindi question text (Devanagari)",
  "options_en": { "A": "", "B": "", "C": "", "D": "" },
  "options_hi": { "A": "", "B": "", "C": "", "D": "" },
  "answer": "A | B | C | D",
  "explanation_en": { "A": "", "B": "", "C": "", "D": "" },
  "explanation_hi": { "A": "", "B": "", "C": "", "D": "" },
  "subject": "One of: ${subjectsText}"
}

EXPLANATION (OPTION-WISE, MANDATORY in both languages):
- explanation_en and explanation_hi MUST be objects { "A", "B", "C", "D" }.
- CORRECT option: one short sentence why it is right. INCORRECT: one short sentence why it is wrong.
- Keep each explanation brief (1 sentence) to save tokens.

IMPORTANT:
- Do NOT add any introductory or closing text.
- Do NOT repeat questions.
- For assertion-type and statement-based questions: always use 2 or 3 statements, and options must be statement-type (e.g. "1 only", "2 only", "1 and 2 only", "1, 2 and 3"). Do not use unrelated option text.
- Include assertion-reason type where suitable.
- Keep language concise, formal, and exam-oriented.`;
}

/**
 * Build CSAT system prompt with categories.
 */
function buildCSATSystemPrompt(csatCategories, topic) {
  const categoriesText = Array.isArray(csatCategories) && csatCategories.length > 0
    ? csatCategories.join(", ")
    : "Quantitative Aptitude, Logical Reasoning, Reading Comprehension, Data Interpretation";

  return `You are an UPSC CSE Prelims CSAT (Paper-II) MCQ Generator.

OBJECTIVE:
Generate UPSC-standard CSAT MCQs for mock tests. CSAT is qualifying in nature; focus on clarity and standard exam patterns.

CATEGORIES TO COVER: ${categoriesText}
Topic/Focus: ${topic}

RULES:
- 4 options per question, single correct answer.
- Quantitative Aptitude: numerical problems, shortcuts, approximation.
- Logical Reasoning: sequences, arrangements, syllogisms, puzzles.
- Reading Comprehension: short passages with inference and factual questions.
- Data Interpretation: tables, graphs, caselets with calculation and inference.

OUTPUT FORMAT (STRICT – JSON array only):
${BILINGUAL_JSON_RULES}
Each object:
{
  "pattern": "QUANTITATIVE | LOGICAL_REASONING | READING_COMPREHENSION | DATA_INTERPRETATION",
  "question_en": "English (passage + question for RC/DI if needed)",
  "question_hi": "Hindi (same content)",
  "options_en": { "A": "", "B": "", "C": "", "D": "" },
  "options_hi": { "A": "", "B": "", "C": "", "D": "" },
  "answer": "A | B | C | D",
  "explanation_en": { "A": "", "B": "", "C": "", "D": "" },
  "explanation_hi": { "A": "", "B": "", "C": "", "D": "" },
  "subject": "CSAT"
}

EXPLANATION (OPTION-WISE, MANDATORY in both languages):
- explanation_en and explanation_hi as { "A", "B", "C", "D" }; one brief sentence per option.

IMPORTANT:
- Do NOT add any introductory or closing text.
- Keep language concise and exam-oriented.`;
}

/**
 * Build system prompt for FULL-LENGTH UPSC Prelims GS Paper 1 Mock (100 questions).
 * Subject is provided by admin (SUBJECT_FROM_ADMIN).
 */
function buildFullMockGSSystemPrompt(subject) {
  const subjectText = typeof subject === "string" ? subject : (Array.isArray(subject) ? subject.join(", ") : "General Studies");
  return `You are an expert UPSC Civil Services Examination Prelims Question Paper Setter.

Your task is to generate a FULL-LENGTH UPSC Prelims GS Paper 1 Mock Test strictly based on the real UPSC pattern.

Follow these rules VERY STRICTLY:

--------------------------------------------
EXAM STRUCTURE:
--------------------------------------------
• Total Questions: 100
• Total Marks: 200
• Each Question: 2 Marks
• Negative Marking: 1/3rd (0.66)
• Difficulty Level: Moderate to Tough (UPSC standard)
• Avoid very direct factual questions
• Focus on conceptual clarity and elimination-based logic

--------------------------------------------
QUESTION TYPES (Must Mix These):
--------------------------------------------
1. Multi-statement based questions:
   Example format:
   Consider the following statements:
   1. ...
   2. ...
   3. ...
   Which of the above is/are correct?

2. Assertion and Reason

3. Match the Following

4. Analytical / Conceptual MCQs

--------------------------------------------
SUBJECT INPUT:
--------------------------------------------
Generate questions from the following subject: ${subjectText}

--------------------------------------------
QUESTION FORMAT (STRICT JSON OUTPUT):
--------------------------------------------

Return response ONLY in JSON format like below:

{
  "test_name": "Prelims Mock - Full Length",
  "total_questions": 100,
  "total_marks": 200,
  "negative_marking": 0.66,
  "duration_minutes": 120,
  "questions": [
    {
      "question_number": 1,
      "type": "multi-statement",
      "question": "Full UPSC standard question text here",
      "options": {
        "A": "Option text",
        "B": "Option text",
        "C": "Option text",
        "D": "Option text"
      },
      "correct_answer": "B",
      "explanation": { "A": "", "B": "", "C": "", "D": "" }
    }
  ]
}

--------------------------------------------
EXPLANATION (OPTION-WISE, MANDATORY – same as CSAT):
--------------------------------------------
• explanation MUST be an object: { "A": "...", "B": "...", "C": "...", "D": "..." }.
• For the CORRECT option: write "correct statement" — WHY it is correct (reason, fact, concept).
• For EACH INCORRECT option: write "wrong statement" — WHY it is wrong (wrong fact, trap, common mistake).
• At least 1–2 sentences per option. No empty explanation for any option.

--------------------------------------------
IMPORTANT RULES:
--------------------------------------------
• Do NOT skip question numbers. Number questions 1 to 100.
• Do NOT reduce total questions. Must generate exactly 100 questions.
• Maintain UPSC language tone.
• Avoid repetition.
• Output MUST be valid JSON.
• Do NOT add extra commentary outside JSON.
• "type" for each question must be one of: "multi-statement", "assertion-reason", "match", "analytical".
• For assertion-reason: options must be (a) Both correct, A explains R (b) Both correct, A does not explain R (c) A correct, R wrong (d) A wrong, R correct.`;
}

/** Human-readable labels for pattern IDs (for prompt text). */
const PATTERN_LABELS = {
  statement_based: "Statement-based (which are correct)",
  statement_not_correct: "Statement-based (NOT correct)",
  pair_matching: "Pair matching / Match the following",
  assertion_reason: "Assertion–Reason",
  direct_conceptual: "Direct conceptual MCQs",
  chronology: "Chronology-based",
  sequence_arrangement: "Sequence arrangement",
  map_location: "Map/location-based",
  odd_one_out: "Odd one out",
  multi_statement_elimination: "Multi-statement elimination",
};

/**
 * Compact system prompt for admin Prelims Mock GS Mix (~low tokens).
 */
function buildCompactFullMockMixSystemPrompt(
  difficulty = "moderate",
  excludeSnippets = [],
  patternsToInclude = []
) {
  const avoidLine =
    Array.isArray(excludeSnippets) && excludeSnippets.length > 0
      ? `\nAvoid repeating:\n${excludeSnippets.slice(0, 5).map((s) => `- ${String(s).slice(0, 60)}`).join("\n")}\n`
      : "";
  const difficultyMix =
    difficulty === "moderate"
      ? "50% moderate, 35% hard, 15% easy"
      : difficulty === "hard"
        ? "80% hard, 20% moderate"
        : "50% easy, 50% moderate";
  const patterns =
    Array.isArray(patternsToInclude) && patternsToInclude.length > 0
      ? patternsToInclude.map((id) => PATTERN_LABELS[id] || id).join(", ")
      : "statement, match, assertion, pair, chronology, map, direct";
  const explLine = usesFullBilingualExplanations()
    ? "explanation_en + explanation_hi per option (brief)."
    : '"explanation": one short English sentence for the correct option only.';

  return `UPSC GS Paper 1 full-mock batch generator.${avoidLine}
Subjects: Polity, History, Geography, Economy, Environment, Science & Tech, Art & Culture + Current Affairs.
Patterns (balanced): ${patterns}. Difficulty: ${difficultyMix}.
${getPrelimsJsonRules()}
Per question also: subject, questionType (statement|match|assertion|chronology|pair|map|direct). Use matchColumns or assertionReason only when needed.
${explLine}
Return ONLY JSON: { "examTitle": "...", "questions": [ ... ] } or a raw array. No markdown.`;
}

function buildCompactFullMockCsatSystemPrompt(excludeSnippets = []) {
  const avoidLine =
    Array.isArray(excludeSnippets) && excludeSnippets.length > 0
      ? `\nAvoid repeating:\n${excludeSnippets.slice(0, 5).map((s) => `- ${String(s).slice(0, 60)}`).join("\n")}\n`
      : "";
  const explLine = usesFullBilingualExplanations()
    ? "explanation_en/hi per option."
    : '"explanation": one short English sentence (correct option).';
  return `UPSC CSAT Paper 2 batch generator. Mix RC, logical reasoning, numeracy, DI.${avoidLine}
For RC: each item must include the passage plus a distinct sub-question (do not output multiple MCQs with identical question text).
${getPrelimsJsonRules()}
${explLine}
Return ONLY JSON with "test_name" and "questions" array.`;
}

/** CSAT papers use passage-based sets; stem-only dedupe would drop valid RC siblings. */
function dedupeMockPaperQuestions(questions, { csat = false } = {}) {
  const base = dedupeQuestions(questions);
  if (csat) return base;
  return dedupeQuestionsByStem(base);
}

function bilingualBatchJsonNote() {
  return usesFullBilingualExplanations()
    ? "Bilingual Q/options/explanations."
    : "Bilingual Q/options (EN+HI). English explanation only.";
}

/**
 * Shared generate → dedupe → refill → top-up loop (GS Mix, CSAT, PYQ, subject mocks).
 */
async function runFullMockPaperGenerationLoop({
  apiKey,
  model,
  displayCount,
  csatPaper = false,
  logPrefix,
  generateBatch,
}) {
  const perBatch = getMixBatchSize();
  const generateCount = displayCount + getMixGenerateBuffer();
  const batches = Math.ceil(generateCount / perBatch);
  const all = [];
  let testName = null;

  for (let b = 1; b <= batches; b += 1) {
    const rollingExclude = [
      ...new Set(
        dedupeMockPaperQuestions(all, { csat: csatPaper })
          .map((q) => String(q.question_en || q.question || q.questionText || "").trim().slice(0, 60))
          .filter(Boolean)
      ),
    ].slice(0, 5);
    console.log(
      `📝 ${logPrefix}: batch ${b}/${batches} (${perBatch} Q, max_tokens≈${getMaxTokensForTestGeneration(perBatch)})...`
    );
    const { questions: batchQuestions, testName: batchTestName } = await generateBatch(
      apiKey,
      model,
      perBatch,
      `Part ${b}`,
      rollingExclude
    );
    if (batchTestName) testName = batchTestName;
    if (batchQuestions?.length) all.push(...batchQuestions);
  }

  let deduped = dedupeMockPaperQuestions(all, { csat: csatPaper });
  const maxRefills = getMixMaxRefillBatches();
  let refill = 0;
  let stallRounds = 0;

  while (deduped.length < displayCount && refill < maxRefills) {
    const beforeCount = deduped.length;
    const need = Math.max(1, Math.min(perBatch, displayCount - deduped.length));
    const snippetPool = deduped
      .map((q) => String(q.question_en || q.question || q.questionText || "").trim().slice(0, 60))
      .filter(Boolean)
      .slice(0, 5);
    console.log(
      `📝 ${logPrefix}: refill ${refill + 1}/${maxRefills} (unique ${deduped.length}/${displayCount}, requesting ${need})...`
    );
    const { questions: batchQuestions, testName: batchTestName } = await generateBatch(
      apiKey,
      model,
      need,
      `Refill ${refill + 1}`,
      snippetPool
    );
    if (batchTestName) testName = batchTestName;
    if (batchQuestions?.length) all.push(...batchQuestions);
    deduped = dedupeMockPaperQuestions(all, { csat: csatPaper });
    refill += 1;
    if (deduped.length === beforeCount) stallRounds += 1;
    else stallRounds = 0;
    if (stallRounds >= 4) {
      console.warn(`📝 ${logPrefix}: stopping refill after ${stallRounds} rounds with no new unique questions`);
      break;
    }
  }

  let finalQuestions = deduped.slice(0, displayCount);

  if (finalQuestions.length < displayCount) {
    const gap = displayCount - finalQuestions.length;
    console.log(`📝 ${logPrefix}: short by ${gap}, running up to ${gap + 2} micro top-up batches...`);
    for (let t = 0; t < gap + 2 && finalQuestions.length < displayCount; t += 1) {
      const need = displayCount - finalQuestions.length;
      const snippets = finalQuestions
        .map((q) => String(q.question_en || q.question || "").trim().slice(0, 60))
        .filter(Boolean)
        .slice(0, 8);
      const { questions: extra } = await generateBatch(apiKey, model, need, `Top-up ${t + 1}`, snippets);
      if (extra?.length) {
        all.push(...extra);
        deduped = dedupeMockPaperQuestions(all, { csat: csatPaper });
        finalQuestions = deduped.slice(0, displayCount);
      }
    }
  }

  return { deduped, finalQuestions, testName };
}

function buildCompactFullMockSubjectSystemPrompt(subjectsList, excludeSnippets = [], patternsToInclude = []) {
  const avoidLine =
    Array.isArray(excludeSnippets) && excludeSnippets.length > 0
      ? `\nAvoid repeating:\n${excludeSnippets.slice(0, 5).map((s) => `- ${String(s).slice(0, 60)}`).join("\n")}\n`
      : "";
  const subjects = subjectsList.join(", ");
  const patterns =
    Array.isArray(patternsToInclude) && patternsToInclude.length > 0
      ? patternsToInclude.map((id) => PATTERN_LABELS[id] || id).join(", ")
      : "statement, match, assertion, pair, chronology, map, direct";
  const explLine = usesFullBilingualExplanations()
    ? "explanation_en + explanation_hi per option (brief)."
    : '"explanation": one short English sentence for the correct option only.';
  return `UPSC GS Paper 1 subject mock (${subjects}).${avoidLine}
Patterns (balanced): ${patterns}. Difficulty: 50% moderate, 35% hard, 15% easy.
${getPrelimsJsonRules()}
Per question: subject, questionType. Use matchColumns or assertionReason only when needed.
${explLine}
Return ONLY JSON: { "examTitle": "...", "questions": [ ... ] } or a raw array. No markdown.`;
}

function buildCompactFullMockPyoSystemPrompt(yearFrom, yearTo, excludeSnippets = []) {
  const avoidLine =
    Array.isArray(excludeSnippets) && excludeSnippets.length > 0
      ? `\nAvoid repeating:\n${excludeSnippets.slice(0, 5).map((s) => `- ${String(s).slice(0, 60)}`).join("\n")}\n`
      : "";
  const explLine = usesFullBilingualExplanations()
    ? "explanation_en/hi per option."
    : '"explanation": one short English sentence (correct option).';
  return `UPSC PYQ-style (${yearFrom}–${yearTo}) batch generator. Multi-statement heavy. Do not copy exact PYQs.${avoidLine}
${getPrelimsJsonRules()}
${explLine}
Return ONLY JSON with "test_name" and "questions" array.`;
}

/**
 * Build system prompt for FULL-LENGTH UPSC Prelims GS Paper 1 MIX.
 * Uses structured output: tableData, matchColumns, assertionReason, questionType, difficulty mix 50% Moderate / 35% Hard / 15% Easy.
 * @param {string} [difficulty]
 * @param {string[]} [excludeSnippets]
 * @param {string[]} [patternsToInclude] - If non-empty, use ONLY these patterns in balanced proportion.
 */
function buildFullMockMixSystemPrompt(difficulty = "moderate", excludeSnippets = [], patternsToInclude = []) {
  const avoidLine =
    Array.isArray(excludeSnippets) && excludeSnippets.length > 0
      ? `\nAVOID repeating or closely mimicking these previous question snippets (do not duplicate themes/wording):\n${excludeSnippets.map((s) => `- ${s}`).join("\n")}\n`
      : "";
  const difficultyMix =
    difficulty === "moderate"
      ? "50% Moderate, 35% Hard, 15% Easy"
      : difficulty === "hard"
        ? "80% Hard, 20% Moderate"
        : "50% Easy, 50% Moderate";

  const questionTypeSection =
    Array.isArray(patternsToInclude) && patternsToInclude.length > 0
      ? `Question types to use (ONLY these, in balanced proportion): ${patternsToInclude.map((id) => PATTERN_LABELS[id] || id).join(" | ")}. Map to questionType as: statement_based/statement_not_correct/multi_statement_elimination/odd_one_out → "statement" where appropriate; pair_matching → "match" or "pair"; assertion_reason → "assertion"; direct_conceptual → "direct"; chronology/sequence_arrangement → "chronology"; map_location → "map".`
      : "Question Type Distribution (same for 100 and 50): 60% Statement Based | 12% Match the Following | 6% Assertion–Reason | 8% Pair Matching | 4% Chronology | 5% Map Conceptual | 5% Direct (concept-linked only)";

  return `You are an expert UPSC Prelims GS Paper 1 question setter and structured exam formatter.

Generate a full-length UPSC Prelims mock test strictly following the 2015–2024 trend.

VERY IMPORTANT:
Output MUST be structured JSON array.
Each question must be UI-renderable.
Support table-based and column-based formatting.
${avoidLine}
---------------------------------------------------
EXAM CONFIGURATION
---------------------------------------------------
Total Questions: as requested per batch. For 100-question full-length: 20 per batch × 5. For 50-question sectional: 25 per batch × 2. Same format and same question types for both; only count changes.

Subject Distribution (scale proportionally for 50Q sectional):
Full 100: Polity 14 | History 14 | Geography 11 | Economy 14 | Environment 16 | Science & Tech 10 | Art & Culture 6 | Current Affairs integrated.
Sectional 50: roughly half each (e.g. Polity 7, History 7, Geography 6, Economy 7, Environment 8, Science & Tech 5, Art & Culture 3, rest Current Affairs).

${questionTypeSection}

Difficulty: ${difficultyMix}

---------------------------------------------------
STRUCTURED OUTPUT FORMAT (MANDATORY)
---------------------------------------------------
Return output in this exact structure:

{
  "examTitle": "UPSC GS Paper 1 Full Mock",
  "totalQuestions": 100,
  "questions": [
    {
      "id": 1,
      "subject": "",
      "questionType": "statement | match | assertion | chronology | pair | map | direct",
      "difficulty": "easy | moderate | hard",
      "questionText": "",
      "tableData": null OR { "headers": [], "rows": [[]] },
      "matchColumns": null OR { "columnA": [], "columnB": [] },
      "assertionReason": null OR { "assertion": "", "reason": "" },
      "options": [ { "key": "A", "text": "" }, { "key": "B", "text": "" }, { "key": "C", "text": "" }, { "key": "D", "text": "" } ],
      "correctAnswer": "A|B|C|D",
      "explanation": { "A": "", "B": "", "C": "", "D": "" },
      "eliminationLogic": "",
      "conceptualSource": ""
    }
  ]
}

---------------------------------------------------
FORMAT RULES
---------------------------------------------------
1. If questionType = "match": Fill matchColumns with two arrays. UI will render side-by-side.
2. If questionType = "statement": Write statements numbered 1, 2, 3. Options: A. 1 only | B. 2 only | C. 1 and 2 only | D. 1, 2 and 3
3. If questionType = "assertion": Use assertionReason object. Options: A. Both A and R true and R correct explanation | B. Both true but R not explanation | C. A true, R false | D. A false, R true
4. If questionType = "chronology": Provide events list in question. Options must show correct order.
5. If questionType = "pair": Provide list of pairs. Use elimination logic.
6. If questionType = "map": Concept-based location logic. Avoid actual image.
7. If table needed: Fill tableData with headers and rows.

---------------------------------------------------
EXPLANATION (MANDATORY – OPTION-WISE, same as CSAT)
---------------------------------------------------
- For EVERY question, explanation MUST be an object: { "A": "...", "B": "...", "C": "...", "D": "..." }.
- For the CORRECT option: write "correct statement" — WHY it is correct (reason, facts, chronology, concept). User should see sahi hai toh kyu.
- For EACH INCORRECT option: write "wrong statement" — WHY it is wrong (wrong order, wrong fact, trap, common mistake). User should see galat hai toh kyu.
- At least 2-3 sentences per option. No empty explanation for any option.
- At least 120 words total per question explanation (across all four options combined).

---------------------------------------------------
QUALITY CONTROL
---------------------------------------------------
- Avoid repetition. Use elimination traps. Integrate current + static. Deep conceptual reasoning.
- Mention eliminationLogic (how to eliminate wrong options). Mention conceptualSource (e.g. NCERT, Laxmikanth, Spectrum).

OUTPUT MUST BE CLEAN JSON. NO EXTRA TEXT. NO MARKDOWN. NO COMMENTS. ONLY JSON.
Generate exactly the number of questions requested in this batch.`;
}

/**
 * Build system prompt for PYQ-style mock (Previous Year Question reconstruction, 2010–2025).
 * Recreate questions based on trends/themes; do not copy exact PYQs. Same JSON structure.
 */
function buildFullMockPyoSystemPrompt(yearFrom, yearTo) {
  const range = `${yearFrom}–${yearTo}`;
  return `You are a UPSC Previous Year Question Reconstruction Engine.

Generate a practice paper inspired by UPSC Prelims from ${range}.

DO NOT copy exact previous year questions.
Recreate questions based on trends, themes, and conceptual patterns.

STRICT STRUCTURE:

• Total Questions: 100 (this batch: generate exactly the number requested)
• Total Marks: 200
• Negative Marking: 0.66
• Difficulty: Same as actual PYQs
• Include multi-statement heavy pattern (2018–2023 style)

Subjects mixed like real UPSC (Polity, History, Geography, Economy, Environment, Science & Tech, Current Affairs).

Return ONLY valid JSON in this format. No commentary outside JSON.

{
  "test_name": "UPSC PYQ Style Mock ${range}",
  "type": "PYQ Reconstruction",
  "total_questions": 100,
  "total_marks": 200,
  "negative_marking": 0.66,
  "duration_minutes": 120,
  "questions": [
    {
      "question_number": 1,
      "subject": "",
      "type": "statement | assertion | match | pair | direct",
      "question": "",
      "options": {
        "A": "",
        "B": "",
        "C": "",
        "D": ""
      },
      "correct_answer": "A|B|C|D",
      "explanation": { "A": "", "B": "", "C": "", "D": "" }
    }
  ]
}

EXPLANATION (option-wise, mandatory – same as CSAT):
- explanation MUST be an object: { "A": "...", "B": "...", "C": "...", "D": "..." }.
- For the CORRECT option: write "correct statement" — WHY it is correct (sahi hai toh kyu — reason, facts, concept).
- For EACH INCORRECT option: write "wrong statement" — WHY it is wrong (galat hai toh kyu — wrong fact, trap, common mistake).
- At least 1-2 sentences per option. No empty explanation for any option.

Generate exactly the number of questions requested in this batch (20 per batch).
Do not write anything outside JSON.`;
}

/**
 * Build system prompt for FULL-LENGTH UPSC CSAT Paper 2 (80 questions).
 * Sections: RC 25-30, Logical Reasoning 15-20, Analytical 10-15, Numeracy 10-15, DI 5-10.
 */
function buildFullMockCsatSystemPrompt() {
  return `You are an expert UPSC Civil Services CSAT Paper 2 examiner and question setter.

Generate a FULL-LENGTH UPSC CSAT Paper 2 exactly like the real UPSC exam.

Follow STRICT UPSC structure:

----------------------------------------
EXAM STRUCTURE
----------------------------------------
• Total Questions: 80
• Total Marks: 200
• Each Question: 2.5 Marks
• Negative Marking: 0.83 (1/3rd)
• Duration: 120 Minutes
• Difficulty: Moderate to Tough (UPSC standard)
• Maintain elimination-based logic

----------------------------------------
SECTION DISTRIBUTION (REALISTIC MIX)
----------------------------------------
1. Reading Comprehension – 25 to 30 Questions
2. Logical Reasoning – 15 to 20 Questions
3. Analytical Ability – 10 to 15 Questions
4. Basic Numeracy (Class X Level) – 10 to 15 Questions
5. Data Interpretation – 5 to 10 Questions

----------------------------------------
IMPORTANT RULES
----------------------------------------
• Include 4 options (A, B, C, D) for every question
• Include correct_answer
• Include short but clear explanation
• Maintain UPSC-style language
• Avoid very easy or coaching-type questions
• Ensure mathematical questions have correct logic
• Ensure reading comprehension includes passage-based MCQs
• Do NOT repeat similar question patterns

----------------------------------------
OUTPUT FORMAT (STRICT JSON ONLY)
----------------------------------------

Return ONLY valid JSON. For real exam-style rendering:
- Reading Comprehension: put passage in question text, then the question.
- Data Interpretation: when a table is needed, use "tableData": { "headers": ["Col1","Col2",...], "rows": [["r1c1","r1c2"],...] } so the UI can render a table.
- Other sections: standard question + options.

{
  "test_name": "UPSC CSAT Full Mock",
  "type": "CSAT Paper 2",
  "total_questions": 80,
  "total_marks": 200,
  "negative_marking": 0.83,
  "duration_minutes": 120,
  "questions": [
    {
      "question_number": 1,
      "section": "Reading Comprehension | Logical Reasoning | Analytical Ability | Basic Numeracy | Data Interpretation",
      "question": "Full question text (or passage + question for RC)",
      "tableData": null OR { "headers": [], "rows": [[]] },
      "options": { "A": "", "B": "", "C": "", "D": "" },
      "correct_answer": "A",
      "explanation": { "A": "", "B": "", "C": "", "D": "" }
    }
  ]
}

----------------------------------------
EXPLANATION (OPTION-WISE, MANDATORY)
----------------------------------------
• explanation MUST be an object: { "A": "...", "B": "...", "C": "...", "D": "..." }.
• For the CORRECT option: write "correct statement" — WHY it is correct (sahi hai toh kyu — reason, logic, fact).
• For EACH INCORRECT option: write "wrong statement" — WHY it is wrong (galat hai toh kyu — wrong step, trap, common mistake).
• At least 1-2 sentences per option. No empty explanation for any option.

----------------------------------------
CRITICAL INSTRUCTIONS
----------------------------------------
• Generate exactly the number of questions requested in this batch (20 per batch when splitting).
• Do NOT skip question numbers.
• Do NOT output anything outside JSON.
• Ensure JSON is valid and properly formatted.
• No markdown.
• No commentary.`;
}

/**
 * Generate one batch of CSAT Paper 2 questions (20 per batch).
 */
async function generateFullMockCsatBatch(apiKey, model, batchSize, batchLabel, excludeSnippets = []) {
  const systemPrompt = usesCompactFullMockPrompts()
    ? buildCompactFullMockCsatSystemPrompt(excludeSnippets)
    : buildFullMockCsatSystemPrompt();
  const userPrompt = `Generate EXACTLY ${batchSize} UPSC CSAT Paper 2 questions (${batchLabel}). Mix RC, LR, numeracy, DI. ${bilingualBatchJsonNote()} JSON only.`;

  const maxTokens = getMaxTokensForTestGeneration(batchSize);
  const { aiContent, finishReason } = await callOpenRouterTestGeneration({
    apiKey,
    model,
    systemPrompt,
    userPrompt,
    maxTokens,
    apiTitle: "UPSC Mentor - CSAT Mock",
  });

  if (finishReason === "length") {
    console.warn(`⚠️ Full mock CSAT batch truncated (max_tokens=${maxTokens}, need=${batchSize})`);
  }

  try {
    const { validatedQuestions, testName } = parseFullMockResponse(aiContent);
    if (validatedQuestions.length > 0) {
      return { questions: validatedQuestions, testName, finishReason };
    }
    console.warn(`Full mock CSAT: parseFullMockResponse returned 0 valid questions (finish=${finishReason}); trying compact array parser`);
  } catch (parseErr) {
    console.warn("Full mock CSAT: parseFullMockResponse failed:", parseErr.message);
  }

  const validated = parseAndValidateQuestions(aiContent, batchSize);
  if (validated.length > 0) {
    return { questions: validated, testName: "UPSC CSAT Full Mock", finishReason };
  }

  console.error("Full mock CSAT batch: no valid questions. Raw (first 600 chars):", aiContent.slice(0, 600));
  return { questions: [], testName: "UPSC CSAT Full Mock", finishReason };
}

const CSAT_DISPLAY_COUNT = 80;

/**
 * Generate full-length (80 questions) CSAT Paper 2 mock with refill/top-up (same pattern as GS Mix).
 * @returns {Promise<Object>} - { success, questions?, count?, testName?, error? }
 */
export const generateFullMockCsatTestQuestions = async () => {
  const displayCount = CSAT_DISPLAY_COUNT;

  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = getTestGenerationModel();

    if (!apiKey) {
      throw new Error("Missing OPENROUTER_API_KEY in environment variables");
    }

    const { deduped, finalQuestions, testName } = await runFullMockPaperGenerationLoop({
      apiKey,
      model,
      displayCount,
      csatPaper: true,
      logPrefix: "Full mock CSAT",
      generateBatch: (key, m, size, label, exclude) =>
        generateFullMockCsatBatch(key, m, size, label, exclude),
    });

    if (finalQuestions.length === 0) {
      throw new Error("No valid CSAT questions generated. Please try again.");
    }

    if (finalQuestions.length < displayCount) {
      throw new Error(
        `Full mock CSAT: only ${finalQuestions.length} unique questions (need ${displayCount}). Try Go Live again.`
      );
    }

    console.log(`✅ Full mock CSAT: ${deduped.length} unique generated, showing ${finalQuestions.length} questions`);

    const translatedQuestions = finalizeGeneratedQuestions(finalQuestions);

    return {
      success: true,
      questions: translatedQuestions,
      count: translatedQuestions.length,
      testName: testName || "Prelims Mock - CSAT Paper 2",
    };
  } catch (error) {
    console.error("Error generating full mock CSAT questions:", error);
    return {
      success: false,
      error: error.message || "Failed to generate CSAT mock questions",
      questions: [],
    };
  }
};

/**
 * Generate one batch of PYQ-style questions (20 per batch).
 */
async function generateFullMockPyoBatch(apiKey, model, batchSize, batchLabel, yearFrom, yearTo, excludeSnippets = []) {
  const systemPrompt = usesCompactFullMockPrompts()
    ? buildCompactFullMockPyoSystemPrompt(yearFrom, yearTo, excludeSnippets)
    : buildFullMockPyoSystemPrompt(yearFrom, yearTo);
  const userPrompt = `Generate EXACTLY ${batchSize} PYQ-style questions (${yearFrom}–${yearTo}, ${batchLabel}). ${bilingualBatchJsonNote()} JSON only.`;

  const maxTokens = getMaxTokensForTestGeneration(batchSize);
  const { aiContent, finishReason } = await callOpenRouterTestGeneration({
    apiKey,
    model,
    systemPrompt,
    userPrompt,
    maxTokens,
    apiTitle: "UPSC Mentor - PYQ Mock",
  });

  if (finishReason === "length") {
    console.warn(`⚠️ Full mock PYQ batch truncated (max_tokens=${maxTokens}, need=${batchSize})`);
  }

  const defaultName = `UPSC PYQ Style Mock ${yearFrom}–${yearTo}`;
  try {
    const { validatedQuestions, testName } = parseFullMockResponse(aiContent);
    if (validatedQuestions.length > 0) {
      return { questions: validatedQuestions, testName: testName || defaultName, finishReason };
    }
    console.warn(`Full mock PYQ: parseFullMockResponse returned 0 (finish=${finishReason}); trying compact parser`);
  } catch (parseErr) {
    console.warn("Full mock PYQ: parseFullMockResponse failed:", parseErr.message);
  }

  const validated = parseAndValidateQuestions(aiContent, batchSize);
  if (validated.length > 0) {
    return { questions: validated, testName: defaultName, finishReason };
  }

  console.error("Full mock PYQ batch: no valid questions. Raw (first 600 chars):", aiContent.slice(0, 600));
  return { questions: [], testName: defaultName, finishReason };
}

const PYQ_DISPLAY_COUNT = 100;

/**
 * Generate full-length (100 questions) PYQ-style mock: generate 120 (6 batches of 20), show 100. Gemini 2.0.
 * @param {Object} params
 * @param {number} params.yearFrom - e.g. 2010
 * @param {number} params.yearTo - e.g. 2025
 */
export const generateFullMockPyoTestQuestions = async ({ yearFrom, yearTo }) => {
  const displayCount = PYQ_DISPLAY_COUNT;

  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = getTestGenerationModel();

    if (!apiKey) {
      throw new Error("Missing OPENROUTER_API_KEY in environment variables");
    }

    const { deduped, finalQuestions, testName } = await runFullMockPaperGenerationLoop({
      apiKey,
      model,
      displayCount,
      csatPaper: false,
      logPrefix: "Full mock PYQ",
      generateBatch: (key, m, size, label, exclude) =>
        generateFullMockPyoBatch(key, m, size, label, yearFrom, yearTo, exclude),
    });

    if (finalQuestions.length === 0) {
      throw new Error("No valid UPSC questions generated for PYQ mock. Please try again.");
    }

    if (finalQuestions.length < displayCount) {
      throw new Error(
        `Full mock PYQ: only ${finalQuestions.length} unique questions (need ${displayCount}). Try Go Live again.`
      );
    }

    console.log(`✅ Full mock PYQ: ${deduped.length} unique generated, showing ${finalQuestions.length} questions`);

    const translatedQuestions = finalizeGeneratedQuestions(finalQuestions);

    return {
      success: true,
      questions: translatedQuestions,
      count: translatedQuestions.length,
      testName: testName || `Prelims Mock - PYQ ${yearFrom}-${yearTo}`,
    };
  } catch (error) {
    console.error("Error generating full mock PYQ questions:", error);
    return {
      success: false,
      error: error.message || "Failed to generate PYQ mock questions",
      questions: [],
    };
  }
};

/**
 * Generate one batch of mixed full-mock questions (20 per batch for 100Q, or 25 per batch for 50-question sectional).
 * @param {string[]} [patternsToInclude] - If provided, use only these question patterns in balanced proportion.
 */
async function generateFullMockMixBatch(apiKey, model, batchSize, batchLabel, difficulty = "moderate", excludeSnippets = [], totalQuestions = 100, patternsToInclude = []) {
  const systemPrompt = usesCompactFullMockPrompts()
    ? buildCompactFullMockMixSystemPrompt(difficulty, excludeSnippets, patternsToInclude)
    : buildFullMockMixSystemPrompt(difficulty, excludeSnippets, patternsToInclude);

  const jsonNote = usesFullBilingualExplanations()
    ? "Bilingual Q/options/explanations."
    : "Bilingual Q/options (EN+HI). English explanation only.";
  const userPrompt = `Generate EXACTLY ${batchSize} UPSC GS Paper 1 questions (${batchLabel}, ${totalQuestions}Q mock). ${jsonNote} JSON only.`;

  const maxTokens = getMaxTokensForTestGeneration(batchSize);
  const { aiContent, finishReason } = await callOpenRouterTestGeneration({
    apiKey,
    model,
    systemPrompt,
    userPrompt,
    maxTokens,
    apiTitle: "UPSC Mentor - Full Mock Mix",
  });

  if (finishReason === "length") {
    console.warn(`⚠️ Full mock MIX batch truncated (max_tokens=${maxTokens}, need=${batchSize})`);
  }

  try {
    const { validatedQuestions, testName } = parseFullMockResponse(aiContent);
    if (validatedQuestions.length > 0) {
      return { questions: validatedQuestions, testName, finishReason };
    }
    console.warn(
      `Full mock MIX: parseFullMockResponse returned 0 valid questions (finish=${finishReason}); trying compact array parser`
    );
  } catch (parseErr) {
    console.warn("Full mock MIX: parseFullMockResponse failed:", parseErr.message);
  }

  const validated = parseAndValidateQuestions(aiContent, batchSize);
  if (validated.length > 0) {
    return { questions: validated, testName: "UPSC Real Prelims Mock", finishReason };
  }

  console.error("Full mock MIX batch: no valid questions. Raw (first 600 chars):", aiContent.slice(0, 600));
  return { questions: [], testName: "UPSC Real Prelims Mock", finishReason };
}

const MIX_DISPLAY_100 = 100;
const MIX_DISPLAY_50 = 50;
/** Max extra API batches if dedupe leaves us short of display count. */
function getMixMaxRefillBatches() {
  return Math.max(5, Math.min(25, parseInt(process.env.MIX_MAX_REFILL_BATCHES, 10) || 15));
}

/**
 * Generate full-length or sectional UPSC Prelims GS Paper 1 MIX mock (100 or 50 questions).
 * Generates more than display count to avoid duplicate questions in the same paper; returns only display count.
 * @param {Object} [opts]
 * @param {number} [opts.totalQuestions=100] - 100 full-length or 50 sectional (display count)
 * @param {string} [opts.difficulty=moderate] - easy | moderate | hard (moderate = 60% moderate + 40% hard)
 * @param {boolean} [opts.avoidPreviouslyUsed=false] - if true, pass hint to avoid repeating themes (prompt-level)
 */
export const generateFullMockMixTestQuestions = async (opts = {}) => {
  const displayCount = Math.min(100, Math.max(50, parseInt(opts.totalQuestions, 10) || 100));
  const isSectional = displayCount === 50;
  const generateCount = displayCount + getMixGenerateBuffer();
  const difficulty = ["easy", "moderate", "hard"].includes(String(opts.difficulty || "").toLowerCase())
    ? String(opts.difficulty).toLowerCase()
    : "moderate";
  const excludeSnippets = Array.isArray(opts.excludeSnippets) ? opts.excludeSnippets : [];
  const patternsToInclude = Array.isArray(opts.patternsToInclude) && opts.patternsToInclude.length > 0 ? opts.patternsToInclude : [];

  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = getTestGenerationModel();

    if (!apiKey) {
      throw new Error("Missing OPENROUTER_API_KEY in environment variables");
    }

    const perBatch = getMixBatchSize();
    const batches = Math.ceil(generateCount / perBatch);
    const all = [];
    let testName = isSectional ? "UPSC GS Sectional Mock (50 Q)" : "UPSC Real Prelims Mock";

    for (let b = 1; b <= batches; b++) {
      const fromAll = dedupeQuestionsByStem(dedupeQuestions(all))
        .map((q) => String(q.question_en || q.question || q.questionText || "").trim().slice(0, 60))
        .filter(Boolean);
      const rollingExclude = [...new Set([...excludeSnippets, ...fromAll])].slice(0, 5);
      console.log(
        `📝 Full mock MIX: batch ${b}/${batches} (${perBatch} Q, max_tokens≈${getMaxTokensForTestGeneration(perBatch)}, difficulty=${difficulty})...`
      );
      const { questions: batchQuestions, testName: batchTestName } = await generateFullMockMixBatch(
        apiKey,
        model,
        perBatch,
        `Part ${b}`,
        difficulty,
        rollingExclude,
        displayCount,
        patternsToInclude
      );
      if (batchTestName) testName = batchTestName;
      if (batchQuestions && batchQuestions.length) all.push(...batchQuestions);
    }

    let deduped = dedupeQuestionsByStem(dedupeQuestions(all));
    const maxRefills = getMixMaxRefillBatches();
    let refill = 0;
    let stallRounds = 0;

    while (deduped.length < displayCount && refill < maxRefills) {
      const beforeCount = deduped.length;
      const need = Math.max(1, Math.min(perBatch, displayCount - deduped.length));
      const fromDeduped = deduped
        .map((q) => String(q.question_en || q.question || q.questionText || "").trim().slice(0, 60))
        .filter(Boolean);
      const snippetPool = [...new Set([...excludeSnippets, ...fromDeduped])].slice(0, 5);
      console.log(
        `📝 Full mock MIX: refill ${refill + 1}/${maxRefills} (unique ${deduped.length}/${displayCount}, requesting ${need})...`
      );
      const { questions: batchQuestions, testName: batchTestName } = await generateFullMockMixBatch(
        apiKey,
        model,
        need,
        `Refill ${refill + 1}`,
        difficulty,
        snippetPool,
        displayCount,
        patternsToInclude
      );
      if (batchTestName) testName = batchTestName;
      if (batchQuestions && batchQuestions.length) all.push(...batchQuestions);
      deduped = dedupeQuestionsByStem(dedupeQuestions(all));
      refill += 1;
      if (deduped.length === beforeCount) stallRounds += 1;
      else stallRounds = 0;
      if (stallRounds >= 4) {
        console.warn(`📝 Full mock MIX: stopping refill after ${stallRounds} rounds with no new unique questions`);
        break;
      }
    }

    let finalQuestions = deduped.slice(0, displayCount);

    if (finalQuestions.length === 0) {
      throw new Error("No valid UPSC questions generated for full mock mix. Please try again.");
    }

    if (finalQuestions.length < displayCount) {
      const gap = displayCount - finalQuestions.length;
      console.log(`📝 Full mock MIX: short by ${gap}, running up to ${gap + 2} micro top-up batches...`);
      for (let t = 0; t < gap + 2 && finalQuestions.length < displayCount; t += 1) {
        const need = displayCount - finalQuestions.length;
        const snippets = finalQuestions
          .map((q) => String(q.question_en || q.question || "").trim().slice(0, 60))
          .filter(Boolean)
          .slice(0, 8);
        const { questions: extra } = await generateFullMockMixBatch(
          apiKey,
          model,
          need,
          `Top-up ${t + 1}`,
          difficulty,
          snippets,
          displayCount,
          patternsToInclude
        );
        if (extra && extra.length) {
          all.push(...extra);
          deduped = dedupeQuestionsByStem(dedupeQuestions(all));
          finalQuestions = deduped.slice(0, displayCount);
        }
      }
    }

    if (finalQuestions.length < displayCount) {
      throw new Error(
        `Full mock MIX: only ${finalQuestions.length} unique questions after ${batches + refill} batches (need ${displayCount}). Try Go Live again.`
      );
    }

    console.log(`✅ Full mock MIX: ${deduped.length} unique generated, showing ${finalQuestions.length} questions (no duplicates in paper)`);

    const translatedQuestions = finalizeGeneratedQuestions(finalQuestions);

    return {
      success: true,
      questions: translatedQuestions,
      count: translatedQuestions.length,
      testName: testName || (isSectional ? "Prelims Mock - Sectional 50" : "Prelims Mock - Full Length GS Mix"),
    };
  } catch (error) {
    console.error("Error generating full mock MIX questions:", error);
    return {
      success: false,
      error: error.message || "Failed to generate full mock mix questions",
      questions: [],
    };
  }
};

/**
 * Normalize explanation: object { A,B,C,D } or string (legacy).
 */
function normalizeExplanation(raw) {
  if (typeof raw === "object" && raw !== null && (raw.A != null || raw.B != null || raw.C != null || raw.D != null)) {
    return {
      A: String(raw.A ?? "").trim() || "—",
      B: String(raw.B ?? "").trim() || "—",
      C: String(raw.C ?? "").trim() || "—",
      D: String(raw.D ?? "").trim() || "—",
    };
  }
  const str = String(raw ?? "").trim() || "No explanation provided.";
  return { A: str, B: str, C: str, D: str };
}

/**
 * Normalize options from options_en, options (object/array), or [{ key, text }].
 */
function normalizeOptions(q) {
  const optionsObj = { A: "", B: "", C: "", D: "" };

  const fillFromObject = (obj) => {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
    optionsObj.A = String(obj.A ?? obj.a ?? "").trim();
    optionsObj.B = String(obj.B ?? obj.b ?? "").trim();
    optionsObj.C = String(obj.C ?? obj.c ?? "").trim();
    optionsObj.D = String(obj.D ?? obj.d ?? "").trim();
    return Boolean(optionsObj.A && optionsObj.B && optionsObj.C && optionsObj.D);
  };

  const fillFromStringArray = (arr) => {
    if (!Array.isArray(arr) || arr.length < 4 || typeof arr[0] !== "string") return false;
    optionsObj.A = String(arr[0] ?? "").trim();
    optionsObj.B = String(arr[1] ?? "").trim();
    optionsObj.C = String(arr[2] ?? "").trim();
    optionsObj.D = String(arr[3] ?? "").trim();
    return Boolean(optionsObj.A && optionsObj.B && optionsObj.C && optionsObj.D);
  };

  if (fillFromObject(q.options_en)) return optionsObj;
  if (fillFromObject(q.options)) return optionsObj;
  if (fillFromStringArray(q.options_en)) return optionsObj;
  if (fillFromStringArray(q.options)) return optionsObj;

  if (Array.isArray(q.options) && q.options.length >= 4) {
    q.options.forEach((opt) => {
      if (typeof opt === "string") return;
      const key = (opt.key || opt.Key || "").toUpperCase().charAt(0);
      if (["A", "B", "C", "D"].includes(key)) {
        optionsObj[key] = String(opt.text ?? opt.value ?? "").trim();
      }
    });
  }

  return optionsObj;
}

/**
 * Normalize raw question items to app schema.
 * Supports new structured format (questionText, tableData, matchColumns, assertionReason, options array) and legacy format.
 */
function normalizeFullMockQuestions(questions) {
  if (!Array.isArray(questions)) return [];
  return questions
    .map((q) => {
      const questionEn = String(q.question_en ?? q.questionText ?? q.question ?? "").trim();
      const questionHi = String(q.question_hi ?? "").trim();
      const optionsObj = normalizeOptions(q);
      const optionsHi = { A: "", B: "", C: "", D: "" };
      const sourceHi = q.options_hi;
      if (sourceHi && typeof sourceHi === "object" && !Array.isArray(sourceHi)) {
        optionsHi.A = String(sourceHi.A ?? sourceHi.a ?? "").trim();
        optionsHi.B = String(sourceHi.B ?? sourceHi.b ?? "").trim();
        optionsHi.C = String(sourceHi.C ?? sourceHi.c ?? "").trim();
        optionsHi.D = String(sourceHi.D ?? sourceHi.d ?? "").trim();
      } else if (Array.isArray(sourceHi) && sourceHi.length >= 4) {
        optionsHi.A = String(sourceHi[0] ?? "").trim();
        optionsHi.B = String(sourceHi[1] ?? "").trim();
        optionsHi.C = String(sourceHi[2] ?? "").trim();
        optionsHi.D = String(sourceHi[3] ?? "").trim();
      }
      if (!optionsObj.A && optionsHi.A) {
        optionsObj.A = optionsHi.A;
        optionsObj.B = optionsHi.B;
        optionsObj.C = optionsHi.C;
        optionsObj.D = optionsHi.D;
      }
      const correct = (q.correct_answer || q.correctAnswer || q.answer || "").toUpperCase().charAt(0);
      const difficulty = ["easy", "moderate", "hard"].includes(String(q.difficulty || "").toLowerCase())
        ? String(q.difficulty).toLowerCase()
        : "moderate";
      const questionType = q.questionType || q.type || "direct";
      const correctKey = ["A", "B", "C", "D"].includes(correct) ? correct : null;
      const explanationEn = normalizePrelimsExplanation(
        q.explanation_en ?? q.explanation,
        correctKey
      );
      const base = ensureEnglishBilingualFields({
        subject: q.subject != null && String(q.subject).trim() ? String(q.subject).trim() : undefined,
        difficulty,
        question: questionEn,
        question_en: questionEn,
        question_hi: questionHi,
        options: optionsObj,
        options_en: optionsObj,
        options_hi: optionsHi,
        correctAnswer: correctKey,
        explanation: explanationEn,
        explanation_en: explanationEn,
        ...(usesFullBilingualExplanations() && q.explanation_hi
          ? { explanation_hi: normalizeExplanation(q.explanation_hi) }
          : {}),
        patternType: questionType,
        questionType,
      });
      if (q.tableData && typeof q.tableData === "object" && (q.tableData.headers?.length || q.tableData.rows?.length)) {
        base.tableData = { headers: q.tableData.headers || [], rows: q.tableData.rows || [] };
      }
      if (q.matchColumns && typeof q.matchColumns === "object" && (q.matchColumns.columnA?.length || q.matchColumns.columnB?.length)) {
        base.matchColumns = { columnA: q.matchColumns.columnA || [], columnB: q.matchColumns.columnB || [] };
      }
      if (q.assertionReason && typeof q.assertionReason === "object" && (q.assertionReason.assertion || q.assertionReason.reason)) {
        base.assertionReason = {
          assertion: String(q.assertionReason.assertion ?? "").trim(),
          reason: String(q.assertionReason.reason ?? "").trim(),
        };
      }
      if (!usesCompactFullMockPrompts()) {
        if (q.eliminationLogic != null && String(q.eliminationLogic).trim()) {
          base.eliminationLogic = String(q.eliminationLogic).trim();
        }
        if (q.conceptualSource != null && String(q.conceptualSource).trim()) {
          base.conceptualSource = String(q.conceptualSource).trim();
        }
      }
      base.questionId = hashQuestion(canonicalDedupeKey(base));
      return base;
    })
    .filter(
      (q) =>
        q.question &&
        q.options.A &&
        q.options.B &&
        q.options.C &&
        q.options.D &&
        q.correctAnswer
    );
}

/**
 * Parse full-mock AI response. Accepts:
 * - Full object { test_name, questions: [...] }
 * - Raw array of question objects
 * - JSON wrapped in markdown code blocks (single or with leading text)
 * - Uses extractJsonFromContent when direct parse fails
 */
function parseFullMockResponse(aiContent) {
  let content = aiContent.trim();
  // Strip markdown code blocks (allow leading text before ```)
  const codeBlockStart = content.indexOf("```");
  if (codeBlockStart >= 0) {
    const afterStart = content.slice(codeBlockStart).replace(/^```\s*(?:json)?\s*/i, "").trim();
    const endBlock = afterStart.indexOf("```");
    content = (endBlock >= 0 ? afterStart.slice(0, endBlock) : afterStart).trim();
  }
  const jsonStart = content.indexOf("{");
  const arrayStart = content.indexOf("[");
  let data = null;
  let testName = "Prelims Mock - Full Length";

  // Try parse full content
  try {
    data = JSON.parse(content);
  } catch (_) {}

  if (data !== null) {
    if (Array.isArray(data)) {
      return { validatedQuestions: normalizeFullMockQuestions(data), testName };
    }
    if (data && typeof data.questions !== "undefined") {
      testName = data.test_name || data.title || data.examTitle || testName;
      return { validatedQuestions: normalizeFullMockQuestions(data.questions), testName };
    }
  }

  // Try extractJsonFromContent (finds first { or [ and matching bracket)
  data = extractJsonFromContent(content);
  if (data !== null) {
    if (Array.isArray(data)) {
      return { validatedQuestions: normalizeFullMockQuestions(data), testName };
    }
    if (data && typeof data.questions !== "undefined") {
      testName = data.test_name || data.title || data.examTitle || testName;
      return { validatedQuestions: normalizeFullMockQuestions(data.questions), testName };
    }
  }

  // Truncated array: content is just "[ { ... }, { ... }"
  if (content.charAt(0) === "[") {
    const extracted = extractCompleteObjectsFromTruncatedArray(content);
    if (extracted && extracted.length > 0) {
      return { validatedQuestions: normalizeFullMockQuestions(extracted), testName };
    }
  }

  // Truncated object: content is "{ "test_name": ..., "questions": [ { ... }, ..." (cut off before ] })
  const questionsLabel = '"questions"';
  const qIdx = content.indexOf(questionsLabel);
  if (qIdx >= 0) {
    const arrayStart = content.indexOf("[", qIdx);
    if (arrayStart >= 0) {
      const arrayPart = content.slice(arrayStart);
      const extracted = extractCompleteObjectsFromTruncatedArray(arrayPart);
      if (extracted && extracted.length > 0) {
        const nameMatch = content.match(/"test_name"\s*:\s*"([^"]*)"/);
        if (nameMatch) testName = nameMatch[1];
        return { validatedQuestions: normalizeFullMockQuestions(extracted), testName };
      }
    }
  }

  throw new Error("AI response did not contain a valid full-mock JSON object or questions array");
}

/**
 * One batch for subject-based Prelims mock (same bilingual + parse path as GS Mix).
 */
async function generateFullMockSubjectBatch(
  apiKey,
  model,
  subject,
  batchLabel,
  batchSize,
  excludeSnippets = [],
  patternsToInclude = []
) {
  const subjectsList = typeof subject === "string" ? subject.split(",").map((s) => s.trim()) : [subject];
  const systemPrompt = usesCompactFullMockPrompts()
    ? buildCompactFullMockSubjectSystemPrompt(subjectsList, excludeSnippets, patternsToInclude)
    : buildGSSystemPrompt(subjectsList, `Full Mock - ${batchLabel}`, "Moderate", null, patternsToInclude);
  const userPrompt = `Generate EXACTLY ${batchSize} UPSC GS questions (${batchLabel}, subjects: ${subjectsList.join(", ")}). ${bilingualBatchJsonNote()} JSON only.`;

  const maxTokens = getMaxTokensForTestGeneration(batchSize);
  const { aiContent, finishReason } = await callOpenRouterTestGeneration({
    apiKey,
    model,
    systemPrompt,
    userPrompt,
    maxTokens,
    apiTitle: "UPSC Mentor - Full Mock Subject",
  });

  if (finishReason === "length") {
    console.warn(`⚠️ Full mock Subject batch truncated (max_tokens=${maxTokens}, need=${batchSize})`);
  }

  const defaultName = `Prelims Mock - ${subjectsList.join(", ")}`;
  try {
    const { validatedQuestions, testName } = parseFullMockResponse(aiContent);
    if (validatedQuestions.length > 0) {
      return { questions: validatedQuestions, testName: testName || defaultName, finishReason };
    }
    console.warn(`Full mock Subject: parseFullMockResponse returned 0 (finish=${finishReason}); trying compact parser`);
  } catch (parseErr) {
    console.warn("Full mock Subject: parseFullMockResponse failed:", parseErr.message);
  }

  const validated = parseAndValidateQuestions(aiContent, batchSize);
  if (validated.length > 0) {
    return { questions: validated, testName: defaultName, finishReason };
  }

  console.error("Full mock Subject batch: no valid questions. Raw (first 600 chars):", aiContent.slice(0, 600));
  return { questions: [], testName: defaultName, finishReason };
}

const SUBJECT_FULL_DISPLAY_COUNT = 100;

/**
 * Generate full-length (100 questions) UPSC Prelims GS Paper 1 mock: 6 batches of 20 (120 generated), show 100.
 * @param {Object} params
 * @param {string} params.subject - Subject from admin (e.g. "Polity", "History, Geography")
 * @returns {Promise<Object>} - { success, questions?, count?, testName?, error? }
 */
export const generateFullMockTestQuestions = async ({ subject, patternsToInclude = [] }) => {
  const displayCount = SUBJECT_FULL_DISPLAY_COUNT;
  const patterns = Array.isArray(patternsToInclude) && patternsToInclude.length > 0 ? patternsToInclude : [];

  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = getTestGenerationModel();

    if (!apiKey) {
      throw new Error("Missing OPENROUTER_API_KEY in environment variables");
    }

    const { deduped, finalQuestions, testName } = await runFullMockPaperGenerationLoop({
      apiKey,
      model,
      displayCount,
      csatPaper: false,
      logPrefix: "Full mock Subject",
      generateBatch: (key, m, size, label, exclude) =>
        generateFullMockSubjectBatch(key, m, subject, label, size, exclude, patterns),
    });

    if (finalQuestions.length === 0) {
      throw new Error("No valid UPSC questions generated for full mock. Please try again.");
    }

    if (finalQuestions.length < displayCount) {
      throw new Error(
        `Full mock Subject: only ${finalQuestions.length} unique questions (need ${displayCount}). Try Go Live again.`
      );
    }

    console.log(`✅ Full mock Subject: ${deduped.length} unique generated, showing ${finalQuestions.length} questions`);

    const translatedQuestions = finalizeGeneratedQuestions(finalQuestions);

    return {
      success: true,
      questions: translatedQuestions,
      count: translatedQuestions.length,
      testName: testName || `Prelims Mock - ${subject}`,
    };
  } catch (error) {
    console.error("Error generating full mock questions:", error);
    return {
      success: false,
      error: error.message || "Failed to generate full mock questions",
      questions: [],
    };
  }
};

/**
 * Extract a JSON array or object from content by finding first [ or { and matching bracket.
 */
function extractJsonFromContent(content) {
  const trim = content.trim();
  const arrayStart = trim.indexOf("[");
  const objectStart = trim.indexOf("{");
  const start = arrayStart >= 0 && (objectStart < 0 || arrayStart < objectStart) ? arrayStart : objectStart;
  if (start < 0) return null;
  const open = trim[start];
  const close = open === "[" ? "]" : "}";
  let depth = 0;
  for (let i = start; i < trim.length; i++) {
    const c = trim[i];
    if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(trim.slice(start, i + 1));
        } catch (_) {
          return null;
        }
      }
    }
  }
  return null;
}

/**
 * When AI response is truncated (starts with [ but no closing ]), extract every complete
 * {...} object so we can still use the questions we got. Respects strings so we don't
 * count { or } inside quoted values.
 */
function extractCompleteObjectsFromTruncatedArray(content) {
  const s = content.trim();
  if (s.charAt(0) !== "[") return null;
  const results = [];
  let i = s.indexOf("{");
  while (i >= 0 && i < s.length) {
    let depth = 0;
    let inString = false;
    let escape = false;
    let end = -1;
    for (let j = i; j < s.length; j++) {
      const c = s[j];
      if (escape) {
        escape = false;
        continue;
      }
      if (c === "\\" && inString) {
        escape = true;
        continue;
      }
      if (c === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (c === "{") depth++;
        else if (c === "}") {
          depth--;
          if (depth === 0) {
            end = j;
            break;
          }
        }
      }
    }
    if (end < 0) break;
    try {
      const obj = JSON.parse(s.slice(i, end + 1));
      results.push(obj);
    } catch (_) {}
    i = s.indexOf("{", end + 1);
  }
  return results.length > 0 ? results : null;
}

/**
 * Parse AI response and map to application question schema.
 * Tolerates markdown code blocks, leading text, and both array + object-with-questions formats.
 */
function parseAndValidateQuestions(aiContent, count) {
  let content = aiContent.trim();
  if (content.startsWith("```")) {
    content = content.replace(/^```\s*(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  }

  let questions = [];
  let parsed = null;
  try {
    parsed = JSON.parse(content);
  } catch (_) {
    parsed = extractJsonFromContent(content);
  }
  // Truncated response: starts with [ but no closing ] – extract each complete {...} object
  if (parsed === null && content.charAt(0) === "[") {
    const extracted = extractCompleteObjectsFromTruncatedArray(content);
    if (extracted && extracted.length > 0) {
      parsed = extracted;
      console.log(`parseAndValidateQuestions: used ${extracted.length} questions from truncated response`);
    }
  }

  if (parsed !== null) {
    questions = Array.isArray(parsed) ? parsed : (parsed.questions || []);
  }

  if (!Array.isArray(questions) || questions.length === 0) {
    console.warn(
      "parseAndValidateQuestions: no parseable questions (truncated or invalid JSON). Preview:",
      content.slice(0, 200)
    );
    return [];
  }

  const validatedQuestions = questions
    .map((q) => {
      const optionsObj = {};
      const optionsHi = { A: "", B: "", C: "", D: "" };
      const sourceEn = q.options_en ?? (Array.isArray(q.options) ? null : q.options);
      const sourceHi = q.options_hi;

      if (sourceEn && typeof sourceEn === "object" && !Array.isArray(sourceEn)) {
        optionsObj.A = String(sourceEn.A ?? sourceEn.a ?? "").trim();
        optionsObj.B = String(sourceEn.B ?? sourceEn.b ?? "").trim();
        optionsObj.C = String(sourceEn.C ?? sourceEn.c ?? "").trim();
        optionsObj.D = String(sourceEn.D ?? sourceEn.d ?? "").trim();
      } else if (Array.isArray(q.options) && q.options.length >= 4) {
        optionsObj.A = String(q.options[0] ?? "").trim();
        optionsObj.B = String(q.options[1] ?? "").trim();
        optionsObj.C = String(q.options[2] ?? "").trim();
        optionsObj.D = String(q.options[3] ?? "").trim();
      } else if (typeof q.options === "object" && q.options !== null) {
        optionsObj.A = String(q.options.A ?? q.options.a ?? "").trim();
        optionsObj.B = String(q.options.B ?? q.options.b ?? "").trim();
        optionsObj.C = String(q.options.C ?? q.options.c ?? "").trim();
        optionsObj.D = String(q.options.D ?? q.options.d ?? "").trim();
      }

      if (sourceHi && typeof sourceHi === "object" && !Array.isArray(sourceHi)) {
        optionsHi.A = String(sourceHi.A ?? sourceHi.a ?? "").trim();
        optionsHi.B = String(sourceHi.B ?? sourceHi.b ?? "").trim();
        optionsHi.C = String(sourceHi.C ?? sourceHi.c ?? "").trim();
        optionsHi.D = String(sourceHi.D ?? sourceHi.d ?? "").trim();
      } else if (Array.isArray(sourceHi) && sourceHi.length >= 4) {
        optionsHi.A = String(sourceHi[0] ?? "").trim();
        optionsHi.B = String(sourceHi[1] ?? "").trim();
        optionsHi.C = String(sourceHi[2] ?? "").trim();
        optionsHi.D = String(sourceHi[3] ?? "").trim();
      }

      let correct = q.answer ?? q.correctAnswer ?? q.correct_answer ?? "";
      correct = String(correct).toUpperCase().trim().charAt(0);
      if (["1", "2", "3", "4"].includes(correct)) correct = ["A", "B", "C", "D"][parseInt(correct, 10) - 1];
      if (!["A", "B", "C", "D"].includes(correct)) correct = null;
      const questionEn = String(q.question_en ?? q.question ?? q.questionText ?? "").trim();
      const questionHi = String(q.question_hi ?? "").trim();
      const difficulty = ["easy", "moderate", "hard"].includes(String(q.difficulty || "").toLowerCase())
        ? String(q.difficulty).toLowerCase()
        : "moderate";
      const explanationEn = normalizePrelimsExplanation(
        q.explanation_en ?? q.explanation,
        correct
      );
      const explanationHiRaw = usesFullBilingualExplanations() ? q.explanation_hi : null;
      const row = ensureEnglishBilingualFields({
        difficulty,
        question: questionEn,
        question_en: questionEn,
        question_hi: questionHi,
        options: optionsObj,
        options_en: optionsObj,
        options_hi: optionsHi,
        correctAnswer: correct,
        explanation: explanationEn,
        explanation_en: explanationEn,
        ...(explanationHiRaw ? { explanation_hi: normalizeExplanation(explanationHiRaw) } : {}),
        patternType: q.pattern || "GENERAL",
        subject: q.subject,
      });
      row.questionId = hashQuestion(canonicalDedupeKey(row));
      return row;
    })
    .filter(
      (q) =>
        q.question &&
        q.options.A &&
        q.options.B &&
        q.options.C &&
        q.options.D &&
        q.correctAnswer
    )
    .slice(0, parseInt(count, 10) || 999);

  return validatedQuestions;
}

/**
 * One OpenRouter chat completion for prelims MCQ JSON.
 */
async function callOpenRouterTestGeneration({
  apiKey,
  model,
  systemPrompt,
  userPrompt,
  maxTokens,
  apiTitle = "UPSC Mentor - Prelims Test Generator",
}) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": getFrontendOrigin(),
      "X-Title": apiTitle,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`OpenRouter API error: ${response.status}`, errorBody);
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const aiContent = data?.choices?.[0]?.message?.content?.trim();
  const finishReason = data?.choices?.[0]?.finish_reason;
  const usage = data?.usage;

  if (usage) {
    console.log(
      `📊 OpenRouter usage: prompt=${usage.prompt_tokens ?? "?"} completion=${usage.completion_tokens ?? "?"} total=${usage.total_tokens ?? "?"} finish=${finishReason ?? "?"} max_tokens=${maxTokens}`
    );
  }

  if (!aiContent) {
    throw new Error("No response received from AI model");
  }

  return { aiContent, finishReason, usage };
}

/**
 * Fetch one batch of MCQs; top-up within the batch if the response was truncated.
 */
async function fetchQuestionBatch({
  apiKey,
  model,
  systemPrompt,
  userPrompt,
  need,
  avoidSnippets = [],
  csatPaper = false,
}) {
  let apiCalls = 0;
  const avoidBlock =
    avoidSnippets.length > 0
      ? `\nDo not repeat or closely paraphrase these stems:\n${avoidSnippets.map((s) => `- ${s}`).join("\n")}`
      : "";

  const runOnce = async (prompt, n) => {
    const maxTokens = getMaxTokensForTestGeneration(n);
    const { aiContent, finishReason } = await callOpenRouterTestGeneration({
      apiKey,
      model,
      systemPrompt,
      userPrompt: prompt,
      maxTokens,
    });
    apiCalls += 1;
    if (finishReason === "length") {
      console.warn(`⚠️ Batch response truncated (max_tokens=${maxTokens}, need=${n})`);
    }
    const questions = parseAndValidateQuestions(aiContent, n);
    return { questions, finishReason };
  };

  let { questions: batch, finishReason: lastFinish } = await runOnce(`${userPrompt}${avoidBlock}`, need);

  if (batch.length < need && lastFinish === "length") {
    const missing = need - batch.length;
    const stems = batch
      .map((q) => String(q.question_en || q.question || "").trim().slice(0, 60))
      .filter(Boolean);
    const topUpPrompt = `${userPrompt}${avoidBlock}\n\nGenerate EXACTLY ${missing} ADDITIONAL questions (not ${need} total). Return ONLY a JSON array of ${missing} new objects.${stems.length ? `\nAvoid repeating:\n${stems.map((s) => `- ${s}`).join("\n")}` : ""}`;
    const { questions: more } = await runOnce(topUpPrompt, missing);
    batch = dedupeMockPaperQuestions([...batch, ...more], { csat: csatPaper }).slice(0, need);
  } else if (batch.length < need) {
    console.warn(
      `⚠️ Batch parsed ${batch.length}/${need} questions (finish_reason=${lastFinish ?? "unknown"}); skipping top-up`
    );
  }

  return { questions: batch, apiCalls };
}

/**
 * Generate UPSC Prelims MCQs using OpenRouter API.
 * @param {Object} params
 * @param {string[]} params.subjects - Subject names (e.g. ["Polity", "History"])
 * @param {string} params.topic - Topic name
 * @param {"GS"|"CSAT"} params.examType - GS Paper 1 or CSAT
 * @param {number} params.questionCount - Number of questions
 * @param {string} [params.difficulty] - Easy | Moderate | Hard (GS only)
 * @param {string[]} [params.csatCategories] - For CSAT: Quantitative Aptitude, etc.
 * @param {Object} [params.currentAffairsPeriod] - { month?, year? } (future use)
 * @returns {Promise<Object>} - { success, questions?, count?, error? }
 */
export const generateTestQuestions = async ({
  subjects,
  topic,
  examType,
  questionCount,
  difficulty = "Moderate",
  csatCategories,
  currentAffairsPeriod,
}) => {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = getTestGenerationModel();

    if (!apiKey) {
      throw new Error("Missing OPENROUTER_API_KEY in environment variables");
    }

    const count = parseInt(questionCount, 10) || 20;
    const subjectsList = Array.isArray(subjects) ? subjects : [subjects];
    const subjectsText = subjectsList.join(", ");

    const systemPrompt =
      examType === "CSAT"
        ? buildPrelimsCSATSystemPrompt(csatCategories || [], topic)
        : buildPrelimsGSSystemPrompt(subjectsList, topic, difficulty, currentAffairsPeriod);

    const batchSize = Math.min(
      count,
      Math.max(5, parseInt(process.env.TEST_GEN_BATCH_SIZE, 10) || 8)
    );
    let validatedQuestions = [];
    let apiCalls = 0;
    const maxBatchRounds = Math.ceil(count / batchSize) + 2;

    for (let round = 0; validatedQuestions.length < count && round < maxBatchRounds; round += 1) {
      const need = Math.min(batchSize, count - validatedQuestions.length);
      const avoidSnippets = validatedQuestions
        .map((q) => String(q.question_en || q.question || "").trim().slice(0, 60))
        .filter(Boolean)
        .slice(0, 5);

      const batchUserPrompt = buildPrelimsBatchUserPrompt({
        examType,
        need,
        topic,
        subjectsText,
        difficulty,
      });

      console.log(
        `📝 Prelims batch ${round + 1}: requesting ${need} question(s) (${validatedQuestions.length}/${count} so far)...`
      );

      const { questions: batchQuestions, apiCalls: batchCalls } = await fetchQuestionBatch({
        apiKey,
        model,
        systemPrompt,
        userPrompt: batchUserPrompt,
        need,
        avoidSnippets,
        csatPaper: examType === "CSAT",
      });
      apiCalls += batchCalls;

      if (batchQuestions.length === 0) {
        console.warn(`⚠️ Batch ${round + 1} returned 0 parseable questions`);
        continue;
      }

      validatedQuestions = dedupeMockPaperQuestions([...validatedQuestions, ...batchQuestions], {
        csat: examType === "CSAT",
      }).slice(0, count);
    }

    if (validatedQuestions.length === 0) {
      throw new Error("No valid UPSC questions generated. Please try again.");
    }

    if (validatedQuestions.length < count) {
      throw new Error(
        `Only ${validatedQuestions.length} of ${count} questions were generated. Please try again.`
      );
    }

    console.log(
      `✅ Generated ${validatedQuestions.length} ${examType} questions (model: ${model}, ${apiCalls} API call(s), batchSize=${batchSize})`
    );

    const translatedQuestions = finalizeGeneratedQuestions(validatedQuestions);

    return {
      success: true,
      questions: translatedQuestions,
      count: translatedQuestions.length,
    };
  } catch (error) {
    console.error("Error generating test questions:", error);
    return {
      success: false,
      error: error.message || "Failed to generate questions",
      questions: [],
    };
  }
};

export default {
  generateTestQuestions,
  generateFullMockTestQuestions,
  generateFullMockMixTestQuestions,
  generateFullMockPyoTestQuestions,
  generateFullMockCsatTestQuestions,
  dedupeQuestions,
  dedupeQuestionsByStem,
  canonicalDedupeKey,
};
