import { getAiCostAnalytics } from "../logger.service.js";
import { getOptimizationCounters } from "../tokenOptimization.service.js";
import { getAiHealthSnapshot } from "../healthMonitor.service.js";
import { getQueueStats } from "../queue.service.js";
import { describeRoute } from "../modelRouter.service.js";

export const getAiHealth = async (req, res) => {
  try {
    const windowMinutes = Number(req.query.windowMinutes) || 60;
    const data = await getAiHealthSnapshot({ windowMinutes });
    return res.status(200).json(data);
  } catch (error) {
    console.error("getAiHealth error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load AI health",
      error: error.message,
    });
  }
};

export const getAiMonitor = async (req, res) => getAiHealth(req, res);

export const getAiAnalytics = async (req, res) => {
  try {
    const { from, to, limit } = req.query;
    const data = await getAiCostAnalytics({
      from: from || null,
      to: to || null,
      limit: Number(limit) || 40,
    });
    const live = getOptimizationCounters();
    return res.status(200).json({
      ...data,
      live: {
        promptSavingsPct: live.promptSavingsPct,
        targetMet: live.targetMet,
        targetSavingsPct: live.targetSavingsPct,
      },
    });
  } catch (error) {
    console.error("getAiAnalytics error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load AI analytics",
      error: error.message,
    });
  }
};

export const getAiRouterInfo = async (_req, res) => {
  try {
    return res.status(200).json({
      success: true,
      router: describeRoute(),
      queue: getQueueStats(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export default {
  getAiHealth,
  getAiMonitor,
  getAiAnalytics,
  getAiRouterInfo,
};
