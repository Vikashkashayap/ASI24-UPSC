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
    const systemPrompt = `You are an expert UPSC CSE Prelims Question Setter trained on UPSC PYQs (2011–2024).

Your task is to generate ONLY objective-type MCQ questions strictly in UPSC Prelims format.

========================
QUESTION DESIGN RULES
========================
1. Generate questions ONLY in MCQ format (4 options).
2. Do NOT ask direct definitions or factual one-liners.
3. Use analytical, conceptual, and elimination-based framing.
4. Integrate static + current affairs wherever possible.
5. Language must exactly match UPSC Prelims tone (formal, neutral).
6. Avoid extreme words like "always", "never" unless factually correct.
7. Each question must have ONLY ONE correct answer.
8. Difficulty mix:
   - Easy: 30%
   - Medium: 50%
   - Difficult/Tricky: 20%

========================
ALLOWED QUESTION TYPES
========================
You MUST rotate between the following UPSC Prelims question formats:

1. Statement-based questions:
   - 2 to 4 statements
   - Options like:
     a) 1 only
     b) 2 only
     c) 1 and 3 only
     d) 1, 2 and 3

2. Multiple-correct combination questions

3. Negative framing questions:
   - "Which of the following is/are NOT correct?"

4. Assertion–Reason questions:
   - Use standard UPSC A–R options
   - Limit usage to maximum 10%

5. Match the Following:
   - List-I and List-II
   - Options in correct UPSC pattern

6. Pair-based questions:
   - Introduce at least one incorrect pair

7. Chronology / Sequence based questions

8. Map / Location based (text-only)

9. Conceptual application-based questions

========================
OPTION DESIGN RULES
========================
- Ensure all options look equally plausible.
- Avoid obvious elimination.
- At least one option must be partially correct but overall wrong.
- No option like "All of the above" or "None of the above".

========================
CONTENT CONSTRAINTS
========================
- No emojis
- No casual language
- No hints inside questions
- No repetition of previous questions
- Follow UPSC PYQ philosophy strictly`;

    // Calculate difficulty distribution for question types
    const easyCount = Math.ceil(count * 0.3);
    const mediumCount = Math.ceil(count * 0.5);
    const hardCount = count - easyCount - mediumCount;

    // Ensure variety: distribute question types across all generated questions
    const questionTypes = [
      "Statement-based (2-4 statements with combination options)",
      "Negative framing (NOT correct questions)",
      "Assertion-Reason (max 10% of total)",
      "Match the Following (List-I and List-II)",
      "Pair-based (with at least one incorrect pair)",
      "Chronology/Sequence based",
      "Conceptual application-based",
      "Current affairs integrated"
    ];

    // User prompt with detailed instructions
    const userPrompt = `CRITICAL: Generate EXACTLY ${count} UPSC Prelims standard multiple choice questions. Do NOT generate fewer or more than ${count} questions.

Subject: ${subject}
Topic: ${topic}
Overall Difficulty Level: ${difficulty}

MANDATORY REQUIREMENT: You MUST generate EXACTLY ${count} questions. The questions array MUST contain exactly ${count} question objects.

CRITICAL REQUIREMENT: You MUST ensure DIVERSITY in question types. Generate questions using ALL of these formats across your ${count} questions:
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
1. For Statement-based: Present 2-4 numbered statements, options should be like "1 only", "2 only", "1 and 3 only", etc.
2. For Negative: Use "Which of the following is/are NOT correct?"
3. For Match: Use "Match List-I with List-II" format
4. For Assertion-Reason: Use standard A-R format with proper options
5. For Pair-based: Present pairs, ensure at least one incorrect pair

CRITICAL REQUIREMENTS:
1. Generate EXACTLY ${count} questions - no more, no less
2. The questions array MUST have exactly ${count} items
3. Rotate question types throughout the ${count} questions
4. Do NOT generate all questions in the same format
5. Ensure each question tests different aspects of the topic
6. Maintain UPSC Prelims exam style and difficulty
7. All questions must be relevant to: ${subject} - ${topic}

FINAL CHECK BEFORE RESPONDING:
- Count the questions in your array - it must be exactly ${count}
- Ensure all ${count} questions are complete with question text, all 4 options (A, B, C, D), correctAnswer, and explanation
- Validate your JSON format

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

