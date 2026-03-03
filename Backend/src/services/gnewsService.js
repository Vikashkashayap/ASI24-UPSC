/**
 * GNews API service – fetch India news for UPSC-relevant topics
 * API: https://gnews.io/api/v4/search
 */

const GNEWS_BASE = "https://gnews.io/api/v4/search";
const DEFAULT_QUERY =
  "India government policy OR Supreme Court OR economy OR environment OR international relations";
const DEFAULT_MAX = 5;

/**
 * Fetch latest India news from GNews
 * @param {Object} options
 * @param {string} [options.q] - Search query
 * @param {string} [options.lang=en]
 * @param {string} [options.country=in]
 * @param {number} [options.max=5]
 * @returns {Promise<Array<{ title, description, content, url, publishedAt }>>}
 */
export async function fetchGNews(options = {}) {
  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) {
    throw new Error("GNEWS_API_KEY is not set in environment");
  }

  const params = new URLSearchParams({
    q: options.q || DEFAULT_QUERY,
    lang: options.lang || "en",
    country: options.country || "in",
    max: String(options.max ?? DEFAULT_MAX),
    apikey: apiKey,
  });

  const url = `${GNEWS_BASE}?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GNews API error: ${response.status} ${response.statusText} – ${text.slice(0, 200)}`);
  }

  const data = await response.json();

  if (!Array.isArray(data.articles)) {
    return [];
  }

  return data.articles.map((a) => ({
    title: a.title || "",
    description: a.description || "",
    content: a.content || "",
    url: a.url || "",
    publishedAt: a.publishedAt || null,
  }));
}
