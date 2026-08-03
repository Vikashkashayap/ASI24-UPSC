/**
 * Model router — Lite / Flash selection for admin health display.
 */

export const MODEL_TIER = {
  LITE: "lite",
  FLASH: "flash",
};

export const TASK_TIER_MAP = {
  question_detection: MODEL_TIER.LITE,
  ocr: MODEL_TIER.LITE,
  feedback: MODEL_TIER.LITE,
  evaluation: MODEL_TIER.FLASH,
  model_answer: MODEL_TIER.FLASH,
  copy_evaluation: MODEL_TIER.FLASH,
  default: MODEL_TIER.FLASH,
};

export function getLiteModel() {
  return (
    process.env.AI_MODEL_LITE ||
    process.env.OPENROUTER_TEST_MODEL ||
    process.env.OPENROUTER_MODEL ||
    "google/gemini-2.5-flash-lite"
  );
}

export function getFlashModel() {
  return (
    process.env.AI_MODEL_FLASH ||
    process.env.OPENROUTER_MODEL ||
    "google/gemini-2.5-flash"
  );
}

export function getPrimaryModel() {
  return getFlashModel();
}

export function getFailoverChain() {
  const primary = getFlashModel();
  const lite = getLiteModel();
  const failover = process.env.AI_MODEL_FAILOVER || "";
  return [...new Set([primary, lite, failover].filter(Boolean))];
}

export function selectModel(tier = MODEL_TIER.FLASH) {
  return tier === MODEL_TIER.LITE ? getLiteModel() : getFlashModel();
}

export function selectModelForTask(task = "default") {
  const tier = TASK_TIER_MAP[task] || TASK_TIER_MAP.default;
  return selectModel(tier);
}

export function classifyComplexity(text = "") {
  const len = String(text || "").length;
  return len > 1200 ? MODEL_TIER.FLASH : MODEL_TIER.LITE;
}

export function describeRoute() {
  return {
    active: getPrimaryModel(),
    lite: getLiteModel(),
    flash: getFlashModel(),
    failover: getFailoverChain(),
  };
}

/** Rough OpenRouter Gemini Flash pricing fallback (USD per 1M tokens). */
export function estimateCostUsd({
  promptTokens = 0,
  completionTokens = 0,
  model = "",
} = {}) {
  const m = String(model || "").toLowerCase();
  const inputRate = m.includes("lite") ? 0.1 : 0.3;
  const outputRate = m.includes("lite") ? 0.4 : 2.5;
  return (
    (Number(promptTokens) / 1e6) * inputRate +
    (Number(completionTokens) / 1e6) * outputRate
  );
}

export default {
  MODEL_TIER,
  selectModelForTask,
  getLiteModel,
  getFlashModel,
  describeRoute,
  estimateCostUsd,
};
