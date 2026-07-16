/**
 * Reranker provider abstraction — Cohere | Jina | Voyage | none (score passthrough).
 */

import fetch from "node-fetch";
import { QG_CONFIG } from "../config/qg.config.js";

function getProvider() {
  return String(QG_CONFIG.reranker.provider || "none").toLowerCase();
}

/**
 * @param {{ query: string, documents: string[], topN?: number }} params
 * @returns {Promise<{ index: number, relevanceScore: number }[]>}
 */
export async function rerankDocuments({ query, documents, topN }) {
  const docs = (documents || []).map((d) => String(d || "").trim()).filter(Boolean);
  if (!docs.length) return [];

  const n = Math.min(topN || QG_CONFIG.reranker.topN, docs.length);
  const provider = getProvider();

  try {
    if (provider === "cohere") return await rerankCohere(query, docs, n);
    if (provider === "jina") return await rerankJina(query, docs, n);
    if (provider === "voyage") return await rerankVoyage(query, docs, n);
  } catch (err) {
    console.warn(`[qg.rerank] ${provider} failed: ${err.message}; falling back to input order`);
  }

  return docs.map((_, index) => ({ index, relevanceScore: 1 - index * 0.01 })).slice(0, n);
}

async function rerankCohere(query, documents, topN) {
  const apiKey = process.env.COHERE_API_KEY;
  if (!apiKey) throw new Error("COHERE_API_KEY missing");

  const model = QG_CONFIG.reranker.model || process.env.COHERE_RERANK_MODEL || "rerank-english-v3.0";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), QG_CONFIG.reranker.timeoutMs);

  try {
    const res = await fetch("https://api.cohere.ai/v1/rerank", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        query,
        documents,
        top_n: topN,
        return_documents: false,
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Cohere rerank HTTP ${res.status}`);
    const data = await res.json();
    return (data.results || []).map((r) => ({
      index: r.index,
      relevanceScore: r.relevance_score,
    }));
  } finally {
    clearTimeout(timer);
  }
}

async function rerankJina(query, documents, topN) {
  const apiKey = process.env.JINA_API_KEY;
  if (!apiKey) throw new Error("JINA_API_KEY missing");

  const model = QG_CONFIG.reranker.model || process.env.JINA_RERANK_MODEL || "jina-reranker-v2-base-multilingual";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), QG_CONFIG.reranker.timeoutMs);

  try {
    const res = await fetch("https://api.jina.ai/v1/rerank", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        query,
        documents,
        top_n: topN,
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Jina rerank HTTP ${res.status}`);
    const data = await res.json();
    return (data.results || []).map((r) => ({
      index: r.index,
      relevanceScore: r.relevance_score ?? r.score,
    }));
  } finally {
    clearTimeout(timer);
  }
}

async function rerankVoyage(query, documents, topN) {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) throw new Error("VOYAGE_API_KEY missing");

  const model = QG_CONFIG.reranker.model || process.env.VOYAGE_RERANK_MODEL || "rerank-2";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), QG_CONFIG.reranker.timeoutMs);

  try {
    const res = await fetch("https://api.voyageai.com/v1/rerank", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        query,
        documents,
        top_k: topN,
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Voyage rerank HTTP ${res.status}`);
    const data = await res.json();
    return (data.data || data.results || []).map((r) => ({
      index: r.index,
      relevanceScore: r.relevance_score ?? r.score,
    }));
  } finally {
    clearTimeout(timer);
  }
}

export function isRerankerConfigured() {
  const p = getProvider();
  if (p === "none" || p === "passthrough") return false;
  if (p === "cohere") return Boolean(process.env.COHERE_API_KEY);
  if (p === "jina") return Boolean(process.env.JINA_API_KEY);
  if (p === "voyage") return Boolean(process.env.VOYAGE_API_KEY);
  return false;
}

export default { rerankDocuments, isRerankerConfigured };
