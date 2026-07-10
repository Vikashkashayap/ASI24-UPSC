/**
 * HTML → clean educational plain text for MentorsDaily Notes.
 * Strips navigation, ads, scripts, styles; keeps headings, paragraphs, lists, tables.
 */

const BLOCK_TAGS =
  /<\/?(?:p|div|h[1-6]|li|tr|br|section|article|blockquote|table|thead|tbody|tfoot|ul|ol|dl|dt|dd|pre|figure|figcaption)[^>]*>/gi;
const INLINE_TAGS = /<\/?(?:span|strong|em|b|i|a|td|th|code|mark|sub|sup|small)[^>]*>/gi;

/** Tags and regions to remove entirely before text extraction. */
const REMOVE_TAG_BLOCKS = [
  /<script[\s\S]*?<\/script>/gi,
  /<style[\s\S]*?<\/style>/gi,
  /<noscript[\s\S]*?<\/noscript>/gi,
  /<svg[\s\S]*?<\/svg>/gi,
  /<iframe[\s\S]*?<\/iframe>/gi,
  /<!--[\s\S]*?-->/g,
  /<nav[\s\S]*?<\/nav>/gi,
  /<header[\s\S]*?<\/header>/gi,
  /<footer[\s\S]*?<\/footer>/gi,
  /<aside[\s\S]*?<\/aside>/gi,
  /<form[\s\S]*?<\/form>/gi,
  /<button[\s\S]*?<\/button>/gi,
];

/** Class/id patterns typical of menus, ads, sidebars (non-educational chrome). */
const CHROME_PATTERN =
  /<(?:div|section|aside|span)[^>]*(?:class|id)=["'][^"']*(?:nav|menu|sidebar|footer|header|breadcrumb|advert|ads?|promo|social|share|cookie|modal|popup|toolbar|widget)[^"']*["'][^>]*>[\s\S]*?<\/(?:div|section|aside|span)>/gi;

function decodeBasicEntities(text = "") {
  return String(text)
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function normalizeWhitespace(text = "") {
  return String(text)
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function dedupeParagraphs(text = "") {
  const seen = new Set();
  const lines = text.split("\n");
  const out = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (out.length && out[out.length - 1] !== "") out.push("");
      continue;
    }
    const key = trimmed.toLowerCase().replace(/\s+/g, " ").slice(0, 200);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Strip non-educational HTML regions before conversion.
 * @param {string} html
 * @returns {string}
 */
export function stripNonEducationalHtml(html = "") {
  if (!html || typeof html !== "string") return "";
  let cleaned = html;
  for (const pattern of REMOVE_TAG_BLOCKS) {
    cleaned = cleaned.replace(pattern, " ");
  }
  // Remove chrome blocks (nav, ads, etc.) — run twice for nested wrappers
  cleaned = cleaned.replace(CHROME_PATTERN, " ");
  cleaned = cleaned.replace(CHROME_PATTERN, " ");
  return cleaned;
}

export function cleanHtml(html = "") {
  if (!html || typeof html !== "string") return "";
  let text = stripNonEducationalHtml(html)
    .replace(BLOCK_TAGS, "\n")
    .replace(INLINE_TAGS, " ")
    .replace(/<[^>]+>/g, " ");
  text = decodeBasicEntities(text);
  return normalizeWhitespace(text);
}

/**
 * Lightweight HTML → structured plain text (headings, lists, tables simplified).
 */
export function htmlToMarkdown(html = "") {
  if (!html || typeof html !== "string") return "";
  let md = stripNonEducationalHtml(html);

  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n# $1\n");
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n## $1\n");
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n### $1\n");
  md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, "\n#### $1\n");
  md = md.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, "\n##### $1\n");
  md = md.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, "\n###### $1\n");
  md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "\n- $1");
  md = md.replace(/<br\s*\/?>/gi, "\n");
  md = md.replace(/<\/p>/gi, "\n\n");
  md = md.replace(/<\/tr>/gi, "\n");
  md = md.replace(/<\/t[dh]>/gi, " | ");
  md = md.replace(/<table[^>]*>/gi, "\n");
  md = md.replace(/<\/table>/gi, "\n");

  return dedupeParagraphs(cleanHtml(md));
}

/**
 * Full pipeline: HTML → educational plain text for LLM prompts.
 * @param {string} html
 * @returns {string}
 */
export function htmlToEducationalText(html = "") {
  return dedupeParagraphs(htmlToMarkdown(html));
}

export function removeUnwantedTags(html = "") {
  return cleanHtml(html);
}
