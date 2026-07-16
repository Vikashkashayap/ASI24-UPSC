/**
 * Exponential backoff retry for embedding / Qdrant / LLM calls.
 */

import { ragLogger } from "./logger.js";
import { RAG_CONFIG } from "../config/rag.config.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * @template T
 * @param {() => Promise<T>} fn
 * @param {{ retries?: number, label?: string, baseDelayMs?: number }} [opts]
 * @returns {Promise<T>}
 */
export async function withRetry(fn, opts = {}) {
  const retries = opts.retries ?? RAG_CONFIG.retry.llm;
  const baseDelayMs = opts.baseDelayMs ?? RAG_CONFIG.retry.baseDelayMs;
  const label = opts.label || "operation";
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      ragLogger.warn(`${label} failed`, {
        attempt,
        retries,
        error: err?.message || String(err),
      });
      if (attempt >= retries) break;
      await sleep(baseDelayMs * 2 ** (attempt - 1));
    }
  }

  throw lastError;
}

export default withRetry;
