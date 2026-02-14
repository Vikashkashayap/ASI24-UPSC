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
 * Parse AI response and map to application question schema.
 */
function parseAndValidateQuestions(aiContent, count) {
  let content = aiContent.trim();
  if (content.startsWith("```")) {
    content = content.replace(/^```json\s*/, "").replace(/```$/, "").trim();
  }

  let questions = [];
  try {
    const parsedData = JSON.parse(content);
    questions = Array.isArray(parsedData) ? parsedData : parsedData.questions || [];
  } catch {
    const jsonArrayMatch = content.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (jsonArrayMatch) {
      try {
        questions = JSON.parse(jsonArrayMatch[0]);
      } catch (e) {
        throw new Error("Failed to parse questions array from AI response");
      }
    } else {
      throw new Error("AI response did not contain a valid JSON questions list");
    }
  }

  const validatedQuestions = questions
    .map((q) => {
      const optionsObj = {};
      if (Array.isArray(q.options) && q.options.length >= 4) {
        optionsObj.A = q.options[0];
        optionsObj.B = q.options[1];
        optionsObj.C = q.options[2];
        optionsObj.D = q.options[3];
      } else if (typeof q.options === "object" && q.options.A) {
        optionsObj.A = q.options.A;
        optionsObj.B = q.options.B;
        optionsObj.C = q.options.C;
        optionsObj.D = q.options.D;
      }
      return {
        question: q.question,
        options: optionsObj,
        correctAnswer: q.answer || q.correctAnswer,
        explanation: q.explanation || q.concept || "No explanation provided.",
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
        ["A", "B", "C", "D"].includes(q.correctAnswer)
    )
    .slice(0, parseInt(count, 10));

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
};
