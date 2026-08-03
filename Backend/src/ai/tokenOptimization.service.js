/**
 * Lightweight token-optimization counters for health / analytics live panel.
 */

export const TARGET_SAVINGS_PCT = Number(process.env.AI_TARGET_SAVINGS_PCT) || 30;

const counters = {
  requests: 0,
  estimatedTokens: 0,
  actualTokens: 0,
  estimatedCost: 0,
  actualCost: 0,
};

export function getOptimizationCounters() {
  const est = counters.estimatedTokens || 0;
  const act = counters.actualTokens || 0;
  const promptSavingsPct =
    est > 0 ? Math.max(0, ((est - act) / est) * 100) : 0;
  return {
    ...counters,
    promptSavingsPct,
    targetSavingsPct: TARGET_SAVINGS_PCT,
    targetMet: promptSavingsPct >= TARGET_SAVINGS_PCT,
  };
}

export function reconcileUsage({
  estimatedTokens = 0,
  actualTokens = 0,
  estimatedCost = 0,
  actualCost = 0,
} = {}) {
  counters.requests += 1;
  counters.estimatedTokens += Number(estimatedTokens) || 0;
  counters.actualTokens += Number(actualTokens) || 0;
  counters.estimatedCost += Number(estimatedCost) || 0;
  counters.actualCost += Number(actualCost) || 0;
}

export function optimizeAiRequest(payload = {}) {
  return payload;
}

export function buildBaselinePrompt(parts = []) {
  return Array.isArray(parts) ? parts.filter(Boolean).join("\n") : String(parts || "");
}

export default {
  TARGET_SAVINGS_PCT,
  getOptimizationCounters,
  reconcileUsage,
  optimizeAiRequest,
  buildBaselinePrompt,
};
