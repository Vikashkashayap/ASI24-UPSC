/**
 * Topic ↔ content relevance helpers.
 * Prevents clear off-topic leaks (e.g. Preamble for Cabinet) without
 * killing valid on-topic Qs (NITI, Five Year Plan, LPG reforms, etc.).
 */

import { isMetadataQuestion } from "../../content/frontMatterFilter.js";

/** Pure filler — never strip subject words like economy/indian from the student topic */
const FILLER_STOP = new Set([
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
  "of",
  "on",
  "in",
  "to",
  "a",
  "an",
  "its",
  "their",
  "our",
  "upsc",
  "prelims",
  "gs",
  "cse",
  "paper",
  "topic",
  "subject",
]);

/** Per-token synonyms / stems / typos */
const TOKEN_ALIASES = {
  cabinent: ["cabinet", "cabinets"],
  cabinet: ["cabinets", "cabinet committee", "ccs"],
  ministers: ["minister", "ministry", "ministries", "council"],
  minister: ["ministers", "ministry", "ministries"],
  council: ["councils"],
  committee: ["committees"],
  committees: ["committee"],
  preamble: ["preamble"],
  federalism: ["federal", "federation"],
  judiciary: ["judicial", "supreme court", "high court"],
  economic: ["economy", "economies", "economically"],
  economy: ["economic", "economies", "economically"],
  planning: ["plan", "plans", "planned", "planner", "planners"],
  plan: ["plans", "planned", "planning"],
  plans: ["plan", "planned", "planning"],
  evolution: ["evolve", "evolved", "development", "growth", "transition", "reform", "reforms"],
  indian: ["india"],
  india: ["indian"],
  geographical: ["geography", "geographic", "geographically", "physiography", "physiographic"],
  geography: ["geographical", "geographic", "geographically", "physiography", "physiographic"],
  geographic: ["geography", "geographical", "geographically"],
  physiography: ["physiographic", "geographical", "geography"],
  setting: ["location", "locale", "physiography", "terrain", "landscape"],
};

/**
 * Chapter-title filler — alone these do not identify a UPSC topic.
 * When the only distinctive words are weak, use soft on-topic checks.
 */
const WEAK_TOPIC_TOKENS = new Set([
  "setting",
  "settings",
  "introduction",
  "overview",
  "nature",
  "aspect",
  "aspects",
  "basics",
  "basic",
  "concept",
  "concepts",
  "meaning",
  "scope",
  "feature",
  "features",
  "general",
  "background",
  "context",
  "framework",
  "outline",
  "fundamentals",
  "elements",
  "dimensions",
]);

/**
 * Extra domain phrases keyed by normalized topic phrase.
 * Matched as substrings in question text.
 */
