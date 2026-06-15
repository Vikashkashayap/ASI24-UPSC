import { callOpenRouterAPI, parseJSONFromResponse } from "../services/openRouterService.js";
import { getChatModel } from "../config/openRouterModels.js";
import { JSON_MAX_TOKENS } from "../config/openRouterDefaults.js";

/** ~80% smaller than legacy prompt — schema inlined once */
const STUDENT_PROFILER_SYSTEM_PROMPT = `UPSC study planner. JSON only (no markdown):
{"summary":{"strategy":"2-3 sentences","focusSubjects":[],"dailyLoadType":"light|moderate|intensive"},"dailyPlan":[{"day":"Mon-Sun","subject":"","topic":"","durationHours":0,"activity":"Concept reading|Notes|PYQs|Revision|Test"}],"weeklyPlan":[{"week":"Week N","primaryFocus":[],"revisionDays":[],"testDay":"Sunday"}],"revisionSchedule":[{"topic":"","revisionDaysAfter":[3,7,21]}],"dynamicRules":["x3-5"]}
Rules: 7-day plan; 4+ weeks; Sunday=revision/test; spaced revision 3/7/21; realistic hours; weak-subject priority; UPSC syllabus terms.`;

export const generateStudentStudyPlan = async (input) => {
  const { targetYear, dailyHours, weakSubjects, examStage, currentDate } = input;

  const userPrompt = `Year: ${targetYear}. Hours/day: ${dailyHours}. Stage: ${examStage}. Date: ${currentDate}. Weak: ${weakSubjects.join(", ") || "None"}. Max ${dailyHours}h/day. Sunday revision/test. JSON only.`;

  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = getChatModel();

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const apiResponse = await callOpenRouterAPI({
    apiKey,
    model,
    systemPrompt: STUDENT_PROFILER_SYSTEM_PROMPT,
    userPrompt,
    temperature: 0.3,
    maxTokens: JSON_MAX_TOKENS,
    label: "student-profiler",
    cacheTtlSec: 86400,
    jsonOutput: true,
  });

  if (!apiResponse.success) {
    throw new Error(apiResponse.error || "Failed to generate study plan");
  }

  const parsedPlan = parseJSONFromResponse(apiResponse.content);

  if (!parsedPlan) {
    console.error("Failed to parse JSON. Raw response:", apiResponse.content);
    throw new Error("Failed to parse study plan from AI response. Response may not be valid JSON.");
  }

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
