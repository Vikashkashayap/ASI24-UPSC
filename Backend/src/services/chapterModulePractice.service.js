/**
 * Student Module Targets → chapter practice:
 * - Generate 30 Hard MCQs from Admin Knowledge Base RAG only (kbOnly)
 * - Show 20 unique questions (teaching explanations: correct + all wrong options)
 * - Prefetch related UPSC topics for the *next* chapter into cache
 * Module Final (50Q): chapter bank + RAG top-up from same KB, polished explanations
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
import { mapBilingualQuestionForClient } from "../services/bilingualQuestionStorage.js";
import { ALL_PATTERN_IDS } from "../config/questionPatterns.js";

const SYLLABUS_KEY_TO_KB_SUBJECT = {
  polity: "Polity",
  ancient: "History",
  medieval: "History",
  modern: "History",
  postind: "History",
  worldhist: "History",
  artculture: "Art & Culture",
  indgeo: "Geography",
  worldgeo: "Geography",
  economy: "Economy",
  environment: "Environment",
  ir: "International Relations",
  intsec: "Internal Security",
  society: "Society",
  governance: "Governance",
  socialjustice: "Governance",
  ethics: "Ethics",
  scitech: "Science & Tech",
};

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

export function resolveKbSubject(subjectKey, subjectName) {
  const key = String(subjectKey || "").trim().toLowerCase();
  if (SYLLABUS_KEY_TO_KB_SUBJECT[key]) return SYLLABUS_KEY_TO_KB_SUBJECT[key];
  const name = String(subjectName || "").trim();
  if (!name) return "Polity";
  const mapped = Object.values(SYLLABUS_KEY_TO_KB_SUBJECT).find(
    (s) => s.toLowerCase() === name.toLowerCase()
  );
  return mapped || name;
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

  const buckets = new Map(ALL_PATTERN_IDS.map((id) => [id, []]));
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
  while (picked.length < showCount && guard < showCount * ALL_PATTERN_IDS.length + 20) {
    guard += 1;
    let added = false;
    for (const id of ALL_PATTERN_IDS) {
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
 */
