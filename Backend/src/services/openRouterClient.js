import crypto from "crypto";
import fetch from "node-fetch";
import { getFrontendOrigin } from "../config/urlConfig.js";
import { usdToInr } from "../config/openRouterDefaults.js";
import { recordOpenRouterCost } from "./openRouterCostTracker.js";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions";

/** Approximate USD per 1M tokens (input, output) — update if OpenRouter pricing changes */
const MODEL_PRICING_PER_M = {
  "google/gemini-2.5-flash-lite": [0.075, 0.3],
  "google/gemini-2.5-flash": [0.15, 0.6],
  "google/gemini-2.0-flash-001": [0.1, 0.4],
  "openai/gpt-4o-mini": [0.15, 0.6],
  "openai/gpt-3.5-turbo": [0.5, 1.5],
  "meta-llama/meta-llama-3.1-70b-instruct": [0.52, 0.75],
  default: [0.2, 0.8],
};

const responseCache = new Map();
const inFlight = new Map();
const dailyStats = { date: "", requests: 0, promptTokens: 0, completionTokens: 0, costUsd: 0, cachedHits: 0 };

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function resetDailyIfNeeded() {
  const d = todayKey();
  if (dailyStats.date !== d) {
    if (dailyStats.date && dailyStats.requests > 0) {
      logDailySummary("rollover");
    }
    dailyStats.date = d;
    dailyStats.requests = 0;
    dailyStats.promptTokens = 0;
    dailyStats.completionTokens = 0;
    dailyStats.costUsd = 0;
    dailyStats.cachedHits = 0;
  }
}

function estimateCostUsd(model, usage = {}) {
  const key = String(model || "").toLowerCase();
  const [inRate, outRate] =
    MODEL_PRICING_PER_M[key] ||
    MODEL_PRICING_PER_M[Object.keys(MODEL_PRICING_PER_M).find((k) => key.includes(k.split("/").pop()))] ||
    MODEL_PRICING_PER_M.default;
  const prompt = usage.prompt_tokens || 0;
  const completion = usage.completion_tokens || 0;
  return (prompt * inRate + completion * outRate) / 1_000_000;
}

function hashRequest(model, messages, maxTokens, temperature) {
  const payload = JSON.stringify({ model, messages, maxTokens, temperature });
  return crypto.createHash("sha256").update(payload).digest("hex");
}

function getCacheTtlMs(cacheTtlSec) {
  if (cacheTtlSec === 0) return 0;
  const env = parseInt(process.env.OPENROUTER_CACHE_TTL_SEC, 10);
  const base = Number.isFinite(cacheTtlSec) ? cacheTtlSec : env || 3600;
  return Math.max(0, base) * 1000;
}

function pruneCache() {
  const max = parseInt(process.env.OPENROUTER_CACHE_MAX_ENTRIES, 10) || 500;
  if (responseCache.size <= max) return;
  const entries = [...responseCache.entries()].sort((a, b) => a[1].at - b[1].at);
  const remove = entries.slice(0, responseCache.size - max);
  for (const [k] of remove) responseCache.delete(k);
}

function logUsage({ model, usage, costUsd, cached, label, finishReason, maxTokens }) {
  resetDailyIfNeeded();
  if (cached) dailyStats.cachedHits += 1;
  else {
    dailyStats.requests += 1;
    dailyStats.promptTokens += usage?.prompt_tokens || 0;
    dailyStats.completionTokens += usage?.completion_tokens || 0;
    dailyStats.costUsd += costUsd;
  }

  const tag = label ? `[${label}]` : "";
  const cacheNote = cached ? " (cache)" : "";
  const inr = usdToInr(costUsd);
  console.log(
    `💰 OpenRouter${tag}${cacheNote}: model=${model} in=${usage?.prompt_tokens ?? 0} out=${usage?.completion_tokens ?? 0} cost=$${(costUsd || 0).toFixed(6)} (₹${inr.toFixed(2)}) finish=${finishReason ?? "?"} max_tokens=${maxTokens ?? "?"} | daily: $${dailyStats.costUsd.toFixed(4)} (${dailyStats.requests} calls, ${dailyStats.cachedHits} cache hits)`
  );
}

export function logDailySummary(reason = "manual") {
  resetDailyIfNeeded();
  console.log(
    `📊 OpenRouter daily summary (${dailyStats.date}, ${reason}): requests=${dailyStats.requests} cached=${dailyStats.cachedHits} tokens in=${dailyStats.promptTokens} out=${dailyStats.completionTokens} est_cost=$${dailyStats.costUsd.toFixed(4)}`
  );
  return { ...dailyStats };
}

export function getOpenRouterDailyStats() {
  resetDailyIfNeeded();
  return { ...dailyStats };
}

/**
 * Single OpenRouter chat completion with cache, in-flight dedup, and cost logging.
 */
export async function openRouterChatCompletion({
  apiKey,
  model,
  messages,
  temperature = 0.3,
  maxTokens = 2000,
  xTitle = "UPSC Mentor",
  cacheTtlSec,
  cacheKey,
  label,
  stream = false,
}) {
  if (!apiKey) throw new Error("OpenRouter API key is required");
  if (!model) throw new Error("Model name is required");
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error("messages array is required");
  }
  if (stream) {
    throw new Error("Streaming not enabled in openRouterClient; set stream=false");
  }

  const ttlMs = getCacheTtlMs(cacheTtlSec);
  const key = cacheKey || hashRequest(model, messages, maxTokens, temperature);

  if (ttlMs > 0) {
    const hit = responseCache.get(key);
    if (hit && Date.now() - hit.at < ttlMs) {
      logUsage({
        model,
        usage: hit.usage,
        costUsd: hit.costUsd,
        cached: true,
        label,
        finishReason: hit.finishReason,
        maxTokens,
      });
      return { ...hit.data, cached: true };
    }
  }

  if (inFlight.has(key)) {
    return inFlight.get(key);
  }

  const frontendOrigin = getFrontendOrigin();
  const requestBody = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  };

  const promise = (async () => {
    const response = await fetch(OPENROUTER_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": frontendOrigin,
        "X-Title": xTitle,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `OpenRouter API error: ${response.status}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error?.message || errorData.message || errorMessage;
      } catch {
        errorMessage = errorText?.slice(0, 300) || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content ?? "";
    const finishReason = data?.choices?.[0]?.finish_reason;
    const usage = data?.usage || {};
    const costUsd = estimateCostUsd(data.model || model, usage);

    const result = {
      success: true,
      content: typeof content === "string" ? content : JSON.stringify(content),
      model: data.model || model,
      usage,
      finishReason,
      costUsd,
      cached: false,
    };

    logUsage({ model: result.model, usage, costUsd, cached: false, label, finishReason, maxTokens });
    recordOpenRouterCost(costUsd, false);

    if (ttlMs > 0) {
      responseCache.set(key, {
        at: Date.now(),
        data: result,
        usage,
        costUsd,
        finishReason,
      });
      pruneCache();
    }

    return result;
  })();

  inFlight.set(key, promise);
  try {
    return await promise;
  } finally {
    inFlight.delete(key);
  }
}

export function clearOpenRouterCache() {
  responseCache.clear();
}
