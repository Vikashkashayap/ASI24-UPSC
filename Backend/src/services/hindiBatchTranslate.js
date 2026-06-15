import fetch from "node-fetch";
import { getFrontendOrigin } from "../config/urlConfig.js";
import { assertOpenRouterAllowed } from "../middleware/examAiGuard.js";

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

/**
 * Batch Hindi translation — allowed during migration batch or admin generation only.
 */
export async function translateTextsBatchToHindi(texts, { apiKey, model, batchSize = 40 } = {}) {
  assertOpenRouterAllowed("translateTextsBatchToHindi");

  const sources = texts.map((t) => String(t ?? "").trim()).filter(Boolean);
  if (sources.length === 0) return [];

  const key = apiKey || process.env.OPENROUTER_API_KEY;
  if (!key) {
    console.warn("translateTextsBatchToHindi: no API key, returning English");
    return sources;
  }

  const resolvedModel =
    model ||
    process.env.OPENROUTER_TRANSLATION_MODEL ||
    process.env.OPENROUTER_CHEAP_MODEL ||
    "google/gemini-2.5-flash-lite";

  const size = Math.max(1, parseInt(batchSize, 10) || 40);
  const out = [];

  for (let i = 0; i < sources.length; i += size) {
    const chunk = sources.slice(i, i + size);
    const maxTokens = Math.min(4000, Math.max(512, chunk.join("").length * 2));

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "HTTP-Referer": getFrontendOrigin(),
        "X-Title": "UPSC Mentor - Hindi Migration",
      },
      body: JSON.stringify({
        model: resolvedModel,
        messages: [
          { role: "system", content: BATCH_SYSTEM },
          { role: "user", content: JSON.stringify(chunk) },
        ],
        temperature: 0.15,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Hindi batch translate failed: ${response.status} ${errText.slice(0, 200)}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content ?? "";
    const parsed = parseJsonArray(content);
    if (!parsed || parsed.length !== chunk.length) {
      console.warn(`Hindi batch: expected ${chunk.length}, got ${parsed?.length ?? 0} — using English fallback`);
      out.push(...chunk);
    } else {
      out.push(...parsed);
    }
  }

  return out;
}