export async function warmChapterQuestionCache({ kbSubject, topicName }) {
  try {
    await generateQuestionsFromRag({
      subject: kbSubject,
      topic: topicName,
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
export async function prefetchNextChapter({
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
 * Generate 30 Hard MCQs from Admin Knowledge Base RAG only (kbOnly),
 * then show 20 unique questions with teaching explanations (all options).
 *
 * Retake / forceCache: always reuse the saved paper for this topic from DB
 * (same student's prior attempt first, else any prior GS Hard paper).
 */
export async function createChapterPracticeTest({
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
  const baseCacheQuery = {
    subject: testSubject,
    topic: topicRegex,
    difficulty,
    examType: "GS",
    totalQuestions: { $gte: SHOW_COUNT },
    questions: { $exists: true, $not: { $size: 0 } },
    $and: [
      { $or: [{ prelimsMockId: null }, { prelimsMockId: { $exists: false } }] },
      { $or: [{ assignedPracticeTestId: null }, { assignedPracticeTestId: { $exists: false } }] },
    ],
  };

  // Retake: prefer this student's own saved paper for the topic; else any prior paper
  let existingTest = null;
  if (forceCache && userId) {
    existingTest = await Test.findOne({ ...baseCacheQuery, userId }).sort({ createdAt: -1 });
  }
  if (!existingTest) {
    existingTest = await Test.findOne(baseCacheQuery).sort({ createdAt: -1 });
  }

  let questions;
  let fromCache = false;

  if (existingTest?.questions?.length >= SHOW_COUNT) {
    const cached = filterStudentReadyQuestions(
      uniquePool(
        existingTest.questions.map((value) => {
          const plain = typeof value.toObject === "function" ? value.toObject() : { ...value };
          return pickBilingualQuestionFields({ ...plain, userAnswer: null });
        })
      )
    );
    const teachingCount = cached.filter((q) => hasTeachingExplanation(q)).length;
    const teachingOk =
      cached.length >= SHOW_COUNT && teachingCount >= Math.ceil(SHOW_COUNT * 0.7);
    // Retake always reuses DB paper; first attempt still prefers teaching-quality cache
    const useCache = cached.length >= SHOW_COUNT && (forceCache || teachingOk);
    if (useCache) {
      fromCache = true;
      questions = pickBalancedPatternSet(cached, SHOW_COUNT);
      console.log(
        `[chapterPractice] cache hit → ${questions.length} unique shown (topic="${topicNormalized}", forceCache=${Boolean(forceCache)}, teaching=${teachingCount}/${cached.length})`
      );
    } else {
      console.warn(
        `[chapterPractice] cache skipped — weak/short explanations (${teachingCount}/${cached.length}) — regenerating from Admin KB RAG`
      );
    }
  }

  if (!fromCache) {
    console.log(
      `[chapterPractice] generate ${GENERATE_COUNT}Q from Admin KB RAG (kbOnly) → show ${SHOW_COUNT}`
    );
    const generationResult = await generateTestQuestions({
      subjects: [kbSubject],
      topic: topicNormalized,
      examType: "GS",
      questionCount: GENERATE_COUNT,
      difficulty,
      batchSize: BATCH_SIZE,
      minAcceptable: MIN_ACCEPTABLE,
      kbOnly: true,
    });

    if (!generationResult.success || !generationResult.questions?.length) {
      const err = new Error(
        generationResult.error ||
          `Could not generate KB/RAG questions for "${topicNormalized}" under ${kbSubject}. Sync website notes / upload PDFs in Knowledge Base, then try again.`
      );
      err.status = 400;
      throw err;
    }

    const rawPool = generationResult.questions.map((q) => pickBilingualQuestionFields(q));
    const pool = filterStudentReadyQuestions(uniquePool(rawPool));

    const hardFloor = Math.min(MIN_ACCEPTABLE, 18);
    if (pool.length < hardFloor) {
      const err = new Error(
        `Only ${pool.length} usable KB questions for "${topicNormalized}" (need ${hardFloor}+). Sync more Knowledge Base content for this topic.`
      );
      err.status = 400;
      throw err;
    }

    questions = pickBalancedPatternSet(pool, SHOW_COUNT);

    console.log(
      `[chapterPractice] RAG ${generationResult.source || "knowledge_base"}: raw ${rawPool.length} → unique ${pool.length} → showing ${questions.length}`
    );
  }

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
    test: {
      _id: test._id,
      subject: test.subject,
      examType: test.examType,
      topic: test.topic,
      difficulty: test.difficulty,
      totalQuestions: test.totalQuestions,
      durationMinutes: test.durationMinutes,
      questions: test.questions.map((q) =>
        mapBilingualQuestionForClient(q, { includeAnswers: false })
      ),
      createdAt: test.createdAt,
      fromCache,
      chapterLabel: chapterLabel || topicNormalized,
      kbSubject,
      generatedCount: GENERATE_COUNT,
      shownCount: questions.length,
      source: fromCache ? "cache" : "knowledge_base_rag",
    },
    fromCache,
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
      });
      if (!generationResult.success || !generationResult.questions?.length) continue;
      const mapped = generationResult.questions.map((q) => pickBilingualQuestionFields(q));
      fresh.push(...filterOutPriorRepeats(mapped, fingerprints));
    }
  }

  return dedupeQuestionsByStem(dedupeQuestions(fresh));
}

/**
 * Module Final (50Q): reuse chapter-bank when teaching-quality, fill shortfall from
 * Admin Knowledge Base RAG (kbOnly), polish all explanations (50–100 words, all options).
 */
export async function createModuleFinalTestFromChapterBank({
  userId,
  kbSubject,
  moduleId,
  moduleName,
  chapterLabels = [],
  showCount = 50,
}) {
  const testSubject = resolveTestSubject(kbSubject);
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
    $and: [
      { $or: [{ prelimsMockId: null }, { prelimsMockId: { $exists: false } }] },
      { $or: [{ assignedPracticeTestId: null }, { assignedPracticeTestId: { $exists: false } }] },
    ],
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
    `[moduleFinal] ${moduleId}: topics=${topicNames.length}, pool=${pool.length}, bank=${bankUnique.length} (teaching=${bankTeaching.length}), need=${showCount}`
  );

  // If no chapter bank yet, still build entirely from Admin KB RAG across module topics
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

  let picked = [...combined]
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .slice(0, showCount)
    .map(({ value }) => value);

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (apiKey) {
    try {
      picked = await ensurePrelimsExplanationsPracticeStyle(apiKey, picked);
      console.log(`[moduleFinal] polished ${picked.length} explanations (all-option teaching)`);
    } catch (err) {
      console.warn("[moduleFinal] explanation polish failed:", err?.message || err);
    }
  }

  const finalTopic = `${moduleId} Module Final — ${moduleName}`.trim();
  const test = new Test({
    userId,
    subject: testSubject,
    examType: "GS",
    topic: finalTopic,
    difficulty: "Hard",
    questions: picked,
    totalQuestions: picked.length,
    // Module Final 50Q → 1 hour; other counts scale (60 min per 50Q)
    durationMinutes: Math.max(15, Math.round((picked.length * 60) / 50)),
  });
  await test.save();

  console.log(
    `[moduleFinal] created ${picked.length}Q in ${test.durationMinutes}min (bank=${bankUnique.length}, RAG=${generatedCount}, fromGeneration=${fromGeneration})`
  );

  return {
    test: {
      _id: test._id,
      subject: test.subject,
      examType: test.examType,
      topic: test.topic,
      difficulty: test.difficulty,
      totalQuestions: test.totalQuestions,
      durationMinutes: test.durationMinutes,
      questions: test.questions.map((q) =>
        mapBilingualQuestionForClient(q, { includeAnswers: false })
      ),
      createdAt: test.createdAt,
      fromChapterBank: bankUnique.length > 0,
      fromGeneration,
      bankCount: bankUnique.length,
      generatedCount,
      moduleId,
      moduleName,
      poolSize: combined.length,
      source: "knowledge_base_rag",
    },
  };
}
