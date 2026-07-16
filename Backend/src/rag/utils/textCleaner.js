/**
 * Sanitize extracted PDF / HTML text before chunking + storage.
 */

export function cleanExtractedText(raw = "") {
  let text = String(raw || "");

  // Normalize newlines / whitespace
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  text = text.replace(/[ \t]+\n/g, "\n");
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text.replace(/[ \t]{2,}/g, " ");

  // Strip common PDF artifacts
  text = text.replace(/\u0000/g, "");
  text = text.replace(/[\u200B-\u200D\uFEFF]/g, "");

  // Soft control chars (keep newlines/tabs)
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");

  return text.trim();
}

/**
 * Very light HTML → text when ingesting scraped notes.
 */
export function stripHtml(html = "") {
  return cleanExtractedText(
    String(html || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
  );
}

export default { cleanExtractedText, stripHtml };
