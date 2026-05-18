import fetch from "node-fetch";

const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001";

/**
 * Translate a single English string to Hindi (Devanagari).
 * Falls back to original text on any failure.
 * @param {string} text
 * @returns {Promise<string>}
 */
export async function translateToHindi(text) {
  const source = String(text ?? "").trim();
  if (!source) return "";

  if (process.env.ENABLE_HINDI_TRANSLATION === "false") {
    return source;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn("translateToHindi: OPENROUTER_API_KEY missing, using English fallback");
    return source;
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.FRONTEND_URL || "http://localhost:5173",
        "X-Title": "UPSC Mentor - Hindi Translation",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a professional Hindi translator for UPSC (Union Public Service Commission) exam content. Translate accurately into formal Hindi (Devanagari script). Preserve proper nouns, numbers, dates, and technical terms where appropriate. Return ONLY the translated text with no quotes, labels, or explanations.",
          },
          {
            role: "user",
            content: `Translate to Hindi:\n\n${source}`,
          },
        ],
        temperature: 0.2,
        max_tokens: Math.min(2000, Math.max(256, source.length * 3)),
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter ${response.status}: ${errText.slice(0, 200)}`);
    }

    const data = await response.json();
    const translated = data?.choices?.[0]?.message?.content?.trim();
    return translated || source;
  } catch (error) {
    console.error("translateToHindi failed:", error.message);
    return source;
  }
}

/**
 * Translate multiple option strings in parallel.
 * @param {string[]} texts
 * @returns {Promise<string[]>}
 */
export async function translateManyToHindi(texts) {
  if (!Array.isArray(texts)) return [];
  try {
    return await Promise.all(texts.map((t) => translateToHindi(t)));
  } catch (error) {
    console.error("translateManyToHindi failed:", error.message);
    return texts.map((t) => String(t ?? ""));
  }
}
