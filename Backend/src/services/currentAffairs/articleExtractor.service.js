/**
 * Fetch a Current Affairs URL and extract clean article text for temporary AI context.
 * Never persist article body to the database.
 */

import fetch from "node-fetch";
import { htmlToEducationalText } from "../notes/htmlCleaner.js";

const FETCH_TIMEOUT_MS = parseInt(process.env.CA_EXTRACT_TIMEOUT_MS, 10) || 20000;
const MAX_CONTENT_CHARS = parseInt(process.env.CA_EXTRACT_MAX_CHARS, 10) || 16000;
const USER_AGENT =
  process.env.CA_EXTRACT_USER_AGENT ||
  "MentorsDailyBot/1.0 (+https://mentorsdaily.com; UPSC education research)";

function decodeEntities(text = "") {
  return String(text)
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

function metaContent(html, property) {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`,
      "i"
    ),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return decodeEntities(m[1].trim());
  }
  return "";
}

function extractTitle(html) {
  return (
    metaContent(html, "og:title") ||
    metaContent(html, "twitter:title") ||
    (() => {
      const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      return m ? decodeEntities(m[1].replace(/\s+/g, " ").trim()) : "";
    })() ||
    (() => {
      const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
      return m
        ? decodeEntities(m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
        : "";
    })()
  );
}

function extractMainHtml(html) {
  const article = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (article?.[1] && article[1].length > 400) return article[1];
  const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (main?.[1] && main[1].length > 400) return main[1];
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return body?.[1] || html;
}

function sourceNameFromUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./i, "");
    const map = {
      "pib.gov.in": "PIB",
      "prsindia.org": "PRS India",
      "vajiramandravi.com": "Vajiram & Ravi",
      "visionias.in": "Vision IAS",
      "drishtiias.com": "Drishti IAS",
      "insightsonindia.com": "Insights IAS",
      "forumias.com": "Forum IAS",
      "rbi.org.in": "RBI",
    };
    for (const [h, name] of Object.entries(map)) {
      if (host === h || host.endsWith(`.${h}`)) return name;
    }
    return host.split(".")[0] || host;
  } catch {
    return "";
  }
}

function assertSafeUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid URL");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http/https URLs are allowed");
  }
  const host = parsed.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".local") ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  ) {
    throw new Error("Private/local URLs are not allowed");
  }
  return parsed.toString();
}

/**
 * @param {string} url
 * @returns {Promise<{ title: string, sourceName: string, sourceUrl: string, content: string, preview: string }>}
 */
export async function extractArticleFromUrl(url) {
  const safeUrl = assertSafeUrl(String(url || "").trim());
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let html = "";
  try {
    const res = await fetch(safeUrl, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-IN,en;q=0.9,hi;q=0.8",
      },
    });
    if (!res.ok) throw new Error(`Failed to fetch article (${res.status})`);
    html = await res.text();
  } catch (err) {
    if (err?.name === "AbortError") throw new Error("Article fetch timed out");
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (!html || html.length < 200) {
    throw new Error("Empty or invalid page content");
  }

  let content = htmlToEducationalText(extractMainHtml(html)).trim();
  if (content.length > MAX_CONTENT_CHARS) {
    content = `${content.slice(0, MAX_CONTENT_CHARS)}\n\n[Truncated]`;
  }
  if (content.length < 120) {
    throw new Error("Could not extract enough article text from this URL");
  }

  const title =
    extractTitle(html) ||
    content.split("\n").find((l) => l.trim()) ||
    "Current Affairs";

  return {
    title: title.slice(0, 300),
    sourceName: sourceNameFromUrl(safeUrl),
    sourceUrl: safeUrl,
    content,
    preview: content.slice(0, 500) + (content.length > 500 ? "…" : ""),
  };
}

export default { extractArticleFromUrl };
