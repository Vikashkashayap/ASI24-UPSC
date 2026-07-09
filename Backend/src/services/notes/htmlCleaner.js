/**
 * Strip HTML tags and normalize whitespace for notes ingestion.
 */

const BLOCK_TAGS = /<\/?(?:p|div|h[1-6]|li|tr|br|section|article|header|footer|table|thead|tbody|ul|ol)[^>]*>/gi;
const INLINE_TAGS = /<\/?(?:span|strong|em|b|i|a|td|th)[^>]*>/gi;

export function cleanHtml(html = "") {
  if (!html || typeof html !== "string") return "";
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(BLOCK_TAGS, "\n")
    .replace(INLINE_TAGS, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
  return text;
}

/**
 * Lightweight HTML → Markdown-ish text (headings, lists, tables simplified).
 */
export function htmlToMarkdown(html = "") {
  if (!html || typeof html !== "string") return "";
  let md = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n# $1\n");
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n## $1\n");
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n### $1\n");
  md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, "\n#### $1\n");
  md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "\n- $1");
  md = md.replace(/<br\s*\/?>/gi, "\n");
  md = md.replace(/<\/p>/gi, "\n\n");
  md = md.replace(/<\/tr>/gi, "\n");
  md = md.replace(/<\/t[dh]>/gi, " | ");

  return cleanHtml(md);
}

export function removeUnwantedTags(html = "") {
  return cleanHtml(html);
}
