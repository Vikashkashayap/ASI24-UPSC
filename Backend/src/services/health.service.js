/**
 * System health checks — MongoDB, Qdrant, Embeddings, LLM, QG pipeline metrics.
 */

import mongoose from "mongoose";
import fetch from "node-fetch";
import { embeddingService } from "./ai/embedding.service.js";
import { qdrantService } from "./ai/qdrant.service.js";
import {
  getQgMetricsSnapshot,
  isRerankerConfigured,
  getModelForStage,
  QG_CONFIG,
} from "./qg/index.js";
import { getOpenRouterIdentHeaders } from "../config/openRouterAppTitle.js";

function connectionStatus(readyState) {
  return readyState === 1 ? "connected" : "disconnected";
}

async function checkMongo() {
  return connectionStatus(mongoose.connection.readyState);
}

async function checkQdrant() {
  if (!qdrantService.isConfigured()) return "disconnected";
  try {
    const health = await qdrantService.health();
    return health?.ok ? "connected" : "disconnected";
  } catch {
    return "disconnected";
  }
}

async function checkEmbedding() {
  if (!embeddingService.isConfigured()) return "disconnected";
  try {
    const result = await embeddingService.healthCheck();
    return result.ok ? "connected" : "disconnected";
  } catch {
    return "disconnected";
  }
}

async function checkLlm() {
  const apiKey = String(process.env.OPENROUTER_API_KEY || "").trim();
  if (!apiKey) return "disconnected";

  const timeoutMs = parseInt(process.env.HEALTH_LLM_TIMEOUT_MS, 10) || 10_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...getOpenRouterIdentHeaders("health"),
      },
      signal: controller.signal,
    });
    return response.ok ? "connected" : "disconnected";
  } catch {
    return "disconnected";
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @returns {Promise<object>}
 */
export async function getSystemHealth() {
  const [mongodb, qdrant, embedding, llm] = await Promise.all([
    checkMongo(),
    checkQdrant(),
    checkEmbedding(),
    checkLlm(),
  ]);

  const metrics = getQgMetricsSnapshot();

  return {
    mongodb,
    qdrant,
    embedding,
    embeddingProvider: embeddingService.getProviderLabel(),
    llm,
    reranker: {
      provider: QG_CONFIG.reranker.provider,
      configured: isRerankerConfigured(),
      status: isRerankerConfigured() ? "configured" : "passthrough",
    },
    models: {
      question: getModelForStage("question"),
      verification: getModelForStage("verification"),
      explanation: getModelForStage("explanation"),
      factCheck: getModelForStage("factCheck"),
    },
    pipeline: {
      hybridRetrieval: process.env.QG_HYBRID_RETRIEVAL !== "false",
      enterpriseQg: process.env.QG_ENTERPRISE_PIPELINE !== "false",
      qualityProfile: QG_CONFIG.qualityProfile,
      allowOpenKnowledge: QG_CONFIG.generation.allowOpenKnowledge,
      explanationWords: [
        QG_CONFIG.quality.explanationMinWords,
        QG_CONFIG.quality.explanationMaxWords,
      ],
      lockAnswerExplanation: QG_CONFIG.quality.requireAnswerExplanationLock,
      averages: metrics.averages,
      counters: metrics.counters,
      samples: metrics.samples,
    },
  };
}

export default { getSystemHealth };
