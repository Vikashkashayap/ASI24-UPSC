import crypto from "crypto";
import { openRouterChatCompletion } from "./openRouterClient.js";
import {
  getTestGenerationModel,
  getPracticeGenerationModel,
  getMaxTokensForTestGeneration,
  getMaxTokensForPracticeGeneration,
  getMaxTokensForPracticeHindiBatch,
  getMixBatchSize,
  getMixGenerateBuffer,
  getPracticeBatchSize,
  getPracticeGenerateBuffer,
  getPracticeMaxRefillBatches,
  isPracticeBulkGenerationEnabled,
  getPracticeBulkBatchSize,
  isPracticeBatchHindiEnabled,
} from "../config/openRouterConfig.js";
import {
  ensureEnglishBilingualFields,
  practiceQuestionNeedsHindi,
  translatePracticeQuestionsToHindi,
} from "./questionTranslationService.js";

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

const PRACTICE_STRUCTURED_JSON_RULES = `Each object (JSON array only):
- question: stem text (for match use intro only; for assertion use short intro or empty — put A/R in assertionReason)
- options: { "A","B","C","D" }
- answer: A|B|C|D
- questionType: statement|match|assertion|chronology|pair|map|direct|odd_one_out
- matchColumns (match/pair only): { "columnA": ["item1",...], "columnB": ["item1",...] } — List-I & List-II, 3–4 items each
- assertionReason (assertion only): { "assertion": "...", "reason": "..." } — do NOT repeat A/R inside question
- statement type: MIN 2, MAX 5 numbered statements in question (e.g. "1. ... 2. ... 3. ..."); options must use statement combos ("1 only", "1 and 2 only", etc.)
- explanation: { "A":"...", "B":"...", "C":"...", "D":"..." } — CORRECT option: WHY true (1 sentence). Each WRONG option: one-line why false. Keep all 4 keys.`;

function getPracticeJsonRules() {
  return `${PRACTICE_STRUCTURED_JSON_RULES}
ENGLISH ONLY from generator — do NOT include question_hi, options_hi, or any Hindi/Devanagari text. Hindi is added later by the app.`;
}

function practiceBatchJsonNote() {
  return "English only — no Hindi in generator output.";
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

function getQuestionText(q) {
  if (!q || typeof q !== "object") return "";
  return String(q.question_en ?? q.question ?? q.questionText ?? "").trim();
}

function getQuestionOptions(q) {
  if (!q || typeof q !== "object") return {};
  return q.options_en ?? q.options ?? {};
}

const UPSC_STEM_PREFIX_RE =
  /^(consider the following statements?[:\.]?\s*|with reference to .*?[,\.]?\s*|which of the following (statements?|is\/are correct|is\/are incorrect|is\/are not correct)[:\.]?\s*|how many of the above.*?[:\.]?\s*|match the following.*?[:\.]?\s*)/i;

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
  const stem = normalizeTextForFingerprint(getQuestionText(q));
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
  const opts = getQuestionOptions(q);
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
  const stem = normalizeTextForFingerprint(getQuestionText(q));
  const ar = q.assertionReason;
  const arKey =
    ar && typeof ar === "object"
      ? `${normalizeTextForFingerprint(ar.assertion)}|${normalizeTextForFingerprint(ar.reason)}`
      : "";
  return [stem, arKey].filter(Boolean).join("##");
}

/** Loose stem key — catches paraphrased repeats after stripping UPSC boilerplate. */
function looseStemKey(q) {
  let stem = normalizeTextForFingerprint(getQuestionText(q));
  stem = stem.replace(UPSC_STEM_PREFIX_RE, "");
  stem = stem.replace(/\b[1234]\.\s/g, " ");
  return stem.trim().slice(0, 120);
}

/**
 * Build fingerprint sets from stored/generated questions (for cross-paper dedupe).
 */
export function buildQuestionFingerprints(questions) {
  const fullKeys = new Set();
  const stemKeys = new Set();
  const looseKeys = new Set();
  const snippets = [];

  for (const q of questions || []) {
    const plain = {
      question: getQuestionText(q),
      question_en: getQuestionText(q),
      options: getQuestionOptions(q),
      options_en: getQuestionOptions(q),
      matchColumns: q.matchColumns,
      assertionReason: q.assertionReason,
      tableData: q.tableData,
    };
    const fk = canonicalDedupeKey(plain);
    const sk = canonicalStemKey(plain);
    const lk = looseStemKey(plain);
    if (fk) fullKeys.add(fk);
    if (sk) stemKeys.add(sk);
    if (lk) looseKeys.add(lk);
    const stem = getQuestionText(q);
    if (stem) snippets.push(stem.slice(0, 100));
  }

  return { fullKeys, stemKeys, looseKeys, snippets: [...new Set(snippets)] };
}

export function isQuestionRepeatOfPrior(q, priorFingerprints) {
  if (!priorFingerprints || !q) return false;
  const plain = {
    question: getQuestionText(q),
    question_en: getQuestionText(q),
    options: getQuestionOptions(q),
    options_en: getQuestionOptions(q),
    matchColumns: q.matchColumns,
    assertionReason: q.assertionReason,
    tableData: q.tableData,
  };
  const fk = canonicalDedupeKey(plain);
  const sk = canonicalStemKey(plain);
  const lk = looseStemKey(plain);
  if (fk && priorFingerprints.fullKeys?.has(fk)) return true;
  if (sk && priorFingerprints.stemKeys?.has(sk)) return true;
  if (lk && priorFingerprints.looseKeys?.has(lk)) return true;
  return false;
}

