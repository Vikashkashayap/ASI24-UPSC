import { getPerformanceSummary } from "../services/performanceService.js";
import { runPlannerChain } from "../chains/plannerChain.js";

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
