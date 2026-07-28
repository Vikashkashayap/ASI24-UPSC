import { normalizeWhitespace } from "../utils/helpers.js";

const HEADER_FOOTER_RE =
  /^(page\s+\d+(\s+of\s+\d+)?|\d+\s*\/\s*\d+|confidential|mentors\s*daily|www\.[\w.-]+)$/i;

/**
 * Clean extracted page text: headers/footers, watermarks, broken words, noise.
 */
export function cleanPageText(text, { pageNumber } = {}) {
  let t = String(text || "").replace(/\r/g, "");

  // Fix hyphenated line breaks: "constitu-\ntion" → "constitution"
  t = t.replace(/(\w)-\n(\w)/g, "$1$2");

  // Drop likely header/footer lines
  t = t
    .split("\n")
    .filter((line) => {
      const s = line.trim();
      if (!s) return true;
      if (HEADER_FOOTER_RE.test(s)) return false;
      if (/^[\d\s|.-]{1,8}$/.test(s) && Number(s) === pageNumber) return false;
      if (/watermark|sample\s*copy|do\s*not\s*copy/i.test(s) && s.length < 40) return false;
      return true;
    })
    .join("\n");

  return normalizeWhitespace(t);
}

export function cleanPages(pages) {
  return (pages || []).map((p) => {
    const cleanedText = cleanPageText(p.text || p.rawText || "", {
      pageNumber: p.pageNumber,
    });
    return {
      ...p,
      rawText: p.text || p.rawText || "",
      cleanedText,
      text: cleanedText,
    };
  });
}
