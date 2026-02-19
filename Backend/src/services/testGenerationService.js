import fetch from "node-fetch";

/**
 * Build GS Paper 1 system prompt with optional Current Affairs and Art & Culture emphasis.
 */
function buildGSSystemPrompt(subjects, topic, difficulty, currentAffairsPeriod) {
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
  "explanation": "Detailed explanation (3–5 sentences).",
  "subject": "One of: ${subjectsText}"
}

IMPORTANT:
- "explanation" must be DETAILED (3–5 sentences minimum).
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
  "explanation": "Detailed explanation (2–4 sentences).",
  "subject": "CSAT"
}

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
      "explanation": "Detailed explanation explaining why correct and why others are incorrect"
    }
  ]
}

--------------------------------------------
IMPORTANT RULES:
--------------------------------------------
• Do NOT skip question numbers. Number questions 1 to 100.
• Do NOT reduce total questions. Must generate exactly 100 questions.
• Maintain UPSC language tone.
• Avoid repetition.
• Ensure high-quality analytical explanations.
• Output MUST be valid JSON.
• Do NOT add extra commentary outside JSON.
• "type" for each question must be one of: "multi-statement", "assertion-reason", "match", "analytical".
• For assertion-reason: options must be (a) Both correct, A explains R (b) Both correct, A does not explain R (c) A correct, R wrong (d) A wrong, R correct.`;
}

/**
 * Build system prompt for FULL-LENGTH UPSC Prelims GS Paper 1 MIX (all subjects mixed like real exam).
 * Uses official paper-setter persona and strict subject distribution. For Gemini 2.0.
 */
function buildFullMockMixSystemPrompt() {
  return `You are an official UPSC Civil Services Prelims Paper Setter.

Generate a FULL-LENGTH UPSC Prelims GS Paper 1 exactly like the real examination.

STRICT RULES:

• Total Questions: 100
• Total Marks: 200
• Each Question: 2 Marks
• Negative Marking: 0.66
• Duration: 120 Minutes
• Difficulty: Moderate to Tough (2014–2023 level)

Subjects must be mixed like real UPSC:

- Polity: 15–20
- History: 15–20
- Geography: 15–20
- Economy: 15–20
- Environment: 15–20
- Science & Tech: 10–15
- Current Affairs: 15–20

Question Types Must Include:
1. Multi-statement analysis
2. Assertion & Reason
3. Match the Following
4. Analytical / Elimination based tricky questions

Avoid:
- Direct factual one-line questions
- Repeated themes
- Coaching style easy questions

Return ONLY valid JSON in this format:

{
  "test_name": "UPSC Real Prelims Mock",
  "type": "Full Length GS",
  "total_questions": 100,
  "total_marks": 200,
  "negative_marking": 0.66,
  "duration_minutes": 120,
  "questions": [
    {
      "question_number": 1,
      "subject": "",
      "type": "",
      "question": "",
      "options": {
        "A": "",
        "B": "",
        "C": "",
        "D": ""
      },
      "correct_answer": "",
      "explanation": ""
    }
  ]
}

