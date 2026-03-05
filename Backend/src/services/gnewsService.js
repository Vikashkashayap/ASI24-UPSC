/**
 * GNews API service – fetch India news for UPSC current affairs
 * Uses top-headlines (single request) to avoid 429 Too Many Requests.
 * API: https://gnews.io/api/v4/top-headlines
 */

const GNEWS_TOP_HEADLINES = "https://gnews.io/api/v4/top-headlines";
const DEFAULT_MAX = 20;
const LANG = "en";
const COUNTRY = "in";

/**
 * Fetch latest Indian top headlines – ONE request to avoid rate limits.
 * @param {Object} [options]
 * @param {number} [options.max=20]
 * @returns {Promise<Array<{ title, description, content, url, publishedAt }>>}
 */
export async function fetchTopHeadlines(options = {}) {
  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) {
    throw new Error("GNEWS_API_KEY is not set in environment");
  }

  const params = new URLSearchParams({
    country: COUNTRY,
    lang: LANG,
    max: String(options.max ?? DEFAULT_MAX),
    apikey: apiKey,
  });

  const url = `${GNEWS_TOP_HEADLINES}?${params.toString()}`;
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

/**
 * Legacy: fetch by search query (use sparingly to avoid 429).
 * @deprecated Prefer fetchTopHeadlines for daily pipeline.
 */
const GNEWS_SEARCH = "https://gnews.io/api/v4/search";
const DEFAULT_QUERY =
  "India government policy OR Supreme Court OR economy OR environment OR international relations";

export async function fetchGNews(options = {}) {
  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) {
    throw new Error("GNEWS_API_KEY is not set in environment");
  }

  const params = new URLSearchParams({
    q: options.q || DEFAULT_QUERY,
    lang: options.lang || LANG,
    country: options.country || COUNTRY,
    max: String(options.max ?? 5),
    apikey: apiKey,
  });

  const url = `${GNEWS_SEARCH}?${params.toString()}`;
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