export function filterOutPriorRepeats(questions, priorFingerprints) {
  if (!priorFingerprints || !Array.isArray(questions)) return questions;
  return questions.filter((q) => !isQuestionRepeatOfPrior(q, priorFingerprints));
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

const ASSERTION_IN_STEM_RE =
  /(?:Assertion|अभिकथन)\s*\(A\)\s*:.*?(?:Reason|कारण)\s*\(R\)\s*:.*/is;

function stripDuplicateAssertionFromStem(questionEn) {
  return String(questionEn || "")
    .replace(ASSERTION_IN_STEM_RE, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Keep at most maxEvents numbered items (1. 2. 3.) in chronology stems. */
function findNumberedStatementMarkers(text) {
  const src = String(text || "");
  const regex = /\b(\d+)[.)]\s+/g;
  const markers = [];
  let match;
  while ((match = regex.exec(src)) !== null) {
    markers.push({ index: match.index, length: match[0].length, number: Number(match[1]) });
  }
  return markers;
}

function limitNumberedItemsInStem(text, maxItems) {
  const src = String(text || "").trim();
  if (!src || maxItems < 1) return src;
  const markers = findNumberedStatementMarkers(src);
  if (markers.length <= maxItems) return src;

  const cutAt = markers[maxItems].index;
  let trimmed = src.slice(0, cutAt).trim();
  const intro = trimmed.slice(0, markers[0].index).trim();
  if (intro && !/[:\?]$/.test(intro)) trimmed = `${intro}:\n${trimmed.slice(markers[0].index)}`;
  return trimmed;
}

function limitChronologyEventsInStem(text, maxEvents = 3) {
  return limitNumberedItemsInStem(text, maxEvents);
}

const PRACTICE_STATEMENT_MIN = 2;
const PRACTICE_STATEMENT_MAX = 5;

const STATEMENT_PATTERN_IDS = new Set([
  "statement_based",
  "statement_not_correct",
  "multi_statement_elimination",
]);

function isStatementTypePracticeQuestion(q) {
  const pattern = String(q.patternType || "").toLowerCase();
  if (STATEMENT_PATTERN_IDS.has(pattern)) return true;
  const qType = String(q.questionType || "").toLowerCase();
  if (qType !== "statement") return false;
  if (q.matchColumns?.columnA?.length || q.assertionReason?.assertion) return false;
  return true;
}

function countNumberedStatementsInStem(text) {
  return findNumberedStatementMarkers(text).length;
}

function optionsLookLikeStatementCombos(q) {
  const opts = Object.values(q.options_en || q.options || {});
  return opts.some((o) => /\b[1-4]\b/.test(String(o)) && /only|all three|all four|none/i.test(String(o)));
}

function isValidStatementQuestionCount(q) {
  if (!isStatementTypePracticeQuestion(q)) return true;
  const stem = getQuestionText(q);
  const n = countNumberedStatementsInStem(stem);
  if (n >= PRACTICE_STATEMENT_MIN && n <= PRACTICE_STATEMENT_MAX) return true;
  if (optionsLookLikeStatementCombos(q) && n < PRACTICE_STATEMENT_MIN) return false;
  return n >= PRACTICE_STATEMENT_MIN && n <= PRACTICE_STATEMENT_MAX;
}

/**
 * Normalize topic-practice items: UPSC intro stems, no duplicate A/R in question text, chronology cap.
 */
function normalizeAssertionReasonFields(ar) {
  if (!ar || typeof ar !== "object") return ar;
  let assertion = String(ar.assertion ?? "").trim();
  let reason = String(ar.reason ?? "").trim();

  const stripA = (t) =>
    String(t || "")
      .replace(/^(?:Assertion|अभिकथन)\s*\(A\)\s*:?\s*/gi, "")
      .trim();
  const stripR = (t) =>
    String(t || "")
      .replace(/^(?:Reason|कारण)\s*\(R\)\s*:?\s*/gi, "")
      .trim();

  assertion = stripA(assertion);
  reason = stripR(reason);

  if (!reason && assertion) {
    const split = assertion.split(/(?:Reason|कारण)\s*\(R\)\s*:?\s*/i);
    if (split.length >= 2) {
      assertion = stripA(split[0]);
      reason = split.slice(1).join(" ").trim();
    }
  }

  return {
    ...ar,
    assertion,
    reason,
    ...(ar.assertion_hi != null ? { assertion_hi: stripA(ar.assertion_hi) } : {}),
    ...(ar.reason_hi != null ? { reason_hi: stripR(ar.reason_hi) } : {}),
  };
}

function sanitizePracticeQuestion(q) {
  if (!q || typeof q !== "object") return q;
  const questionType = String(q.questionType || q.patternType || "").toLowerCase();
  let questionEn = getQuestionText(q);

  if (q.assertionReason?.assertion || q.assertionReason?.reason) {
    q = { ...q, assertionReason: normalizeAssertionReasonFields(q.assertionReason) };
    questionEn = stripDuplicateAssertionFromStem(questionEn);
    if (!questionEn || questionEn.length < 12) {
      questionEn = "Consider the following Assertion (A) and Reason (R) and select the correct answer:";
    }
  }

  if (q.matchColumns?.columnA?.length) {
    questionEn = stripDuplicateAssertionFromStem(questionEn);
    if (!questionEn || questionEn.length < 12) {
      questionEn =
        "Match List-I with List-II and select the correct answer using the codes given below:";
    }
  }

  if (questionType === "chronology" || questionType === "sequence_arrangement") {
    questionEn = limitChronologyEventsInStem(questionEn, 3);
  }

  if (isStatementTypePracticeQuestion(q)) {
    questionEn = limitNumberedItemsInStem(questionEn, PRACTICE_STATEMENT_MAX);
  }

  const updated = {
    ...q,
    question: questionEn,
    question_en: questionEn,
    ...(q.assertionReason ? { assertionReason: normalizeAssertionReasonFields(q.assertionReason) } : {}),
  };
  updated.questionId = hashQuestion(canonicalDedupeKey(updated));
  return updated;
}

/**
 * Parse topic-practice AI JSON with structured UPSC fields (matchColumns, assertionReason, option-wise explanations).
 */
function parsePracticeBatchResponse(aiContent, count) {
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
  if (parsed === null && content.charAt(0) === "[") {
    const extracted = extractCompleteObjectsFromTruncatedArray(content);
    if (extracted?.length) parsed = extracted;
  }

  if (parsed !== null) {
    questions = Array.isArray(parsed) ? parsed : parsed.questions || [];
  }
  if (!Array.isArray(questions) || questions.length === 0) return [];

  const limit = parseInt(count, 10) || 999;
  return normalizeFullMockQuestions(questions)
    .map(stripLlmHindiFromPracticeQuestion)
    .map((q) => {
      const explanationEn = normalizePrelimsExplanation(
        q.explanation_en ?? q.explanation,
        q.correctAnswer,
        { practiceMode: true }
      );
      return sanitizePracticeQuestion({
        ...q,
        explanation: explanationEn,
        explanation_en: explanationEn,
      });
    })
    .filter(isValidStatementQuestionCount)
    .slice(0, limit);
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
function normalizePrelimsExplanation(raw, correctAnswer, { practiceMode = false } = {}) {
  if (usesFullBilingualExplanations() || practiceMode) {
    const obj = normalizeExplanation(raw);
    const filledKeys = ["A", "B", "C", "D"].filter(
      (k) => obj[k] && obj[k] !== "—" && obj[k] !== "No explanation provided."
    );
    if (filledKeys.length > 0) return obj;
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
function dedupeMockPaperQuestions(questions, { csat = false, priorFingerprints = null } = {}) {
  let base = dedupeQuestions(questions);
  if (!csat) base = dedupeQuestionsByStem(base);
  if (priorFingerprints) base = filterOutPriorRepeats(base, priorFingerprints);
  return base;
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
  generateBuffer,
  perBatch: perBatchOverride,
  maxRefillBatches: maxRefillBatchesOverride,
  estimateMaxTokens,
  priorFingerprints = null,
  rollingExcludeLimit = 5,
}) {
  const perBatch = perBatchOverride ?? getMixBatchSize();
  const generateCount = displayCount + (generateBuffer ?? getMixGenerateBuffer());
  const batches = Math.ceil(generateCount / perBatch);
  const tokenEst = estimateMaxTokens ?? getMaxTokensForTestGeneration;
  const all = [];
  let testName = null;

  const applyDedupe = (qs) =>
    dedupeMockPaperQuestions(qs, { csat: csatPaper, priorFingerprints });

  const collectExcludeSnippets = (qs) =>
    [
      ...new Set(
        applyDedupe(qs)
          .map((q) => getQuestionText(q).slice(0, 100))
          .filter(Boolean)
      ),
    ].slice(0, rollingExcludeLimit);

  for (let b = 1; b <= batches; b += 1) {
    const rollingExclude = collectExcludeSnippets(all);
    console.log(
      `📝 ${logPrefix}: batch ${b}/${batches} (${perBatch} Q, max_tokens≈${tokenEst(perBatch)})...`
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

  let deduped = applyDedupe(all);
  const maxRefills = maxRefillBatchesOverride ?? getMixMaxRefillBatches();
  let refill = 0;
  let stallRounds = 0;

  while (deduped.length < displayCount && refill < maxRefills) {
    const beforeCount = deduped.length;
    const need = Math.max(1, Math.min(perBatch, displayCount - deduped.length));
    const snippetPool = collectExcludeSnippets(deduped);
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
    deduped = applyDedupe(all);
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
      const snippets = collectExcludeSnippets(finalQuestions);
      const { questions: extra } = await generateBatch(apiKey, model, need, `Top-up ${t + 1}`, snippets);
      if (extra?.length) {
        all.push(...extra);
        deduped = applyDedupe(all);
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
  return Math.max(5, Math.min(25, parseInt(process.env.MIX_MAX_REFILL_BATCHES, 10) || 8));
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
        base.assertionReason = normalizeAssertionReasonFields({
          assertion: String(q.assertionReason.assertion ?? "").trim(),
          reason: String(q.assertionReason.reason ?? "").trim(),
        });
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
  const result = await openRouterChatCompletion({
    apiKey,
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.4,
    maxTokens,
    xTitle: apiTitle,
    cacheTtlSec: 0,
    label: "test-gen",
  });

  const aiContent = result.content?.trim();
  const finishReason = result.finishReason;
  const usage = result.usage;

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

  if (batch.length < need) {
    const missing = need - batch.length;
    const stems = batch
      .map((q) => String(q.question_en || q.question || "").trim().slice(0, 60))
      .filter(Boolean);
    const topUpPrompt = `${userPrompt}${avoidBlock}\n\nGenerate EXACTLY ${missing} ADDITIONAL questions (not ${need} total). Return ONLY a JSON array of ${missing} new objects.${stems.length ? `\nAvoid repeating:\n${stems.map((s) => `- ${s}`).join("\n")}` : ""}`;
    const { questions: more, finishReason: topFinish } = await runOnce(topUpPrompt, missing);
    batch = dedupeMockPaperQuestions([...batch, ...more], { csat: csatPaper }).slice(0, need);
    if (batch.length < need && lastFinish !== "length" && topFinish !== "length") {
      console.warn(
        `⚠️ Batch parsed ${batch.length}/${need} questions after top-up (finish_reason=${topFinish ?? lastFinish ?? "unknown"})`
      );
    }
  }

  return { questions: batch, apiCalls };
}

const TOPIC_PRACTICE_DEFAULT_PATTERNS = Object.keys(PATTERN_LABELS);

const PATTERN_TO_QUESTION_TYPE = {
  statement_based: "statement",
  statement_not_correct: "statement",
  multi_statement_elimination: "statement",
  odd_one_out: "odd_one_out",
  pair_matching: "match",
  assertion_reason: "assertion",
  direct_conceptual: "direct",
  chronology: "chronology",
  sequence_arrangement: "chronology",
  map_location: "map",
};

function getPatternFormatRule(patternId) {
  const rules = {
    statement_based:
      'MIN 2, MAX 5 numbered statements in question stem. Options MUST be statement-number combos matching the statement count (e.g. "1 only", "2 only", "1 and 2 only", "1, 2 and 3", "1, 2, 3 and 4"). Ask which are correct.',
    statement_not_correct:
      'MIN 2, MAX 5 numbered statements; ask which is NOT correct; options MUST use statement-number combos only.',
    pair_matching:
      'UPSC "Match List-I with List-II" format. question = intro line only. matchColumns: columnA (List-I, 3–4 items numbered in UI), columnB (List-II, 3–4 items). Options = codes like "1-a, 2-b, 3-c, 4-d" or "1-d, 2-c, 3-b, 4-a". Do NOT put lists inside question text.',
    assertion_reason:
      'Use assertionReason object { assertion, reason }. question = short intro only (do NOT paste A/R in question). Options: (a) Both A and R true and R explains A (b) Both true but R does not explain A (c) A true, R false (d) A false, R true.',
    direct_conceptual:
      "Single-stem conceptual MCQ; elimination-based; avoid rote fact recall.",
    chronology:
      "MAX 3 events/items only (numbered 1, 2, 3 in question stem). Options show different chronological orderings (4 MCQ options A–D). Pick correct sequence.",
    sequence_arrangement:
      "MAX 3 steps/items only. Options show different orderings; pick correct sequence.",
    map_location:
      "Location/map concept question (no image); geography tied to the topic.",
    odd_one_out: "Four related items; one does not belong; identify the odd one.",
    multi_statement_elimination:
      '"How many of the above are correct?" with MIN 2, MAX 5 numbered statements; options like "Only one", "Only two", "All three", "None".',
  };
  return rules[patternId] || PATTERN_LABELS[patternId] || patternId;
}

function resolveTopicPracticePatterns(patternsToInclude = []) {
  const valid = Array.isArray(patternsToInclude)
    ? patternsToInclude.filter((id) => PATTERN_LABELS[id])
    : [];
  return valid.length > 0 ? valid : TOPIC_PRACTICE_DEFAULT_PATTERNS;
}

/** Equal split: 50 Q + 10 patterns → 5 each; remainder +1 to first patterns. */
function buildEqualPatternQuota(patternIds, totalCount) {
  const ids = Array.isArray(patternIds) ? patternIds.filter(Boolean) : [];
  if (ids.length === 0) return [];
  const base = Math.floor(totalCount / ids.length);
  let remainder = totalCount % ids.length;
  return ids.map((patternId) => {
    const count = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
    return { patternId, count };
  });
}

function tagQuestionWithPattern(q, patternId) {
  return {
    ...q,
    patternType: patternId,
    questionType: PATTERN_TO_QUESTION_TYPE[patternId] || "direct",
  };
}

function countPatternQuestions(questions, patternId) {
  return (questions || []).filter((q) => q.patternType === patternId).length;
}

function interleavePatternQuestions(buckets, patternOrder) {
  const final = [];
  const maxLen = Math.max(0, ...patternOrder.map((p) => (buckets[p] || []).length));
  for (let i = 0; i < maxLen; i += 1) {
    for (const p of patternOrder) {
      if (buckets[p]?.[i]) final.push(buckets[p][i]);
    }
  }
  return final;
}

/** Request slightly more than needed so dedupe drops still leave enough unique Q. */
function practiceBatchRequestSize(need) {
  const n = Math.max(1, parseInt(need, 10) || 1);
  const buffer = Math.min(2, getPracticeGenerateBuffer());
  const perQ = parseInt(process.env.PRACTICE_GEN_TOKENS_PER_QUESTION, 10) || 420;
  const tokenCap =
    parseInt(process.env.PRACTICE_MAX_OUTPUT_TOKENS, 10) ||
    parseInt(process.env.TEST_GEN_MAX_OUTPUT_TOKENS, 10) ||
    6500;
  const maxByTokens = Math.max(2, Math.floor((tokenCap - 300) / perQ));
  return Math.min(getPracticeBatchSize(), n + buffer, maxByTokens);
}

function rebuildPracticeBuckets(all, quotaPlan) {
  const buckets = {};
  for (const { patternId, count } of quotaPlan) {
    buckets[patternId] = all.filter((q) => q.patternType === patternId).slice(0, count);
  }
  return buckets;
}

function buildInterleavedPracticePaper(all, quotaPlan, patterns, displayCount) {
  const buckets = rebuildPracticeBuckets(all, quotaPlan);
  return interleavePatternQuestions(buckets, patterns).slice(0, displayCount);
}

async function topUpPracticeQuotaGap({
  all,
  quotaPlan,
  patterns,
  displayCount,
  priorFingerprints,
  requestPatternBatch,
  logPrefix,
  maxRounds = 12,
}) {
  let pool = all;
  let finalQuestions = buildInterleavedPracticePaper(pool, quotaPlan, patterns, displayCount);
  let round = 0;

  while (finalQuestions.length < displayCount && round < maxRounds) {
    const gap = displayCount - finalQuestions.length;
    const buckets = rebuildPracticeBuckets(pool, quotaPlan);
    const underfilled = quotaPlan
      .map((p) => ({ ...p, have: (buckets[p.patternId] || []).length }))
      .filter((p) => p.have < p.count)
      .sort((a, b) => b.count - b.have - (a.count - a.have));

    const targets =
      underfilled.length > 0
        ? underfilled
        : quotaPlan.map((p) => ({ ...p, have: (buckets[p.patternId] || []).length }));

    let progress = false;
    for (const { patternId, count, have } of targets) {
      if (finalQuestions.length >= displayCount) break;
      const patternNeed = count - have;
      const need = Math.max(1, patternNeed > 0 ? patternNeed : gap);
      const batchSize = practiceBatchRequestSize(need);

      console.log(
        `📝 ${logPrefix}: top-up ${round + 1}/${maxRounds} — ${PATTERN_LABELS[patternId]} (need ${need}, gap ${gap}, requesting ${batchSize})...`
      );

      const { questions } = await requestPatternBatch(
        patternId,
        batchSize,
        `${PATTERN_LABELS[patternId]} top-up ${round + 1}`
      );
      if (!questions?.length) continue;

      const tagged = questions.map((q) => tagQuestionWithPattern(q, patternId));
      const beforeTotal = pool.length;
      const beforePattern = countPatternQuestions(pool, patternId);
      pool = dedupeMockPaperQuestions([...pool, ...tagged], { priorFingerprints, csat: false });
      if (pool.length > beforeTotal || countPatternQuestions(pool, patternId) > beforePattern) {
        progress = true;
      }
      finalQuestions = buildInterleavedPracticePaper(pool, quotaPlan, patterns, displayCount);
    }

    round += 1;
    if (!progress) break;
  }

  if (finalQuestions.length < displayCount) {
    console.warn(
      `📝 ${logPrefix}: top-up finished with ${finalQuestions.length}/${displayCount} interleaved questions`
    );
  }

  return { all: pool, finalQuestions };
}

function buildCompactTopicPracticeSystemPrompt(
  subject,
  topic,
  difficulty,
  excludeSnippets = [],
  patternsToInclude = [],
  singlePatternId = null
) {
  const avoidLine =
    Array.isArray(excludeSnippets) && excludeSnippets.length > 0
      ? `\nDo NOT repeat or closely paraphrase these prior stems/concepts (from earlier tests on this topic):\n${excludeSnippets.slice(0, 15).map((s) => `- ${String(s).slice(0, 60)}`).join("\n")}\n`
      : "";
  const diffNorm = String(difficulty || "moderate").toLowerCase();
  const diffLine = diffNorm === "easy" ? "Easy" : diffNorm === "hard" ? "Hard" : "Moderate";
  const explLine =
    "explanation: { A,B,C,D } — CORRECT option: 1 sentence why right; each WRONG: one-line why false.";
  const jsonRules = getPracticeJsonRules();
  const bilingualNote = "English only — Hindi is added by the app after generation, not by you.";

  if (singlePatternId && PATTERN_LABELS[singlePatternId]) {
    const label = PATTERN_LABELS[singlePatternId];
    const rule = getPatternFormatRule(singlePatternId);
    return `UPSC GS Paper-I topic-practice MCQ generator (real Prelims standard).${avoidLine}
Subject: ${subject}. Topic: "${topic}". Difficulty: ${diffLine}.
STRICT PATTERN (100% of this batch): "${label}" ONLY — every question must use this exact UPSC format.
Format rule: ${rule}
${jsonRules}
questionType: "${PATTERN_TO_QUESTION_TYPE[singlePatternId] || "direct"}". Use matchColumns or assertionReason only if this pattern requires it.
${explLine}
${bilingualNote}
ZERO DUPLICATE questions — each must test a unique sub-concept/angle. Never repeat stems, facts, or pairings.
Return ONLY a JSON array. No markdown.`;
  }

  const activePatterns = resolveTopicPracticePatterns(patternsToInclude);
  const perPattern = activePatterns.length > 0 ? Math.floor(50 / activePatterns.length) : 5;
  const patterns = activePatterns.map((id) => PATTERN_LABELS[id] || id).join("; ");
  const patternRules = `UPSC format (real Prelims style):
- Statement-based: MIN 2, MAX 5 numbered statements; options like "1 only", "1 and 2 only", "1, 2 and 3" (scale combos for 4–5 statements).
- Statement NOT correct: same 2–5 statement rule, ask which is incorrect.
- Pair matching / Match the following: List-I & List-II in matchColumns; intro in question only; code-style options.
- Assertion–Reason: assertionReason object; standard 4 UPSC A/R options; do NOT duplicate A/R in question text.
- Direct conceptual: elimination-based, not rote recall.
- Chronology / Sequence: MAX 3 events/steps in stem; 4 ordering options (A–D).
- Map/location: concept-based geography (no image).
- Odd one out: four related items, one misfit.
- Multi-statement elimination: "How many of the above are correct?" with 2–5 statements.`;

  return `UPSC GS Paper-I topic-practice MCQ generator (real Prelims standard).${avoidLine}
Subject: ${subject}. Topic: "${topic}". Difficulty: ${diffLine}.
EQUAL WEIGHTAGE: ${activePatterns.length} patterns × ~${perPattern} questions each (50 total). Use ONLY: ${patterns}.
${patternRules}
${jsonRules}
Per question: questionType (statement|match|assertion|chronology|pair|map|direct|odd_one_out). Use matchColumns or assertionReason only when the pattern needs it. At least one trap option per question.
${explLine}
${bilingualNote}
ZERO DUPLICATE questions in the paper — unique concept/angle per question; no repeated stems or near-paraphrases.
Return ONLY a JSON array. No markdown.`;
}

/** Strip any Hindi the generator may have returned — Hindi is added in code after generation. */
function stripLlmHindiFromPracticeQuestion(q) {
  if (!q || typeof q !== "object") return q;
  const out = { ...q, question_hi: "", options_hi: { A: "", B: "", C: "", D: "" } };
  if (out.matchColumns && typeof out.matchColumns === "object") {
    out.matchColumns = { ...out.matchColumns, columnA_hi: [], columnB_hi: [] };
  }
  if (out.assertionReason && typeof out.assertionReason === "object") {
    out.assertionReason = { ...out.assertionReason, assertion_hi: "", reason_hi: "" };
  }
  return out;
}

/** Ensure Hindi fields on stored practice questions (e.g. before student starts an older test). */
export async function enrichAssignedPracticeWithHindi(questions) {
  if (!Array.isArray(questions) || questions.length === 0) return questions;
  if (!isPracticeBatchHindiEnabled()) return questions;
  if (!questions.some((q) => practiceQuestionNeedsHindi(q))) return questions;
  if (!process.env.OPENROUTER_API_KEY) return questions;

  console.log(`📝 Enriching ${questions.length} practice question(s) with Hindi (code translation)...`);
  return translatePracticeQuestionsToHindi(questions.map(stripLlmHindiFromPracticeQuestion), 4);
}

async function generateTopicPracticeBatch(
  apiKey,
  model,
  batchSize,
  batchLabel,
  subject,
  topic,
  difficulty,
  excludeSnippets = [],
  patternsToInclude = [],
  singlePatternId = null
) {
  const runOnce = async (size) => {
    const systemPrompt = buildCompactTopicPracticeSystemPrompt(
      subject,
      topic,
      difficulty,
      excludeSnippets,
      patternsToInclude,
      singlePatternId
    );
    const patternHint = singlePatternId
      ? PATTERN_LABELS[singlePatternId]
      : resolveTopicPracticePatterns(patternsToInclude)
          .map((id) => PATTERN_LABELS[id] || id)
          .join(", ");
    const statementHint = STATEMENT_PATTERN_IDS.has(singlePatternId || "")
      ? ` Each question: ${PRACTICE_STATEMENT_MIN}–${PRACTICE_STATEMENT_MAX} numbered statements in the stem.`
      : "";
    const userPrompt = singlePatternId
      ? `Generate EXACTLY ${size} MCQs (${batchLabel}). Topic: "${topic}". ALL ${size} must be "${patternHint}" type ONLY — same UPSC format, different sub-concepts. No duplicate or near-duplicate questions in this batch.${statementHint} ${practiceBatchJsonNote()} JSON array only.`
      : `Generate EXACTLY ${size} UPSC-style MCQs (${batchLabel}). Topic: "${topic}". Equal mix of: ${patternHint}. Each question must use a distinct concept/angle — zero repeats. ${practiceBatchJsonNote()} JSON array only.`;

    const maxTokens = getMaxTokensForPracticeGeneration(size);
    const { aiContent, finishReason } = await callOpenRouterTestGeneration({
      apiKey,
      model,
      systemPrompt,
      userPrompt,
      maxTokens,
      apiTitle: "UPSC Mentor - Topic Practice",
    });

    if (finishReason === "length") {
      console.warn(`⚠️ Topic practice batch truncated (max_tokens=${maxTokens}, need=${size})`);
    }

    const validated = dedupeMockPaperQuestions(parsePracticeBatchResponse(aiContent, size), {
      csat: false,
    });
    return { questions: validated, finishReason };
  };

  let requestSize = Math.max(1, batchSize);
  let last = { questions: [], finishReason: null };

  for (let attempt = 0; attempt < 3 && requestSize >= 1; attempt += 1) {
    last = await runOnce(requestSize);
    if (last.questions.length > 0 && last.finishReason !== "length") {
      return last;
    }
    if (last.questions.length >= requestSize) {
      return last;
    }
    if (last.finishReason === "length" && requestSize > 2) {
      requestSize = Math.max(2, Math.ceil(requestSize / 2));
      console.log(`📝 Topic practice: retry smaller batch (${requestSize}) after truncation...`);
      continue;
    }
    break;
  }

  if (last.questions.length > 0) {
    return last;
  }

  console.error("Topic practice batch: no valid questions after retries");
  return { questions: [], finishReason: last.finishReason };
}

function buildPracticeExcludeSnippets(priorSnippets = [], all = []) {
  return [
    ...new Set([
      ...(priorSnippets || []),
      ...all.map((q) => getQuestionText(q).slice(0, 60)).filter(Boolean),
    ]),
  ].slice(0, 15);
}

function inferPracticePatternId(q, allowedPatterns = []) {
  const allowed = allowedPatterns.length ? allowedPatterns : TOPIC_PRACTICE_DEFAULT_PATTERNS;
  const allowedSet = new Set(allowed);

  if (q.patternType && allowedSet.has(q.patternType)) return q.patternType;

  if (q.assertionReason?.assertion || q.assertionReason?.reason) {
    if (allowedSet.has("assertion_reason")) return "assertion_reason";
  }
  if (q.matchColumns?.columnA?.length) {
    if (allowedSet.has("pair_matching")) return "pair_matching";
  }

  const qType = String(q.questionType || "").toLowerCase();
  const stem = getQuestionText(q).toLowerCase();

  if ((qType === "odd_one_out" || /odd one out|does not belong/i.test(stem)) && allowedSet.has("odd_one_out")) {
    return "odd_one_out";
  }
  if ((qType === "map" || /\bmap\b|location-based|latitude|longitude/i.test(stem)) && allowedSet.has("map_location")) {
    return "map_location";
  }
  if (/how many of the above/i.test(stem) && allowedSet.has("multi_statement_elimination")) {
    return "multi_statement_elimination";
  }
  if (/not correct|incorrect|which of the following is not/i.test(stem) && allowedSet.has("statement_not_correct")) {
    return "statement_not_correct";
  }
  if (
    (qType === "chronology" || /chronolog|correct sequence|arrange.*order/i.test(stem)) &&
    allowedSet.has("chronology")
  ) {
    return "chronology";
  }
  if (qType === "chronology" && allowedSet.has("sequence_arrangement")) {
    return "sequence_arrangement";
  }
  if (qType === "assertion" && allowedSet.has("assertion_reason")) return "assertion_reason";
  if ((qType === "match" || qType === "pair") && allowedSet.has("pair_matching")) return "pair_matching";
  if (
    (qType === "statement" || countNumberedStatementsInStem(stem) >= PRACTICE_STATEMENT_MIN) &&
    allowedSet.has("statement_based")
  ) {
    return "statement_based";
  }
  if (allowedSet.has("direct_conceptual")) return "direct_conceptual";
  return allowed[0] || "direct_conceptual";
}

/**
 * Token-efficient bulk generation: ~4–6 mixed-pattern API calls, then ≤3 targeted refills.
 */
async function runTopicPracticeBulkFirstLoop({
  apiKey,
  model,
  subject,
  topic,
  difficulty,
  patterns,
  displayCount,
  priorFingerprints,
  priorSnippets = [],
  logPrefix,
  maxRefillBatches,
}) {
  const quotaPlan = buildEqualPatternQuota(patterns, displayCount);
  let all = [];
  const bulkBatchSize = getPracticeBulkBatchSize(displayCount);
  const targetPool = displayCount + Math.min(3, getPracticeGenerateBuffer());
  const maxBulkRounds = Math.ceil(targetPool / bulkBatchSize) + 1;

  console.log(
    `📝 ${logPrefix}: bulk mode — ${maxBulkRounds} max rounds × ${bulkBatchSize}Q, patterns: ${patterns.length}`
  );

  for (let round = 0; round < maxBulkRounds && all.length < targetPool; round += 1) {
    const need = Math.min(bulkBatchSize, targetPool - all.length);
    const excludeSnippets = buildPracticeExcludeSnippets(priorSnippets, all);
    console.log(`📝 ${logPrefix}: bulk round ${round + 1}, requesting ${need} (pool ${all.length}/${targetPool})...`);
    const { questions } = await generateTopicPracticeBatch(
      apiKey,
      model,
      need,
      `Bulk round ${round + 1}`,
      subject,
      topic,
      difficulty,
      excludeSnippets,
      patterns,
      null
    );
    if (!questions?.length) break;
    const tagged = questions.map((q) => tagQuestionWithPattern(q, inferPracticePatternId(q, patterns)));
    all = dedupeMockPaperQuestions([...all, ...tagged], { priorFingerprints, csat: false });
  }

  const requestPatternBatch = async (patternId, batchSize, batchLabel) => {
    const excludeSnippets = buildPracticeExcludeSnippets(priorSnippets, all);
    return generateTopicPracticeBatch(
      apiKey,
      model,
      batchSize,
      batchLabel,
      subject,
      topic,
      difficulty,
      excludeSnippets,
      [patternId],
      patternId
    );
  };

  const maxRefills = Math.min(maxRefillBatches, 3);
  for (let refill = 0; refill < maxRefills; refill += 1) {
    const short = quotaPlan
      .filter((p) => countPatternQuestions(all, p.patternId) < p.count)
      .sort((a, b) => a.count - countPatternQuestions(all, a.patternId) - (b.count - countPatternQuestions(all, b.patternId)));

    if (short.length === 0) break;

    let progress = false;
    for (const { patternId, count } of short.slice(0, 3)) {
      const before = countPatternQuestions(all, patternId);
      if (before >= count) continue;
      const need = count - before;
      const batchSize = practiceBatchRequestSize(need);
      console.log(
        `📝 ${logPrefix}: refill ${refill + 1} — ${PATTERN_LABELS[patternId]} ${before}/${count}, requesting ${batchSize}...`
      );
      const { questions } = await requestPatternBatch(
        patternId,
        batchSize,
        `${PATTERN_LABELS[patternId]} refill ${refill + 1}`
      );
      if (!questions?.length) continue;
      const tagged = questions.map((q) => tagQuestionWithPattern(q, patternId));
      const merged = dedupeMockPaperQuestions([...all, ...tagged], { priorFingerprints, csat: false });
      if (merged.length > all.length || countPatternQuestions(merged, patternId) > before) {
        progress = true;
      }
      all = merged;
    }
    if (!progress) break;
  }

  const toppedUp = await topUpPracticeQuotaGap({
    all,
    quotaPlan,
    patterns,
    displayCount,
    priorFingerprints,
    requestPatternBatch,
    logPrefix,
    maxRounds: Math.min(3, maxRefillBatches),
  });

  return { finalQuestions: toppedUp.finalQuestions, deduped: toppedUp.all, quotaPlan };
}

/**
 * Generate topic practice with equal quota per pattern (e.g. 10 patterns × 5 Q = 50).
 * Legacy path — many API calls; use bulk mode by default.
 */
async function runTopicPracticePatternQuotaLoop({
  apiKey,
  model,
  subject,
  topic,
  difficulty,
  patterns,
  displayCount,
  priorFingerprints,
  priorSnippets = [],
  logPrefix,
  maxRefillBatches,
}) {
  const quotaPlan = buildEqualPatternQuota(patterns, displayCount);
  let all = [];

  console.log(
    `📝 ${logPrefix}: equal pattern quota — ${quotaPlan.map((p) => `${PATTERN_LABELS[p.patternId] || p.patternId}=${p.count}`).join(", ")}`
  );

  const maxAttemptsPerPattern = Math.max(
    3,
    Math.ceil(Math.max(...quotaPlan.map((p) => p.count), 1) / getPracticeBatchSize()) + 2
  );

  const requestPatternBatch = async (patternId, batchSize, batchLabel) => {
    const excludeSnippets = buildPracticeExcludeSnippets(priorSnippets, all);
    return generateTopicPracticeBatch(
      apiKey,
      model,
      batchSize,
      batchLabel,
      subject,
      topic,
      difficulty,
      excludeSnippets,
      [patternId],
      patternId
    );
  };

  for (const { patternId, count } of quotaPlan) {
    let stallRounds = 0;
    let attempts = 0;

    while (countPatternQuestions(all, patternId) < count && attempts < maxAttemptsPerPattern) {
      const before = countPatternQuestions(all, patternId);
      const need = count - before;
      const batchSize = practiceBatchRequestSize(need);
      console.log(
        `📝 ${logPrefix}: ${PATTERN_LABELS[patternId]} ${before}/${count}, requesting ${batchSize}...`
      );
      const { questions } = await requestPatternBatch(
        patternId,
        batchSize,
        `${PATTERN_LABELS[patternId]} (${before + 1}–${count})`
      );
      if (questions?.length) {
        const tagged = questions.map((q) => tagQuestionWithPattern(q, patternId));
        all = dedupeMockPaperQuestions([...all, ...tagged], { priorFingerprints, csat: false });
      }
      attempts += 1;
      if (countPatternQuestions(all, patternId) === before) stallRounds += 1;
      else stallRounds = 0;
      if (stallRounds >= 5) {
        console.warn(`📝 ${logPrefix}: stall on pattern ${patternId}`);
        break;
      }
    }

    const got = countPatternQuestions(all, patternId);
    if (got < count) {
      console.warn(`📝 ${logPrefix}: pattern ${patternId} short — ${got}/${count}`);
    }
  }

  let refill = 0;
  while (refill < maxRefillBatches) {
    const short = quotaPlan.filter((p) => countPatternQuestions(all, p.patternId) < p.count);
    if (short.length === 0) break;
    let progress = false;
    for (const { patternId, count } of short) {
      const before = countPatternQuestions(all, patternId);
      if (before >= count) continue;
      const need = count - before;
      const batchSize = practiceBatchRequestSize(need);
      console.log(
        `📝 ${logPrefix}: refill ${refill + 1} — ${PATTERN_LABELS[patternId]} need ${need}...`
      );
      const { questions } = await requestPatternBatch(
        patternId,
        batchSize,
        `${PATTERN_LABELS[patternId]} refill ${refill + 1}`
      );
      if (questions?.length) {
        const tagged = questions.map((q) => tagQuestionWithPattern(q, patternId));
        const merged = dedupeMockPaperQuestions([...all, ...tagged], { priorFingerprints, csat: false });
        if (merged.length > all.length || countPatternQuestions(merged, patternId) > before) {
          progress = true;
        }
        all = merged;
      }
    }
    refill += 1;
    if (!progress) break;
  }

  const toppedUp = await topUpPracticeQuotaGap({
    all,
    quotaPlan,
    patterns,
    displayCount,
    priorFingerprints,
    requestPatternBatch,
    logPrefix,
    maxRounds: Math.max(12, maxRefillBatches + 4),
  });

  return { finalQuestions: toppedUp.finalQuestions, deduped: toppedUp.all, quotaPlan };
}

/**
 * Token-efficient 50Q generator for admin topic practice.
 * Uses compact prompts, 10Q batches, small over-generate buffer, and prior-stem exclusion.
 */
export const generateAssignedPracticeQuestions = async ({
  subject,
  topic,
  difficulty = "Moderate",
  questionCount = 50,
  excludeSnippets = [],
  patternsToInclude = [],
  priorFingerprints = null,
}) => {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = getPracticeGenerationModel();

    if (!apiKey) {
      throw new Error("Missing OPENROUTER_API_KEY in environment variables");
    }

    const subjectStr = String(subject || "").trim();
    const topicStr = String(topic || "").trim();
    if (!subjectStr || !topicStr) {
      throw new Error("Subject and topic are required");
    }

    const displayCount = Math.max(10, Math.min(50, parseInt(questionCount, 10) || 50));
    const diffNorm = ["easy", "moderate", "hard"].includes(String(difficulty || "").toLowerCase())
      ? String(difficulty).toLowerCase()
      : "moderate";
    const prior =
      priorFingerprints ||
      (Array.isArray(excludeSnippets) && excludeSnippets.length > 0
        ? { fullKeys: new Set(), stemKeys: new Set(), looseKeys: new Set(), snippets: excludeSnippets }
        : null);
    const priorSnippets = prior?.snippets?.length ? prior.snippets : excludeSnippets;
    const priorCount = prior?.fullKeys?.size || 0;
    const patterns = resolveTopicPracticePatterns(patternsToInclude);
    if (patterns.length === 0) {
      throw new Error("Select at least one question pattern");
    }

    const perPatternCount = Math.floor(displayCount / patterns.length);
    const maxRefillBatches =
      getPracticeMaxRefillBatches() + (priorCount > 0 ? Math.min(2, Math.floor(priorCount / 50)) : 0);

    const costMode = isPracticeBatchHindiEnabled() ? "english+code-hindi" : "english-only";
    const genMode = isPracticeBulkGenerationEnabled() ? "bulk" : "per-pattern";

    console.log(
      `📝 Topic practice: ${patterns.length} patterns × ~${perPatternCount}Q each (${displayCount} total), model=${model}, priorQ=${priorCount}, mode=${genMode}`
    );

    const runLoop = isPracticeBulkGenerationEnabled()
      ? runTopicPracticeBulkFirstLoop
      : runTopicPracticePatternQuotaLoop;

    const { finalQuestions, quotaPlan } = await runLoop({
      apiKey,
      model,
      subject: subjectStr,
      topic: topicStr,
      difficulty: diffNorm,
      patterns,
      displayCount,
      priorFingerprints: prior,
      priorSnippets,
      logPrefix: `Topic practice (${subjectStr} — ${topicStr})`,
      maxRefillBatches,
    });

    if (quotaPlan?.length) {
      console.log(
        `📝 Topic practice quota result: ${quotaPlan
          .map((p) => `${p.patternId}=${countPatternQuestions(finalQuestions, p.patternId)}/${p.count}`)
          .join(", ")} (total ${finalQuestions.length}/${displayCount})`
      );
    }

    if (finalQuestions.length === 0) {
      throw new Error("No valid UPSC questions generated. Please try again.");
    }

    let workingPool = [...finalQuestions];

    if (workingPool.length < displayCount) {
      console.log(`📝 Topic practice: short by ${displayCount - workingPool.length}, running final gap fill...`);
      for (let attempt = 0; attempt < 2 && workingPool.length < displayCount; attempt += 1) {
        const patternId = patterns[attempt % patterns.length];
        const need = displayCount - workingPool.length;
        const excludeSnippets = buildPracticeExcludeSnippets(priorSnippets, workingPool);
        const { questions } = await generateTopicPracticeBatch(
          apiKey,
          model,
          practiceBatchRequestSize(need),
          `Final gap ${attempt + 1}`,
          subjectStr,
          topicStr,
          diffNorm,
          excludeSnippets,
          [patternId],
          patternId
        );
        if (!questions?.length) continue;
        const tagged = questions.map((q) => tagQuestionWithPattern(q, patternId));
        const merged = dedupeMockPaperQuestions(
          [...workingPool, ...tagged.map(sanitizePracticeQuestion)],
          { priorFingerprints: prior }
        );
        if (merged.length > workingPool.length) workingPool = merged;
      }
    }

    if (workingPool.length < displayCount) {
      throw new Error(
        `Only ${workingPool.length} of ${displayCount} questions were generated. Please try again.`
      );
    }

    const dedupedFinal = dedupeMockPaperQuestions(
      workingPool.map(sanitizePracticeQuestion),
      { priorFingerprints: prior }
    );
    if (dedupedFinal.length < displayCount) {
      throw new Error(
        `Only ${dedupedFinal.length} unique questions after deduplication. Please try again.`
      );
    }

    let translatedQuestions = finalizeGeneratedQuestions(
      dedupedFinal.slice(0, displayCount).map(stripLlmHindiFromPracticeQuestion)
    );

    if (isPracticeBatchHindiEnabled()) {
      translatedQuestions = await translatePracticeQuestionsToHindi(translatedQuestions, 4);
    }

    console.log(
      `✅ Topic practice: ${translatedQuestions.length} questions (${subjectStr} — ${topicStr}, model: ${model}, mode: ${costMode})`
    );

    return {
      success: true,
      questions: translatedQuestions,
      count: translatedQuestions.length,
    };
  } catch (error) {
    console.error("Error generating assigned practice questions:", error);
    return {
      success: false,
      error: error.message || "Failed to generate questions",
      questions: [],
    };
  }
};

/**
 * Max API batch rounds for topic-based generation (dedupe often drops questions).
 */
function getTestGenMaxBatchRounds(count, batchSize) {
  const minRounds = Math.ceil(count / batchSize);
  const envRefill = parseInt(process.env.TEST_GEN_MAX_REFILL_BATCHES, 10);
  if (count >= 50) {
    return minRounds + Math.max(10, Math.min(25, envRefill || 15));
  }
  if (count >= 20) {
    return minRounds + Math.max(4, Math.min(12, envRefill || 6));
  }
  return minRounds + 2;
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
    const maxBatchRounds = getTestGenMaxBatchRounds(count, batchSize);
    let stallRounds = 0;

    for (let round = 0; validatedQuestions.length < count && round < maxBatchRounds; round += 1) {
      const beforeLen = validatedQuestions.length;
      const need = Math.min(batchSize, count - validatedQuestions.length);
      const avoidSnippets = validatedQuestions
        .map((q) => String(q.question_en || q.question || "").trim().slice(0, 60))
        .filter(Boolean)
        .slice(0, 8);

      const batchUserPrompt = buildPrelimsBatchUserPrompt({
        examType,
        need,
        topic,
        subjectsText,
        difficulty,
      });

      const isRefill = round >= Math.ceil(count / batchSize);
      console.log(
        `📝 Prelims batch ${round + 1}/${maxBatchRounds}${isRefill ? " (refill)" : ""}: requesting ${need} question(s) (${validatedQuestions.length}/${count} so far)...`
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
        stallRounds += 1;
        if (stallRounds >= 5) {
          console.warn("⚠️ Too many empty batches; stopping early");
          break;
        }
        continue;
      }

      validatedQuestions = dedupeMockPaperQuestions([...validatedQuestions, ...batchQuestions], {
        csat: examType === "CSAT",
      }).slice(0, count);

      if (validatedQuestions.length === beforeLen) {
        stallRounds += 1;
      } else {
        stallRounds = 0;
      }
    }

    // Last-resort top-up: request exactly the missing count in one small batch
    if (validatedQuestions.length > 0 && validatedQuestions.length < count) {
      const missing = count - validatedQuestions.length;
      console.log(`📝 Prelims final top-up: requesting ${missing} more question(s)...`);
      const avoidSnippets = validatedQuestions
        .map((q) => String(q.question_en || q.question || "").trim().slice(0, 60))
        .filter(Boolean)
        .slice(0, 8);
      const topUpPrompt = buildPrelimsBatchUserPrompt({
        examType,
        need: missing,
        topic,
        subjectsText,
        difficulty,
      });
      const { questions: topUp, apiCalls: topUpCalls } = await fetchQuestionBatch({
        apiKey,
        model,
        systemPrompt,
        userPrompt: topUpPrompt,
        need: missing,
        avoidSnippets,
        csatPaper: examType === "CSAT",
      });
      apiCalls += topUpCalls;
      if (topUp.length > 0) {
        validatedQuestions = dedupeMockPaperQuestions([...validatedQuestions, ...topUp], {
          csat: examType === "CSAT",
        }).slice(0, count);
      }
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
  generateAssignedPracticeQuestions,
  generateFullMockTestQuestions,
  generateFullMockMixTestQuestions,
  generateFullMockPyoTestQuestions,
  generateFullMockCsatTestQuestions,
  dedupeQuestions,
  dedupeQuestionsByStem,
  canonicalDedupeKey,
  buildQuestionFingerprints,
  filterOutPriorRepeats,
  isQuestionRepeatOfPrior,
};
