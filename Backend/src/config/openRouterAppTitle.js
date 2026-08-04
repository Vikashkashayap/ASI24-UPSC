import { AsyncLocalStorage } from "async_hooks";

/**
 * OpenRouter "App" column (X-Title header) — set per feature at the entry point
 * so nested LLM/embedding calls inherit the same label without threading params.
 */
const store = new AsyncLocalStorage();

/** Labels shown in OpenRouter Observability → Logs → App */
export const OPENROUTER_APP_TITLES = Object.freeze({
  PRACTICE: "practice",
  COPY_EVALUATION: "copy evaluation",
  MODULE: "module",
});

/**
 * Run async work with a feature-specific OpenRouter App title.
 * @template T
 * @param {string} title
 * @param {() => T | Promise<T>} fn
 * @returns {Promise<T>}
 */
export function runWithOpenRouterAppTitle(title, fn) {
  return store.run(String(title || "").trim() || undefined, fn);
}

/**
 * Current feature title, or fallback when no entry point set one.
 * @param {string} [fallback="UPSC Mentor"]
 */
export function getOpenRouterAppTitle(fallback = "UPSC Mentor") {
  const current = store.getStore();
  return current || fallback;
}
