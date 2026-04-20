import fetch from "node-fetch";
import crypto from "crypto";

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

OUTPUT FORMAT (STRICT – JSON ONLY):
Return ONLY valid JSON. For each question:
{
  "pattern": "STATEMENT_BASED | ASSERTION_REASON | HOW_MANY_CORRECT | MATCH | WHICH_CORRECT | CONCEPT_CURRENT",
  "question": "Question text",
  "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
  "answer": "A | B | C | D",
  "explanation": { "A": "", "B": "", "C": "", "D": "" },
  "subject": "One of: ${subjectsText}"
}

EXPLANATION (OPTION-WISE, MANDATORY – same as CSAT):
- explanation MUST be an object: { "A": "...", "B": "...", "C": "...", "D": "..." }.
- For the CORRECT option: write "correct statement" — WHY it is correct (reason, fact, concept). User should see sahi hai toh kyu.
- For EACH INCORRECT option: write "wrong statement" — WHY it is wrong (wrong fact, trap, common mistake). User should see galat hai toh kyu.
- At least 1–2 sentences per option. No empty explanation for any option.

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

OUTPUT FORMAT (STRICT – JSON ONLY):
Return ONLY valid JSON. For each question:
{
  "pattern": "QUANTITATIVE | LOGICAL_REASONING | READING_COMPREHENSION | DATA_INTERPRETATION",
  "question": "Question text (include passage for RC/DI if needed)",
  "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
  "answer": "A | B | C | D",
  "explanation": { "A": "", "B": "", "C": "", "D": "" },
  "subject": "CSAT"
}

EXPLANATION (OPTION-WISE, MANDATORY):
- explanation MUST be an object: { "A": "...", "B": "...", "C": "...", "D": "..." }.
- For the CORRECT option: write "correct statement" — WHY it is correct (reason, logic, fact).
- For EACH INCORRECT option: write "wrong statement" — WHY it is wrong (wrong step, trap, common mistake).
- At least 1–2 sentences per option. No empty explanation for any option.

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
async function generateFullMockCsatBatch(apiKey, model, batchSize, batchLabel) {
  const userPrompt = `Generate EXACTLY ${batchSize} UPSC CSAT Paper 2 questions. This is ${batchLabel}. Mix sections: Reading Comprehension (25-30%), Logical Reasoning (15-20%), Analytical Ability (10-15%), Basic Numeracy (10-15%), Data Interpretation (5-10%). Return ONLY valid JSON with "test_name", "questions" array. Each question: question_number, section, question, options (A,B,C,D), correct_answer, explanation as object { "A": "why A correct or wrong", "B": "...", "C": "...", "D": "..." } — for correct option say why it is right, for each wrong option say why it is wrong.`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.FRONTEND_URL || "http://localhost:5173",
      "X-Title": "UPSC Mentor - CSAT Mock Generator",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: buildFullMockCsatSystemPrompt() },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.35,
      max_tokens: 8000,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API error: ${response.status} ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const aiContent = data?.choices?.[0]?.message?.content?.trim();
  if (!aiContent) throw new Error("No response from AI");

  try {
    const { validatedQuestions, testName } = parseFullMockResponse(aiContent);
    return { questions: validatedQuestions, testName };
  } catch (parseErr) {
    try {
      const validated = parseAndValidateQuestions(aiContent, batchSize);
      if (validated && validated.length > 0) {
        return { questions: validated, testName: "UPSC CSAT Full Mock" };
      }
    } catch (_) {}
    console.error("Full mock CSAT batch parse failed. Raw (first 500 chars):", aiContent.slice(0, 500));
    throw parseErr;
  }
}

/** Display count for CSAT: we generate more to avoid duplicates, then show only this many. */
const CSAT_DISPLAY_COUNT = 80;
/** Generate this many CSAT questions; after dedupe we take first CSAT_DISPLAY_COUNT for the paper. */
const CSAT_GENERATE_COUNT = 100;

/**
 * Generate full-length (80 questions) CSAT Paper 2 mock: generate 100 (5 batches of 20), show 80. Gemini 2.0.
 * @returns {Promise<Object>} - { success, questions?, count?, testName?, error? }
 */