const TOPIC_PHRASE_HINTS = {
  "economic planning": [
    "five year plan",
    "five-year plan",
    "planning commission",
    "niti aayog",
    "niti ayog",
    "national development council",
    "mixed economy",
    "licence raj",
    "license raj",
    "planned economy",
    "central planning",
    "indicative planning",
    "perspective plan",
    "rolling plan",
    "bombay plan",
    "gadgil",
    "growth target",
  ],
  "evolution of the indian economy": [
    "indian economy",
    "colonial economy",
    "pre-independence",
    "post-independence",
    "five year plan",
    "five-year plan",
    "planning commission",
    "niti aayog",
    "mixed economy",
    "licence raj",
    "license raj",
    "lpg",
    "liberali",
    "privatisation",
    "privatization",
    "globalisation",
    "globalization",
    "1991",
    "economic reform",
    "green revolution",
    "hindu rate",
    "bombay plan",
    "drain of wealth",
    "deindustrial",
    "gdp",
    "national income",
    "public sector",
    "industrial policy",
  ],
  "central council of ministers": [
    "cabinet",
    "prime minister",
    "council of ministers",
    "article 74",
    "article 75",
    "collective responsibility",
  ],
  "cabinet committee": [
    "cabinet committee",
    "ccs",
    "ccp",
    "cabinet secretariat",
    "council of ministers",
  ],
  "essence determinants and consequences of ethics": [
    "ethics",
    "ethical",
    "morality",
    "moral",
    "values",
    "determinant",
    "consequence",
    "human values",
    "integrity",
    "conscience",
    "attitude",
  ],
  "geographical setting": [
    "geography",
    "geographical",
    "geographic",
    "physiography",
    "physiographic",
    "himalaya",
    "himalayas",
    "indo-gangetic",
    "indo gangetic",
    "gangetic plain",
    "peninsular india",
    "deccan plateau",
    "indian plate",
    "plate tectonics",
    "latitudinal",
    "longitudinal",
    "tropic of cancer",
    "standard meridian",
    "indian ocean",
    "arabian sea",
    "bay of bengal",
    "western ghats",
    "eastern ghats",
    "thar desert",
    "monsoon",
    "drainage",
    "river system",
    "ganga",
    "brahmaputra",
    "indus",
    "coastal plain",
    "continental shelf",
    "location of india",
    "size of india",
    "extent of india",
    "neighbours of india",
    "border",
    "frontier",
    "relief",
    "terrain",
    "landform",
    "landforms",
    "climate of india",
    "soil of india",
    "natural vegetation",
  ],
  "the importance of ancient indian history": [
    "ancient indian history",
    "ancient india",
    "importance of history",
    "historical sources",
    "historiography",
    "periodisation",
    "periodization",
    "why study history",
    "reconstruction of history",
  ],
  "the construction of ancient indian history": [
    "sources of ancient",
    "literary sources",
    "archaeological sources",
    "inscriptions",
    "coins",
    "numismatic",
    "foreign accounts",
    "puranas",
    "vedic literature",
    "buddhist literature",
    "jaina literature",
    "historiography",
  ],
  "the stone age": [
    "stone age",
    "palaeolithic",
    "paleolithic",
    "mesolithic",
    "neolithic",
    "microlith",
    "hunter gatherer",
    "hunters and gatherers",
    "bhimbetka",
    "soan",
    "acheulian",
    "chalcolithic",
  ],
};

/** If question hits these AND misses topic tokens, treat as clear off-topic (soft mode). */
const CLEAR_OFFTOPIC_MARKERS = [
  "preamble of the constitution",
  "preamble to the constitution",
  "preamble of the constitution of india",
  "fundamental rights",
  "fundamental right",
  "directive principles",
  "dpsp",
  "supreme court of india was established",
  "which schedule of the constitution",
  "article 32",
  "basic structure doctrine",
  "union public service commission",
];

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

