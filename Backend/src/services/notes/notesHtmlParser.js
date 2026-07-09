/**
 * Parse topic names and links from notes.mentorsdaily.com HTML.
 */

const NOTES_BASE = "https://notes.mentorsdaily.com";

const GENERIC_HEADING_RE =
  /^(why (this|the) .+ matters|on this page|conceptual clarity|quick revision|download pdf|table of contents)/i;

export function decodeHtmlEntities(text = "") {
  return String(text)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

export function slugToTitle(slug = "") {
  return decodeHtmlEntities(
    String(slug)
      .replace(/-\d+$/g, "")
      .split("-")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}

export function isGenericHeading(text = "") {
  const t = String(text || "").trim();
  if (!t || t.length < 4) return true;
  if (GENERIC_HEADING_RE.test(t)) return true;
  if (/^topic \d+/i.test(t)) return true;
  return false;
}

/**
 * Extract topic title from topic page <title> tag.
 * e.g. "The Stone Age Notes for UPSC 2027 | ..." → "The Stone Age"
 */
export function extractTitleFromTopicPageHtml(html = "") {
  const raw = html.match(/<title>([^<]+)<\/title>/i)?.[1];
  if (!raw) return "";

  const decoded = decodeHtmlEntities(raw);
  const beforeNotes = decoded.split(/\s+Notes for UPSC/i)[0]?.trim();
  if (beforeNotes && beforeNotes.length > 2 && !isGenericHeading(beforeNotes)) {
    return beforeNotes;
  }
  return "";
}

/**
 * Extract topics from chapter hub page — parses each hub-topic-card individually.
 * @returns {{ url: string, slug: string, title: string }[]}
 */
export function extractTopicsFromChapterPage(html = "", chapterUrl = "") {
  const base = String(chapterUrl || "").trim().replace(/\/$/, "");
  const topics = [];
  const seen = new Set();

  // Primary: parse each topic card (handles mixed live / coming-soon cards)
  const cards = [...html.matchAll(/<article class="hub-topic-card">([\s\S]*?)<\/article>/gi)];
  for (const card of cards) {
    const block = card[1];
    const cardTitle = decodeHtmlEntities(block.match(/hub-card-title[^>]*>([^<]+)/i)?.[1] || "");
    let href = block.match(/hub-read-btn[^>]*href="([^"]+)"/i)?.[1];
    if (!href) continue;

    if (href.startsWith("/")) href = `${NOTES_BASE}${href}`;
    if (!href.startsWith(NOTES_BASE)) continue;
    if (href === base || href === `${base}/`) continue;
    if (!href.startsWith(`${base}/`)) continue;

    const slug = href.replace(base, "").replace(/^\//, "").split("?")[0];
    if (!slug || slug.includes("#") || seen.has(href)) continue;
    seen.add(href);

    const title = cardTitle && !isGenericHeading(cardTitle) ? cardTitle : slugToTitle(slug);
    topics.push({ url: href, slug, title });
  }

  if (topics.length > 0) return topics;

  // Fallback: hub-card-title + active read-btn pairs (legacy layout)
  const titles = [...html.matchAll(/class="hub-card-title"[^>]*>([^<]+)</gi)].map((m) =>
    decodeHtmlEntities(m[1])
  );
  const hrefs = [
    ...html.matchAll(/class="hub-read-btn[^"]*hub-read-btn--active"[^>]*href="([^"]+)"/gi),
    ...html.matchAll(/class="hub-read-btn[^"]*"[^>]*href="([^"]+)"/gi),
  ].map((m) => m[1]);

  for (let i = 0; i < hrefs.length; i += 1) {
    let href = hrefs[i];
    if (href.startsWith("/")) href = `${NOTES_BASE}${href}`;
    if (!href.startsWith(NOTES_BASE)) continue;
    if (href === base || href === `${base}/`) continue;
    if (!href.startsWith(`${base}/`)) continue;

    const slug = href.replace(base, "").replace(/^\//, "").split("?")[0];
    if (!slug || seen.has(href)) continue;
    seen.add(href);

    const cardTitle = titles[i] || "";
    const title = cardTitle && !isGenericHeading(cardTitle) ? cardTitle : slugToTitle(slug);
    topics.push({ url: href, slug, title });
  }

  // Last resort: any child links under chapter URL
  if (topics.length === 0) {
    const regex = /href="(\/[^"]+|https?:\/\/notes\.mentorsdaily\.com\/[^"]+)"/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
      let href = match[1];
      if (href.startsWith("/")) href = `${NOTES_BASE}${href}`;
      if (!href.startsWith(`${base}/`) || href === base) continue;
      const slug = href.replace(base, "").replace(/^\//, "").split("?")[0];
      if (!slug || seen.has(href)) continue;
      seen.add(href);
      topics.push({ url: href, slug, title: slugToTitle(slug) });
    }
  }

  return topics;
}

/**
 * Resolve best topic display name.
 */
export function resolveTopicName({ cardTitle = "", pageHtml = "", slug = "" }) {
  const fromCard = decodeHtmlEntities(cardTitle);
  if (fromCard && !isGenericHeading(fromCard)) return fromCard;

  const fromPage = extractTitleFromTopicPageHtml(pageHtml);
  if (fromPage) return fromPage;

  return slugToTitle(slug);
}

export default {
  decodeHtmlEntities,
  slugToTitle,
  isGenericHeading,
  extractTitleFromTopicPageHtml,
  extractTopicsFromChapterPage,
  resolveTopicName,
};
