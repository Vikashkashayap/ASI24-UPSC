import { QG_CONFIG } from "../config/qg.config.js";

export async function withRetry(fn, { retries, label = "qg", baseDelayMs } = {}) {
  const max = Math.max(1, retries ?? QG_CONFIG.retry.llm);
  const base = baseDelayMs ?? QG_CONFIG.retry.baseDelayMs;
  let lastErr;

  for (let attempt = 1; attempt <= max; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      if (attempt >= max) break;
      const delay = base * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 200);
      console.warn(`[${label}] attempt ${attempt}/${max} failed: ${err.message}; retry in ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

export default { withRetry };
