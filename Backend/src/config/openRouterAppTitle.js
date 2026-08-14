import { AsyncLocalStorage } from "async_hooks";
import { getFrontendOrigin } from "./urlConfig.js";

/**
 * OpenRouter "App" column (X-Title header) — set per feature at the entry point
 * so nested LLM/embedding calls inherit the same label without threading params.
 */
const store = new AsyncLocalStorage();

/** Labels shown in OpenRouter Observability → Logs → App */
export const OPENROUTER_APP_TITLES = Object.freeze({
  PRACTICE: "practice test",
  CHAPTER_PRACTICE: "chapter practice",
  MODULE_FINAL: "module final",
  COPY_EVALUATION: "copy evaluation",
  CURRENT_AFFAIRS: "current affairs",
  AI_MENTOR: "ai mentor",
  PRELIMS: "prelims test series",
  /** @deprecated use CHAPTER_PRACTICE or MODULE_FINAL */
  MODULE: "chapter practice",
});

function slugFromTitle(title) {
  return (
    String(title || "upsc-mentor")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "upsc-mentor"
  );
}

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

/**
 * HTTP-Referer + X-Title for OpenRouter logs (App column).
 * @param {string} [explicitTitle]
 */
export function getOpenRouterIdentHeaders(explicitTitle) {
  const title = explicitTitle || getOpenRouterAppTitle("UPSC Mentor");
  const origin = (getFrontendOrigin() || "https://studentportal.mentorsdaily.com").replace(
    /\/$/,
    ""
  );
  return {
    "HTTP-Referer": `${origin}/${slugFromTitle(title)}`,
    "X-Title": title,
  };
}
