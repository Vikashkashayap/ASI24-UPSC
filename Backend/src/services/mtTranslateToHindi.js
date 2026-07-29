/**
 * Free EN→HI machine translation (Google gtx endpoint).
 * No OpenRouter / LLM tokens — same approach as Frontend clientHindiTranslate.
 */

import fetch from "node-fetch";

const memory = new Map();
const TRANSLATE_TIMEOUT_MS = Math.max(
  5000,
  parseInt(process.env.HINDI_MT_TIMEOUT_MS, 10) || 10000
);
const MAX_PARALLEL = Math.max(1, Math.min(6, parseInt(process.env.HINDI_MT_PARALLEL, 10) || 4));

function hasDevanagari(s) {
  return /[\u0900-\u097F]/.test(String(s || ""));
}

function cacheKey(text) {
  const t = String(text || "");
  let h = 0;
  for (let i = 0; i < t.length; i += 1) h = (h * 31 + t.charCodeAt(i)) | 0;
  return `${t.slice(0, 24)}_${t.length}_${Math.abs(h).toString(36)}`;
}

function chunkText(text, maxLen = 450) {
  const t = String(text || "");
  if (t.length <= maxLen) return [t];
  const parts = [];
  const lines = t.split("\n");
  let buf = "";
  for (const line of lines) {
    if (`${buf}\n${line}`.length > maxLen && buf) {
      parts.push(buf);
      buf = line;
    } else {
      buf = buf ? `${buf}\n${line}` : line;
    }
  }
  if (buf) parts.push(buf);
  const out = [];
  for (const p of parts) {
    if (p.length <= maxLen) out.push(p);
    else {
      for (let i = 0; i < p.length; i += maxLen) out.push(p.slice(i, i + maxLen));
    }
  }
  return out;
}

async function mapPool(items, limit, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor;
      cursor += 1;
      results[i] = await fn(items[i], i);
    }
  }
  const n = Math.max(1, Math.min(limit, items.length || 1));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}

async function translateChunk(text) {
  const q = String(text || "").trim();
  if (!q) return "";
  if (hasDevanagari(q) && !/[A-Za-z]{4,}/.test(q)) return q;

  const key = cacheKey(q);
  if (memory.has(key)) return memory.get(key);

  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=hi&dt=t&q=" +
    encodeURIComponent(q);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TRANSLATE_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`MT HTTP ${res.status}`);
    const data = await res.json();
    const translated = Array.isArray(data?.[0])
      ? data[0].map((row) => (Array.isArray(row) ? String(row[0] || "") : "")).join("")
      : "";
    const out = translated.trim() || q;
    memory.set(key, out);
    return out;
  } catch (err) {
    console.warn("[mt-hi] chunk failed, keeping English:", err?.message || err);
    return q;
  } finally {
    clearTimeout(timer);
  }
}

/** Translate one English string to Hindi (free MT, 0 OpenRouter tokens). */
export async function mtTranslateToHindi(text) {
  const raw = String(text || "").trim();
  if (!raw) return "";
  if (hasDevanagari(raw) && !/[A-Za-z]{4,}/.test(raw) && raw.length > 12) return raw;

  const chunks = chunkText(raw);
  if (chunks.length === 1) return translateChunk(chunks[0]);
  const parts = await mapPool(chunks, 2, (c) => translateChunk(c));
  return parts.join("\n").trim();
}

/** Translate many strings with limited concurrency. */
export async function mtTranslateManyToHindi(texts) {
  if (!Array.isArray(texts)) return [];
  const list = texts.map((t) => String(t ?? ""));
  return mapPool(list, MAX_PARALLEL, (t) => mtTranslateToHindi(t));
}

/**
 * Which Hindi path to use:
 * - client | none → skip server translate (exam UI free Google translate)
 * - mt | gtx → free server MT (no OpenRouter)
 * - llm → OpenRouter (expensive, opt-in only)
 */
export function getHindiTranslateProvider() {
  const raw = String(process.env.HINDI_TRANSLATE_PROVIDER || "client")
    .toLowerCase()
    .trim();
  if (["llm", "openrouter"].includes(raw)) return "llm";
  if (["mt", "gtx", "google"].includes(raw)) return "mt";
  return "client"; // client | none | anything else
}

export function shouldSkipServerHindiTranslation() {
  return getHindiTranslateProvider() === "client";
}

export function shouldUseFreeMtHindi() {
  return getHindiTranslateProvider() === "mt";
}

export function shouldUseLlmHindi() {
  return getHindiTranslateProvider() === "llm";
}