Generate exactly the number of questions requested in this batch (20 per batch when splitting).
Do not write anything outside JSON.`;
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
      "type": "",
      "question": "",
      "options": {
        "A": "",
        "B": "",
        "C": "",
        "D": ""
      },
      "correct_answer": "",
      "explanation": ""
    }
  ]
}

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

Return ONLY valid JSON in this exact format:

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
      "section": "Reading Comprehension / Logical Reasoning / Analytical Ability / Basic Numeracy / Data Interpretation",
      "question": "Full question text here",
      "options": {
        "A": "Option A",
        "B": "Option B",
        "C": "Option C",
        "D": "Option D"
      },
      "correct_answer": "A",
      "explanation": "Clear explanation of logic or calculation."
    }
  ]
}

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
  const userPrompt = `Generate EXACTLY ${batchSize} UPSC CSAT Paper 2 questions. This is ${batchLabel}. Mix sections: Reading Comprehension (25-30%), Logical Reasoning (15-20%), Analytical Ability (10-15%), Basic Numeracy (10-15%), Data Interpretation (5-10%). Return ONLY valid JSON with "test_name", "questions" array. Each question: question_number, section, question, options (A,B,C,D), correct_answer, explanation.`;

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

/**
 * Generate full-length (80 questions) CSAT Paper 2 mock: 4 batches of 20. Gemini 2.0.
 * @returns {Promise<Object>} - { success, questions?, count?, testName?, error? }
 */
export const generateFullMockCsatTestQuestions = async () => {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001";

    if (!apiKey) {
      throw new Error("Missing OPENROUTER_API_KEY in environment variables");
    }

    const batches = 4;
    const perBatch = 20;
    const all = [];
    let testName = "UPSC CSAT Full Mock";

    for (let b = 1; b <= batches; b++) {
      console.log(`📝 Full mock CSAT: generating batch ${b}/${batches} (${perBatch} questions)...`);
      const { questions: batchQuestions, testName: batchTestName } = await generateFullMockCsatBatch(apiKey, model, perBatch, `Part ${b}`);
      if (batchTestName) testName = batchTestName;
      if (batchQuestions && batchQuestions.length) all.push(...batchQuestions);
    }

    const finalQuestions = all.slice(0, 80);

    if (finalQuestions.length === 0) {
      throw new Error("No valid CSAT questions generated. Please try again.");
    }

    console.log(`✅ Full mock CSAT: generated ${finalQuestions.length} questions`);

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
  const userPrompt = `Generate EXACTLY ${batchSize} UPSC Prelims PYQ-style questions for ${yearFrom}–${yearTo}. This is ${batchLabel}. Recreate based on trends and themes; do not copy exact PYQs. Mix subjects like real UPSC. Multi-statement heavy (2018–2023 style). Return ONLY valid JSON with "test_name", "questions" array. Each question: question_number, subject, type, question, options (A,B,C,D), correct_answer, explanation.`;

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

/**
 * Generate full-length (100 questions) PYQ-style mock: 5 batches of 20. Gemini 2.0.
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

    const batches = 5;
    const perBatch = 20;
    const all = [];
    let testName = `UPSC PYQ Style Mock ${yearFrom}–${yearTo}`;

    for (let b = 1; b <= batches; b++) {
      console.log(`📝 Full mock PYQ: generating batch ${b}/${batches} (${perBatch} questions)...`);
      const { questions: batchQuestions, testName: batchTestName } = await generateFullMockPyoBatch(apiKey, model, perBatch, `Part ${b}`, yearFrom, yearTo);
      if (batchTestName) testName = batchTestName;
      if (batchQuestions && batchQuestions.length) all.push(...batchQuestions);
    }

    const finalQuestions = all.slice(0, 100);

    if (finalQuestions.length === 0) {
      throw new Error("No valid UPSC questions generated for PYQ mock. Please try again.");
    }

    console.log(`✅ Full mock PYQ: generated ${finalQuestions.length} questions`);

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
 * Generate one batch of mixed full-mock questions (20 per batch, same as subject-wise).
 */
async function generateFullMockMixBatch(apiKey, model, batchSize, batchLabel) {
  const userPrompt = `Generate EXACTLY ${batchSize} UPSC Prelims GS Paper 1 questions with MIXED subjects as per the rules. This is ${batchLabel}. Mix all subjects (Polity, History, Geography, Economy, Environment, Science & Tech, Current Affairs) in the given proportions. Return ONLY valid JSON with "test_name", "questions" array. Each question must have question_number, subject, type, question, options (A,B,C,D), correct_answer, explanation.`;

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
        { role: "system", content: buildFullMockMixSystemPrompt() },
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

/**
 * Generate full-length (100 questions) UPSC Prelims GS Paper 1 MIX mock using Gemini 2.0.
 * Five batches of 20 (same as subject-wise) to avoid truncation; combines to 100 questions.
 * @returns {Promise<Object>} - { success, questions?, count?, testName?, error? }
 */
export const generateFullMockMixTestQuestions = async () => {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001";

    if (!apiKey) {
      throw new Error("Missing OPENROUTER_API_KEY in environment variables");
    }

    const batches = 5;
    const perBatch = 20;
    const all = [];
    let testName = "UPSC Real Prelims Mock";

    for (let b = 1; b <= batches; b++) {
      console.log(`📝 Full mock MIX: generating batch ${b}/${batches} (${perBatch} questions)...`);
      const { questions: batchQuestions, testName: batchTestName } = await generateFullMockMixBatch(apiKey, model, perBatch, `Part ${b}`);
      if (batchTestName) testName = batchTestName;
      if (batchQuestions && batchQuestions.length) all.push(...batchQuestions);
    }

    const finalQuestions = all.slice(0, 100);

    if (finalQuestions.length === 0) {
      throw new Error("No valid UPSC questions generated for full mock mix. Please try again.");
    }

    console.log(`✅ Full mock MIX: generated ${finalQuestions.length} questions`);

    return {
      success: true,
      questions: finalQuestions,
      count: finalQuestions.length,
      testName: testName || "Prelims Mock - Full Length GS Mix",
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
 * Normalize raw question items to app schema (question, options A-D, correctAnswer, explanation).
 */
function normalizeFullMockQuestions(questions) {
  if (!Array.isArray(questions)) return [];
  return questions
    .map((q) => {
      const optionsObj = {};
      if (typeof q.options === "object" && q.options !== null) {
        optionsObj.A = q.options.A || q.options.a || "";
        optionsObj.B = q.options.B || q.options.b || "";
        optionsObj.C = q.options.C || q.options.c || "";
        optionsObj.D = q.options.D || q.options.d || "";
      }
      const correct = (q.correct_answer || q.correctAnswer || q.answer || "").toUpperCase().charAt(0);
      return {
        question: q.question,
        options: optionsObj,
        correctAnswer: ["A", "B", "C", "D"].includes(correct) ? correct : null,
        explanation: q.explanation || q.concept || "No explanation provided.",
        patternType: q.type || "analytical",
      };
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
      testName = data.test_name || data.title || testName;
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
      testName = data.test_name || data.title || testName;
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
 */
async function generateFullMockBatch(apiKey, model, subject, batchLabel) {
  const subjectsList = typeof subject === "string" ? subject.split(",").map((s) => s.trim()) : [subject];
  const systemPrompt = buildGSSystemPrompt(subjectsList, `Full Mock - ${batchLabel}`, "Moderate", null);
  const userPrompt = `Generate EXACTLY 20 UPSC Prelims GS Paper 1 MCQs. Subjects: ${subjectsList.join(", ")}. Topic: Full Mock - ${batchLabel}. Difficulty: Moderate.

