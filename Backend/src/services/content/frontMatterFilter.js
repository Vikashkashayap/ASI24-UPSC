/**
 * Detect and filter non-substantive book sections (preface, index, TOC, metadata).
 * Used at chunking time (prevent indexing) and retrieval time (defense for legacy chunks).
 */

const NON_CONTENT_HEADING_PATTERNS = [
  /^preface\b/i,
  /^foreword\b/i,
  /^acknowledg/i,
  /^table of contents\b/i,
  /^contents\s*$/i,
  /^index\s*$/i,
  /^bibliograph/i,
  /^appendix\s*[:\-]?\s*[a-z0-9]*\s*$/i,
  /^about the author/i,
  /^about this book/i,
  /^publisher/i,
  /^copyright\b/i,
  /^dedication\b/i,
  /^list of (?:tables|figures|abbreviations|acronyms)/i,
  /^abbreviations\b/i,
  /^acronyms\b/i,
  /^front\s*cover/i,
  /^back\s*cover/i,
  /^title\s*page/i,
  /^publication\s*(?:details|info)/i,
  /^edition\s*(?:note|info)/i,
  /^how to use this book/i,
  /^syllabus\s*(?:coverage|mapping)/i,
  /^note to (?:the )?readers?/i,
];

const NON_CONTENT_HEADING_EXACT = new Set([
  "preface",
  "foreword",
  "contents",
  "index",
  "bibliography",
  "appendix",
  "acknowledgements",
  "acknowledgments",
  "dedication",
  "copyright",
  "table of contents",
]);

const METADATA_CONTENT_PATTERNS = [
  /\baccording to the preface\b/i,
  /\bthis (?:new )?edition (?:of (?:the )?book|is intended)\b/i,
  /\bintended to serve the readers\b/i,
  /\bisbn[\s:-]*[\d-]+/i,
  /\bpublished by\b/i,
  /\ball rights reserved\b/i,
  /\bcopyright\s*[©(c)]/i,
  /\bfirst published\b/i,
  /\breprint(?:ed)?\s+(?:in|by)\b/i,
  /\bprinted (?:at|in|by)\b/i,
  /\bfor which years'? examinations\b/i,
  /\bnew edition of the book\b/i,
  /\bserve the readers'? needs\b/i,
  /\bedition of the book is intended\b/i,
];

const INDEX_LINE_RE = /^.{3,100}\.{3,}\s*\d+\s*$/;
const TOC_LINE_RE =
  /^(?:chapter|unit|part|section|lesson|module)\s+[\dIVXLC]+[\s.:–—-].*\.{2,}\s*\d+\s*$/i;
/** Topic … page (dots, tabs, or wide spaces — common in scanned books) */
const PAGE_LEADER_RE =
  /^.{2,120}(?:\.{2,}|[\t ]{3,}|\s[–—-]\s)\s*\d{1,4}\s*$/;
const SHORT_PAGE_TAIL_RE = /^[\w\s,'"();:/&-]{3,75}\s+\d{1,4}\s*$/;
const INDEX_ENTRY_COMMA_RE = /^[A-Za-z0-9][\w\s,'"()-]{1,65},\s*\d{1,4}\s*$/;

/**
 * @param {string} text
 */
export function isNonContentHeading(text) {
  const t = String(text || "").trim();
  if (!t || t.length > 120) return false;

  const lower = t
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (NON_CONTENT_HEADING_EXACT.has(lower)) return true;

  for (const re of NON_CONTENT_HEADING_PATTERNS) {
    if (re.test(t)) return true;
  }
  return false;
}

/**
 * @param {string} text
 */
export function isIndexOrTocContent(text) {
  const t = String(text || "").trim();
  if (!t) return false;

  const lines = t.split("\n").map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return false;

  let indexLines = 0;
  for (const line of lines) {
    if (INDEX_LINE_RE.test(line) || TOC_LINE_RE.test(line)) indexLines += 1;
    else if (PAGE_LEADER_RE.test(line)) indexLines += 1;
    else if (SHORT_PAGE_TAIL_RE.test(line) && line.length < 85) indexLines += 1;
    else if (INDEX_ENTRY_COMMA_RE.test(line)) indexLines += 1;
  }

  if (lines.length >= 2 && indexLines / lines.length >= 0.4) return true;
  if (lines.length === 1 && indexLines === 1) return true;

  const opener = lines[0]
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (
    (opener === "index" ||
      opener === "contents" ||
      opener.includes("table of contents") ||
      opener === "subject index") &&
    indexLines >= Math.min(2, lines.length)
  ) {
    return true;
  }

  return false;
}

/**
 * @param {string} text
 */
export function isBookMetadataContent(text) {
  const t = String(text || "").trim();
  if (!t) return false;
  return METADATA_CONTENT_PATTERNS.some((re) => re.test(t));
}

/**
 * @param {object} chunk
 */
export function chunkTextOf(chunk) {
  return String(chunk?.text || chunk?.chunk || chunk?.chunkText || "").trim();
}

export function isNonContentChunk(chunk) {
  const text = chunkTextOf(chunk);
  const heading = String(
    chunk?.heading || chunk?.topic || chunk?.subTopic || chunk?.chapter || ""
  ).trim();

  if (isNonContentHeading(heading)) return true;
  if (text.length <= 120 && isNonContentHeading(text)) return true;
  if (isIndexOrTocContent(text)) return true;
  if (isBookMetadataContent(text)) return true;

  const opener = text.slice(0, 400).toLowerCase();
  if (opener.includes("preface") && isBookMetadataContent(text)) return true;
  if (opener.includes("foreword") && text.length < 600 && isBookMetadataContent(text)) return true;

  return false;
}

/**
 * @param {object[]} chunks
 */
export function filterNonContentChunks(chunks) {
  const list = Array.isArray(chunks) ? chunks : [];
  const kept = [];
  let dropped = 0;

  for (const c of list) {
    if (isNonContentChunk(c)) dropped += 1;
    else kept.push(c);
  }

  return { chunks: kept, dropped };
}

/**
 * @param {object} question
 */
const INDEX_QUESTION_PATTERNS = [
  /\btable of contents\b/i,
  /\bcontents page\b/i,
  /\b(?:subject|book|author) index\b/i,
  /\bindex (?:of|lists|entry|entries|page)\b/i,
  /\blisted in the index\b/i,
  /\baccording to the index\b/i,
  /\bappears in the index\b/i,
  /\b(?:which|on which) page\b.*\b(?:book|index|contents)\b/i,
  /\bpage number\b.*\b(?:book|index|contents|chapter listing)\b/i,
  /\b(?:preface|foreword|publisher|isbn|edition of the book)\b/i,
  /\b(?:reprint|printed at|all rights reserved)\b/i,
  /\bchapter\s+\d+[\s.:–—-].*\.{2,}\s*\d+\b/i,
];

export function isMetadataQuestion(question) {
  const blob = [
    question?.question,
    question?.question_en,
    question?.explanation,
    question?.explanation_en,
    question?.options?.A,
    question?.options?.B,
    question?.options?.C,
    question?.options?.D,
  ]
    .filter(Boolean)
    .join(" ");
  if (isBookMetadataContent(blob)) return true;
  if (INDEX_QUESTION_PATTERNS.some((re) => re.test(blob))) return true;
  if (isIndexOrTocContent(blob)) return true;
  return false;
}

export default {
  isNonContentHeading,
  isIndexOrTocContent,
  isBookMetadataContent,
  chunkTextOf,
  isNonContentChunk,
  filterNonContentChunks,
  isMetadataQuestion,
};
