/**
 * Detect and filter non-substantive book sections
 * (preface, index, TOC, examples boxes, exercises, glossary, metadata).
 * Used at chunking time (prevent indexing) and retrieval time (defense for legacy chunks).
 */

const NON_CONTENT_HEADING_PATTERNS = [
  /^preface\b/i,
  /^foreword\b/i,
  /^acknowledg/i,
  /^table of contents\b/i,
  /^contents\s*$/i,
  /^index\s*$/i,
  /^subject\s+index\b/i,
  /^name\s+index\b/i,
  /^author\s+index\b/i,
  /^bibliograph/i,
  /^appendix\s*[:\-]?\s*[a-z0-9]*\s*$/i,
  /^about the author/i,
  /^about this book/i,
  /^publisher/i,
  /^copyright\b/i,
  /^dedication\b/i,
  /^list of (?:tables|figures|abbreviations|acronyms|illustrations|plates)/i,
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
  // Book apparatus / practice apparatus — not UPSC substance
  /^examples?\s*$/i,
  /^examples?\s*[:\-–—]/i,
  /^example\s+\d+\b/i,
  /^illustrations?\s*$/i,
  /^exercises?\s*$/i,
  /^exercises?\s*[:\-–—]/i,
  /^practice\s+questions?\b/i,
  /^model\s+questions?\b/i,
  /^sample\s+questions?\b/i,
  /^review\s+questions?\b/i,
  /^check\s+your\s+progress\b/i,
  /^self[\s-]?assessment\b/i,
  /^glossary\b/i,
  /^key\s+terms\b/i,
  /^further\s+reading\b/i,
  /^suggested\s+readings?\b/i,
  /^references\s*$/i,
  /^works\s+cited\b/i,
  /^points?\s+to\s+remember\b/i,
  /^let\s+us\s+sum\s+up\b/i,
  /^summary\s*$/i,
  /^answers?\s+to\s+(?:exercises?|questions?)\b/i,
];

const NON_CONTENT_HEADING_EXACT = new Set([
  "preface",
  "foreword",
  "contents",
  "index",
  "subject index",
  "name index",
  "author index",
  "bibliography",
  "appendix",
  "acknowledgements",
  "acknowledgments",
  "dedication",
  "copyright",
  "table of contents",
  "examples",
  "example",
  "exercises",
  "exercise",
  "glossary",
  "references",
  "summary",
  "illustrations",
  "key terms",
  "further reading",
  "suggested reading",
  "suggested readings",
  "practice questions",
  "model questions",
  "sample questions",
  "review questions",
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
  /\bhow to use this book\b/i,
  /\bin this edition we have\b/i,
];

const INDEX_LINE_RE = /^.{3,100}\.{3,}\s*\d+\s*$/;
const TOC_LINE_RE =
  /^(?:chapter|unit|part|section|lesson|module)\s+[\dIVXLC]+[\s.:–—-].*\.{2,}\s*\d+\s*$/i;
/** Topic … page (dots, tabs, or wide spaces — common in scanned books) */
const PAGE_LEADER_RE =
  /^.{2,120}(?:\.{2,}|[\t ]{3,}|\s[–—-]\s)\s*\d{1,4}\s*$/;
const SHORT_PAGE_TAIL_RE = /^[\w\s,'"();:/&-]{3,75}\s+\d{1,4}\s*$/;
const INDEX_ENTRY_COMMA_RE = /^[A-Za-z0-9][\w\s,'"()-]{1,65},\s*\d{1,4}\s*$/;

/** Numbered exercise / example box openers that dominate a chunk */
const EXERCISE_OPENER_RE =
  /^(?:example|exercise|q|question|problem)\s*\.?\s*\d+[.):]\s*/i;
const EXERCISE_ITEM_RE =
  /^(?:\d+[.)]|[a-d][.)]|q\d+[.)]?)\s+.+/i;

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
      opener === "subject index" ||
      opener === "name index" ||
      opener === "author index") &&
    indexLines >= Math.min(2, lines.length)
  ) {
    return true;
  }

  return false;
}

/**
 * True when chunk is mostly numbered Example/Exercise/Q boxes (book apparatus).
 * Does NOT block normal prose that merely says "for example".
 * @param {string} text
 */
export function isExerciseOrExampleBoxContent(text) {
  const t = String(text || "").trim();
  if (!t || t.length < 40) return false;

  const lines = t.split("\n").map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return false;

  const opener = lines[0]
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const apparatusOpener =
    /^(?:examples?|exercises?|practice questions?|model questions?|sample questions?|review questions?|check your progress|self assessment|glossary|key terms|further reading|suggested readings?|points? to remember|summary)$/.test(
      opener
    ) || EXERCISE_OPENER_RE.test(lines[0]);

  let exerciseLines = 0;
  for (const line of lines) {
    if (EXERCISE_OPENER_RE.test(line) || EXERCISE_ITEM_RE.test(line)) exerciseLines += 1;
  }

  if (apparatusOpener && lines.length >= 2 && exerciseLines / lines.length >= 0.35) {
    return true;
  }
  // Dense Q1/Q2/Example 1 lists without prose paragraphs
  if (lines.length >= 4 && exerciseLines / lines.length >= 0.55) return true;

  // Short chunk that is literally just "Example 3: …" box
  if (EXERCISE_OPENER_RE.test(lines[0]) && t.length < 500 && lines.length <= 6) {
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
  if (isExerciseOrExampleBoxContent(text)) return true;

  const opener = text.slice(0, 400).toLowerCase();
  if (opener.includes("preface") && isBookMetadataContent(text)) return true;
  if (opener.includes("foreword") && text.length < 600 && isBookMetadataContent(text)) return true;
  if (
    (opener.startsWith("index") || opener.startsWith("contents") || opener.startsWith("glossary")) &&
    text.length < 800
  ) {
    return true;
  }

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
  /\b(?:subject|book|author|name) index\b/i,
  /\bindex (?:of|lists|entry|entries|page)\b/i,
  /\blisted in the index\b/i,
  /\baccording to the index\b/i,
  /\bappears in the index\b/i,
  /\b(?:which|on which) page\b.*\b(?:book|index|contents)\b/i,
  /\bpage number\b.*\b(?:book|index|contents|chapter listing)\b/i,
  /\b(?:preface|foreword|publisher|isbn|edition of the book)\b/i,
  /\b(?:reprint|printed at|all rights reserved)\b/i,
  /\bchapter\s+\d+[\s.:–—-].*\.{2,}\s*\d+\b/i,
  /\b(?:glossary|further reading|suggested readings?|bibliography)\b/i,
  /\bas (?:given |shown )?(?:in |by )?(?:the )?(?:example|exercise)\s*(?:box|no\.?|number)?\s*\d*\b/i,
  /\baccording to (?:example|exercise)\s*\d+\b/i,
  /\bin the (?:example|exercise) (?:box|section)\b/i,
  /\bcheck your progress\b/i,
  /\bpoints? to remember\b/i,
  /\bhow to use this book\b/i,
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
  isExerciseOrExampleBoxContent,
  isBookMetadataContent,
  chunkTextOf,
  isNonContentChunk,
  filterNonContentChunks,
  isMetadataQuestion,
};
