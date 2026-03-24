import { getPerformanceSummary } from "../services/performanceService.js";
import { runPlannerChain } from "../chains/plannerChain.js";
import {
  generateSyllabusBasedTasks,
  flattenSyllabusSubjects,
} from "../services/upscSyllabusPlannerEngine.js";

export const getPlanner = async (req, res) => {
  try {
    const userId = req.user._id;
    const performance = await getPerformanceSummary(userId);
    const planner = await runPlannerChain({
      weakSubjects: performance.weakSubjects,
      averageScore: performance.averageScore,
    });
    res.json({ planner, performance });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

function normalizeSyllabusPayload(syllabusJson) {
  if (!syllabusJson) return [];
  if (Array.isArray(syllabusJson?.subjects)) {
    return flattenSyllabusSubjects(syllabusJson.subjects);
  }
  if (Array.isArray(syllabusJson)) {
    return syllabusJson
      .map((item) => ({
        subject: item.subject || item.name || "General",
        topic: item.topic,
        subtopics: Array.isArray(item.subtopics) ? item.subtopics : [],
        weight: item.weight,
        estimatedHours: item.estimatedHours,
      }))
      .filter((t) => t.topic);
  }
  return [];
}

export const generatePlan = async (req, res) => {
  try {
    const { startDate, endDate, dailyHours = 6, syllabusJson } = req.body || {};
    if (!startDate || !endDate) {
      return res.status(400).json({ message: "startDate and endDate are required" });
    }
    const flatTopics = normalizeSyllabusPayload(syllabusJson);
    const result = generateSyllabusBasedTasks({
      startDate,
      endDate,
      dailyHours: Math.max(1, Math.min(16, Number(dailyHours) || 6)),
      flatTopics,
    });
    res.json({
      startDate,
      endDate,
      totalDays: result.meta.totalDays,
      totalTopics: result.meta.totalTopics,
      intensiveMode: result.intensiveMode,
      usedFallbackSyllabus: result.meta.usedFallback,
      plan: result.tasks,
    });
  } catch (error) {
    res.status(400).json({ message: error.message || "Failed to generate plan" });
  }
};