Output ONLY a valid JSON array of 20 objects. No markdown, no code fences, no explanation before or after.
Each object must have: "question" (string), "options" (array of 4 strings in order A,B,C,D), "answer" (one of "A","B","C","D"), "explanation" (string). Optional: "pattern", "subject".
Example: [{"question":"...","options":["opt A","opt B","opt C","opt D"],"answer":"B","explanation":"..."}, ...]`;

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

/**
 * Generate full-length (100 questions) UPSC Prelims GS Paper 1 mock in 5 batches of 20.
 * Smaller batches reduce truncation; truncated responses can still yield complete questions.
 * @param {Object} params
 * @param {string} params.subject - Subject from admin (e.g. "Polity", "History, Geography")
 * @returns {Promise<Object>} - { success, questions?, count?, testName?, error? }
 */
export const generateFullMockTestQuestions = async ({ subject }) => {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001";

    if (!apiKey) {
      throw new Error("Missing OPENROUTER_API_KEY in environment variables");
    }

    const batches = 5;
    const perBatch = 20;
    const all = [];
    for (let b = 1; b <= batches; b++) {
      console.log(`📝 Full mock: generating batch ${b}/${batches} (${perBatch} questions)...`);
      const batch = await generateFullMockBatch(apiKey, model, subject, `Part ${b}`);
      if (batch && batch.length) all.push(...batch);
    }
    const questions = all.slice(0, 100);

    if (questions.length === 0) {
      throw new Error("No valid UPSC questions generated for full mock. Please try again.");
    }

    console.log(`✅ Full mock: generated ${questions.length} questions`);

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
      return {
        question: String(q.question ?? "").trim(),
        options: optionsObj,
        correctAnswer: correct,
        explanation: String(q.explanation || q.concept || "No explanation provided.").trim(),
        patternType: q.pattern || "GENERAL",
      };
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
};
