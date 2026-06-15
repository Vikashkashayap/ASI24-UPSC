import { getTranslationModel } from "../config/openRouterModels.js";
import { isSeparateHindiTranslationEnabled } from "../config/bilingualConfig.js";
import { openRouterChatCompletion } from "./openRouterClient.js";

const HINDI_SYSTEM =
  "UPSC Hindi translator. Formal Devanagari. Keep proper nouns/numbers. Return ONLY requested format, no labels.";

const BATCH_SYSTEM =
  "Translate each English UPSC exam string to formal Hindi (Devanagari). Return ONLY a JSON array of translated strings in the same order and length as input. No markdown.";

function parseJsonArray(raw) {
  const text = String(raw || "").trim();
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return null;
  try {
    const arr = JSON.parse(match[0]);
    return Array.isArray(arr) ? arr.map((s) => String(s ?? "").trim()) : null;
  } catch {
    return null;
  }
}

async function callTranslateBatchApi(texts) {
  const sources = texts.map((t) => String(t ?? "").trim()).filter(Boolean);
  if (sources.length === 0) return [];

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn("translateToHindi: OPENROUTER_API_KEY missing, using English fallback");
    return sources;
  }

  const model = getTranslationModel();
  const maxTokens = Math.min(4000, Math.max(512, sources.join("").length * 2));

  try {
    const result = await openRouterChatCompletion({
      apiKey,
      model,
      messages: [
        { role: "system", content: BATCH_SYSTEM },
        { role: "user", content: JSON.stringify(sources) },
      ],
      temperature: 0.15,
      maxTokens,
      xTitle: "UPSC Mentor - Hindi Translation",
      cacheTtlSec: parseInt(process.env.TRANSLATION_CACHE_TTL_SEC, 10) || 604800,
      label: `hindi-batch-${sources.length}`,
    });

    const parsed = parseJsonArray(result.content);
    if (!parsed || parsed.length !== sources.length) {
      console.warn(`translate batch: expected ${sources.length} items, got ${parsed?.length ?? 0}`);
      return sources;
    }
    return parsed;
  } catch (error) {
    console.error("translate batch failed:", error.message);
    return sources;
  }
}

async function callTranslateToHindiApi(text) {
  const source = String(text ?? "").trim();
  if (!source) return "";
  if (/[\u0900-\u097F]/.test(source)) return source;

  const [translated] = await callTranslateBatchApi([source]);
  return translated || source;
}

/**
 * Translate many strings in few API calls (default 20 per batch).
 */
export async function translateTextsBatchToHindi(texts, batchSize = 20) {
  if (!Array.isArray(texts) || texts.length === 0) return [];

  const normalized = texts.map((t) => String(t ?? "").trim());
  const results = [...normalized];

  const uniqueMap = new Map();
  const uniqueTexts = [];
  normalized.forEach((t, i) => {
    if (!t || /[\u0900-\u097F]/.test(t)) return;
    if (!uniqueMap.has(t)) {
      uniqueMap.set(t, []);
      uniqueTexts.push(t);
    }
    uniqueMap.get(t).push(i);
  });

  const size = Math.max(1, parseInt(process.env.HINDI_TRANSLATE_BATCH_SIZE, 10) || batchSize);
  for (let i = 0; i < uniqueTexts.length; i += size) {
    const chunk = uniqueTexts.slice(i, i + size);
    const translated = await callTranslateBatchApi(chunk);
    chunk.forEach((src, j) => {
      const out = translated[j] || src;
      for (const idx of uniqueMap.get(src) || []) {
        results[idx] = out;
      }
    });
  }

  return results;
}

export async function translateToHindi(text) {
  const source = String(text ?? "").trim();
  if (!source) return "";
  if (!isSeparateHindiTranslationEnabled()) return source;
  return callTranslateToHindiApi(source);
}

export async function translateToHindiForPractice(text) {
  const source = String(text ?? "").trim();
  if (!source) return "";
  if (/[\u0900-\u097F]/.test(source)) return source;
  return callTranslateToHindiApi(source);
}

export async function translateManyToHindiForPractice(texts, concurrency = 8) {
  if (!Array.isArray(texts) || texts.length === 0) return [];
  return translateTextsBatchToHindi(texts, parseInt(process.env.HINDI_TRANSLATE_BATCH_SIZE, 10) || 20);
}

export async function translateManyToHindi(texts) {
  if (!Array.isArray(texts)) return [];
  if (!isSeparateHindiTranslationEnabled()) {
    return texts.map((t) => String(t ?? ""));
  }
  try {
    return await translateTextsBatchToHindi(texts);
  } catch (error) {
    console.error("translateManyToHindi failed:", error.message);
    return texts.map((t) => String(t ?? ""));
  }
}