export const generateFullMockCsatTestQuestions = async () => {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001";

    if (!apiKey) {
      throw new Error("Missing OPENROUTER_API_KEY in environment variables");
    }

    const batches = Math.ceil(CSAT_GENERATE_COUNT / 20);
    const perBatch = 20;
    const all = [];
    let testName = "UPSC CSAT Full Mock";

    for (let b = 1; b <= batches; b++) {
      console.log(`📝 Full mock CSAT: generating batch ${b}/${batches} (${perBatch} questions)...`);
      const { questions: batchQuestions, testName: batchTestName } = await generateFullMockCsatBatch(apiKey, model, perBatch, `Part ${b}`);
      if (batchTestName) testName = batchTestName;
      if (batchQuestions && batchQuestions.length) all.push(...batchQuestions);
    }

    const deduped = dedupeQuestionsByStem(dedupeQuestions(all));
    const finalQuestions = deduped.slice(0, CSAT_DISPLAY_COUNT);

    if (finalQuestions.length === 0) {
      throw new Error("No valid CSAT questions generated. Please try again.");
    }

    console.log(`✅ Full mock CSAT: generated ${deduped.length}, showing ${finalQuestions.length} questions (no duplicates in paper)`);

    return {
      success: true,
      questions: finalQuestions,
      count: finalQuestions.length,
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
async function generateFullMockPyoBatch(apiKey, model, batchSize, batchLabel, yearFrom, yearTo) {
  const userPrompt = `Generate EXACTLY ${batchSize} UPSC Prelims PYQ-style questions for ${yearFrom}–${yearTo}. This is ${batchLabel}. Recreate based on trends and themes; do not copy exact PYQs. Mix subjects like real UPSC. Include real UPSC question types: statement-based, assertion-reason, match the following, pair-based, which correct/incorrect. For each question give explanation as object { "A": "...", "B": "...", "C": "...", "D": "..." }: for correct option explain why it is right, for each wrong option explain why it is wrong. Return ONLY valid JSON with "test_name", "questions" array.`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.FRONTEND_URL || "http://localhost:5173",
      "X-Title": "UPSC Mentor - PYQ Mock Generator",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: buildFullMockPyoSystemPrompt(yearFrom, yearTo) },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.35,
      max_tokens: 8000,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API error: ${response.status} ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const aiContent = data?.choices?.[0]?.message?.content?.trim();
  if (!aiContent) throw new Error("No response from AI");

  try {
    const { validatedQuestions, testName } = parseFullMockResponse(aiContent);
    return { questions: validatedQuestions, testName };
  } catch (parseErr) {
    try {
      const validated = parseAndValidateQuestions(aiContent, batchSize);
      if (validated && validated.length > 0) {
        return { questions: validated, testName: `UPSC PYQ Style Mock ${yearFrom}–${yearTo}` };
      }
    } catch (_) {}
    console.error("Full mock PYQ batch parse failed. Raw (first 500 chars):", aiContent.slice(0, 500));
    throw parseErr;
  }
}

/** Display count for PYQ full mock; we generate more to avoid duplicates. */
const PYQ_DISPLAY_COUNT = 100;
const PYQ_GENERATE_COUNT = 120;

/**
 * Generate full-length (100 questions) PYQ-style mock: generate 120 (6 batches of 20), show 100. Gemini 2.0.
 * @param {Object} params
 * @param {number} params.yearFrom - e.g. 2010
 * @param {number} params.yearTo - e.g. 2025
 */
export const generateFullMockPyoTestQuestions = async ({ yearFrom, yearTo }) => {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001";

    if (!apiKey) {
      throw new Error("Missing OPENROUTER_API_KEY in environment variables");
    }

    const batches = Math.ceil(PYQ_GENERATE_COUNT / 20);
    const perBatch = 20;
    const all = [];
    let testName = `UPSC PYQ Style Mock ${yearFrom}–${yearTo}`;

    for (let b = 1; b <= batches; b++) {
      console.log(`📝 Full mock PYQ: generating batch ${b}/${batches} (${perBatch} questions)...`);
      const { questions: batchQuestions, testName: batchTestName } = await generateFullMockPyoBatch(apiKey, model, perBatch, `Part ${b}`, yearFrom, yearTo);
      if (batchTestName) testName = batchTestName;
      if (batchQuestions && batchQuestions.length) all.push(...batchQuestions);
    }

    const deduped = dedupeQuestionsByStem(dedupeQuestions(all));
    const finalQuestions = deduped.slice(0, PYQ_DISPLAY_COUNT);

    if (finalQuestions.length === 0) {
      throw new Error("No valid UPSC questions generated for PYQ mock. Please try again.");
    }

    console.log(`✅ Full mock PYQ: generated ${deduped.length}, showing ${finalQuestions.length} questions (no duplicates in paper)`);

    return {
      success: true,
      questions: finalQuestions,
      count: finalQuestions.length,
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
  const isSectional = totalQuestions === 50;
  const contextLine = isSectional
    ? `This is ${batchLabel} of a 50-question SECTIONAL mock. Use the SAME format as full-length: same question types (statement, match, assertion, chronology, pair, map, direct), same structured JSON (questionText, tableData, matchColumns, assertionReason, options array, explanation per option). Generate exactly ${batchSize} questions.`
    : `This is ${batchLabel} of a 100-question full-length mock. Generate exactly ${batchSize} questions.`;
  const typeMixLine =
    Array.isArray(patternsToInclude) && patternsToInclude.length > 0
      ? `Use ONLY these question patterns in balanced proportion: ${patternsToInclude.map((id) => PATTERN_LABELS[id] || id).join(", ")}.`
      : "Question type mix: ~60% statement, ~12% match, ~6% assertion, ~8% pair, ~4% chronology, ~5% map, ~5% direct.";
  const userPrompt = `Generate EXACTLY ${batchSize} UPSC Prelims GS Paper 1 questions. ${contextLine}

Subject mix in this batch (scale to batch size): Polity, History, Geography, Economy, Environment, Science & Tech, Art & Culture; integrate Current Affairs where relevant.
${typeMixLine}
Difficulty mix: 50% moderate, 35% hard, 15% easy.

For each question: option-wise explanation (explanation.A/B/C/D), at least 120 words total per question; eliminationLogic; conceptualSource (e.g. NCERT, standard text).
Return ONLY valid JSON with "examTitle" or "test_name", "questions" array. Each question: id/question_number, subject, questionType, difficulty, questionText/question, tableData (if needed), matchColumns (if match), assertionReason (if assertion), options as [ { "key": "A", "text": "..." }, ... ], correctAnswer (A|B|C|D), explanation as { "A": "", "B": "", "C": "", "D": "" }, eliminationLogic, conceptualSource.`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.FRONTEND_URL || "http://localhost:5173",
      "X-Title": "UPSC Mentor - Full Mock Mix Generator",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: buildFullMockMixSystemPrompt(difficulty, excludeSnippets, patternsToInclude) },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.35,
      max_tokens: 8000,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API error: ${response.status} ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const aiContent = data?.choices?.[0]?.message?.content?.trim();
  if (!aiContent) throw new Error("No response from AI");

  try {
    const { validatedQuestions, testName } = parseFullMockResponse(aiContent);
    return { questions: validatedQuestions, testName };
  } catch (parseErr) {
    // Fallback: model may return raw array or different JSON shape
    try {
      const validated = parseAndValidateQuestions(aiContent, batchSize);
      if (validated && validated.length > 0) {
        return { questions: validated, testName: "UPSC Real Prelims Mock" };
      }
    } catch (_) {}
    console.error("Full mock MIX batch parse failed. Raw (first 500 chars):", aiContent.slice(0, 500));
    throw parseErr;
  }
}

/** For 100Q mock we generate 120 first; refill batches run until 100 UNIQUE questions (dedupe drops dupes). 50Q: 60 then refill to 50. */
const MIX_GENERATE_100 = 120;
const MIX_GENERATE_50 = 60;
const MIX_DISPLAY_100 = 100;
const MIX_DISPLAY_50 = 50;
/** Max extra API batches if dedupe leaves us short of display count (each batch = 20 questions). */
const MIX_MAX_REFILL_BATCHES = 35;

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
  const generateCount = isSectional ? MIX_GENERATE_50 : MIX_GENERATE_100;
  const difficulty = ["easy", "moderate", "hard"].includes(String(opts.difficulty || "").toLowerCase())
    ? String(opts.difficulty).toLowerCase()
    : "moderate";
  const excludeSnippets = Array.isArray(opts.excludeSnippets) ? opts.excludeSnippets : [];
  const patternsToInclude = Array.isArray(opts.patternsToInclude) && opts.patternsToInclude.length > 0 ? opts.patternsToInclude : [];

  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001";

    if (!apiKey) {
      throw new Error("Missing OPENROUTER_API_KEY in environment variables");
    }

    const batches = Math.ceil(generateCount / (isSectional ? 20 : 20));
    const perBatch = 20;
    const all = [];
    let testName = isSectional ? "UPSC GS Sectional Mock (50 Q)" : "UPSC Real Prelims Mock";

    for (let b = 1; b <= batches; b++) {
      const fromAll = dedupeQuestionsByStem(dedupeQuestions(all))
        .map((q) => String(q.question || q.questionText || "").trim().slice(0, 120))
        .filter(Boolean);
      const rollingExclude = [...new Set([...excludeSnippets, ...fromAll])].slice(0, 40);
      console.log(`📝 Full mock MIX: generating batch ${b}/${batches} (${perBatch} questions, difficulty=${difficulty})...`);
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
    let refill = 0;
    while (deduped.length < displayCount && refill < MIX_MAX_REFILL_BATCHES) {
      const fromDeduped = deduped
        .map((q) => String(q.question || q.questionText || "").trim().slice(0, 120))
        .filter(Boolean);
      const snippetPool = [...new Set([...excludeSnippets, ...fromDeduped])].slice(0, 40);
      console.log(
        `📝 Full mock MIX: refill ${refill + 1}/${MIX_MAX_REFILL_BATCHES} (unique so far ${deduped.length}/${displayCount}, need ${displayCount - deduped.length} more)...`
      );
      const { questions: batchQuestions, testName: batchTestName } = await generateFullMockMixBatch(
        apiKey,
        model,
        perBatch,
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
    }

    const finalQuestions = deduped.slice(0, displayCount);

    if (finalQuestions.length === 0) {
      throw new Error("No valid UPSC questions generated for full mock mix. Please try again.");
    }
    if (finalQuestions.length < displayCount) {
      throw new Error(
        `Full mock MIX: only ${finalQuestions.length} unique questions after ${batches + refill} batches (need ${displayCount}). Try again or increase MIX_MAX_REFILL_BATCHES.`
      );
    }

    console.log(`✅ Full mock MIX: ${deduped.length} unique generated, showing ${finalQuestions.length} questions (no duplicates in paper)`);

    return {
      success: true,
      questions: finalQuestions,
      count: finalQuestions.length,
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
 * Normalize options from either array [{ key, text }] or object { A, B, C, D }.
 */
function normalizeOptions(q) {
  const optionsObj = { A: "", B: "", C: "", D: "" };
  if (Array.isArray(q.options) && q.options.length >= 4) {
    q.options.forEach((opt) => {
      const key = (opt.key || opt.Key || "").toUpperCase().charAt(0);
      if (["A", "B", "C", "D"].includes(key)) optionsObj[key] = String(opt.text ?? opt.value ?? "").trim();
    });
  } else if (typeof q.options === "object" && q.options !== null) {
    optionsObj.A = String(q.options.A ?? q.options.a ?? "").trim();
    optionsObj.B = String(q.options.B ?? q.options.b ?? "").trim();
    optionsObj.C = String(q.options.C ?? q.options.c ?? "").trim();
    optionsObj.D = String(q.options.D ?? q.options.d ?? "").trim();
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
      const questionText = q.questionText ?? q.question ?? "";
      const optionsObj = normalizeOptions(q);
      const correct = (q.correct_answer || q.correctAnswer || q.answer || "").toUpperCase().charAt(0);
      const difficulty = ["easy", "moderate", "hard"].includes(String(q.difficulty || "").toLowerCase())
        ? String(q.difficulty).toLowerCase()
        : "moderate";
      const questionType = q.questionType || q.type || "direct";
      const base = {
        subject: q.subject != null && String(q.subject).trim() ? String(q.subject).trim() : undefined,
        difficulty,
        question: questionText,
        options: optionsObj,
        correctAnswer: ["A", "B", "C", "D"].includes(correct) ? correct : null,
        explanation: normalizeExplanation(q.explanation),
        patternType: questionType,
        questionType,
      };
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
      if (q.eliminationLogic != null && String(q.eliminationLogic).trim()) base.eliminationLogic = String(q.eliminationLogic).trim();
      if (q.conceptualSource != null && String(q.conceptualSource).trim()) base.conceptualSource = String(q.conceptualSource).trim();
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
 * Generate 20 questions per batch using GS prompt (array format). Used for full-mock.
 * @param {string[]} [patternsToInclude] - If provided, use only these question patterns in balanced proportion.
 */
async function generateFullMockBatch(apiKey, model, subject, batchLabel, patternsToInclude = []) {
  const subjectsList = typeof subject === "string" ? subject.split(",").map((s) => s.trim()) : [subject];
  const systemPrompt = buildGSSystemPrompt(subjectsList, `Full Mock - ${batchLabel}`, "Moderate", null, patternsToInclude);
  const userPrompt = `Generate EXACTLY 20 UPSC Prelims GS Paper 1 MCQs. Subjects: ${subjectsList.join(", ")}. Topic: Full Mock - ${batchLabel}. Difficulty: Moderate.

Output ONLY a valid JSON array of 20 objects. No markdown, no code fences, no explanation before or after.
Each object must have: "question" (string), "options" (array of 4 strings in order A,B,C,D), "answer" (one of "A","B","C","D"), "explanation" (object { "A": "", "B": "", "C": "", "D": "" } — for correct option write correct statement (why right), for each wrong option write wrong statement (why wrong)). Optional: "pattern", "subject".
Example: [{"question":"...","options":["opt A","opt B","opt C","opt D"],"answer":"B","explanation":{"A":"wrong because...","B":"correct because...","C":"wrong because...","D":"wrong because..."}}, ...]`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.FRONTEND_URL || "http://localhost:5173",
      "X-Title": "UPSC Mentor - Full Mock Generator",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.35,
      max_tokens: 8000,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API error: ${response.status} ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const aiContent = data?.choices?.[0]?.message?.content?.trim();
  if (!aiContent) throw new Error("No response from AI");

  try {
    return parseAndValidateQuestions(aiContent, 20);
  } catch (parseErr) {
    console.error(`Full mock batch "${batchLabel}" parse failed. Raw response (first 600 chars):`, aiContent.slice(0, 600));
    throw parseErr;
  }
}

/** Subject-based full mock: generate 120, show 100 to avoid duplicates in paper. */
const SUBJECT_FULL_DISPLAY_COUNT = 100;
const SUBJECT_FULL_GENERATE_COUNT = 120;

/**
 * Generate full-length (100 questions) UPSC Prelims GS Paper 1 mock: 6 batches of 20 (120 generated), show 100.
 * @param {Object} params
 * @param {string} params.subject - Subject from admin (e.g. "Polity", "History, Geography")
 * @returns {Promise<Object>} - { success, questions?, count?, testName?, error? }
 */
export const generateFullMockTestQuestions = async ({ subject, patternsToInclude = [] }) => {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001";

    if (!apiKey) {
      throw new Error("Missing OPENROUTER_API_KEY in environment variables");
    }

    const patterns = Array.isArray(patternsToInclude) && patternsToInclude.length > 0 ? patternsToInclude : [];
    const batches = Math.ceil(SUBJECT_FULL_GENERATE_COUNT / 20);
    const perBatch = 20;
    const all = [];
    for (let b = 1; b <= batches; b++) {
      console.log(`📝 Full mock: generating batch ${b}/${batches} (${perBatch} questions)...`);
      const batch = await generateFullMockBatch(apiKey, model, subject, `Part ${b}`, patterns);
      if (batch && batch.length) all.push(...batch);
    }
    const deduped = dedupeQuestionsByStem(dedupeQuestions(all));
    const questions = deduped.slice(0, SUBJECT_FULL_DISPLAY_COUNT);

    if (questions.length === 0) {
      throw new Error("No valid UPSC questions generated for full mock. Please try again.");
    }

    console.log(`✅ Full mock: generated ${deduped.length}, showing ${questions.length} questions (no duplicates in paper)`);

    return {
      success: true,
      questions,
      count: questions.length,
      testName: `Prelims Mock - ${subject}`,
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
    const preview = content.slice(0, 400);
    console.error("parseAndValidateQuestions: no array found. Preview:", preview);
    throw new Error("AI response did not contain a valid JSON questions list");
  }

  const validatedQuestions = questions
    .map((q) => {
      const optionsObj = {};
      if (Array.isArray(q.options) && q.options.length >= 4) {
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
      let correct = q.answer ?? q.correctAnswer ?? q.correct_answer ?? "";
      correct = String(correct).toUpperCase().trim().charAt(0);
      if (["1", "2", "3", "4"].includes(correct)) correct = ["A", "B", "C", "D"][parseInt(correct, 10) - 1];
      if (!["A", "B", "C", "D"].includes(correct)) correct = null;
      const questionText = String(q.question ?? q.questionText ?? "").trim();
      const difficulty = ["easy", "moderate", "hard"].includes(String(q.difficulty || "").toLowerCase())
        ? String(q.difficulty).toLowerCase()
        : "moderate";
      const row = {
        difficulty,
        question: questionText,
        options: optionsObj,
        correctAnswer: correct,
        explanation: normalizeExplanation(q.explanation),
        patternType: q.pattern || "GENERAL",
      };
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
    const model = process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001";

    if (!apiKey) {
      throw new Error("Missing OPENROUTER_API_KEY in environment variables");
    }

    const count = parseInt(questionCount, 10) || 20;
    let systemPrompt;
    let userPrompt;

    if (examType === "CSAT") {
      systemPrompt = buildCSATSystemPrompt(csatCategories || [], topic);
      userPrompt = `Generate EXACTLY ${count} UPSC Prelims CSAT MCQs. Topic/Focus: ${topic}. Return EXACTLY ${count} questions in a JSON array as specified.`;
    } else {
      const subjectsList = Array.isArray(subjects) ? subjects : [subjects];
      systemPrompt = buildGSSystemPrompt(subjectsList, topic, difficulty, currentAffairsPeriod);
      const subjectsText = subjectsList.join(", ");
      userPrompt = `Generate EXACTLY ${count} UPSC Prelims GS Paper 1 MCQs. Subjects: ${subjectsText}. Topic: ${topic}. Difficulty: ${difficulty}. Return EXACTLY ${count} questions in a JSON array as specified.`;
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.FRONTEND_URL || "http://localhost:5173",
        "X-Title": "UPSC Mentor - Prelims Test Generator",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: count <= 5 ? 2000 : count <= 10 ? 4000 : 8000,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`OpenRouter API error: ${response.status}`, errorBody);
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const aiContent = data?.choices?.[0]?.message?.content?.trim();

    if (!aiContent) {
      throw new Error("No response received from AI model");
    }

    const validatedQuestions = parseAndValidateQuestions(aiContent, count);

    if (validatedQuestions.length === 0) {
      console.error("No valid questions after mapping. Raw content:", aiContent.substring(0, 500));
      throw new Error("No valid UPSC questions generated. Please try again.");
    }

    console.log(`✅ Generated ${validatedQuestions.length} ${examType} questions`);

    return {
      success: true,
      questions: validatedQuestions,
      count: validatedQuestions.length,
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
