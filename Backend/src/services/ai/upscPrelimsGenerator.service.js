/**
 * Common UPSC CSE Prelims GS question generator.
 *
 * TEMP: Admin KB / RAG retrieval is paused — retrieved chunks were noisy
 * (TOC, OCR junk, thin excerpts) and produced weak MCQs. Generation now uses
 * the LLM's standard UPSC syllabus knowledge (PYQ / Vision / Insights style).
 * Re-enable RAG: set SKIP_KB_RAG_RETRIEVAL = false.
 *
 * CSAT stays on open-LLM elsewhere.
 */

import { ALL_PATTERN_IDS, PYQ_HARD_PATTERN_IDS, resolveNotesPatterns } from "../../config/questionPatterns.js";
import { SKIP_KB_RAG_RETRIEVAL } from "../../config/generationMode.js";
import { getContextForPractice } from "./kbContext.service.js";
import { generateQuestionsFromContextBatch } from "./questionGenerator.service.js";
import { questionPatternEngine } from "./questionPatternEngine.js";
import {
  buildNotesQuestionSystemPrompt,
  buildNotesQuestionUserPrompt,
} from "./promptBuilder.js";
import { pickBilingualQuestionFields } from "../questionTranslationService.js";
import { filterQuestionsByTopic } from "../qg/utils/topicRelevance.js";
import { getSyllabusPreviewForSubject } from "../syllabusTopicPool.js";

export { SKIP_KB_RAG_RETRIEVAL };

/** Real-exam GS Paper 1 subject mix (admin Prelims Mock). */
export const UPSC_GS_MIX_SUBJECTS = [
  "Polity",
  "History",
  "Geography",
  "Economy",
  "Environment",
  "Science & Tech",
  "Art & Culture",
  "Current Affairs",
];

/** Fallback topic angles when syllabus JSON has no entries for a subject. */
const FALLBACK_TOPICS = {
  Polity: [
    "Constitutional framework and Preamble",
    "Fundamental Rights and DPSPs",
    "Parliament and State Legislature",
    "Judiciary and judicial review",
    "Federalism and Centre-State relations",
    "Constitutional and non-constitutional bodies",
    "Local self-government and elections",
    "Emergency provisions and amendment procedure",
  ],
  History: [
    "Ancient India polity and culture",
    "Medieval India administration and culture",
    "Modern India — Company rule to 1857",
    "Freedom Struggle 1857–1947",
    "Post-Independence consolidation",
    "Social and religious reform movements",
  ],
  Geography: [
    "Physiography of India",
    "Climate monsoon and drainage",
    "Soils agriculture and resources",
    "Population and urbanization",
    "World geography and map-based locations",
    "Environment geography disasters",
  ],
  Economy: [
    "National income and growth",
    "Money banking and monetary policy",
    "Fiscal policy budget and taxation",
    "Inflation unemployment poverty",
    "External sector trade and BoP",
    "Agriculture industry and infrastructure",
  ],
  Environment: [
    "Ecology ecosystems and biodiversity",
    "Climate change and international conventions",
    "Pollution waste and environmental laws",
    "Protected areas wildlife and conservation",
    "Sustainable development and renewable energy",
  ],
  "Science & Tech": [
    "Space technology and ISRO missions",
    "Biotechnology and health science",
    "ICT AI and cybersecurity",
    "Nuclear energy and defence tech",
    "Emerging technologies and applications",
  ],
  "Art & Culture": [
    "Indian architecture and temple styles",
    "Classical dance music and theatre",
    "Painting schools and sculpture",
    "Literature languages and philosophy",
    "UNESCO heritage and cultural institutions",
  ],
  "Current Affairs": [
    "National polity and governance current",
    "Economy schemes and budget current",
    "International relations and organisations",
    "Environment climate and science current",
    "Social issues and government schemes",
  ],
};

function normalizeDifficulty(difficulty) {
  const d = String(difficulty || "moderate").toLowerCase();
  if (d === "easy") return "easy";
  if (d === "hard") return "hard";
  return "moderate";
}

function isRagEnabled() {
  if (SKIP_KB_RAG_RETRIEVAL) return false;
  return String(process.env.PRELIMS_USE_RAG || "true").toLowerCase() !== "false";
}

function allowOpenKnowledgeFallback() {
  return String(process.env.PRELIMS_FORCE_KB_ONLY || "").toLowerCase() !== "true";
}

