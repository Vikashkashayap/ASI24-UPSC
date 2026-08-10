/**
 * Semantic chunking for notes / PDF content (Step 2).
 * Splits on headings, paragraphs, bullets, and tables — not fixed character windows.
 * Target: 500–800 words · overlap: 100 words (env overrides via PRACTICE_CHUNK_*).
 */

import { isNonContentHeading, isNonContentChunk } from "../content/frontMatterFilter.js";

const DEFAULT_MIN_WORDS = parseInt(process.env.PRACTICE_CHUNK_MIN_WORDS, 10) || 500;
const DEFAULT_MAX_WORDS = parseInt(process.env.PRACTICE_CHUNK_MAX_WORDS, 10) || 800;
const DEFAULT_OVERLAP_WORDS = parseInt(process.env.PRACTICE_CHUNK_OVERLAP_WORDS, 10) || 100;

export function countWords(text) {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function estimateTokenCount(text) {
  return Math.ceil(countWords(text) * 1.3);
}

/**
 * @typedef {"heading"|"subheading"|"paragraph"|"bullet"|"table"} BlockType
 * @typedef {{ type: BlockType, text: string, level?: number }} SemanticBlock
 */

/**
 * Heuristic: is this line a section heading?
 * @param {string} line
 * @param {string} [nextLine]
 */
function classifyHeadingLine(line, nextLine = "") {
  const t = String(line || "").trim();
  if (!t || t.length > 140) return null;

  const md = t.match(/^(#{1,3})\s+(.+)$/);
  if (md) {
    return { level: md[1].length, text: md[2].trim() };
  }

  if (/^(chapter|unit|part|section|topic|module)\s+[\dIVXLC]+([:.\-–—]\s*.+)?$/i.test(t)) {
    return { level: 1, text: t };
  }

  if (/^\d+(\.\d+)*\s+[A-ZÀ-ÖØ-Þ][\w\s,:'"\-/()]{2,100}$/.test(t) && !/[.?!]$/.test(t)) {
    const dotted = (t.match(/\./g) || []).length;
    return { level: dotted >= 1 ? 2 : 1, text: t };
  }

  const words = t.split(/\s+/).filter(Boolean);
  const isShort = words.length >= 2 && words.length <= 12;
  const noSentenceEnd = !/[.?!]$/.test(t);
  const mostlyCaps =
    t === t.toUpperCase() && /[A-Z]/.test(t) && t.length >= 8 && t.length <= 80;
  const titleCase =
    words.filter((w) => /^[A-Z]/.test(w)).length >= Math.ceil(words.length * 0.6);
  const nextLooksBody = nextLine && countWords(nextLine) >= 12;

  if (mostlyCaps && noSentenceEnd) return { level: 1, text: t };
  if (isShort && noSentenceEnd && titleCase && nextLooksBody && !/^[-*•]/.test(t)) {
    return { level: 2, text: t };
  }

  return null;
}

function isBulletLine(line) {
  return /^\s*(?:[-*•∙▪]|\(\s*[a-z0-9]+\s*\)|\d+[.)])\s+\S+/i.test(String(line || ""));
}

function isTableLine(line) {
  const t = String(line || "").trim();
  if (!t) return false;
  if ((t.match(/\|/g) || []).length >= 2) return true;
  if (/\t/.test(t) && t.split(/\t/).length >= 3) return true;
  return false;
}

/**
 * Split document text into semantic blocks.
 * @param {string} text
 * @returns {SemanticBlock[]}
 */
export function splitIntoSemanticBlocks(text) {
  const normalized = String(text || "")
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .trim();
  if (!normalized) return [];

  const lines = normalized.split("\n");
  /** @type {SemanticBlock[]} */
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i += 1;
      continue;
    }

    const nextNonEmpty = (() => {
      for (let j = i + 1; j < lines.length; j += 1) {
        if (lines[j].trim()) return lines[j].trim();
      }
      return "";
    })();

    const heading = classifyHeadingLine(line, nextNonEmpty);
    if (heading) {
      blocks.push({
        type: heading.level <= 1 ? "heading" : "subheading",
        level: heading.level,
        text: heading.text,
      });
      i += 1;
      continue;
    }

    if (isTableLine(line)) {
      const tableLines = [line];
      i += 1;
      while (i < lines.length && isTableLine(lines[i])) {
        tableLines.push(lines[i].trim());
        i += 1;
      }
      blocks.push({ type: "table", text: tableLines.join("\n") });
      continue;
    }

    if (isBulletLine(line)) {
      const bulletLines = [line];
      i += 1;
      while (i < lines.length && (isBulletLine(lines[i]) || (lines[i].trim() && !classifyHeadingLine(lines[i].trim())))) {
        const cur = lines[i].trim();
        if (!cur) break;
        if (classifyHeadingLine(cur) || isTableLine(cur)) break;
        if (isBulletLine(cur) || /^[a-z]/.test(cur)) {
          bulletLines.push(cur);
          i += 1;
          continue;
        }
        break;
      }
      blocks.push({ type: "bullet", text: bulletLines.join("\n") });
      continue;
    }

    // Paragraph: consume until blank / heading / bullet / table
    const paraLines = [line];
    i += 1;
    while (i < lines.length) {
      const cur = lines[i].trim();
      if (!cur) {
        i += 1;
        break;
      }
      if (classifyHeadingLine(cur, lines[i + 1]?.trim() || "") || isBulletLine(cur) || isTableLine(cur)) {
        break;
      }
      paraLines.push(cur);
      i += 1;
    }
    blocks.push({ type: "paragraph", text: paraLines.join(" ") });
  }

  return blocks;
}

/**
 * Detect topics from semantic blocks (heading-driven).
 * @param {SemanticBlock[]} blocks
 * @param {{ fallbackTitle?: string }} [opts]
 * @returns {{ name: string, heading: string, blocks: SemanticBlock[], pageStart: number|null, pageEnd: number|null }[]}
 */
export function detectTopicsFromBlocks(blocks, opts = {}) {
  const fallback = String(opts.fallbackTitle || "Chapter Content").trim() || "Chapter Content";
  const topics = [];
  let current = null;
  let inNonContent = false;

  const startTopic = (name) => {
    current = {
      name,
      heading: name,
      blocks: [],
      pageStart: null,
      pageEnd: null,
    };
    topics.push(current);
  };

  for (const block of blocks) {
    if (block.type === "heading") {
      if (isNonContentHeading(block.text)) {
        inNonContent = true;
        current = null;
        continue;
      }
      inNonContent = false;
      startTopic(block.text);
      continue;
    }
    if (inNonContent) continue;
    if (!current) startTopic(fallback);
    current.blocks.push(block);
  }

  if (!topics.length) {
    startTopic(fallback);
    topics[0].blocks = [...blocks];
  }

  // Drop empty topics (heading-only with no body) and non-content sections (preface/index/TOC)
  const withBody = topics.filter(
    (t) =>
      !isNonContentHeading(t.name) &&
      t.blocks.some((b) => countWords(b.text) > 0)
  );
  if (withBody.length) return withBody;
  return topics.filter((t) => !isNonContentHeading(t.name));
}

/**
 * Pack blocks into overlapping word windows (400–700 / overlap 80).
 * Never uses fixed character splitting as the primary rule.
 *
 * @param {SemanticBlock[]} blocks
 * @param {{ minWords?: number, maxWords?: number, overlapWords?: number, heading?: string, page?: number|null, subTopic?: string, source?: string }} [opts]
 */
export function packBlocksIntoChunks(blocks, opts = {}) {
  const minWords = opts.minWords ?? DEFAULT_MIN_WORDS;
  const maxWords = opts.maxWords ?? DEFAULT_MAX_WORDS;
  const overlapWords = opts.overlapWords ?? DEFAULT_OVERLAP_WORDS;
  const baseHeading = opts.heading || "";
  const defaultPage = opts.page ?? null;
  const defaultSubTopic = opts.subTopic || "";
  const source = opts.source || "pdf";

  /** @type {{ heading: string, text: string, order: number, tokenCount: number, page: number|null, subTopic: string, chunkNumber: number, source: string, contentLanguage: string }[]} */
  const chunks = [];

  let currentParts = [];
  let currentWords = 0;
  let currentSubTopic = defaultSubTopic;
  let order = 0;

  const flush = (force = false) => {
    if (!currentParts.length) return;
    if (!force && currentWords < minWords && chunks.length === 0) {
      // keep accumulating until min unless we're done
      return;
    }
    const text = currentParts.join("\n\n").trim();
    if (!text) {
      currentParts = [];
      currentWords = 0;
      return;
    }
    const words = text.split(/\s+/).filter(Boolean);
    chunks.push({
      heading: baseHeading
        ? chunks.length
          ? `${baseHeading} (Part ${chunks.length + 1})`
          : baseHeading
        : `Part ${chunks.length + 1}`,
      text,
      order,
      tokenCount: Math.ceil(words.length * 1.3),
      page: defaultPage,
      subTopic: currentSubTopic,
      chunkNumber: order + 1,
      source,
      contentLanguage: "",
    });
    order += 1;

    if (overlapWords > 0 && words.length > overlapWords) {
      const overlapText = words.slice(-overlapWords).join(" ");
      currentParts = [overlapText];
      currentWords = overlapWords;
    } else {
      currentParts = [];
      currentWords = 0;
    }
  };

  const pushUnit = (unitText, subTopic) => {
    const unit = String(unitText || "").trim();
    if (!unit) return;
    const w = countWords(unit);

    if (subTopic) currentSubTopic = subTopic;

    // Oversized single unit → word-window split with overlap (still semantic unit boundary first)
    if (w > maxWords) {
      flush(true);
      const words = unit.split(/\s+/).filter(Boolean);
      let start = 0;
      while (start < words.length) {
        const end = Math.min(start + maxWords, words.length);
        const slice = words.slice(start, end).join(" ");
        currentParts = [slice];
        currentWords = end - start;
        flush(true);
        if (end >= words.length) break;
        start = Math.max(0, end - overlapWords);
      }
      return;
    }

    if (currentWords > 0 && currentWords + w > maxWords) {
      flush(true);
    }

    currentParts.push(unit);
    currentWords += w;

    if (currentWords >= maxWords) {
      flush(true);
    }
  };

  for (const block of blocks) {
    if (block.type === "subheading") {
      // Prefer starting a new chunk near min if we already have enough content
      if (currentWords >= minWords) flush(true);
      currentSubTopic = block.text;
      pushUnit(block.text, block.text);
      continue;
    }
    pushUnit(block.text, currentSubTopic);
  }

  flush(true);

  const filtered = chunks.filter(
    (c) => !isNonContentChunk({ text: c.text, heading: baseHeading || c.heading, topic: currentSubTopic })
  );
  chunks.length = 0;
  chunks.push(...filtered);

  // Merge tiny trailing chunk into previous when possible
  if (chunks.length >= 2) {
    const last = chunks[chunks.length - 1];
    if (countWords(last.text) < Math.floor(minWords / 2)) {
      const prev = chunks[chunks.length - 2];
      const merged = `${prev.text}\n\n${last.text}`.trim();
      if (countWords(merged) <= maxWords + overlapWords) {
        prev.text = merged;
        prev.tokenCount = estimateTokenCount(merged);
        chunks.pop();
      }
    }
  }

  return chunks;
}

/**
 * Full pipeline: text → topics with semantic chunks.
 * @param {string} text
 * @param {{ fallbackTitle?: string, minWords?: number, maxWords?: number, overlapWords?: number, source?: string }} [opts]
 */
export function semanticChunkDocument(text, opts = {}) {
  const blocks = splitIntoSemanticBlocks(text);
  const topics = detectTopicsFromBlocks(blocks, { fallbackTitle: opts.fallbackTitle });

  return topics.map((topic) => {
    const chunks = packBlocksIntoChunks(topic.blocks, {
      heading: topic.name,
      minWords: opts.minWords,
      maxWords: opts.maxWords,
      overlapWords: opts.overlapWords,
      source: opts.source || "pdf",
    });
    return {
      name: topic.name,
      heading: topic.heading,
      summary: chunks[0]?.text?.slice(0, 400) || "",
      pageStart: topic.pageStart,
      pageEnd: topic.pageEnd,
      chunks,
      wordCount: chunks.reduce((sum, c) => sum + countWords(c.text), 0),
    };
  });
}

/**
 * Page-aware path: annotate chunks with approximate page from page map.
 * @param {{ pageNumber: number, text: string }[]} pages
 * @param {{ fallbackTitle?: string, minWords?: number, maxWords?: number, overlapWords?: number }} [opts]
 */
export function semanticChunkPages(pages, opts = {}) {
  const pageTexts = (pages || []).filter((p) => p?.text?.trim());
  if (!pageTexts.length) return [];

  // Build combined text with page markers that we strip after topic detect
  const marker = (n) => `\n\n[[PAGE:${n}]]\n\n`;
  const combined = pageTexts.map((p) => `${marker(p.pageNumber)}${p.text}`).join("");

  const cleanedForStructure = combined.replace(/\[\[PAGE:\d+\]\]/g, "\n\n");
  const topics = semanticChunkDocument(cleanedForStructure, opts);

  // Assign page by finding first page whose text overlaps chunk start
  for (const topic of topics) {
    let minPage = null;
    let maxPage = null;
    for (const chunk of topic.chunks) {
      const sample = chunk.text.slice(0, 80).replace(/\s+/g, " ");
      let page = null;
      for (const p of pageTexts) {
        if (p.text.replace(/\s+/g, " ").includes(sample.slice(0, 40))) {
          page = p.pageNumber;
          break;
        }
      }
      if (page == null) {
        // fallback: proportional
        page = pageTexts[0]?.pageNumber ?? 1;
      }
      chunk.page = page;
      if (minPage == null || page < minPage) minPage = page;
      if (maxPage == null || page > maxPage) maxPage = page;
    }
    topic.pageStart = minPage;
    topic.pageEnd = maxPage;
  }

  return topics;
}

export const SEMANTIC_CHUNK_DEFAULTS = {
  minWords: DEFAULT_MIN_WORDS,
  maxWords: DEFAULT_MAX_WORDS,
  overlapWords: DEFAULT_OVERLAP_WORDS,
};

export const semanticChunkingService = {
  splitIntoSemanticBlocks,
  detectTopicsFromBlocks,
  packBlocksIntoChunks,
  semanticChunkDocument,
  semanticChunkPages,
  countWords,
  estimateTokenCount,
  SEMANTIC_CHUNK_DEFAULTS,
};
