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
    const systemPrompt = `You are an expert UPSC Prelims question setter with 20+ years of experience. 
Your task is to generate high-quality, exam-standard multiple choice questions that test conceptual understanding, analytical thinking, and current affairs knowledge.`;

    // User prompt with detailed instructions
    const userPrompt = `Generate ${count} UPSC Prelims standard multiple choice questions.

Subject: ${subject}
Topic: ${topic}
Difficulty: ${difficulty}

IMPORTANT RULES:
1. Follow real UPSC prelims question style - avoid direct textbook lines
2. Include analytical & conceptual questions, not just factual recall
3. Four options only (A, B, C, D) - exactly four, no more, no less
4. Only one correct answer per question
5. Provide clear, detailed explanation for each answer (2-3 sentences)
6. Questions should be relevant to UPSC Prelims syllabus
7. For "Hard" difficulty, include questions that require deep understanding
8. For "Easy" difficulty, focus on fundamental concepts
9. For "Moderate" difficulty, balance between concepts and application

Return STRICTLY in valid JSON format only (no markdown, no code blocks, no extra text):
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
      "explanation": "Detailed explanation of why this answer is correct (2-3 sentences)"
    }
  ]
}

Ensure the JSON is valid and parseable. Generate exactly ${count} questions.`;

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
          max_tokens: 4000, // Increased for multiple questions
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

    // Parse JSON from response
    const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in AI response");
    }

    const parsedData = JSON.parse(jsonMatch[0]);

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
    }

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

