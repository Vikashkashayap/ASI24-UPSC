/**
 * ContextReducer — keep MentorsDaily notes context under token budgets.
 * Splits long topics, then keeps UPSC-dense lines only.
 */

import { estimateTokens, countWords } from "./tokenEstimator.service.js";

export const TARGET_CONTEXT_TOKENS = parseInt(process.env.PRACTICE_TARGET_CONTEXT_TOKENS, 10) || 1200;
export const ABORT_CONTEXT_TOKENS = parseInt(process.env.PRACTICE_ABORT_CONTEXT_TOKENS, 10) || 1500;
const WORD_SPLIT_THRESHOLD = parseInt(process.env.PRACTICE_WORD_SPLIT_THRESHOLD, 10) || 1500;
const CHUNK_MIN_WORDS = parseInt(process.env.PRACTICE_CHUNK_MIN_WORDS, 10) || 600;
const CHUNK_MAX_WORDS = parseInt(process.env.PRACTICE_CHUNK_MAX_WORDS, 10) || 800;
const CHUNK_OVERLAP_WORDS = parseInt(process.env.PRACTICE_CHUNK_OVERLAP_WORDS, 10) || 50;

const UPSC_KEYWORD_RE =
  /\b(article|articles|act|acts|committee|commission|constitution|constitutional|amendment|schedule|fundamental|directive|dpsp|parliament|supreme court|high court|governor|president|election|reservation|caste|secular|minorit|federal|judiciary|legislature|executive|bill|ordinance|writ|pil|niti aayog|cag|ups?c|ibps|gdp|inflation|budget|fiscal|monetary|rbi|sebi|niti|sdg|unesco|who|imf|world bank|treaty|convention|protocol|year|century|bc|ad|ce)\b/i;

const HEADING_RE = /^(#{1,6}\s+|.+:)\s*$/;
const LIST_RE = /^\s*([-*•]|\d+[.)])\s+/;
const TABLE_RE = /\|/;
const DATE_RE = /\b(1[0-9]{3}|20[0-2][0-9])\b|\b\d{1,2}\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b/i;
const DEFINITION_RE = /\b(means|refers to|defined as|is known as|definition|known as)\b/i;
const FACT_RE = /\b(important|key|notable|significant|first|largest|smallest|only|mandatory|compulsory)\b/i;

/**
 * Split text into overlapping word chunks (Rule 3).
 * @param {string} text
 * @param {{ minWords?: number, maxWords?: number, overlapWords?: number }} [opts]
 * @returns {string[]}
 */
export function splitIntoWordChunks(text, opts = {}) {
  const minWords = opts.minWords ?? CHUNK_MIN_WORDS;
  const maxWords = opts.maxWords ?? CHUNK_MAX_WORDS;
  const overlapWords = opts.overlapWords ?? CHUNK_OVERLAP_WORDS;
  const normalized = String(text || "").trim();
  if (!normalized) return [];

  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length <= WORD_SPLIT_THRESHOLD && words.length <= maxWords) {
    return [normalized];
  }
  if (words.length <= WORD_SPLIT_THRESHOLD) {
    return [normalized];
  }

  const chunks = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + maxWords, words.length);
    // Prefer at least minWords unless last chunk
    const sliceEnd =
      end < words.length && end - start < minWords
        ? Math.min(start + minWords, words.length)
        : end;
    chunks.push(words.slice(start, sliceEnd).join(" "));
    if (sliceEnd >= words.length) break;
    start = Math.max(0, sliceEnd - overlapWords);
  }

  // Merge tiny trailing chunk into previous (avoids ~100–200 token dead ends on top-up)
  const minTailWords = Math.max(200, Math.floor(minWords * 0.45));
  if (chunks.length >= 2) {
    const lastWords = chunks[chunks.length - 1].split(/\s+/).filter(Boolean).length;
    if (lastWords < minTailWords) {
      const tail = chunks.pop();
      chunks[chunks.length - 1] = `${chunks[chunks.length - 1]} ${tail}`.trim();
    }
  }
  return chunks;
}

