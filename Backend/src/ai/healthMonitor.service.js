/**
 * AI Health Monitor — live operational snapshot for admin dashboards.
 */

import { AiRequestLog } from "./logger.service.js";
import { getQueueStats } from "./queue.service.js";
import { cacheStats } from "./cache.service.js";
import {
  getLiteModel,
  getFlashModel,
  describeRoute,
} from "./modelRouter.service.js";
import { getOptimizationCounters } from "./tokenOptimization.service.js";

const DEFAULT_WINDOW_MINUTES =
  Number(process.env.AI_HEALTH_WINDOW_MINUTES) || 60;

function deriveStatus({ requestCount, successRate, failureRate, avgLatency }) {
  if (!requestCount) {
    return {
      level: "idle",
      label: "Idle",
      detail: "No AI requests in this window yet.",
    };
  }
  if (failureRate >= 40 || successRate < 60) {
    return {
      level: "critical",
      label: "Critical",
      detail: `High failure rate (${failureRate.toFixed(1)}%). Check OpenRouter / model config.`,
    };
  }
  if (failureRate >= 15 || avgLatency > 45000) {
    return {
      level: "degraded",
      label: "Degraded",
      detail: `Elevated latency or failures (avg ${Math.round(avgLatency)} ms).`,
    };
  }
  return {
    level: "healthy",
    label: "Healthy",
    detail: `Success ${successRate.toFixed(1)}% · avg ${Math.round(avgLatency)} ms`,
  };
}

/**
 * @param {{ windowMinutes?: number }} opts
 */
export async function getAiHealthSnapshot({
  windowMinutes = DEFAULT_WINDOW_MINUTES,
} = {}) {
  const window = Math.min(Math.max(Number(windowMinutes) || 60, 1), 60 * 24 * 7);
  const since = new Date(Date.now() - window * 60 * 1000);

  const [agg, recentModels] = await Promise.all([
    AiRequestLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: null,
          requestCount: { $sum: 1 },
          successCount: {
            $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] },
          },
          failureCount: {
            $sum: {
              $cond: [{ $in: ["$status", ["failed", "error"]] }, 1, 0],
            },
          },
          retryingCount: {
            $sum: { $cond: [{ $eq: ["$status", "retrying"] }, 1, 0] },
          },
          retryCount: { $sum: "$retries" },
          avgLatency: { $avg: "$latencyMs" },
          avgTokens: { $avg: "$actualTokens" },
          avgCost: { $avg: "$actualCost" },
          totalTokens: { $sum: "$actualTokens" },
          totalCost: { $sum: "$actualCost" },
          lastTask: { $last: "$task" },
          lastModel: { $last: "$model" },
          lastUsedAt: { $max: "$createdAt" },
        },
      },
    ]),
    AiRequestLog.aggregate([
      { $match: { createdAt: { $gte: since }, model: { $ne: "" } } },
      {
        $group: {
          _id: "$model",
          count: { $sum: 1 },
          lastUsed: { $max: "$createdAt" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
  ]);

  const a = agg[0] || {};
  const requestCount = a.requestCount || 0;
  const successCount = a.successCount || 0;
  const failureCount = a.failureCount || 0;
  const successRate = requestCount ? (successCount / requestCount) * 100 : 0;
  const failureRate = requestCount ? (failureCount / requestCount) * 100 : 0;
  const avgLatency = a.avgLatency || 0;
  const avgRetries = requestCount ? (a.retryCount || 0) / requestCount : 0;

  const queue = getQueueStats();
  const cache = cacheStats();
  const route = describeRoute();
  const opt = getOptimizationCounters();
  const status = deriveStatus({
    requestCount,
    successRate,
    failureRate,
    avgLatency,
  });

  return {
    success: true,
    updatedAt: new Date().toISOString(),
    windowMinutes: window,
    status,
    metrics: {
      averageResponseTimeMs: Math.round(avgLatency || 0),
      successRate,
      failureRate,
      retryCount: a.retryCount || 0,
      averageRetries: Number(avgRetries.toFixed(2)),
      averageTokens: Math.round(a.avgTokens || 0),
      averageCost: Number((a.avgCost || 0).toFixed(6)),
      totalTokens: a.totalTokens || 0,
      totalCost: Number((a.totalCost || 0).toFixed(6)),
      requestCount,
      successCount,
      failureCount,
      retryingCount: a.retryingCount || 0,
    },
    queue: {
      size: queue.size,
      queued: queue.queued,
      active: queue.active,
      maxConcurrency: queue.maxConcurrency,
    },
    cache,
    currentModel: {
      active: a.lastModel || route.active || null,
      lite: getLiteModel(),
      flash: getFlashModel(),
      lastTask: a.lastTask || null,
      lastUsedAt: a.lastUsedAt || null,
      recent: (recentModels || []).map((r) => ({
        model: r._id,
        count: r.count,
        lastUsed: r.lastUsed,
      })),
    },
    live: {
      promptSavingsPct: opt.promptSavingsPct,
      targetMet: opt.targetMet,
      targetSavingsPct: opt.targetSavingsPct,
    },
  };
}

export default { getAiHealthSnapshot };
