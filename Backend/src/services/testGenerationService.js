import fetch from "node-fetch";

/**
 * Generate UPSC Prelims MCQs using OpenRouter API
 * @param {Object} params - Generation parameters
 * @param {string} params.subject - Subject name
 * @param {string} params.topic - Topic name
 * @param {string} params.difficulty - Difficulty level
 * @param {number} params.count - Number of questions
 * @returns {Promise<Object>} - Generated questions array
 */
// Re-export imports to ensure they are available if needed, though they are usually top-level
// For this replacement, we assume imports are already present at the top of the file.

export const generateTestQuestions = async ({
  subject,
  topic,
  difficulty,
  count,
}) => {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001";

    if (!apiKey) {
      throw new Error("Missing OPENROUTER_API_KEY in environment variables");
    }

    // System prompt as per MODEL TARGET specifications
    const systemPrompt = `You are an UPSC CSE Prelims GS Paper-I MCQ Generator.

MODEL TARGET: google/gemini-1.5-flash

OBJECTIVE:
Generate UPSC-standard MCQs for mock tests.
Questions must feel like real Prelims — conceptual, eliminable, and trap-based,
while keeping token usage minimal.

MANDATORY QUESTION PATTERNS:
1. Statement-based questions (2 to 4 statements, Options like: 1 only / 1 & 2 only / etc.)
2. Assertion-Reason (Statement I and Statement II logic)
3. "How many of the above are correct?" structure
4. Match the following / Pair-based
5. "Which of the following is correct / incorrect?"
6. Concept + Current Affairs integrated (test a static concept via current relevance)

CONTENT RULES:
- Subject: ${subject}
- Topic: ${topic}
- Difficulty: ${difficulty}
- Stay within UPSC GS-I syllabus.
- Avoid direct factual recall.
- At least one option must be a close UPSC-style trap.
- Options must be logically eliminable.

DIFFICULTY CONTROL:
- Easy: Direct concept understanding
- Moderate: Mixed statements + elimination
- Hard: Closely worded statements, high confusion

OUTPUT FORMAT (STRICT – JSON ONLY):
Return ONLY valid JSON.
For each question, use this structure:
{
  "pattern": "STATEMENT_BASED | ASSERTION_REASON | HOW_MANY_CORRECT | MATCH | WHICH_CORRECT | CONCEPT_CURRENT",
  "question": "Question text",
  "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
  "answer": "A | B | C | D",
  "concept": "Core concept tested"
}

IMPORTANT CONSTRAINTS:
- Do NOT include explanations (put them in "concept").
- Do NOT add any introductory or closing text.
- Do NOT repeat questions.
- Keep language concise, formal, and exam-oriented.`;

    const userPrompt = `Generate EXACTLY ${count} UPSC Prelims MCQs for Subject: ${subject}, Topic: ${topic}, Difficulty: ${difficulty}.
Return EXACTLY ${count} questions in a JSON array format as specified.`;

    // Call OpenRouter API
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
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
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`OpenRouter API error: ${response.status}`, errorBody);
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    let aiContent = data?.choices?.[0]?.message?.content?.trim();

    if (!aiContent) {
      throw new Error("No response received from AI model");
    }

    // JSON extraction
    let questions = [];
    try {
      // Handle potential markdown backticks
      if (aiContent.startsWith("```")) {
        aiContent = aiContent.replace(/^```json\s*/, "").replace(/```$/, "").trim();
      }
      
      const parsedData = JSON.parse(aiContent);
      questions = Array.isArray(parsedData) ? parsedData : parsedData.questions || [];
    } catch (parseError) {
      // Try to find array or object in text if direct parse fails
      const jsonArrayMatch = aiContent.match(/\[\s*\{[\s\S]*\}\s*\]/);
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

    // Map new format to application schema and validate
    const validatedQuestions = questions
      .map((q) => {
        // Map: options array to object { A, B, C, D }
        const optionsObj = {};
        if (Array.isArray(q.options) && q.options.length >= 4) {
          optionsObj.A = q.options[0];
          optionsObj.B = q.options[1];
          optionsObj.C = q.options[2];
          optionsObj.D = q.options[3];
        } else if (typeof q.options === 'object' && q.options.A) {
          // If it somehow returned the old format or a named object
          optionsObj.A = q.options.A;
          optionsObj.B = q.options.B;
          optionsObj.C = q.options.C;
          optionsObj.D = q.options.D;
        }

        return {
          question: q.question,
          options: optionsObj,
          correctAnswer: q.answer || q.correctAnswer,
          explanation: q.concept || q.explanation || "No explanation provided.",
          patternType: q.pattern || "GENERAL"
        };
      })
      .filter((q) => {
        return (
          q.question &&
          q.options.A &&
          q.options.B &&
          q.options.C &&
          q.options.D &&
          ["A", "B", "C", "D"].includes(q.correctAnswer)
        );
      })
      .slice(0, parseInt(count));

    if (validatedQuestions.length === 0) {
      console.error("No valid questions after mapping. Raw content:", aiContent.substring(0, 500));
      throw new Error("No valid UPSC questions generated. Please try again.");
    }

    console.log(`✅ Generated ${validatedQuestions.length} UPSC questions`);

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