function scoreLine(line = "") {
  const t = String(line || "").trim();
  if (!t || t.length < 12) return 0;
  let score = 1;
  if (/^#{1,6}\s+/.test(t) || HEADING_RE.test(t)) score += 8;
  if (LIST_RE.test(t)) score += 4;
  if (TABLE_RE.test(t)) score += 5;
  if (DEFINITION_RE.test(t)) score += 6;
  if (DATE_RE.test(t)) score += 5;
  if (UPSC_KEYWORD_RE.test(t)) score += 7;
  if (FACT_RE.test(t)) score += 3;
  if (/\b(article\s+\d+|schedule\s+[ivx]+|part\s+[ivx]+)\b/i.test(t)) score += 8;
  // Prefer medium-length educational lines
  if (t.length >= 40 && t.length <= 280) score += 2;
  if (t.length > 500) score -= 2;
  return score;
}

/**
 * Keep only high-value UPSC lines until under target tokens (Rule 4).
 * @param {string} text
 * @param {number} [maxTokens]
 */
export function reduceToImportantContent(text, maxTokens = TARGET_CONTEXT_TOKENS) {
  const raw = String(text || "").trim();
  if (!raw) return "";
  if (estimateTokens(raw) <= maxTokens) return raw;

  const lines = raw.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const ranked = lines
    .map((line, index) => ({ line, index, score: scoreLine(line) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);

  const selected = [];
  const selectedIndexes = new Set();
  let tokens = 0;

  for (const item of ranked) {
    const add = estimateTokens(item.line);
    if (tokens + add > maxTokens && selected.length > 0) continue;
    selected.push(item);
    selectedIndexes.add(item.index);
    tokens += add;
    if (tokens >= maxTokens * 0.92) break;
  }

  // Restore original order for readability
  selected.sort((a, b) => a.index - b.index);
  let out = selected.map((s) => s.line).join("\n");

  // Hard trim if still over (very dense lines)
  while (estimateTokens(out) > maxTokens && selected.length > 3) {
    selected.pop();
    out = selected.map((s) => s.line).join("\n");
  }

  if (!out) {
    const words = raw.split(/\s+/).filter(Boolean);
    const approxWords = Math.max(200, Math.floor(maxTokens / 1.3));
    out = words.slice(0, approxWords).join(" ");
  }

  return out.trim();
}

/**
 * Extractive summarize when context still exceeds abort threshold (Rule 10).
 * @param {string} text
 * @param {number} [maxTokens]
 */
export function summarizeContext(text, maxTokens = TARGET_CONTEXT_TOKENS) {
  return reduceToImportantContent(text, maxTokens);
}

/**
 * Prepare a single-topic context for one Gemini request.
 * @param {string} text — cleaned educational text for ONE topic only
 * @param {{ batchIndex?: number, targetTokens?: number, abortTokens?: number }} [opts]
 * @returns {{ context: string, chunkIndex: number, totalChunks: number, tokens: number, reduced: boolean, summarized: boolean }}
 */
export function prepareContextForBatch(text, opts = {}) {
  const targetTokens = opts.targetTokens ?? TARGET_CONTEXT_TOKENS;
  const abortTokens = opts.abortTokens ?? ABORT_CONTEXT_TOKENS;
  const batchIndex = Math.max(0, parseInt(opts.batchIndex, 10) || 0);

  const cleaned = String(text || "").trim();
  if (!cleaned) {
    return { context: "", chunkIndex: 0, totalChunks: 0, tokens: 0, reduced: false, summarized: false };
  }

  const words = countWords(cleaned);
  const chunks =
    words > WORD_SPLIT_THRESHOLD
      ? splitIntoWordChunks(cleaned)
      : [cleaned];

  let chunkIndex = batchIndex % chunks.length;
  let context = chunks[chunkIndex] || chunks[0] || "";

  // If selected chunk is too thin, prefer the richest chunk (or full reduced topic)
  if (estimateTokens(context) < 350 && chunks.length > 1) {
    let bestIdx = 0;
    let bestTok = 0;
    chunks.forEach((c, i) => {
      const t = estimateTokens(c);
      if (t > bestTok) {
        bestTok = t;
        bestIdx = i;
      }
    });
    chunkIndex = bestIdx;
    context = chunks[bestIdx];
  }
  if (estimateTokens(context) < 350 && words > WORD_SPLIT_THRESHOLD) {
    context = reduceToImportantContent(cleaned, targetTokens);
    chunkIndex = 0;
  }

  let reduced = false;
  let summarized = false;

  const before = estimateTokens(context);
  if (before > targetTokens) {
    context = reduceToImportantContent(context, targetTokens);
    reduced = true;
  }

  // Rule 10: if still over abort limit, summarize then proceed
  if (estimateTokens(context) > abortTokens) {
    context = summarizeContext(context, targetTokens);
    summarized = true;
  }

  // Final safety clamp
  if (estimateTokens(context) > abortTokens) {
    context = reduceToImportantContent(context, Math.min(targetTokens, 1100));
    summarized = true;
  }

  return {
    context,
    chunkIndex,
    totalChunks: chunks.length,
    tokens: estimateTokens(context),
    reduced,
    summarized,
    wordCount: countWords(context),
  };
}

/**
 * Build per-topic chunk pool — never merges topics (Rule 1).
 * @param {{ topicId: string, topicName: string, cleanText: string }[]} topicNotes
 */
export function buildTopicChunkPool(topicNotes = []) {
  const pool = [];
  for (const note of topicNotes) {
    const text = String(note.cleanText || "").trim();
    if (!text || text.length < 80) continue;
    const words = countWords(text);
    const chunks =
      words > WORD_SPLIT_THRESHOLD ? splitIntoWordChunks(text) : [text];

    chunks.forEach((chunk, i) => {
      const prepared = prepareContextForBatch(chunk, { batchIndex: 0 });
      pool.push({
        topicId: String(note.topicId || note.topic?._id || ""),
        topicName: note.topicName || note.topic?.name || "",
        chunkIndex: i,
        totalChunks: chunks.length,
        context: prepared.context,
        tokens: prepared.tokens,
      });
    });
  }
  return pool;
}

export const contextReducer = {
  splitIntoWordChunks,
  reduceToImportantContent,
  summarizeContext,
  prepareContextForBatch,
  buildTopicChunkPool,
  TARGET_CONTEXT_TOKENS,
  ABORT_CONTEXT_TOKENS,
};

export default contextReducer;
