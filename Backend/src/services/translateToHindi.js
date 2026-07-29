import fetch from "node-fetch";
import { getFrontendOrigin } from "../config/urlConfig.js";
import { assertOpenRouterAllowed } from "../middleware/examAiGuard.js";
import {
  getHindiTranslateProvider,
  mtTranslateManyToHindi,
  mtTranslateToHindi,
  shouldUseFreeMtHindi,
  shouldUseLlmHindi,
} from "./mtTranslateToHindi.js";

const DEFAULT_MODEL =
  process.env.OPENROUTER_TRANSLATION_MODEL ||
  process.env.OPENROUTER_MODEL ||
  "google/gemini-2.5-flash-lite";

const TRANSLATE_TIMEOUT_MS = Math.max(
  8000,
  parseInt(process.env.HINDI_TRANSLATE_TIMEOUT_MS, 10) || 20000
);

/**
 * Translate a single English string to Hindi (Devanagari).
 * Uses OpenRouter when HINDI_TRANSLATE_PROVIDER=llm (default for quality).
 * Free Google MT only when provider=mt explicitly.
 */
export async function translateToHindi(text) {
  const source = String(text ?? "").trim();
  if (!source) return "";

  if (getHindiTranslateProvider() === "client") {
    return "";
  }

  if (shouldUseFreeMtHindi()) {
    return mtTranslateToHindi(source);
  }

  // OpenRouter LLM path (default)
  assertOpenRouterAllowed("translateToHindi");

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn("translateToHindi: OPENROUTER_API_KEY missing — leaving Hindi empty");
    return "";
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TRANSLATE_TIMEOUT_MS);

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": getFrontendOrigin(),
        "X-Title": "UPSC Mentor - Hindi Translation",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a professional Hindi translator for UPSC exam content. Translate accurately into formal Hindi (Devanagari). Preserve proper nouns, numbers, dates, List-I/List-II structure, and Assertion-Reason labels (अभिकथन/कारण). Return ONLY the translated text — no English, no markdown.",
          },
          {
            role: "user",
            content: `Translate to Hindi:\n\n${source}`,
          },
        ],
        temperature: 0.2,
        max_tokens: Math.min(1500, Math.max(200, Math.ceil(source.length * 2.5))),
      }),
      signal: ctrl.signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter ${response.status}: ${errText.slice(0, 200)}`);
    }

    const data = await response.json();
    const translated = data?.choices?.[0]?.message?.content?.trim() || "";
    // Reject English-as-Hindi leftovers
    if (translated && /[\u0900-\u097F]/.test(translated)) return translated;
    return "";
  } catch (error) {
    console.error("translateToHindi OpenRouter failed:", error.message);
    return "";
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Translate multiple strings with limited concurrency (avoids hanging the server).
 */
export async function translateManyToHindi(texts) {
  if (!Array.isArray(texts)) return [];
  const list = texts.map((t) => String(t ?? ""));

  if (!shouldUseLlmHindi()) {
    return mtTranslateManyToHindi(list);
  }

  const out = new Array(list.length);
  let cursor = 0;
  const limit = Math.min(3, Math.max(1, list.length));

  async function worker() {
    while (cursor < list.length) {
      const i = cursor;
      cursor += 1;
      try {
        out[i] = await translateToHindi(list[i]);
      } catch {
        out[i] = list[i];
      }
    }
  }

  try {
    await Promise.all(Array.from({ length: limit }, () => worker()));
    return out;
  } catch (error) {
    console.error("translateManyToHindi failed:", error.message);
    return list;
  }
}