function questionFingerprint(q) {
  return String(q.question_en || q.question || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097f]+/g, " ")
    .trim()
    .slice(0, 140);
}

function dedupeByStem(questions = []) {
  const seen = new Set();
  const out = [];
  for (const q of questions) {
    const key = questionFingerprint(q);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(q);
  }
  return out;
}

function parseSubjects(subject) {
  if (Array.isArray(subject)) {
    return subject.map((s) => String(s || "").trim()).filter(Boolean);
  }
  return String(subject || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Topic names for a GS subject — syllabus JSON first, then curated fallbacks.
 */
export function getUpscTopicsForSubject(subject, limit = 12) {
  const name = String(subject || "").trim();
  if (!name) return [];

  const fromSyllabus = (getSyllabusPreviewForSubject(name, limit) || [])
    .map((t) => String(t.topicName || "").trim())
    .filter(Boolean);

  if (fromSyllabus.length) return fromSyllabus.slice(0, limit);

  // History has multiple syllabus files — try related keys via preview
  if (/history/i.test(name)) {
    const merged = [];
    for (const key of ["History", "Ancient History", "Medieval History", "Modern History"]) {
      for (const t of getSyllabusPreviewForSubject(key, 6) || []) {
        const n = String(t.topicName || "").trim();
        if (n && !merged.includes(n)) merged.push(n);
      }
    }
    if (merged.length) return merged.slice(0, limit);
  }

  const fallback = FALLBACK_TOPICS[name] || FALLBACK_TOPICS[Object.keys(FALLBACK_TOPICS).find((k) => k.toLowerCase() === name.toLowerCase())];
  if (fallback?.length) return fallback.slice(0, limit);

  return [`${name} core concepts for UPSC Prelims`];
}

/**
 * Build balanced { subject, topic, count } slices for a full / sectional paper.
 */
export function buildUpscPaperTopicPlan({
  mode = "mix",
  subjects = [],
  questionCount = 100,
} = {}) {
  const count = Math.max(1, Math.min(100, parseInt(questionCount, 10) || 100));
  const subjectList =
    mode === "subject"
      ? parseSubjects(subjects).length
        ? parseSubjects(subjects)
        : ["Polity"]
      : UPSC_GS_MIX_SUBJECTS.slice();

  /** Prefer ~8–12 Q per topic slice so RAG context stays focused */
  const targetSliceSize = count >= 80 ? 10 : count >= 40 ? 8 : Math.max(5, Math.ceil(count / 6));
  const slices = [];

  const topicsBySubject = new Map();
  for (const sub of subjectList) {
    topicsBySubject.set(sub, getUpscTopicsForSubject(sub, 16));
  }

  let remaining = count;
  let subjectIdx = 0;
  const topicCursor = new Map(subjectList.map((s) => [s, 0]));

  while (remaining > 0) {
    const subject = subjectList[subjectIdx % subjectList.length];
    const topics = topicsBySubject.get(subject) || [`${subject} UPSC Prelims`];
    const ti = topicCursor.get(subject) || 0;
    const topic = topics[ti % topics.length];
    topicCursor.set(subject, ti + 1);

    const take = Math.min(targetSliceSize, remaining);
    slices.push({ subject, topic, count: take });
    remaining -= take;
    subjectIdx += 1;

    // Safety: never infinite-loop
    if (slices.length > 40) break;
  }

  // If we overshot due to rounding, trim last slice
  let sum = slices.reduce((a, s) => a + s.count, 0);
  while (sum > count && slices.length) {
    const last = slices[slices.length - 1];
    const cut = Math.min(last.count - 1, sum - count);
    if (cut <= 0 || last.count <= 1) {
      sum -= last.count;
      slices.pop();
      continue;
    }
    last.count -= cut;
    sum -= cut;
  }

  return slices;
}

/**
 * Generate on-topic UPSC Prelims MCQs for ONE subject+topic via KB+RAG+LLM.
 * Shared by Topic Practice path consumers and mock-paper orchestration.
 */
export async function generateUpscPrelimsQuestionsForTopic({
  subject,
  topic,
  questionCount = 10,
  difficulty = "moderate",
  patternsToInclude = [],
  allowOpenKnowledge = true,
  batchIndexOffset = 0,
} = {}) {
  const primarySubject = String(subject || "").trim();
  const topicQuery = String(topic || "").trim();
  const count = Math.max(1, Math.min(30, parseInt(questionCount, 10) || 10));
  const difficultyKey = normalizeDifficulty(difficulty);
  const selectedPatterns = resolveNotesPatterns(
    patternsToInclude?.length
      ? patternsToInclude
      : difficultyKey === "hard"
        ? PYQ_HARD_PATTERN_IDS
        : ALL_PATTERN_IDS
  );
  const openAllowed =
    SKIP_KB_RAG_RETRIEVAL ||
    (Boolean(allowOpenKnowledge) && allowOpenKnowledgeFallback());

  if (!primarySubject || !topicQuery) {
    throw new Error("subject and topic are required for UPSC Prelims generation");
  }

  const planState = questionPatternEngine.createPlan({
    questionCount: count + Math.min(4, count),
    patternsToInclude: selectedPatterns,
  });

  const batchSize = Math.min(
    count,
    Math.max(5, parseInt(process.env.TEST_GEN_BATCH_SIZE, 10) || 8),
    parseInt(process.env.QG_MAX_QUESTIONS_PER_CALL, 10) || 10
  );

  // TEMP: RAG retrieval commented — LLM open-syllabus only
  let preferOpen = true;
  /*
  const probe = await getContextForPractice({
    subject: primarySubject,
    topic: topicQuery,
    batchIndex: batchIndexOffset,
  });
  const probeOk = Boolean(probe.contextText && probe.contextText.length >= 80);
  preferOpen = !probeOk && openAllowed;
  */
  if (SKIP_KB_RAG_RETRIEVAL) {
    console.log(
      `🤖 UPSC Prelims (LLM, RAG off): ${count}Q | ${primarySubject} | "${topicQuery}"`
    );
  }
  const usedChunkIds = new Set();
  let validated = [];
  let openUsed = preferOpen;
  const maxRounds = Math.ceil(count / batchSize) + 4;
  let stall = 0;

  const runBatch = async ({ need, round, openKnowledge, contextText, ragSource }) => {
    const askCount = Math.min(10, Math.max(need, Math.ceil(need * 1.3)));
    const batchResult = await generateQuestionsFromContextBatch({
      contextText: openKnowledge ? "" : contextText,
      topic: topicQuery,
      difficulty: difficultyKey,
      batchSize: askCount,
      patternsToInclude: selectedPatterns,
      batchIndex: batchIndexOffset + round,
      generationPlan: questionPatternEngine.nextBatchPlan({
        plan: planState,
        batchSize: askCount,
      }),
      subject: primarySubject,
      chapter: "",
      ragOptimized: !openKnowledge,
      openKnowledge,
    });

    if (!batchResult?.success || !batchResult.questions?.length) return [];

    const mapped = batchResult.questions.slice(0, askCount).map((q) =>
      pickBilingualQuestionFields({
        ...q,
        topic: q.topic || topicQuery,
        subject: q.subject || primarySubject,
        conceptualSource:
          q.conceptualSource ||
          q.sourceParagraph ||
          (openKnowledge ? "open_knowledge" : ragSource || "kb"),
      })
    );

    let onTopic = filterQuestionsByTopic(mapped, topicQuery, {
      soft: Boolean(openKnowledge),
    });
    if (
      !openKnowledge &&
      mapped.length > 0 &&
      onTopic.dropped > 0 &&
      onTopic.questions.length < Math.ceil(mapped.length * 0.5)
    ) {
      const softPass = filterQuestionsByTopic(mapped, topicQuery, { soft: true });
      if (softPass.questions.length > onTopic.questions.length) onTopic = softPass;
    }
    return onTopic.questions;
  };

  for (let round = 0; validated.length < count && round < maxRounds; round += 1) {
    const before = validated.length;
    const need = Math.min(batchSize, count - validated.length);
    let openKnowledge = preferOpen;
    let contextText = "";
    let ragSource = "";

    if (!openKnowledge && !SKIP_KB_RAG_RETRIEVAL) {
      const rag = await getContextForPractice({
        subject: primarySubject,
        topic: topicQuery,
        batchIndex: batchIndexOffset + round,
        excludeChunkIds: [...usedChunkIds],
      });
      for (const id of rag.chunkIds || []) usedChunkIds.add(id);
      if (!rag.contextText || rag.contextText.length < 80) {
        if (!openAllowed) {
          stall += 1;
          if (stall >= 4) break;
          continue;
        }
        openKnowledge = true;
        preferOpen = true;
        openUsed = true;
      } else {
        contextText = rag.contextText;
        ragSource = rag.source || "knowledge_intelligence";
      }
    } else {
      openKnowledge = true;
      preferOpen = true;
      openUsed = true;
    }

    let kept = await runBatch({ need, round, openKnowledge, contextText, ragSource });

    if (!kept.length && !openKnowledge && openAllowed) {
      openUsed = true;
      preferOpen = true;
      kept = await runBatch({
        need,
        round,
        openKnowledge: true,
        contextText: "",
        ragSource: "",
      });
    }

    if (!kept.length) {
      stall += 1;
      if (stall >= 4) break;
      continue;
    }

    validated = dedupeByStem([...validated, ...kept]).slice(0, count);
    if (validated.length === before) stall += 1;
    else stall = 0;
  }

  // Open-syllabus top-up so papers never stall empty when KB is thin
  if (validated.length < count && openAllowed) {
    const topUpRounds = Math.min(4, Math.ceil((count - validated.length) / batchSize) + 1);
    for (let i = 0; i < topUpRounds && validated.length < count; i += 1) {
      const need = Math.min(batchSize, count - validated.length);
      const kept = await runBatch({
        need,
        round: maxRounds + i,
        openKnowledge: true,
        contextText: "",
        ragSource: "",
      });
      if (!kept.length) continue;
      openUsed = true;
      validated = dedupeByStem([...validated, ...kept]).slice(0, count);
    }
  }

  return {
    success: validated.length > 0,
    questions: validated,
    count: validated.length,
    source: SKIP_KB_RAG_RETRIEVAL || openUsed ? "llm_upsc_prelims" : "knowledge_base",
    subject: primarySubject,
    topic: topicQuery,
  };
}

/**
 * Full / sectional GS mock paper — same UPSC LLM generator as Topic Practice.
 * @param {"subject"|"mix"|"pyo"} [opts.mode]
 */
export async function generateUpscPrelimsMockPaper({
  mode = "mix",
  subject = "",
  subjects = [],
  questionCount = 100,
  difficulty = "moderate",
  patternsToInclude = [],
  excludeSnippets = [],
  yearFrom,
  yearTo,
  testName,
} = {}) {
  const displayCount = Math.min(100, Math.max(10, parseInt(questionCount, 10) || 100));
  const subjectList = parseSubjects(subjects.length ? subjects : subject);
  const paperMode = mode === "subject" || mode === "pyo" ? mode : "mix";

  const plan = buildUpscPaperTopicPlan({
    mode: paperMode === "pyo" ? "mix" : paperMode,
    subjects: subjectList,
    questionCount: displayCount + Math.min(12, Math.ceil(displayCount * 0.12)),
  });

  const patterns = resolveNotesPatterns(
    patternsToInclude?.length ? patternsToInclude : ALL_PATTERN_IDS
  );
  const difficultyKey = normalizeDifficulty(difficulty);
  const excludeSet = new Set(
    (excludeSnippets || [])
      .map((s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim().slice(0, 80))
      .filter(Boolean)
  );

  console.log(
    `📚 UPSC Prelims mock (${SKIP_KB_RAG_RETRIEVAL ? "LLM open-syllabus" : "KB+RAG"}): mode=${paperMode} | target=${displayCount} | slices=${plan.length} | difficulty=${difficultyKey} | patterns=${patterns.length}`
  );

  const all = [];
  for (let i = 0; i < plan.length; i += 1) {
    const slice = plan[i];
    const stillNeed = displayCount - dedupeByStem(all).length;
    if (stillNeed <= 0) break;

    const ask = Math.min(slice.count, Math.max(stillNeed, Math.ceil(stillNeed / Math.max(1, plan.length - i))));
    console.log(
      `📚 Mock slice ${i + 1}/${plan.length}: ${slice.subject} · "${slice.topic}" · ask=${ask}`
    );

    try {
      const result = await generateUpscPrelimsQuestionsForTopic({
        subject: slice.subject,
        topic:
          paperMode === "pyo"
            ? `${slice.topic} (UPSC Prelims PYQ-style ${yearFrom || 2010}–${yearTo || 2025})`
            : slice.topic,
        questionCount: ask,
        difficulty: difficultyKey,
        patternsToInclude: patterns,
        allowOpenKnowledge: true,
        batchIndexOffset: i * 3,
      });
      if (result.questions?.length) {
        const filtered = result.questions.filter((q) => {
          const fp = questionFingerprint(q).slice(0, 80);
          if (!fp) return false;
          if (excludeSet.has(fp)) return false;
          return true;
        });
        all.push(...filtered);
      }
    } catch (err) {
      console.warn(
        `⚠️ Mock slice failed (${slice.subject}/${slice.topic}):`,
        err?.message || err
      );
    }
  }

  let unique = dedupeByStem(all);

  // Shortfall: extra open/RAG slices on under-covered subjects
  if (unique.length < displayCount) {
    const gap = displayCount - unique.length;
    const refillSubjects =
      paperMode === "subject" && subjectList.length
        ? subjectList
        : UPSC_GS_MIX_SUBJECTS;
    console.warn(
      `⚠️ UPSC mock short ${unique.length}/${displayCount} — refill ${gap} via extra topic slices`
    );
    for (let r = 0; r < 6 && unique.length < displayCount; r += 1) {
      const sub = refillSubjects[r % refillSubjects.length];
      const topics = getUpscTopicsForSubject(sub, 12);
      const topic = topics[(unique.length + r) % topics.length] || `${sub} Prelims concepts`;
      const need = Math.min(10, displayCount - unique.length);
      try {
        const result = await generateUpscPrelimsQuestionsForTopic({
          subject: sub,
          topic,
          questionCount: need,
          difficulty: difficultyKey,
          patternsToInclude: patterns,
          allowOpenKnowledge: true,
          batchIndexOffset: 100 + r * 5,
        });
        if (result.questions?.length) {
          unique = dedupeByStem([...unique, ...result.questions]);
        }
      } catch (err) {
        console.warn(`⚠️ Mock refill failed:`, err?.message || err);
      }
    }
  }

  const finalQuestions = unique.slice(0, displayCount);
  if (!finalQuestions.length) {
    return {
      success: false,
      error: "No valid UPSC questions generated. Please try again.",
      questions: [],
    };
  }

  if (finalQuestions.length < displayCount) {
    return {
      success: false,
      error: `Only ${finalQuestions.length} unique questions (need ${displayCount}). Please try again.`,
      questions: finalQuestions,
      count: finalQuestions.length,
    };
  }

  const defaultName =
    paperMode === "subject"
      ? `Prelims Mock - ${subjectList.join(", ") || "GS"}`
      : paperMode === "pyo"
        ? `Prelims Mock - PYQ Style ${yearFrom || 2010}–${yearTo || 2025}`
        : displayCount === 50
          ? "Prelims Mock - Sectional 50"
          : "Prelims Mock - Full Length GS Mix";

  console.log(
    `✅ UPSC Prelims mock ready: ${finalQuestions.length}Q via LLM (${SKIP_KB_RAG_RETRIEVAL ? "RAG off" : "KB+RAG"})`
  );

  return {
    success: true,
    questions: finalQuestions,
    count: finalQuestions.length,
    testName: testName || defaultName,
    source: SKIP_KB_RAG_RETRIEVAL ? "llm_upsc_prelims" : "kb_rag_common",
    mode: paperMode,
  };
}

/** Shared prompt accessors — same system prompt as Topic Practice. */
export function getUpscPrelimsSystemPrompt({ openKnowledge = false } = {}) {
  return buildNotesQuestionSystemPrompt({ openKnowledge });
}

export function getUpscPrelimsUserPrompt(params) {
  return buildNotesQuestionUserPrompt(params);
}

export function isUpscPrelimsRagEnabled() {
  // Still use the common UPSC generator even when KB retrieval is paused.
  if (SKIP_KB_RAG_RETRIEVAL) return true;
  return isRagEnabled();
}

export default {
  UPSC_GS_MIX_SUBJECTS,
  SKIP_KB_RAG_RETRIEVAL,
  getUpscTopicsForSubject,
  buildUpscPaperTopicPlan,
  generateUpscPrelimsQuestionsForTopic,
  generateUpscPrelimsMockPaper,
  getUpscPrelimsSystemPrompt,
  getUpscPrelimsUserPrompt,
  isUpscPrelimsRagEnabled,
};
