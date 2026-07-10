/**
 * Split long notes into overlapping word-based chunks.
 * Default: 800–1000 words with 100-word overlap.
 */

const DEFAULT_MIN_WORDS = 800;
const DEFAULT_MAX_WORDS = 1000;
const DEFAULT_OVERLAP_WORDS = 100;

function countWords(text) {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

/**
 * @param {string} text
 * @param {{ minWords?: number, maxWords?: number, overlapWords?: number, heading?: string }} [opts]
 * @returns {{ heading: string, text: string, order: number, tokenCount: number }[]}
 */
export function splitIntoChunks(text, opts = {}) {
  const minWords = opts.minWords ?? DEFAULT_MIN_WORDS;
  const maxWords = opts.maxWords ?? DEFAULT_MAX_WORDS;
  const overlapWords = opts.overlapWords ?? DEFAULT_OVERLAP_WORDS;
  const baseHeading = opts.heading || "";

  const normalized = String(text || "").trim();
  if (!normalized) return [];

  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return [
      {
        heading: baseHeading,
        text: normalized,
        order: 0,
        tokenCount: Math.ceil(words.length * 1.3),
      },
    ];
  }

  const chunks = [];
  let start = 0;
  let order = 0;

  while (start < words.length) {
    const end = Math.min(start + maxWords, words.length);
    const slice = words.slice(start, end);
    const chunkText = slice.join(" ");

    chunks.push({
      heading: baseHeading ? `${baseHeading} (Part ${order + 1})` : `Part ${order + 1}`,
      text: chunkText,
      order,
      tokenCount: Math.ceil(slice.length * 1.3),
    });

    if (end >= words.length) break;
    start = Math.max(0, end - overlapWords);
    order += 1;
  }

  return chunks;
}

export function estimateTokenCount(text) {
  return Math.ceil(countWords(text) * 1.3);
}

export const CHUNK_DEFAULTS = {
  minWords: DEFAULT_MIN_WORDS,
  maxWords: DEFAULT_MAX_WORDS,
  overlapWords: DEFAULT_OVERLAP_WORDS,
};
