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
export const generateTestQuestions = async ({
  subject,
  topic,
  difficulty,
  count,
}) => {
  try {
    // Get API key from environment - use directly like other working agents
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL || "openai/gpt-3.5-turbo";

    if (!apiKey) {
      throw new Error("Missing OPENROUTER_API_KEY in environment variables");
    }

    // System prompt for UPSC question generation
    const systemPrompt = `You are an AI agent specialized in creating UPSC Prelims mock tests.

Your task:
1. Generate only objective type MCQ questions strictly based on UPSC Prelims standards.
2. Use ONLY the following official UPSC Prelims question patterns:

QUESTION PATTERNS TO USE:

1. Multiple Statements Pattern
   Format:
   Consider the following statements:
   1. ...
   2. ...
   3. ...
   Which of the statements given above is/are correct?
   Options:
   (a) 1 only
   (b) 1 and 2 only
   (c) 2 and 3 only
   (d) 1, 2 and 3

2. Which of the following is/are correct
   Format:
   Which of the following statements is/are correct?
   Options:
   (a) 1 only
   (b) 2 only
   (c) 1 and 2
   (d) Neither 1 nor 2

3. Incorrect / NOT Correct Pattern
   Format:
   Which of the statements given above is/are NOT correct?

4. Match the Following
   Format:
   List-I and List-II matching questions with elimination-friendly options.

5. Assertion – Reason (A–R)
   Format:
   Assertion (A): ...
   Reason (R): ...
   Use standard UPSC A–R options.

6. Pair Based Questions
   Format:
   Which of the following pairs is correctly / incorrectly matched?

7. Map / Location Based Questions
   Format:
   Identify locations, arrangement (North–South / East–West), or map-based facts.

8. Chronology / Sequence Questions
   Format:
   Arrange the following events in correct chronological order.

9. Single Statement / Direct Concept Questions
   Format:
   What does XYZ refer to?

10. Current Affairs + Concept Based Questions
    Format:
    Recently in news XYZ, it is related to:

RULES:
- Questions must be analytical, not fact-dumping.
- Avoid extreme words like "always", "never" unless absolutely correct.
- At least 70% questions must be statement-based.
- Mix Static (Polity, Economy, Geography, History, Environment) with Current Affairs.
- Difficulty level: UPSC standard (Moderate to Tough).
- Do NOT reveal answers immediately.

OUTPUT FORMAT:
- Question Number
- Question
- Options (a), (b), (c), (d)
- Keep language simple and formal (English only).
- No Hindi, no emojis, no explanations unless explicitly asked.

END GOAL:
Create a realistic UPSC Prelims mock test suitable for serious aspirants.`;

    // Calculate difficulty distribution for question types
    const easyCount = Math.ceil(count * 0.3);
    const mediumCount = Math.ceil(count * 0.5);
    const hardCount = count - easyCount - mediumCount;

    // Calculate statement-based question count (70% minimum)
    const statementBasedCount = Math.ceil(count * 0.7);
    const otherTypesCount = count - statementBasedCount;

    // Ensure variety: distribute question types across all generated questions
    const questionTypes = [
      `Multiple Statements Pattern (MANDATORY: At least ${statementBasedCount} questions must use this pattern)`,
      "Which of the following is/are correct",
      "Incorrect / NOT Correct Pattern",
      "Match the Following (List-I and List-II)",
      "Assertion – Reason (A–R) - Use sparingly (max 10% of total)",
      "Pair Based Questions",
      "Map / Location Based Questions",
      "Chronology / Sequence Questions",
      "Single Statement / Direct Concept Questions",
      "Current Affairs + Concept Based Questions"
    ];

    // User prompt with detailed instructions
    const userPrompt = `CRITICAL: Generate EXACTLY ${count} UPSC Prelims standard multiple choice questions. Do NOT generate fewer or more than ${count} questions.

Subject: ${subject}
Topic: ${topic}
Overall Difficulty Level: ${difficulty}

MANDATORY REQUIREMENT: You MUST generate EXACTLY ${count} questions. The questions array MUST contain exactly ${count} question objects.

CRITICAL REQUIREMENT - QUESTION TYPE DISTRIBUTION:
- At least ${statementBasedCount} questions (70% minimum) MUST use statement-based patterns (Multiple Statements Pattern or "Which of the following is/are correct")
- Remaining ${otherTypesCount} questions should use other patterns from the list below

You MUST ensure DIVERSITY in question types. Generate questions using these formats across your ${count} questions:
${questionTypes.map((type, idx) => `${idx + 1}. ${type}`).join('\n')}

Difficulty Distribution within the set:
- Easy questions: ${easyCount}
- Medium questions: ${mediumCount}
- Hard questions: ${hardCount}

OUTPUT FORMAT (STRICT):
Return STRICTLY in valid JSON format only (no markdown, no code blocks, no extra text, no trailing commas):
{
  "questions": [
    {
      "question": "Your question text here",
      "options": {
        "A": "Option A text",
        "B": "Option B text",
        "C": "Option C text",
        "D": "Option D text"
      },
      "correctAnswer": "A",
      "explanation": "Why correct option is correct. Why other options are incorrect. (2-3 sentences)"
    }
  ]
}

CRITICAL JSON REQUIREMENTS:
- Start with { and end with }
- No trailing commas anywhere
- Escape all special characters in strings (quotes, newlines, etc.)
- Ensure all strings are properly quoted
- No comments or extra text outside the JSON
- Validate your JSON before returning

QUESTION FORMAT EXAMPLES:

1. Multiple Statements Pattern (USE FOR AT LEAST ${statementBasedCount} QUESTIONS):
   "Consider the following statements:
   1. [Statement 1]
   2. [Statement 2]
   3. [Statement 3]
   Which of the statements given above is/are correct?
   (a) 1 only
   (b) 1 and 2 only
   (c) 2 and 3 only
   (d) 1, 2 and 3"

2. Which of the following is/are correct:
   "Which of the following statements is/are correct?
   1. [Statement 1]
   2. [Statement 2]
   (a) 1 only
   (b) 2 only
   (c) 1 and 2
   (d) Neither 1 nor 2"

3. NOT Correct Pattern:
   "Which of the statements given above is/are NOT correct?"

4. Match the Following:
   "Match List-I with List-II and select the correct answer using the codes given below:
   List-I | List-II
   [Items] | [Items]
   (a) A-1, B-2, C-3
   (b) A-2, B-1, C-3
   etc."

5. Assertion-Reason:
   "Assertion (A): [Assertion text]
   Reason (R): [Reason text]
   (a) Both A and R are true and R is the correct explanation of A
   (b) Both A and R are true but R is not the correct explanation of A
   (c) A is true but R is false
   (d) A is false but R is true"

6. Pair Based:
   "Which of the following pairs is correctly matched?
   (a) Pair 1
   (b) Pair 2
   (c) Pair 3
   (d) Pair 4"

CRITICAL REQUIREMENTS:
1. Generate EXACTLY ${count} questions - no more, no less
2. The questions array MUST have exactly ${count} items
3. At least ${statementBasedCount} questions (70%) MUST be statement-based patterns
4. Rotate question types throughout the ${count} questions
5. Do NOT generate all questions in the same format
6. Ensure each question tests different aspects of the topic
7. Maintain UPSC Prelims exam style and difficulty (Moderate to Tough)
8. All questions must be relevant to: ${subject} - ${topic}
9. Questions must be analytical, not fact-dumping
10. Mix Static knowledge with Current Affairs where relevant

FINAL CHECK BEFORE RESPONDING:
- Count the questions in your array - it must be exactly ${count}
- Verify that at least ${statementBasedCount} questions use statement-based patterns (Multiple Statements or "Which of the following is/are correct")
- Ensure all ${count} questions are complete with question text, all 4 options (A, B, C, D), correctAnswer, and explanation
- Validate your JSON format
- Ensure questions are analytical, not simple fact-dumping
- Mix static knowledge with current affairs where relevant
- Maintain UPSC Prelims difficulty (Moderate to Tough)

Ensure the JSON is valid and parseable. You MUST return exactly ${count} questions in the questions array.`;

    // Call OpenRouter API directly like other working agents
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
          temperature: 0.3, // Low temperature for consistent, structured output
          max_tokens: count <= 5 ? 4000 : count <= 10 ? 8000 : 16000, // Scale tokens based on question count
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `OpenRouter API error: ${response.status} ${response.statusText}`,
        errorBody
      );

      if (response.status === 429) {
        throw new Error("Rate limit reached. Please try again in a moment.");
      } else if (response.status === 401) {
        throw new Error("Invalid API key. Please check your configuration.");
      } else {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
    }

    const data = await response.json();
    const aiContent = data?.choices?.[0]?.message?.content?.trim();

    if (!aiContent) {
      throw new Error("No response received from AI model");
    }

    // Improved JSON extraction - handle markdown code blocks and raw JSON
    let jsonString = aiContent;
    
    // Remove markdown code blocks if present
    const codeBlockMatch = jsonString.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (codeBlockMatch) {
      jsonString = codeBlockMatch[1].trim();
    } else {
      // Find JSON object boundaries more accurately
      const firstBrace = jsonString.indexOf('{');
      if (firstBrace === -1) {
        console.error("AI Response content:", aiContent.substring(0, 500));
        throw new Error("No JSON object found in AI response (no opening brace)");
      }
      
      // Find matching closing brace by counting braces
      let braceCount = 0;
      let lastBrace = -1;
      for (let i = firstBrace; i < jsonString.length; i++) {
        if (jsonString[i] === '{') braceCount++;
        if (jsonString[i] === '}') {
          braceCount--;
          if (braceCount === 0) {
            lastBrace = i;
            break;
          }
        }
      }
      
      if (lastBrace === -1) {
        console.error("AI Response content:", aiContent.substring(0, 500));
        throw new Error("No valid JSON object found in AI response (unclosed braces)");
      }
      
      jsonString = jsonString.substring(firstBrace, lastBrace + 1);
    }

    if (!jsonString || !jsonString.trim().startsWith('{')) {
      console.error("AI Response content:", aiContent.substring(0, 500));
      throw new Error("No valid JSON found in AI response");
    }

    // Clean up common JSON issues
    jsonString = jsonString.trim();
    // Remove trailing commas before closing braces/brackets (more comprehensive)
    jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');
    // Remove trailing commas in arrays and objects
    jsonString = jsonString.replace(/,(\s*\n\s*[}\]])/g, '$1');

    let parsedData;
    try {
      parsedData = JSON.parse(jsonString);
    } catch (parseError) {
      // Log the problematic JSON for debugging
      console.error("JSON Parse Error at position:", parseError.message);
      console.error("JSON String (first 2000 chars):", jsonString.substring(0, 2000));
      console.error("Full AI Response (first 1000 chars):", aiContent.substring(0, 1000));
      throw new Error(`Invalid JSON format in AI response: ${parseError.message}`);
    }

    if (!parsedData || !parsedData.questions || !Array.isArray(parsedData.questions)) {
      throw new Error("Invalid response format from AI. Expected questions array.");
    }

    // Validate questions structure
    const validatedQuestions = parsedData.questions
      .filter((q) => {
        return (
          q.question &&
          q.options &&
          q.options.A &&
          q.options.B &&
          q.options.C &&
          q.options.D &&
          ["A", "B", "C", "D"].includes(q.correctAnswer) &&
          q.explanation
        );
      })
      .slice(0, count); // Ensure we don't exceed requested count

    if (validatedQuestions.length === 0) {
      throw new Error("No valid questions generated. Please try again.");
    }

    if (validatedQuestions.length < count) {
      console.warn(
        `Warning: Requested ${count} questions but only ${validatedQuestions.length} were valid.`
      );
      console.warn(
        `Generated questions: ${parsedData.questions.length}, Valid after filtering: ${validatedQuestions.length}`
      );
      
      // If we got fewer questions than requested, this is a problem
      // The AI should generate the exact count, but we'll still return what we have
      // with a warning
    }
    
    // Log the actual count generated for debugging
    console.log(`✅ Generated ${validatedQuestions.length} valid questions (requested: ${count})`);

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

