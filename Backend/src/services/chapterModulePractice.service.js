/**
 * Student Module Targets → chapter practice:
 * - Admin KB / RAG only for Hard MCQs (no open-syllabus inventing)
 * - Always bilingual (EN + HI) for chapter practice
 * - Show 20 unique questions (teaching explanations: correct + all wrong options)
 * - Prefetch related UPSC topics for the *next* chapter into cache
 * Module Final (50Q): chapter bank + RAG top-up, polished explanations
 */

import Test from "../models/Test.js";
import ChapterRelatedTopicCache, {
  buildChapterTopicCacheKey,
} from "../models/ChapterRelatedTopicCache.js";
import {
  generateTestQuestions,
  dedupeQuestions,
  dedupeQuestionsByStem,
  buildQuestionFingerprints,
  filterOutPriorRepeats,
  ensurePrelimsExplanationsPracticeStyle,
  hasTeachingExplanation,
} from "../services/testGenerationService.js";
import { pickBilingualQuestionFields, filterStudentReadyQuestions } from "../services/questionTranslationService.js";
import { searchKnowledgeBase } from "../rag/services/search.service.js";
import { generateQuestionsFromRag } from "../rag/services/questionGen.service.js";
import {
  OPENROUTER_APP_TITLES,
  runWithOpenRouterAppTitle,
} from "../config/openRouterAppTitle.js";
import { mapBilingualQuestionForClient } from "../services/bilingualQuestionStorage.js";
import { ALL_PATTERN_IDS, PYQ_HARD_PATTERN_IDS } from "../config/questionPatterns.js";
import {
  resolveKbSubjectLabel,
  SYLLABUS_KEY_TO_KB_SUBJECT as SHARED_SYLLABUS_KEY_TO_KB,
} from "./ai/kbSubjectResolve.js";
import { filterQuestionsByPyqHardness } from "./qg/utils/topicRelevance.js";

export const SYLLABUS_KEY_TO_KB_SUBJECT = SHARED_SYLLABUS_KEY_TO_KB;

/**
 * Syllabus display names (Ancient History, World Geography, …) → Admin KB subject bucket.
 * KB uploads are often generic ("History") while Daily Targets use fine-grained labels.
 */
const SYLLABUS_NAME_TO_KB_SUBJECT = [
  { re: /\b(ancient|medieval|modern|world)\s*hist|post[-\s]?independ|\bhistory\b/i, subject: "History" },
  { re: /\b(indian\s+)?polity\b|\bconstitution\b/i, subject: "Polity" },
  { re: /\b(indian\s+|world\s+)?geography\b|\bgeograph/i, subject: "Geography" },
  { re: /\beconom(y|ics)\b/i, subject: "Economy" },
  { re: /\benvironment\b|\becology\b/i, subject: "Environment" },
  { re: /\bart\s*(and|&)\s*culture\b/i, subject: "Art & Culture" },
  { re: /\bscience\s*(and|&)\s*tech/i, subject: "Science & Tech" },
  { re: /\binternational\s+relations\b|\b\bir\b/i, subject: "International Relations" },
  { re: /\binternal\s+security\b/i, subject: "Internal Security" },
  { re: /\bsocial\s+justice\b|\bgovernance\b/i, subject: "Governance" },
  { re: /\bethics\b/i, subject: "Ethics" },
  { re: /\bsociety\b/i, subject: "Society" },
];

/** Prelims test UI subjects — fall back when KB subject is not a GS toggle subject. */
const KB_TO_TEST_SUBJECT = {
  Polity: "Polity",
  History: "History",
  Geography: "Geography",
  Economy: "Economy",
  Environment: "Environment",
  "Science & Tech": "Science & Tech",
  "Art & Culture": "Art & Culture",
  Society: "History",
  Governance: "Polity",
  "International Relations": "Polity",
  "Internal Security": "Polity",
  Ethics: "Polity",
};

export function parseChapterPreviewLine(line) {
  const raw = String(line || "").trim();
  if (!raw) return { chapterNum: "", topicName: "", label: "" };
  const m = raw.match(/^(?:Ch\.?\s*|अध्\.?\s*)(\d+)\s*[:.\-–—]\s*(.+)$/i);
  if (m) {
    return { chapterNum: m[1], topicName: m[2].trim(), label: raw };
  }
  return { chapterNum: "", topicName: raw, label: raw };
}

/** Ancient History / Medieval / … → History (where NCERT PDFs are tagged). */
export function resolveKbSubject(subjectKey, subjectName) {
  const fromShared = resolveKbSubjectLabel(subjectKey, subjectName);
  if (fromShared && fromShared !== String(subjectName || "").trim()) return fromShared;
  const key = String(subjectKey || "").trim().toLowerCase();
  if (SYLLABUS_KEY_TO_KB_SUBJECT[key]) return SYLLABUS_KEY_TO_KB_SUBJECT[key];
  const name = String(subjectName || "").trim();
  if (!name) return fromShared || "Polity";
  for (const { re, subject } of SYLLABUS_NAME_TO_KB_SUBJECT) {
    if (re.test(name)) return subject;
  }
  return fromShared || name;
}

