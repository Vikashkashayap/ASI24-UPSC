/**
 * Topic ↔ content relevance helpers.
 * Prevents off-topic KB chunks / cached questions (e.g. Preamble for Cabinet) from leaking in.
 */

const STOP = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "into",
  "about",
  "that",
  "this",
  "these",
  "those",
  "under",
  "over",
  "between",
  "among",
  "india",
  "indian",
  "upsc",
  "prelims",
  "gs",
  "cse",
  "paper",
  "topic",
  "subject",
  "polity",
  "history",
  "geography",
  "economy",
  "environment",
  "science",
  "tech",
  "culture",
  "current",
  "affairs",
  "csat",
]);

/** Common UPSC topic synonyms / typo fixes so retrieval scoring is resilient. */
const TOKEN_ALIASES = {
  cabinent: ["cabinet"],
  cabinet: ["cabinet", "cabinets"],
  ministers: ["minister", "ministry", "ministries", "council"],
  minister: ["ministers", "ministry", "ministries"],
  council: ["councils", "cabinet"],
  committee: ["committees", "cabinet"],
  committees: ["committee", "cabinet"],
  preamble: ["preamble"],
  federalism: ["federal", "federation"],
  judiciary: ["judicial", "supreme", "highcourt"],
};

function editDistance(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array(b.length + 1);
  const cur = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j];
  }
  return prev[b.length];
}

/**
 * @param {string} topic
 * @returns {string[]}
 */
export function tokenizeTopic(topic) {
  const raw = String(topic || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOP.has(t));

  const out = new Set();
  for (const t of raw) {
    out.add(t);
    for (const alias of TOKEN_ALIASES[t] || []) out.add(alias);
  }
  return [...out];
}

function textHasToken(haystack, token) {
  if (!token) return false;
  if (haystack.includes(token)) return true;
  // Fuzzy: allow 1 edit for long tokens (typos like cabinent↔cabinet)
  if (token.length >= 6) {
    const words = haystack.split(/[^a-z0-9]+/).filter((w) => w.length >= 5);
    for (const w of words) {
      if (Math.abs(w.length - token.length) > 1) continue;
      if (editDistance(w, token) <= 1) return true;
    }
  }
  return false;
}

/**
 * Fraction of topic tokens found in text (0–1).
 * @param {string} text
 * @param {string[]} tokens
 */
export function topicOverlapScore(text, tokens) {
  const list = Array.isArray(tokens) ? tokens : tokenizeTopic(tokens);
  if (!list.length) return 1;
  const hay = String(text || "").toLowerCase();
  if (!hay.trim()) return 0;
  let hits = 0;
  for (const t of list) {
    if (textHasToken(hay, t)) hits += 1;
  }
  return hits / list.length;
}

/**
 * Keep chunks that actually mention the requested topic.
 * @param {object[]} chunks
 * @param {string} topic
 * @param {{ minHits?: number }} [opts]
 */
export function filterChunksByTopic(chunks, topic, opts = {}) {
  const tokens = tokenizeTopic(topic);
  if (!tokens.length) return { chunks: chunks || [], tokens, dropped: 0 };

  // At least one distinctive topic token must appear (aliases expand the search set)
  const minHits = Math.max(1, opts.minHits ?? 1);
  const kept = [];
  let dropped = 0;
  for (const c of chunks || []) {
    const blob = [c.heading, c.subTopic, c.chapter, c.book, c.text].filter(Boolean).join(" ");
    const score = topicOverlapScore(blob, tokens);
    const hitCount = Math.round(score * tokens.length);
    if (hitCount >= minHits) {
      kept.push({ ...c, topicOverlap: score });
    } else {
      dropped += 1;
    }
  }
  return { chunks: kept, tokens, dropped };
}

/**
 * True if question content is about the topic (not just same subject).
 * @param {object} question
 * @param {string} topic
 */
export function isQuestionOnTopic(question, topic) {
  const tokens = tokenizeTopic(topic);
  if (!tokens.length) return true;

  const opts = question?.options || {};
  const blob = [
    question?.question,
    question?.question_en,
    question?.topic,
    question?.explanation,
    question?.explanation_en,
    opts.A,
    opts.B,
    opts.C,
    opts.D,
    opts.a,
    opts.b,
    opts.c,
    opts.d,
  ]
    .filter(Boolean)
    .join(" ");

  const score = topicOverlapScore(blob, tokens);
  const hitCount = Math.round(score * tokens.length);
  // One real topic token in stem/options/explanation is enough
  return hitCount >= 1;
}

/**
 * Filter an array of questions down to on-topic ones.
 */
export function filterQuestionsByTopic(questions, topic) {
  const list = Array.isArray(questions) ? questions : [];
  const kept = list.filter((q) => isQuestionOnTopic(q, topic));
  return {
    questions: kept,
    dropped: list.length - kept.length,
    tokens: tokenizeTopic(topic),
  };
}

export default {
  tokenizeTopic,
  topicOverlapScore,
  filterChunksByTopic,
  isQuestionOnTopic,
  filterQuestionsByTopic,
};
