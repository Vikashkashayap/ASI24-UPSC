import { getPerformanceSummary } from "../services/performanceService.js";

export const getPerformance = async (req, res) => {
  try {
    const userId = req.user._id;
    const performance = await getPerformanceSummary(userId);
    res.json(performance);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
