/**
 * Persist AI request usage for admin cost analytics + health monitor.
 */

import mongoose from "mongoose";
import { randomUUID } from "crypto";
import { estimateCostUsd } from "./modelRouter.service.js";
import { reconcileUsage } from "./tokenOptimization.service.js";

const aiRequestLogSchema = new mongoose.Schema(
  {
    requestId: { type: String, required: true, index: true },
    task: { type: String, default: "unknown", index: true },
    model: { type: String, default: "" },
    status: {
      type: String,
      enum: ["success", "failed", "retrying", "error"],
      default: "success",
      index: true,
    },
    estimatedTokens: { type: Number, default: 0 },
    actualTokens: { type: Number, default: 0 },
    promptTokens: { type: Number, default: 0 },
    completionTokens: { type: Number, default: 0 },
    estimatedCost: { type: Number, default: 0 },
    actualCost: { type: Number, default: 0 },
    savingsPct: { type: Number, default: 0 },
    latencyMs: { type: Number, default: 0 },
    retries: { type: Number, default: 0 },
    error: { type: String, default: "" },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collection: "ai_request_logs" }
);

aiRequestLogSchema.index({ createdAt: -1 });
aiRequestLogSchema.index({ task: 1, createdAt: -1 });

export const AiRequestLog =
  mongoose.models.AiRequestLog ||
  mongoose.model("AiRequestLog", aiRequestLogSchema);

export function createRequestId() {
  try {
    return randomUUID();
  } catch {
    return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

function usageTokens(usage = {}) {
  const prompt = Number(usage.prompt_tokens || usage.promptTokens || 0) || 0;
  const completion =
    Number(usage.completion_tokens || usage.completionTokens || 0) || 0;
  const total =
    Number(usage.total_tokens || usage.totalTokens || 0) || prompt + completion;
  return { prompt, completion, total };
}

/**
 * Fire-and-forget log of an OpenRouter / orchestrator call.
 */
export async function logAiRequest({
  requestId = createRequestId(),
  task = "unknown",
  model = "",
  status = "success",
  usage = {},
  estimatedTokens = 0,
  latencyMs = 0,
  retries = 0,
  error = "",
  meta = {},
} = {}) {
  try {
    const { prompt, completion, total } = usageTokens(usage);
    const actualTokens = total || Number(estimatedTokens) || 0;
    const estTokens = Number(estimatedTokens) || actualTokens;
    const actualCost = estimateCostUsd({
      promptTokens: prompt || Math.round(actualTokens * 0.6),
      completionTokens: completion || Math.round(actualTokens * 0.4),
      model,
    });
    const estimatedCost = estimateCostUsd({
      promptTokens: Math.round(estTokens * 0.6),
      completionTokens: Math.round(estTokens * 0.4),
      model,
    });
    const savingsPct =
      estTokens > 0
        ? Math.max(0, ((estTokens - actualTokens) / estTokens) * 100)
        : 0;

    reconcileUsage({
      estimatedTokens: estTokens,
      actualTokens,
      estimatedCost,
      actualCost,
    });

    await AiRequestLog.create({
      requestId,
      task,
      model,
      status: status === "success" ? "success" : status === "retrying" ? "retrying" : "failed",
      estimatedTokens: estTokens,
      actualTokens,
      promptTokens: prompt,
      completionTokens: completion,
      estimatedCost,
      actualCost,
      savingsPct,
      latencyMs: Number(latencyMs) || 0,
      retries: Number(retries) || 0,
      error: String(error || "").slice(0, 500),
      meta,
    });

    return { requestId, actualTokens, actualCost };
  } catch (err) {
    console.warn("[ai.logger] failed to persist request log:", err.message);
    return null;
  }
}

/**
 * Aggregate cost analytics for admin dashboard.
 */
export async function getAiCostAnalytics({
  from = null,
  to = null,
  limit = 40,
} = {}) {
  const match = {};
  if (from || to) {
    match.createdAt = {};
    if (from) match.createdAt.$gte = new Date(from);
    if (to) match.createdAt.$lte = new Date(to);
  }

  const [summaryAgg, byTask, byDay, recent] = await Promise.all([
    AiRequestLog.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          requests: { $sum: 1 },
          success: {
            $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] },
          },
          failed: {
            $sum: {
              $cond: [{ $in: ["$status", ["failed", "error"]] }, 1, 0],
            },
          },
          estimatedTokens: { $sum: "$estimatedTokens" },
          actualTokens: { $sum: "$actualTokens" },
          estimatedCost: { $sum: "$estimatedCost" },
          actualCost: { $sum: "$actualCost" },
          avgSavingsPct: { $avg: "$savingsPct" },
          avgLatencyMs: { $avg: "$latencyMs" },
        },
      },
    ]),
    AiRequestLog.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$task",
          requests: { $sum: 1 },
          estimatedTokens: { $sum: "$estimatedTokens" },
          actualTokens: { $sum: "$actualTokens" },
          estimatedCost: { $sum: "$estimatedCost" },
          actualCost: { $sum: "$actualCost" },
          avgSavingsPct: { $avg: "$savingsPct" },
        },
      },
      { $sort: { actualCost: -1 } },
      { $limit: 50 },
    ]),
    AiRequestLog.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          requests: { $sum: 1 },
          actualTokens: { $sum: "$actualTokens" },
          estimatedCost: { $sum: "$estimatedCost" },
          actualCost: { $sum: "$actualCost" },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: 30 },
    ]),
    AiRequestLog.find(match)
      .sort({ createdAt: -1 })
      .limit(Math.min(Math.max(Number(limit) || 40, 1), 100))
      .lean(),
  ]);

  const s = summaryAgg[0] || {};

  return {
    success: true,
    summary: {
      requests: s.requests || 0,
      success: s.success || 0,
      failed: s.failed || 0,
      estimatedTokens: s.estimatedTokens || 0,
      actualTokens: s.actualTokens || 0,
      estimatedCost: Number(Number(s.estimatedCost || 0).toFixed(6)),
      actualCost: Number(Number(s.actualCost || 0).toFixed(6)),
      avgSavingsPct: Number(Number(s.avgSavingsPct || 0).toFixed(1)),
      avgLatencyMs: Number(Number(s.avgLatencyMs || 0).toFixed(0)),
    },
    byTask: (byTask || []).map((row) => ({
      task: row._id || "unknown",
      requests: row.requests || 0,
      estimatedTokens: row.estimatedTokens || 0,
      actualTokens: row.actualTokens || 0,
      estimatedCost: row.estimatedCost || 0,
      actualCost: row.actualCost || 0,
      avgSavingsPct: Number(Number(row.avgSavingsPct || 0).toFixed(1)),
    })),
    byDay: (byDay || []).map((row) => ({
      date: row._id,
      requests: row.requests || 0,
      actualTokens: row.actualTokens || 0,
      estimatedCost: row.estimatedCost || 0,
      actualCost: row.actualCost || 0,
    })),
    recent: (recent || []).map((row) => ({
      requestId: row.requestId,
      task: row.task,
      model: row.model,
      status: row.status,
      estimatedTokens: row.estimatedTokens,
      actualTokens: row.actualTokens,
      estimatedCost: row.estimatedCost,
      actualCost: row.actualCost,
      savingsPct: row.savingsPct,
      latency: row.latencyMs,
      createdAt: row.createdAt,
    })),
  };
}

export default {
  AiRequestLog,
  createRequestId,
  logAiRequest,
  getAiCostAnalytics,
};
