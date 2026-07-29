import fetch from "node-fetch";
import { getFrontendOrigin } from "../config/urlConfig.js";
import { isSeparateHindiTranslationEnabled } from "../config/bilingualConfig.js";
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
 * Default: free MT (0 OpenRouter tokens). LLM only if HINDI_TRANSLATE_PROVIDER=llm.
 */
export async function translateToHindi(text) {
  const source = String(text ?? "").trim();
  if (!source) return "";

  if (!isSeparateHindiTranslationEnabled() && !shouldUseFreeMtHindi()) {
    // client provider: callers should skip; return English fallback
    if (getHindiTranslateProvider() === "client") return source;
  }

  if (shouldUseFreeMtHindi() || getHindiTranslateProvider() === "client") {
    // Even under "client", if this helper is invoked, use free MT (never OpenRouter)
    return mtTranslateToHindi(source);
  }

  if (!shouldUseLlmHindi()) {
    return mtTranslateToHindi(source);
  }

  assertOpenRouterAllowed("translateToHindi");

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn("translateToHindi: OPENROUTER_API_KEY missing — using free MT");
    return mtTranslateToHindi(source);
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
              "You are a professional Hindi translator for UPSC exam content. Translate accurately into formal Hindi (Devanagari). Preserve proper nouns, numbers, dates. Return ONLY the translated text.",
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
    const translated = data?.choices?.[0]?.message?.content?.trim();
    return translated || source;
  } catch (error) {
    console.error("translateToHindi LLM failed, falling back to free MT:", error.message);
    return mtTranslateToHindi(source);
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
