/**
 * Build rich embedding text — never embed chunk alone.
 */
export function buildEmbeddingPayload({
  title = "",
  subject = "",
  chapter = "",
  topic = "",
  heading = "",
  chunkText = "",
  keywords = [],
  explanation = "",
  source = "",
} = {}) {
  const kw = Array.isArray(keywords) ? keywords.filter(Boolean).join(", ") : String(keywords || "");
  const parts = [
    subject && `Subject: ${subject}`,
    chapter && `Chapter: ${chapter}`,
    topic && `Topic: ${topic}`,
    title && `Title: ${title}`,
    heading && `Heading: ${heading}`,
    source && `Source: ${source}`,
    kw && `Keywords: ${kw}`,
    explanation && `Explanation: ${explanation}`,
    chunkText && `Content: ${chunkText}`,
  ].filter(Boolean);

  return parts.join("\n");
}

export function extractKeywords(text, limit = 12) {
  const stop = new Set([
    "the", "and", "for", "that", "with", "this", "from", "are", "was", "were",
    "have", "has", "had", "not", "but", "into", "their", "which", "will", "can",
    "also", "been", "more", "than", "such", "about", "over", "under", "between",
  ]);
  const freq = new Map();
  for (const w of String(text || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 3 && !stop.has(t))) {
    freq.set(w, (freq.get(w) || 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([w]) => w);
}