export function resolveTestSubject(kbSubject) {
  return KB_TO_TEST_SUBJECT[kbSubject] || "Polity";
}

function normalizeTopicKey(topic) {
  return String(topic || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizePatternId(questionType) {
  const t = String(questionType || "").toLowerCase().replace(/[\s-]+/g, "_");
  if (ALL_PATTERN_IDS.includes(t)) return t;
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
  return "direct_conceptual";
}

/**
 * Pick `showCount` unique questions with equal-as-possible coverage of all UPSC patterns.
 * No repeats (caller should already dedupe; we still guard by stem).
 */
function pickBalancedPatternSet(pool, showCount) {
  const unique = dedupeQuestionsByStem(dedupeQuestions(pool || []));
  if (unique.length <= showCount) return unique;

  // Prefer real UPSC Prelims Hard patterns when selecting the shown paper
  const patternOrder = [
    ...PYQ_HARD_PATTERN_IDS,
    ...ALL_PATTERN_IDS.filter((id) => !PYQ_HARD_PATTERN_IDS.includes(id)),
  ];

  const buckets = new Map(patternOrder.map((id) => [id, []]));
  const leftovers = [];
  for (const q of unique) {
    const id = normalizePatternId(q.questionType || q.type);
    if (buckets.has(id)) buckets.get(id).push(q);
    else leftovers.push(q);
  }

  // Shuffle inside each bucket for variety
  for (const [, list] of buckets) {
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
  }
  for (let i = leftovers.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [leftovers[i], leftovers[j]] = [leftovers[j], leftovers[i]];
  }

  const picked = [];
  const used = new Set();
  let guard = 0;
  while (picked.length < showCount && guard < showCount * patternOrder.length + 20) {
    guard += 1;
    let added = false;
    for (const id of patternOrder) {
      if (picked.length >= showCount) break;
      const list = buckets.get(id) || [];
      while (list.length) {
        const q = list.shift();
        const key = String(q._id || q.question_en || q.question || "").slice(0, 160);
        if (used.has(key)) continue;
        used.add(key);
        picked.push(q);
        added = true;
        break;
      }
    }
    if (!added) break;
  }

  while (picked.length < showCount && leftovers.length) {
    const q = leftovers.shift();
    const key = String(q._id || q.question_en || q.question || "").slice(0, 160);
    if (used.has(key)) continue;
    used.add(key);
    picked.push(q);
  }

  // If still short, take any remaining from buckets
  if (picked.length < showCount) {
    for (const list of buckets.values()) {
      while (list.length && picked.length < showCount) {
        const q = list.shift();
        const key = String(q._id || q.question_en || q.question || "").slice(0, 160);
        if (used.has(key)) continue;
        used.add(key);
        picked.push(q);
      }
    }
  }

  const coverage = {};
  for (const q of picked) {
    const id = normalizePatternId(q.questionType || q.type);
    coverage[id] = (coverage[id] || 0) + 1;
  }
  console.log(`[chapterPractice] pattern coverage in shown ${picked.length}Q:`, coverage);

  return picked.slice(0, showCount);
}

/**
 * Extract distinct related topic titles from KB search hits.
 */
function extractRelatedTopics(hits = [], currentTopic = "") {
  const cur = normalizeTopicKey(currentTopic);
  const seen = new Set();
  const out = [];

  for (const hit of hits) {
    const candidates = [hit.heading, hit.topic, hit.subtopic]
      .map((x) => String(x || "").trim())
      .filter((x) => x.length >= 3 && x.length <= 160);

    for (const title of candidates) {
      const key = normalizeTopicKey(title);
      if (!key || key === cur || seen.has(key)) continue;
      // Skip pure page numbers / junk
      if (/^page\s*\d+$/i.test(title)) continue;
      seen.add(key);
      out.push({
        title,
        score: typeof hit.score === "number" ? hit.score : null,
        source: hit.source || hit.sourceUrl || "",
      });
      if (out.length >= 12) return out;
    }
  }
  return out;
}

/**
 * Search KB for related UPSC topics and upsert cache.
 */
export async function cacheRelatedTopicsForChapter({
  subjectKey,
  kbSubject,
  chapterLabel,
  topicName,
  prefetchedFromChapter = "",
}) {
  const topic = String(topicName || "").trim();
  if (!topic || !kbSubject) return null;

  const query = `UPSC Prelims ${kbSubject} ${topic} key concepts articles PYQ related topics`;
  let result;
  try {
    result = await searchKnowledgeBase({
      query,
      topK: 16,
      filters: { subject: kbSubject },
    });
  } catch (err) {
    console.warn("[chapterPractice] related-topic search failed:", err.message);
    return null;
  }

  const hits = result?.chunks || [];
  const relatedTopics = extractRelatedTopics(hits, topic);
  const key = buildChapterTopicCacheKey(kbSubject, topic);

  const doc = await ChapterRelatedTopicCache.findOneAndUpdate(
    { kbSubject: key.kbSubject, topic: key.topic },
    {
      $set: {
        subjectKey: subjectKey || "",
        kbSubject: key.kbSubject,
        topic: key.topic,
        chapterLabel: chapterLabel || topic,
        relatedTopics,
        matchedChunks: hits.length,
        query,
        prefetchedFromChapter: prefetchedFromChapter || "",
      },
    },
    { upsert: true, new: true }
  );

  return doc;
}

/**
 * Warm RAG question cache for a chapter (fire-and-forget friendly).
 * Skips entirely when a shared Test paper already exists — avoids duplicate LLM spend.
 */
export async function warmChapterQuestionCache(params) {
  return runWithOpenRouterAppTitle(OPENROUTER_APP_TITLES.MODULE, () =>
    warmChapterQuestionCacheInner(params)
  );
}

async function warmChapterQuestionCacheInner({ kbSubject, topicName }) {
  try {
    const topicNormalized = String(topicName || "").trim().replace(/\s+/g, " ");
    if (!topicNormalized || !kbSubject) return;

    const testSubject = resolveTestSubject(kbSubject);
    const topicRegex = new RegExp(
      `^${topicNormalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
      "i"
    );
    const existing = await Test.findOne({
      subject: testSubject,
      topic: topicRegex,
      difficulty: "Hard",
      examType: "GS",
      totalQuestions: { $gte: 20 },
      questions: { $exists: true, $not: { $size: 0 } },
      $and: [
        { $or: [{ prelimsMockId: null }, { prelimsMockId: { $exists: false } }] },
        { $or: [{ assignedPracticeTestId: null }, { assignedPracticeTestId: { $exists: false } }] },
      ],
    })
      .select("_id")
      .lean();

    if (existing) {
      console.log(
        `[chapterPractice] warm skipped — shared Test already exists for "${topicNormalized}" (${existing._id})`
      );
      return;
    }

    await generateQuestionsFromRag({
      subject: kbSubject,
      topic: topicNormalized,
      difficulty: "Hard",
      count: 30,
      force: false,
    });
  } catch (err) {
    console.warn("[chapterPractice] warm question cache:", err.message);
  }
}

/**
 * Prefetch next chapter: related topics + optional question cache warm.
 */
export async function prefetchNextChapter(params) {
  return runWithOpenRouterAppTitle(OPENROUTER_APP_TITLES.MODULE, () =>
    prefetchNextChapterInner(params)
  );
}

async function prefetchNextChapterInner({
  subjectKey,
  kbSubject,
  currentLabel,
  nextLabel,
}) {
  if (!nextLabel) return null;
  const parsed = parseChapterPreviewLine(nextLabel);
  const topicName = parsed.topicName;
  if (!topicName) return null;

  const cached = await cacheRelatedTopicsForChapter({
    subjectKey,
    kbSubject,
    chapterLabel: nextLabel,
    topicName,
    prefetchedFromChapter: currentLabel,
  });

  // Warm Hard/20 question cache so the next student gets faster generation
  void warmChapterQuestionCache({ kbSubject, topicName });

  return cached;
}

/**
 * Load cached related topics for a list of chapter labels.
 */
export async function loadRelatedTopicsMap(kbSubject, chapterLabels = []) {
  const topics = chapterLabels
    .map((line) => parseChapterPreviewLine(line).topicName)
    .filter(Boolean)
    .map((t) => normalizeTopicKey(t));

  if (!topics.length || !kbSubject) return {};

  const rows = await ChapterRelatedTopicCache.find({
    kbSubject,
    topic: { $in: topics },
  }).lean();

  const byTopic = new Map(rows.map((r) => [r.topic, r]));
  const out = {};
  for (const line of chapterLabels) {
    const name = parseChapterPreviewLine(line).topicName;
    const row = byTopic.get(normalizeTopicKey(name));
    if (row?.relatedTopics?.length) {
      out[line] = row.relatedTopics.map((t) => t.title || t).filter(Boolean);
    }
  }
  return out;
}

/**
 * Create (or reuse-from-cache) a chapter practice test.
 * Admin KB/RAG only for 30 Hard MCQs (no open-syllabus inventing).
 * English at generate time; Hindi via free client Google translate (0 OpenRouter tokens).
 * Show 20 unique questions with teaching explanations.
 *
 * Shared DB cache: once ANY student generates a paper for this topic, every other
 * student reuses those questions (new Test doc per student, 0 LLM calls).
 * Retake prefers that student's own prior paper, else the shared bank.
 */
function mapSavedChapterTestForClient(test, extra = {}) {
  return {
    _id: test._id,
    subject: test.subject,
    examType: test.examType,
    topic: test.topic,
    difficulty: test.difficulty,
    totalQuestions: test.totalQuestions,
    durationMinutes: test.durationMinutes,
    questions: (test.questions || []).map((q) =>
      mapBilingualQuestionForClient(q, { includeAnswers: false })
    ),
    createdAt: test.createdAt,
    isSubmitted: Boolean(test.isSubmitted),
    ...extra,
  };
}

/** Same scope filters used for chapter practice (exclude prelims / assigned practice). */
function chapterPracticeScopeFilters() {
  return [
    { $or: [{ prelimsMockId: null }, { prelimsMockId: { $exists: false } }] },
    { $or: [{ assignedPracticeTestId: null }, { assignedPracticeTestId: { $exists: false } }] },
  ];
}

export async function createChapterPracticeTest(params) {
  return runWithOpenRouterAppTitle(OPENROUTER_APP_TITLES.MODULE, () =>
    createChapterPracticeTestInner(params)
  );
}

async function createChapterPracticeTestInner({
  userId,
  kbSubject,
  topicName,
  chapterLabel,
  forceCache = false,
}) {
  const topicNormalized = String(topicName || "").trim().replace(/\s+/g, " ");
  const testSubject = resolveTestSubject(kbSubject);
  const difficulty = "Hard";
  const GENERATE_COUNT = 30; // 10 × 3 batches
  const SHOW_COUNT = 20; // student sees 20
  const MIN_ACCEPTABLE = 20; // need a full paper; 30 pool absorbs drops/dupes
  const BATCH_SIZE = 10;

  /** Drop exact + near-duplicate stems; keep unique pool for the paper. */
  const uniquePool = (list) => {
    const before = list.length;
    const unique = dedupeQuestionsByStem(dedupeQuestions(list));
    const dropped = before - unique.length;
    if (dropped > 0) {
      console.log(
        `[chapterPractice] dedupe: ${before} → ${unique.length} unique (dropped ${dropped} duplicates)`
      );
    }
    return unique;
  };

  const topicRegex = new RegExp(
    `^${topicNormalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
    "i"
  );

  // Resume unfinished attempt for this student + topic (Stop creating duplicate "In progress" rows)
  if (userId) {
    const openAttempts = await Test.find({
      userId,
      topic: topicRegex,
      examType: "GS",
      isSubmitted: false,
      $and: chapterPracticeScopeFilters(),
    })
      .sort({ createdAt: -1 })
      .limit(20);

    if (openAttempts.length > 0) {
      const [latest, ...stale] = openAttempts;
      if (stale.length > 0) {
        await Test.deleteMany({ _id: { $in: stale.map((t) => t._id) } });
        console.log(
          `[chapterPractice] cleaned ${stale.length} stale unsubmitted duplicate(s) for "${topicNormalized}"`
        );
      }
      console.log(
        `[chapterPractice] RESUME unsubmitted test ${latest._id} (topic="${topicNormalized}") — no new doc`
      );
      return {
        test: mapSavedChapterTestForClient(latest, {
          fromCache: true,
          resumed: true,
          chapterLabel: chapterLabel || topicNormalized,
          kbSubject,
          shownCount: latest.totalQuestions,
          source: "resume",
        }),
        fromCache: true,
        resumed: true,
      };
    }
  }

  const baseCacheQuery = {
    subject: testSubject,
    topic: topicRegex,
    difficulty,
    examType: "GS",
    totalQuestions: { $gte: SHOW_COUNT },
    questions: { $exists: true, $not: { $size: 0 } },
    $and: chapterPracticeScopeFilters(),
  };

  /**
   * Load candidate papers and pick the best usable shared bank.
   * Prefer: this student's own paper (retake) → highest teaching count → newest.
   */
  async function findBestCachedPaper() {
    const candidates = [];

    if (userId) {
      const own = await Test.find({ ...baseCacheQuery, userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();
      candidates.push(...own);
    }

    const shared = await Test.find(
      userId ? { ...baseCacheQuery, userId: { $ne: userId } } : baseCacheQuery
    )
      .sort({ createdAt: -1 })
      .limit(12)
      .lean();
    candidates.push(...shared);

    let best = null;
    let bestScore = -1;

    for (const doc of candidates) {
      const raw = (doc.questions || []).map((value) => {
        const plain = typeof value.toObject === "function" ? value.toObject() : { ...value };
        return pickBilingualQuestionFields({ ...plain, userAnswer: null });
      });
      const cached = filterStudentReadyQuestions(uniquePool(raw));
      if (cached.length < SHOW_COUNT) continue;

      const teachingCount = cached.filter((q) => hasTeachingExplanation(q)).length;
      const isOwn = userId && String(doc.userId || "") === String(userId);
      // Own retake paper wins; else prefer richer teaching explanations, then size
      const score =
        (isOwn && forceCache ? 1_000_000 : 0) +
        teachingCount * 100 +
        cached.length +
        (isOwn ? 50 : 0);

      if (score > bestScore) {
        bestScore = score;
        best = { doc, cached, teachingCount, isOwn };
      }
    }

    return best;
  }

  let questions;
  let fromCache = false;
  let generationSource = "kb_or_llm";
  let cacheMeta = null;

  const bestPaper = await findBestCachedPaper();
  if (bestPaper) {
    // Shared bank: always reuse once a full usable paper exists (any student).
    // This is the main cost saver — no RAG / Gemini on 2nd+ Start Test for same chapter.
    fromCache = true;
    questions = pickBalancedPatternSet(bestPaper.cached, SHOW_COUNT);
    cacheMeta = {
      sourceTestId: String(bestPaper.doc._id),
      sourceUserId: bestPaper.doc.userId ? String(bestPaper.doc.userId) : null,
      isOwnPaper: bestPaper.isOwn,
      teaching: bestPaper.teachingCount,
      pool: bestPaper.cached.length,
    };
    console.log(
      `[chapterPractice] SHARED CACHE HIT → ${questions.length}Q shown` +
        ` (topic="${topicNormalized}", sourceTest=${cacheMeta.sourceTestId},` +
        ` own=${cacheMeta.isOwnPaper}, teaching=${cacheMeta.teaching}/${cacheMeta.pool},` +
        ` forceCache=${Boolean(forceCache)}) — 0 LLM calls`
    );
  } else {
    console.log(
      `[chapterPractice] CACHE MISS → generate ${GENERATE_COUNT}Q from Admin KB RAG only` +
        ` (no open-syllabus) → show ${SHOW_COUNT} (topic="${topicNormalized}")`
    );
  }

  if (!fromCache) {
    const generationResult = await generateTestQuestions({
      subjects: [kbSubject],
      topic: topicNormalized,
      examType: "GS",
      questionCount: GENERATE_COUNT,
      difficulty,
      batchSize: BATCH_SIZE,
      minAcceptable: MIN_ACCEPTABLE,
      // Module Targets: questions MUST come from Admin KB/RAG only (UPSC Hard)
      kbOnly: true,
      allowLlmFallback: false,
      ensureHindi: true,
    });

    if (!generationResult.success || !generationResult.questions?.length) {
      const err = new Error(
        generationResult.error ||
          `Could not generate questions for "${topicNormalized}" under ${kbSubject}. Please try again.`
      );
      err.status = 400;
      throw err;
    }

    const rawPool = generationResult.questions.map((q) => pickBilingualQuestionFields(q));
    const hardness = filterQuestionsByPyqHardness(rawPool);
    if (hardness.dropped > 0) {
      console.log(
        `[chapterPractice] PYQ-Hard filter: kept ${hardness.questions.length}/${rawPool.length} (dropped ${hardness.dropped} easy/one-liners)`
      );
    }
    const pool = filterStudentReadyQuestions(
      uniquePool(hardness.questions.length ? hardness.questions : rawPool)
    );

    const hardFloor = Math.min(MIN_ACCEPTABLE, 18);
    if (pool.length < hardFloor) {
      const err = new Error(
        `Only ${pool.length} usable questions for "${topicNormalized}" (need ${hardFloor}+). Please try again.`
      );
      err.status = 400;
      throw err;
    }

    questions = pickBalancedPatternSet(pool, SHOW_COUNT);
    generationSource = generationResult.source || "kb_or_llm";

    console.log(
      `[chapterPractice] ${generationSource}: raw ${rawPool.length} → unique ${pool.length} → showing ${questions.length} — saved for shared reuse`
    );
  }

  // Always save a per-student attempt doc (answers/score stay private),
  // but questions come from shared bank when fromCache=true.
  const test = new Test({
    userId,
    subject: testSubject,
    examType: "GS",
    topic: topicNormalized,
    difficulty,
    questions,
    totalQuestions: questions.length,
    // 50Q → 60 min; 20Q → 24 min (proportional)
    durationMinutes: Math.max(15, Math.round((questions.length * 60) / 50)),
  });
  await test.save();

  return {
    test: mapSavedChapterTestForClient(test, {
      fromCache,
      cacheMeta,
      chapterLabel: chapterLabel || topicNormalized,
      kbSubject,
      generatedCount: GENERATE_COUNT,
      shownCount: questions.length,
      source: fromCache ? "cache" : generationSource,
      resumed: false,
    }),
    fromCache,
    resumed: false,
  };
}

/**
 * RAG top-up for Module Final: generate only the shortfall across chapter topics,
 * skipping near-duplicates already in the chapter bank.
 */
async function generateModuleFinalTopUp({
  kbSubject,
  topicNames,
  need,
  excludeQuestions = [],
}) {
  if (need <= 0 || !topicNames.length) return [];

  const buffer = Math.min(8, Math.max(3, need));
  const generateTarget = need + buffer;
  const perTopic = Math.max(5, Math.ceil(generateTarget / topicNames.length));
  const fresh = [];

  console.log(
    `[moduleFinal] top-up: need=${need}, generateTarget≈${generateTarget}, topics=${topicNames.length}, ~${perTopic}/topic`
  );

  for (const topic of topicNames) {
    if (fresh.length >= generateTarget) break;

    const want = Math.min(perTopic, generateTarget - fresh.length);
    const fingerprints = buildQuestionFingerprints([...excludeQuestions, ...fresh]);

    const generationResult = await generateTestQuestions({
      subjects: [kbSubject],
      topic,
      examType: "GS",
      questionCount: want,
      difficulty: "Hard",
      batchSize: Math.min(5, want),
      minAcceptable: 1,
      kbOnly: true,
      allowLlmFallback: false,
      ensureHindi: true,
    });

    if (!generationResult.success || !generationResult.questions?.length) {
      console.warn(
        `[moduleFinal] top-up batch failed for "${topic}":`,
        generationResult.error || "no questions"
      );
      continue;
    }

    const mapped = generationResult.questions.map((q) => pickBilingualQuestionFields(q));
    const novel = filterOutPriorRepeats(mapped, fingerprints);
    console.log(
      `[moduleFinal] top-up "${topic}": got ${mapped.length}, novel ${novel.length} (vs bank+fresh)`
    );
    fresh.push(...novel);
  }

  // Still short → one more pass on first topics with smaller batches
  if (fresh.length < need) {
    const stillNeed = need - fresh.length + 3;
    console.log(`[moduleFinal] top-up second pass for ${stillNeed} more…`);
    for (const topic of topicNames) {
      if (fresh.length >= need) break;
      const fingerprints = buildQuestionFingerprints([...excludeQuestions, ...fresh]);
      const generationResult = await generateTestQuestions({
        subjects: [kbSubject],
        topic,
        examType: "GS",
        questionCount: Math.min(5, stillNeed),
        difficulty: "Hard",
        batchSize: 5,
        minAcceptable: 1,
        kbOnly: true,
        allowLlmFallback: false,
        ensureHindi: true,
      });
      if (!generationResult.success || !generationResult.questions?.length) continue;
      const mapped = generationResult.questions.map((q) => pickBilingualQuestionFields(q));
      fresh.push(...filterOutPriorRepeats(mapped, fingerprints));
    }
  }

  return dedupeQuestionsByStem(dedupeQuestions(fresh));
}

/**
 * Module Final (50Q):
 * 1) Resume this student's unsubmitted attempt
 * 2) Reuse shared Module Final paper (any student) — 0 LLM / same questions
 * 3) Else build from chapter bank + RAG top-up (first generation only)
 */
export async function createModuleFinalTestFromChapterBank(params) {
  return runWithOpenRouterAppTitle(OPENROUTER_APP_TITLES.MODULE, () =>
    createModuleFinalTestFromChapterBankInner(params)
  );
}

async function createModuleFinalTestFromChapterBankInner({
  userId,
  kbSubject,
  moduleId,
  moduleName,
  chapterLabels = [],
  showCount = 50,
  syllabusModuleTargetId = null,
}) {
  const testSubject = resolveTestSubject(kbSubject);
  const finalTopic = `${moduleId} Module Final — ${moduleName}`.trim();
  const topicRegex = new RegExp(
    `^${String(moduleId || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+Module Final`,
    "i"
  );

  const saveClone = async (questions, extra = {}) => {
    const cleaned = questions.slice(0, showCount).map((q) => {
      const plain = typeof q.toObject === "function" ? q.toObject() : { ...q };
      return pickBilingualQuestionFields({
        ...plain,
        userAnswer: null,
        timeSpent: 0,
      });
    });
    const test = new Test({
      userId,
      subject: testSubject,
      examType: "GS",
      topic: finalTopic,
      difficulty: "Hard",
      questions: cleaned,
      totalQuestions: cleaned.length,
      durationMinutes: Math.max(15, Math.round((cleaned.length * 60) / 50)),
      ...(syllabusModuleTargetId
        ? { syllabusModuleTargetId }
        : {}),
    });
    await test.save();
    return {
      test: mapSavedChapterTestForClient(test, {
        fromChapterBank: Boolean(extra.fromChapterBank),
        fromGeneration: Boolean(extra.fromGeneration),
        fromCache: Boolean(extra.fromCache),
        resumed: Boolean(extra.resumed),
        bankCount: extra.bankCount ?? 0,
        generatedCount: extra.generatedCount ?? 0,
        moduleId,
        moduleName,
        poolSize: cleaned.length,
        source: extra.source || "module_final",
        sourceTestId: extra.sourceTestId || null,
      }),
      fromCache: Boolean(extra.fromCache || extra.resumed),
      resumed: Boolean(extra.resumed),
    };
  };

  // 1) Resume unfinished Module Final for this student
  if (userId) {
    const openAttempts = await Test.find({
      userId,
      topic: topicRegex,
      examType: "GS",
      isSubmitted: false,
      $and: chapterPracticeScopeFilters(),
    })
      .sort({ createdAt: -1 })
      .limit(20);

    if (openAttempts.length > 0) {
      const [latest, ...stale] = openAttempts;
      if (stale.length > 0) {
        await Test.deleteMany({ _id: { $in: stale.map((t) => t._id) } });
      }
      if (
        syllabusModuleTargetId &&
        !latest.syllabusModuleTargetId
      ) {
        latest.syllabusModuleTargetId = syllabusModuleTargetId;
        await latest.save();
      }
      console.log(
        `[moduleFinal] RESUME unsubmitted ${latest._id} (module=${moduleId}) — 0 LLM`
      );
      return {
        test: mapSavedChapterTestForClient(latest, {
          fromCache: true,
          resumed: true,
          moduleId,
          moduleName,
          source: "resume",
        }),
        fromCache: true,
        resumed: true,
      };
    }
  }

  // 2) Shared Module Final cache — same questions for every student
  const cachedDocs = await Test.find({
    topic: topicRegex,
    examType: "GS",
    difficulty: "Hard",
    totalQuestions: { $gte: showCount },
    questions: { $exists: true, $not: { $size: 0 } },
    $and: chapterPracticeScopeFilters(),
  })
    .sort({ createdAt: 1 }) // oldest canonical paper first (stable shared set)
    .limit(20)
    .lean();

  for (const doc of cachedDocs) {
    const raw = (doc.questions || []).map((value) => {
      const plain = typeof value.toObject === "function" ? value.toObject() : { ...value };
      return pickBilingualQuestionFields({ ...plain, userAnswer: null, timeSpent: 0 });
    });
    const ready = filterStudentReadyQuestions(dedupeQuestionsByStem(dedupeQuestions(raw)));
    if (ready.length < showCount) continue;

    // Exact shared set (no reshuffle) so every student sees the same Module Final
    const picked = ready.slice(0, showCount);
    console.log(
      `[moduleFinal] SHARED CACHE HIT → ${picked.length}Q from test ${doc._id} (module=${moduleId}) — 0 LLM`
    );
    return saveClone(picked, {
      fromCache: true,
      fromChapterBank: true,
      bankCount: picked.length,
      generatedCount: 0,
      source: "shared_module_final_cache",
      sourceTestId: String(doc._id),
    });
  }

  // 3) Cache miss — build from chapter bank + RAG (first student only)
  const topicNames = (chapterLabels || [])
    .map((line) => parseChapterPreviewLine(line).topicName)
    .map((t) => String(t || "").trim())
    .filter(Boolean);

  if (!topicNames.length) {
    const err = new Error("No chapters found for this module");
    err.status = 400;
    throw err;
  }

  const topicOr = topicNames.map((name) => ({
    topic: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
  }));

  const tests = await Test.find({
    examType: "GS",
    difficulty: "Hard",
    questions: { $exists: true, $not: { $size: 0 } },
    $or: topicOr,
    $and: chapterPracticeScopeFilters(),
  })
    .sort({ createdAt: -1 })
    .limit(60)
    .lean();

  const chapterTests = tests.filter((t) => !/module final/i.test(String(t.topic || "")));
  const ordered = [
    ...chapterTests.filter((t) => String(t.userId || "") === String(userId)),
    ...chapterTests.filter((t) => String(t.userId || "") !== String(userId)),
  ];

  const topicKeySet = new Set(topicNames.map((n) => n.toLowerCase()));
  const pool = [];
  for (const t of ordered) {
    const key = String(t.topic || "").trim().toLowerCase();
    if (!topicKeySet.has(key)) continue;
    for (const q of t.questions || []) {
      const plain = typeof q.toObject === "function" ? q.toObject() : { ...q };
      pool.push(pickBilingualQuestionFields({ ...plain, userAnswer: null }));
    }
  }

  let bankUnique = filterStudentReadyQuestions(dedupeQuestionsByStem(dedupeQuestions(pool)));
  const bankTeaching = bankUnique.filter((q) => hasTeachingExplanation(q));
  if (bankTeaching.length >= Math.min(20, Math.floor(showCount * 0.4))) {
    bankUnique = [
      ...bankTeaching,
      ...bankUnique.filter((q) => !hasTeachingExplanation(q)),
    ];
  }

  console.log(
    `[moduleFinal] CACHE MISS ${moduleId}: topics=${topicNames.length}, pool=${pool.length}, bank=${bankUnique.length} (teaching=${bankTeaching.length}), need=${showCount}`
  );

  let combined = filterStudentReadyQuestions([...bankUnique]);
  let generatedCount = 0;
  let fromGeneration = false;

  if (combined.length < showCount) {
    const need = showCount - combined.length;
    const topUp = await generateModuleFinalTopUp({
      kbSubject,
      topicNames,
      need,
      excludeQuestions: bankUnique,
    });
    combined = filterStudentReadyQuestions(
      dedupeQuestionsByStem(dedupeQuestions([...bankUnique, ...topUp]))
    );
    generatedCount = Math.max(0, combined.length - bankUnique.length);
    fromGeneration = generatedCount > 0;
    console.log(
      `[moduleFinal] after RAG top-up: bank=${bankUnique.length} + generated≈${generatedCount} → ${combined.length}`
    );
  }

  const weakCount = combined.filter((q) => !hasTeachingExplanation(q)).length;
  if (weakCount > Math.floor(showCount * 0.3) && combined.length >= Math.min(showCount, 10)) {
    console.log(`[moduleFinal] ${weakCount} weak explanations — RAG refresh`);
    const extra = await generateModuleFinalTopUp({
      kbSubject,
      topicNames,
      need: Math.min(20, weakCount),
      excludeQuestions: combined,
    });
    if (extra.length) {
      const teachingExtra = extra.filter((q) => hasTeachingExplanation(q));
      combined = filterStudentReadyQuestions(
        dedupeQuestionsByStem(
          dedupeQuestions([
            ...combined.filter((q) => hasTeachingExplanation(q)),
            ...teachingExtra,
            ...combined,
            ...extra,
          ])
        )
      );
      fromGeneration = true;
      generatedCount += teachingExtra.length;
    }
  }

  if (combined.length < showCount) {
    const err = new Error(
      `Could not build a ${showCount}Q module final from Knowledge Base (have ${combined.length}` +
        `${bankUnique.length ? `: ${bankUnique.length} chapter bank` : ""}` +
        `${generatedCount ? ` + ${generatedCount} RAG` : ""}). Sync notes/PDFs for this module, then retry.`
    );
    err.status = 400;
    throw err;
  }

  // First generation: shuffle once to build the canonical shared paper
  let picked = [...combined]
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .slice(0, showCount)
    .map(({ value }) => value);

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (apiKey) {
    try {
      picked = await ensurePrelimsExplanationsPracticeStyle(apiKey, picked);
      console.log(`[moduleFinal] polished ${picked.length} explanations (canonical paper)`);
    } catch (err) {
      console.warn("[moduleFinal] explanation polish failed:", err?.message || err);
    }
  }

  console.log(
    `[moduleFinal] created CANONICAL ${picked.length}Q (bank=${bankUnique.length}, RAG=${generatedCount}, fromGeneration=${fromGeneration})`
  );

  return saveClone(picked, {
    fromCache: false,
    fromChapterBank: bankUnique.length > 0,
    fromGeneration,
    bankCount: bankUnique.length,
    generatedCount,
    source: fromGeneration ? "knowledge_base_rag" : "chapter_bank",
  });
}

/**
 * Past chapter practice attempts for one student + topic (retakes included).
 * Excludes prelims mocks / assigned practice papers.
 */
export async function listChapterPracticeHistory({ userId, topicName, limit = 20 }) {
  const topicNormalized = String(topicName || "").trim().replace(/\s+/g, " ");
  if (!userId || !topicNormalized) return [];

  const topicRegex = new RegExp(
    `^${topicNormalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
    "i"
  );

  return Test.find({
    userId,
    topic: topicRegex,
    examType: "GS",
    $and: [
      { $or: [{ prelimsMockId: null }, { prelimsMockId: { $exists: false } }] },
      { $or: [{ assignedPracticeTestId: null }, { assignedPracticeTestId: { $exists: false } }] },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(Math.min(50, Math.max(1, Number(limit) || 20)))
    .select(
      "_id subject topic difficulty totalQuestions score accuracy isSubmitted createdAt correctAnswers wrongAnswers"
    )
    .lean();
}

/**
 * All chapter / module-final practice attempts for a student's assigned modules.
 */
export async function listMyModuleTargetsPracticeHistory({
  userId,
  topicNames = [],
  moduleFinalTopics = [],
  limit = 40,
}) {
  if (!userId) return [];

  const topics = [
    ...new Set(
      [...topicNames, ...moduleFinalTopics]
        .map((t) => String(t || "").trim().replace(/\s+/g, " "))
        .filter(Boolean)
    ),
  ];
  if (!topics.length) return [];

  const topicOr = topics.map((name) => ({
    topic: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
  }));

  const rows = await Test.find({
    userId,
    examType: "GS",
    $or: topicOr,
    $and: chapterPracticeScopeFilters(),
  })
    .sort({ createdAt: -1 })
    .limit(Math.min(200, Math.max(1, Number(limit) || 100)))
    .select(
      "_id subject topic difficulty totalQuestions score accuracy isSubmitted createdAt correctAnswers wrongAnswers"
    )
    .lean();

  // Keep every submitted attempt; only the latest unsubmitted per topic (no duplicate In progress cards)
  const seenOpenTopic = new Set();
  const staleOpenIds = [];
  const deduped = [];
  for (const row of rows) {
    const key = String(row.topic || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
    if (!row.isSubmitted) {
      if (seenOpenTopic.has(key)) {
        staleOpenIds.push(row._id);
        continue;
      }
      seenOpenTopic.add(key);
    }
    deduped.push(row);
  }

  // Drop older unfinished duplicates left from pre-fix "Start Test" clicks
  if (staleOpenIds.length > 0) {
    void Test.deleteMany({ _id: { $in: staleOpenIds }, userId, isSubmitted: false }).catch((err) =>
      console.warn("[chapterHistory] stale cleanup:", err.message)
    );
  }

  return deduped;
}
