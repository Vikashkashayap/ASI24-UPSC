import { callOpenRouterAPI, parseJSONFromResponse } from "../services/openRouterService.js";

/**
 * Student Profiler Agent
 * Generates personalized UPSC study plans with spaced revision cycles
 */

const STUDENT_PROFILER_SYSTEM_PROMPT = `You are an expert UPSC CSE preparation mentor and study planner. Your task is to create highly personalized, realistic, and actionable study plans for UPSC aspirants.

CRITICAL RULES:
1. NO motivational quotes or generic advice - only concrete, actionable plans
2. Keep plans realistic and humane - respect daily hours constraints
3. Sunday MUST be reserved for revision or test day
4. Use proper UPSC syllabus terminology (Polity, Economy, History, Geography, Environment, Science & Tech, Ethics, etc.)
5. Apply spaced revision logic: 1st revision after 3 days, 2nd after 7 days, 3rd after 21 days
6. Prioritize weak subjects while maintaining balanced coverage
7. Adjust plan intensity based on examStage (Prelims/Mains/Both) and time until targetYear

OUTPUT FORMAT:
You MUST return ONLY valid JSON in this exact structure (no markdown, no extra text):

{
  "summary": {
    "strategy": "Brief 2-3 sentence strategy overview",
    "focusSubjects": ["Subject1", "Subject2"],
    "dailyLoadType": "light" | "moderate" | "intensive"
  },
  "dailyPlan": [
    {
      "day": "Monday",
      "subject": "Polity",
      "topic": "Constitutional Framework",
      "durationHours": 2.5,
      "activity": "Concept reading"
    }
  ],
  "weeklyPlan": [
    {
      "week": "Week 1",
      "primaryFocus": ["Polity", "Economy"],
      "revisionDays": ["Wednesday", "Saturday"],
      "testDay": "Sunday"
    }
  ],
  "revisionSchedule": [
    {
      "topic": "Constitutional Framework",
      "revisionDaysAfter": [3, 7, 21]
    }
  ],
  "dynamicRules": [
    "If dailyHours decreases below 4, reduce topic load by 30%",
    "If weak subject performance improves above 70%, rebalance focus to other subjects"
  ]
}

ACTIVITY TYPES:
- "Concept reading" - First-time learning or reading new material
- "Notes" - Making or refining notes
- "PYQs" - Solving Previous Year Questions
- "Revision" - Reviewing previously studied material
- "Test" - Taking a full test or evaluation

DAILY PLAN REQUIREMENTS:
- Generate 7 days (Monday through Sunday)
- Each day must have subject, topic, durationHours, and activity
- Total daily hours must match or be slightly under the provided dailyHours
- Sunday must be revision or test day
- Balance subjects across the week

WEEKLY PLAN REQUIREMENTS:
- Generate at least 4 weeks
- Each week should have primaryFocus (2-3 subjects), revisionDays (2-3 days), and testDay (Sunday)

REVISION SCHEDULE:
- For each major topic studied, create a revision entry
- revisionDaysAfter must be [3, 7, 21] for spaced repetition
- Link revisions to actual topics from dailyPlan

DYNAMIC RULES:
- Provide 3-5 rules for re-planning when inputs change
- Rules should be specific and actionable`;

/**
 * Generate student study plan using AI
 * @param {Object} input - Student profile input
 * @param {string} input.targetYear - Target exam year (e.g., "2026")
 * @param {number} input.dailyHours - Daily study hours
 * @param {string[]} input.weakSubjects - Array of weak subjects
 * @param {string} input.examStage - "Prelims", "Mains", or "Both"
 * @param {string} input.currentDate - Current date in YYYY-MM-DD format
 * @returns {Promise<Object>} - Generated study plan
 */
export const generateStudentStudyPlan = async (input) => {
  const { targetYear, dailyHours, weakSubjects, examStage, currentDate } = input;

  // Build user prompt with all input details
  const userPrompt = `Generate a personalized UPSC study plan for the following student profile:

TARGET EXAM YEAR: ${targetYear}
DAILY STUDY HOURS: ${dailyHours} hours
WEAK SUBJECTS: ${weakSubjects.join(", ") || "None specified"}
EXAM STAGE: ${examStage}
CURRENT DATE: ${currentDate}

REQUIREMENTS:
1. Create a 7-day daily plan (Monday to Sunday) with realistic time allocation
2. Generate a 4-week weekly structure with subject balance
3. Apply spaced revision (3, 7, 21 days) for all major topics
4. Prioritize weak subjects: ${weakSubjects.join(", ") || "None"}
5. Sunday must be revision or test day
6. Ensure total daily hours don't exceed ${dailyHours} hours
7. Adjust plan based on exam stage: ${examStage}

Return ONLY the JSON object as specified in the system prompt. No markdown, no explanations, just valid JSON.`;

  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || "meta-llama/Meta-Llama-3.1-70B-Instruct";

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  // Call OpenRouter API
  const apiResponse = await callOpenRouterAPI({
    apiKey,
    model,
    systemPrompt: STUDENT_PROFILER_SYSTEM_PROMPT,
    userPrompt,
    temperature: 0.4, // Slightly higher for more creative planning
    maxTokens: 4000, // Larger response for comprehensive plans
  });

  if (!apiResponse.success) {
    throw new Error(apiResponse.error || "Failed to generate study plan");
  }

  // Parse JSON from response
  const parsedPlan = parseJSONFromResponse(apiResponse.content);

  if (!parsedPlan) {
    console.error("Failed to parse JSON. Raw response:", apiResponse.content);
    throw new Error("Failed to parse study plan from AI response. Response may not be valid JSON.");
  }

  // Validate structure
  if (!parsedPlan.summary || !parsedPlan.dailyPlan || !parsedPlan.weeklyPlan) {
    throw new Error("Invalid study plan structure. Missing required fields.");
  }

  return {
    success: true,
    plan: parsedPlan,
    model: apiResponse.model,
    usage: apiResponse.usage,
  };
};

export default {
  generateStudentStudyPlan,
};