function normalizeTopicKey(topic) {
  return String(topic || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
    .filter((t) => t.length >= 3 && !FILLER_STOP.has(t));

  const out = new Set();
  for (const t of raw) {
    out.add(t);
    for (const alias of TOKEN_ALIASES[t] || []) out.add(alias);
  }
  return [...out];
}

function phraseHintsForTopic(topic) {
  const key = normalizeTopicKey(topic);
  const hints = new Set();
  if (TOPIC_PHRASE_HINTS[key]) {
    for (const h of TOPIC_PHRASE_HINTS[key]) hints.add(h);
  }
  for (const [k, list] of Object.entries(TOPIC_PHRASE_HINTS)) {
    if (key.includes(k) || k.includes(key)) {
      for (const h of list) hints.add(h);
    }
    // overlap on a distinctive multi-word fragment
    const keyWords = key.split(" ").filter((w) => w.length >= 5);
    if (keyWords.length >= 2 && keyWords.every((w) => k.includes(w) || w.includes(k.split(" ")[0]))) {
      // skip overly loose match
    }
    if (keyWords.some((w) => w.length >= 6 && k.includes(w)) && k.split(" ").length >= 2) {
      for (const h of list) hints.add(h);
    }
  }
  if (key.length >= 6) hints.add(key);
  return [...hints];
}

function textHasToken(haystack, token) {
  if (!token) return false;
  const t = String(token).toLowerCase();
  if (haystack.includes(t)) return true;
  if (t.length >= 6 && !t.includes(" ")) {
    const words = haystack.split(/[^a-z0-9]+/).filter((w) => w.length >= 5);
    const stemLen = Math.min(7, t.length);
    const stem = t.slice(0, stemLen);
    for (const w of words) {
      if (Math.abs(w.length - t.length) > 1) {
        // shared stem: geographical ↔ geography
        if (stemLen >= 6 && w.length >= 6 && w.startsWith(stem.slice(0, 6))) return true;
        continue;
      }
      if (editDistance(w, t) <= 1) return true;
      if (stemLen >= 6 && w.startsWith(stem.slice(0, 6))) return true;
    }
  }
  return false;
}

/**
 * True when the chapter title is mostly filler ("Introduction", "The Geographical Setting").
 * Strict keyword filters kill valid MCQs for these — soft mode is safer.
 * Uses raw topic words only (aliases must not make a vague title look distinctive).
 */
export function isAbstractChapterTopic(topic) {
  const raw = String(topic || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !FILLER_STOP.has(t));
  if (!raw.length) return true;
  const distinctive = raw.filter((t) => !WEAK_TOPIC_TOKENS.has(t) && t.length >= 5);
  return distinctive.length <= 1;
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
  const phrases = phraseHintsForTopic(topic);
  if (!tokens.length && !phrases.length) return { chunks: chunks || [], tokens, dropped: 0 };

  const minHits = Math.max(1, opts.minHits ?? 1);
  const kept = [];
  let dropped = 0;
  for (const c of chunks || []) {
    const blob = [c.heading, c.subTopic, c.chapter, c.book, c.text].filter(Boolean).join(" ");
    const hay = blob.toLowerCase();
    const score = tokens.length ? topicOverlapScore(hay, tokens) : 0;
    const hitCount = tokens.length ? Math.round(score * tokens.length) : 0;
    const phraseHit = phrases.some((p) => hay.includes(p));
    if (hitCount >= minHits || phraseHit) {
      kept.push({ ...c, topicOverlap: Math.max(score, phraseHit ? 0.5 : 0) });
    } else {
      dropped += 1;
    }
  }
  return { chunks: kept, tokens, dropped };
}

function questionBlob(question) {
  const opts = question?.options || {};
  return [
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
    .join(" ")
    .toLowerCase();
}

/**
 * True if question content is about the topic (not just same subject).
 * @param {object} question
 * @param {string} topic
 * @param {{ soft?: boolean }} [opts] soft=true → only drop clear cross-topic leaks
 */
export function isQuestionOnTopic(question, topic, opts = {}) {
  if (isMetadataQuestion(question)) return false;

  // Abstract chapter titles rarely appear verbatim in stems — always soft-check
  const soft = Boolean(opts.soft) || isAbstractChapterTopic(topic);
  const tokens = tokenizeTopic(topic);
  const phrases = phraseHintsForTopic(topic);
  if (!tokens.length && !phrases.length) return true;

  const hay = questionBlob(question);
  if (!hay.trim()) return false;

  if (phrases.some((p) => hay.includes(p))) return true;

  const score = tokens.length ? topicOverlapScore(hay, tokens) : 0;
  const hitCount = tokens.length ? Math.round(score * tokens.length) : 0;
  if (hitCount >= 1) return true;

  if (soft) {
    // Trust prompt TOPIC LOCK / KB grounding unless clearly another chapter
    const clearLeak = CLEAR_OFFTOPIC_MARKERS.some((m) => hay.includes(m));
    return !clearLeak;
  }

  return false;
}

/**
 * Filter an array of questions down to on-topic ones.
 * @param {object[]} questions
 * @param {string} topic
 * @param {{ soft?: boolean }} [opts]
 */
export function filterQuestionsByTopic(questions, topic, opts = {}) {
  const list = Array.isArray(questions) ? questions : [];
  const soft = Boolean(opts.soft) || isAbstractChapterTopic(topic);
  const kept = list.filter((q) => isQuestionOnTopic(q, topic, { ...opts, soft }));
  return {
    questions: kept,
    dropped: list.length - kept.length,
    tokens: tokenizeTopic(topic),
    soft,
  };
}

function normalizePatternIdLoose(questionType) {
  const t = String(questionType || "").toLowerCase().replace(/[\s-]+/g, "_");
  if (t.includes("not_correct") || t.includes("incorrect")) return "statement_not_correct";
  if (t.includes("elimin")) return "multi_statement_elimination";
  if (t.includes("pair") || t.includes("match")) return "pair_matching";
  if (t.includes("assert")) return "assertion_reason";
  if (t.includes("chron")) return "chronology";
  if (t.includes("sequence") || t.includes("arrang")) return "sequence_arrangement";
  if (t.includes("map") || t.includes("location")) return "map_location";
  if (t.includes("odd")) return "odd_one_out";
  if (t.includes("statement")) return "statement_based";
  if (t.includes("direct") || t.includes("concept")) return "direct_conceptual";
  return t || "direct_conceptual";
}

/**
 * Keep only UPSC Prelims Hard / PYQ-style stems.
 * Drops easy one-liners, trivia Who/What recalls, and empty multi-statement shells.
 */
export function isPyqHardEnough(question) {
  if (!question || typeof question !== "object") return false;
  if (String(question.difficulty || "").toLowerCase() === "easy") return false;

  const stem = String(
    question.question_en || question.question || question.question_hi || ""
  ).trim();
  if (stem.length < 60) return false;

  const type = normalizePatternIdLoose(question.questionType || question.type);
  const hasNumbered =
    /(?:^|\n)\s*(?:\(?\d+\)?[.)]|[1-9]\s*[.)])/m.test(stem) ||
    (Array.isArray(question.statements) &&
      question.statements.filter((s) => String(s || "").trim().length >= 12).length >= 2);
  const hasAR =
    /assertion\s*\(|reason\s*\(|अभिकथन|कारण/i.test(stem) ||
    Boolean(question.assertionReason?.assertion && question.assertionReason?.reason);
  const hasMatch =
    /list[\s-]*i|match the following|सुमेलित/i.test(stem) ||
    (Array.isArray(question.matchColumns?.columnA) &&
      question.matchColumns.columnA.filter((x) => String(x || "").trim()).length >= 2);
  const hasChrono =
    /chronolog|arrange|sequence|सही क्रम/i.test(stem) ||
    (Array.isArray(question.chronologyItems) &&
      question.chronologyItems.filter((x) => String(x || "").trim()).length >= 2);

  const pyqPatterns = new Set([
    "statement_based",
    "statement_not_correct",
    "multi_statement_elimination",
    "assertion_reason",
    "pair_matching",
    "chronology",
    "sequence_arrangement",
  ]);

  if (pyqPatterns.has(type)) {
    if (type === "assertion_reason") return hasAR || stem.length >= 140;
    if (type === "pair_matching") return hasMatch || stem.length >= 140;
    if (type === "chronology" || type === "sequence_arrangement") {
      return hasChrono || hasNumbered || stem.length >= 140;
    }
    return hasNumbered || stem.length >= 160;
  }

  // direct_conceptual / others — reject trivia one-liners
  if (/^(who|what|when|where|which\s+year)\b/i.test(stem) && stem.length < 140) {
    return false;
  }
  if (stem.length < 110) return false;
  // Prefer conceptual framing
  if (
    /with reference to|consider the following|which of the following|in the context of|correctly explained|not correct/i.test(
      stem
    )
  ) {
    return true;
  }
  return stem.length >= 140;
}

/**
 * @param {object[]} questions
 * @returns {{ questions: object[], dropped: number }}
 */
export function filterQuestionsByPyqHardness(questions) {
  const list = Array.isArray(questions) ? questions : [];
  const kept = list.filter((q) => isPyqHardEnough(q));
  return { questions: kept, dropped: list.length - kept.length };
}

export default {
  tokenizeTopic,
  topicOverlapScore,
  filterChunksByTopic,
  isQuestionOnTopic,
  filterQuestionsByTopic,
  isAbstractChapterTopic,
  isPyqHardEnough,
  filterQuestionsByPyqHardness,
};
