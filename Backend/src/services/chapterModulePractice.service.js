/**
 * Student Module Targets → chapter practice:
 * - Generate 25 Hard Prelims MCQs (5×5 batches) from Admin Knowledge Base (RAG), show 20
 * - Prefetch related UPSC topics for the *next* chapter into cache
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
} from "../services/testGenerationService.js";
import { pickBilingualQuestionFields, filterStudentReadyQuestions } from "../services/questionTranslationService.js";
import { searchKnowledgeBase } from "../rag/services/search.service.js";
import { generateQuestionsFromRag } from "../rag/services/questionGen.service.js";
import { mapBilingualQuestionForClient } from "../services/bilingualQuestionStorage.js";

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
      count: 25,
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
 * Create (or reuse-from-cache) a chapter practice test from Knowledge Base RAG.
 * Generates 25Q in 5×5 batches so ~5 extras absorb near-duplicates after dedupe,
 * then shows 20 unique questions to the student.
 */
export async function createChapterPracticeTest({
  userId,
  kbSubject,
  topicName,
  chapterLabel,
}) {
  const topicNormalized = String(topicName || "").trim().replace(/\s+/g, " ");
  const testSubject = resolveTestSubject(kbSubject);
  const difficulty = "Hard";
  const GENERATE_COUNT = 25; // 20 show + 5 buffer for duplicate filter
  const SHOW_COUNT = 20;
  const BATCH_SIZE = 5;

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

  // Reuse prior GS Hard paper for same subject+topic (shuffle, take 20 unique)
  const topicRegex = new RegExp(
    `^${topicNormalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
    "i"
  );
  const existingTest = await Test.findOne({
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
  }).sort({ createdAt: -1 });

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
    if (cached.length >= SHOW_COUNT) {
      fromCache = true;
      questions = [...cached]
        .map((value) => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .slice(0, SHOW_COUNT)
        .map(({ value }) => value);
      console.log(
        `[chapterPractice] cache hit → ${questions.length} unique shown (topic="${topicNormalized}")`
      );
    } else {
      console.warn(
        `[chapterPractice] cache had blank/incomplete stems (${cached.length}/${SHOW_COUNT} usable) — regenerating`
      );
    }
  }

  if (!fromCache) {
    console.log(
      `[chapterPractice] generate ${GENERATE_COUNT}Q (5 extra for duplicate filter) in ${BATCH_SIZE}×${Math.ceil(GENERATE_COUNT / BATCH_SIZE)} batches → show ${SHOW_COUNT} unique`
    );
    const generationResult = await generateTestQuestions({
      subjects: [kbSubject],
      topic: topicNormalized,
      examType: "GS",
      questionCount: GENERATE_COUNT,
      difficulty,
      batchSize: BATCH_SIZE,
      minAcceptable: SHOW_COUNT,
    });

    if (!generationResult.success || !generationResult.questions?.length) {
      const err = new Error(
        generationResult.error ||
          `No Knowledge Base content found for "${topicNormalized}" under ${kbSubject}. Upload/sync notes in Admin → Knowledge Base.`
      );
      err.status = 400;
      throw err;
    }

    const rawPool = generationResult.questions.map((q) => pickBilingualQuestionFields(q));
    const pool = filterStudentReadyQuestions(uniquePool(rawPool));

    if (pool.length < SHOW_COUNT) {
      const err = new Error(
        `After removing duplicates/blank stems only ${pool.length} unique questions remain for "${topicNormalized}" (need ${SHOW_COUNT}). Sync more Knowledge Base content or try again.`
      );
      err.status = 400;
      throw err;
    }

    // Shuffle unique pool, take 20 for the student paper
    questions = [...pool]
      .map((value) => ({ value, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .slice(0, SHOW_COUNT)
      .map(({ value }) => value);

    console.log(
      `[chapterPractice] raw ${rawPool.length} → unique ${pool.length} → showing ${questions.length} (no duplicates)`
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
      questions: test.questions.map((q) =>
        mapBilingualQuestionForClient(q, { includeAnswers: false })
      ),
      createdAt: test.createdAt,
      fromCache,
      chapterLabel: chapterLabel || topicNormalized,
      kbSubject,
      generatedCount: GENERATE_COUNT,
      shownCount: SHOW_COUNT,
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
      });
      if (!generationResult.success || !generationResult.questions?.length) continue;
      const mapped = generationResult.questions.map((q) => pickBilingualQuestionFields(q));
      fresh.push(...filterOutPriorRepeats(mapped, fingerprints));
    }
  }

  return dedupeQuestionsByStem(dedupeQuestions(fresh));
}

/**
 * Module Final (50Q): reuse unique chapter-bank questions from DB,
 * then RAG-generate only the shortfall so the paper always reaches showCount.
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

  // Prefer this student's chapter papers; also allow shared bank for same topics
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

  // Prefer this student's papers, then others
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

  const bankUnique = filterStudentReadyQuestions(dedupeQuestionsByStem(dedupeQuestions(pool)));
  console.log(
    `[moduleFinal] ${moduleId}: chapter topics=${topicNames.length}, pool=${pool.length}, bankUnique=${bankUnique.length}, need=${showCount}`
  );

  if (bankUnique.length === 0) {
    const err = new Error(
      `No saved chapter questions for module final. Finish chapter tests first.`
    );
    err.status = 400;
    throw err;
  }

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
      `[moduleFinal] after top-up: bank=${bankUnique.length} + generated≈${generatedCount} → combined=${combined.length}`
    );
  }

  if (combined.length < showCount) {
    const err = new Error(
      `Could not build a ${showCount}Q module final (have ${combined.length}: ${bankUnique.length} from chapter bank` +
        `${generatedCount ? ` + ${generatedCount} newly generated` : ""}). Try again or sync more Knowledge Base content.`
    );
    err.status = 400;
    throw err;
  }

  const picked = [...combined]
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .slice(0, showCount)
    .map(({ value }) => value);

  const finalTopic = `${moduleId} Module Final — ${moduleName}`.trim();
  const test = new Test({
    userId,
    subject: testSubject,
    examType: "GS",
    topic: finalTopic,
    difficulty: "Hard",
    questions: picked,
    totalQuestions: picked.length,
  });
  await test.save();

  console.log(
    `[moduleFinal] created ${picked.length}Q (bank=${Math.min(bankUnique.length, showCount)}, generated=${Math.max(0, picked.length - Math.min(bankUnique.length, showCount))}, fromGeneration=${fromGeneration})`
  );

  return {
    test: {
      _id: test._id,
      subject: test.subject,
      examType: test.examType,
      topic: test.topic,
      difficulty: test.difficulty,
      totalQuestions: test.totalQuestions,
      questions: test.questions.map((q) =>
        mapBilingualQuestionForClient(q, { includeAnswers: false })
      ),
      createdAt: test.createdAt,
      fromChapterBank: true,
      fromGeneration,
      bankCount: bankUnique.length,
      generatedCount,
      moduleId,
      moduleName,
      poolSize: combined.length,
    },
  };
}
