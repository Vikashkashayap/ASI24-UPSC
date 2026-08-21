/**
 * Premium Vision Copy Evaluation Service
 * Handwritten answer analysis via OpenRouter Gemini vision.
 * Flow: OCR → question extract → Admin Knowledge Base (Intelligence hybrid) → examiner evaluation.
 */

import {
  VISION_EVALUATION_SYSTEM_PROMPT,
  buildVisionUserPrompt,
  QUESTION_EXTRACT_SYSTEM_PROMPT,
  buildQuestionExtractUserPrompt,
  OCR_TRANSCRIBE_SYSTEM_PROMPT,
  buildOcrTranscribeUserPrompt,
} from "../prompts/copyEvaluationPrompts.js";
import {
  callOpenRouterVisionAPI,
  callOpenRouterAPI,
  parseJSONFromResponse,
} from "./openRouterService.js";
import {
  hashPages,
  fingerprintQuestion,
  getCachedOcr,
  setCachedOcr,
  setCachedModelAnswer,
  resolveSharedModelAnswer,
  getCachedFullEval,
  setCachedFullEval,
  recordCacheTokenSavings,
} from "./copyEvalTokenCache.service.js";

const MAX_RETRIES = 2;
const VISION_MAX_TOKENS = Number(process.env.COPY_EVAL_MAX_TOKENS) || 8192;
const EXTRACT_MAX_TOKENS = 512;
const OCR_MAX_TOKENS = Number(process.env.COPY_EVAL_OCR_MAX_TOKENS) || 4096;
const TEXT_EXAMINER_ENABLED =
  String(process.env.COPY_EVAL_TEXT_EXAMINER || "true").toLowerCase() !==
  "false";


const RUBRIC_CAPS = {
  understanding: 2,
  content: 3,
  analysis: 2,
  examples: 1,
  structure: 1,
  presentation: 1,
};
const RUBRIC_TOTAL = 10;

const LINE_VERDICTS = new Set([
  "CORRECT",
  "PARTIALLY_CORRECT",
  "INCORRECT",
  "IRRELEVANT",
  "INCOMPLETE",
]);

const ON_TRACK_VERDICTS = new Set([
  "ON_TRACK",
  "PARTIALLY_ON_TRACK",
  "OFF_TRACK",
]);

const toArray = (val) => {
  if (Array.isArray(val)) return val.map(String).filter(Boolean);
  if (typeof val === "string" && val.trim()) return [val.trim()];
  return [];
};

const normalizeVerdict = (v) => {
  const raw = String(v || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
  if (LINE_VERDICTS.has(raw)) return raw;
  if (raw.includes("PARTIAL")) return "PARTIALLY_CORRECT";
  if (raw.includes("INCORRECT") || raw.includes("WRONG")) return "INCORRECT";
  if (raw.includes("IRRELEVANT")) return "IRRELEVANT";
  if (raw.includes("INCOMPLETE") || raw.includes("MISSING")) return "INCOMPLETE";
  if (raw.includes("CORRECT") || raw.includes("GOOD")) return "CORRECT";
  return "";
};

const normalizeOnTrack = (v) => {
  const raw = String(v || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
  if (ON_TRACK_VERDICTS.has(raw)) return raw;
  if (raw.includes("OFF")) return "OFF_TRACK";
  if (raw.includes("PARTIAL")) return "PARTIALLY_ON_TRACK";
  if (raw.includes("ON")) return "ON_TRACK";
  return "PARTIALLY_ON_TRACK";
};

const normalizeLineFeedback = (items) => {
  if (!Array.isArray(items)) return [];
  return items
    .map((row) => ({
      studentLine: String(
        row?.studentLine ??
          row?.studentSnippet ??
          row?.line ??
          row?.text ??
          ""
      ).trim(),
      verdict: normalizeVerdict(
        row?.verdict ?? row?.lineVerdict ?? row?.status ?? ""
      ),
      examinerAnalysis: String(
        row?.examinerAnalysis ??
          row?.researchAnalysis ??
          row?.research_and_analysis ??
          row?.analysis ??
          row?.comment ??
          ""
      ).trim(),
      howToImprove: String(
        row?.howToImprove ??
          row?.improvement ??
          row?.suggestion ??
          row?.how_to_improve ??
          ""
      ).trim(),
    }))
    .filter(
      (row) =>
        row.studentLine && (row.examinerAnalysis || row.howToImprove)
    );
};

/** Split transcribed text into line/sentence units for coverage checks */
const splitStudentUnits = (text) => {
  if (!text?.trim()) return [];
  return text
    .split(/\n+|(?<=[.!?])\s+(?=[A-Z\u0900-\u097F])|(?<=[।])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);
};

const countLineFeedbackInResult = (result) => {
  if (!result) return 0;
  let n = 0;
  n += result.introduction?.lineFeedback?.length || 0;
  n += result.conclusion?.lineFeedback?.length || 0;
  for (const b of result.body || []) {
    n += b.lineFeedback?.length || 0;
  }
  return n;
};

const countExpectedLineUnits = (result) => {
  if (!result) return 0;
  const parts = [
    result.introduction?.studentText,
    ...(result.body || []).map((b) => b.studentText),
    result.conclusion?.studentText,
  ].filter(Boolean);
  if (!parts.length && result.extractedAnswerText) {
    return splitStudentUnits(result.extractedAnswerText).length;
  }
  return parts.reduce((sum, t) => sum + splitStudentUnits(t).length, 0);
};

const normalizeSection = (section, defaults = {}) => ({
  studentText: String(section?.studentText || defaults.studentText || "").trim(),
  lineFeedback: normalizeLineFeedback(section?.lineFeedback),
  analysis: toArray(section?.analysis),
  strengths: toArray(section?.strengths),
  weaknesses: toArray(section?.weaknesses),
  suggestions: toArray(section?.suggestions),
});

const normalizeBodySection = (item, index) => ({
  sectionTitle: String(item?.sectionTitle || `Section ${index + 1}`).trim(),
  studentText: String(item?.studentText || "").trim(),
  lineFeedback: normalizeLineFeedback(item?.lineFeedback),
  analysis: toArray(item?.analysis),
  strengths: toArray(item?.strengths),
  weaknesses: toArray(item?.weaknesses),
  suggestions: toArray(item?.suggestions),
});

/**
 * Detect answer script from OCR transcript (source of truth).
 * OCR's declared `language` field is only a weak hint — models often mislabel English as hi/mixed.
 * @returns {'hi'|'en'|'mixed'}
 */
export const detectAnswerLanguage = (ocr = {}, preferredLanguage = "") => {
  const pref = String(preferredLanguage || ocr.preferredLanguage || "")
    .toLowerCase()
    .trim();
  if (pref === "hi" || pref === "hindi") return "hi";
  if (pref === "en" || pref === "english") return "en";
  // "auto" / empty → detect from transcript

  const text = String(ocr.fullTranscript || ocr.questionText || "").trim();
  if (!text) {
    // No transcript — fall back to declared OCR label carefully
    const declared = String(ocr.language || "").toLowerCase().trim();
    if (declared === "hi" || declared === "hindi") return "hi";
    if (declared === "en" || declared === "english") return "en";
    return "en";
  }

  const devanagari = (text.match(/[\u0900-\u097F]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  const total = devanagari + latin;

  if (total < 8) return devanagari > latin ? "hi" : "en";

  const ratio = devanagari / total;
  // Clear Hindi medium (majority Devanagari)
  if (ratio >= 0.4) return "hi";
  // Mostly English with occasional Hindi terms / Hinglish crumbs
  if (ratio >= 0.2 && latin > 0 && latin >= devanagari) return "mixed";
  // English medium (default for Latin-dominant UPSC answers)
  return "en";
};

/**
 * Feedback output language for the examiner report.
 * Mixed (English body + few Hindi words) → English feedback.
 * Only clear Hindi medium → Hindi feedback.
 * @returns {'hi'|'en'}
 */
export const resolveFeedbackLanguage = (answerLanguage = "en") => {
  const lang = String(answerLanguage || "en").toLowerCase();
  return lang === "hi" || lang === "hindi" ? "hi" : "en";
};

/** Normalize model/improved answers — keep UPSC structure (headings + bullets). */
const formatUpscAnswerText = (text) =>
  String(text || "")
    .replace(/\r\n/g, "\n")
    // ## Heading → **Heading** (FormattedText renders bold section labels)
    .replace(/^#{1,6}\s+(.+)$/gm, "**$1**")
    // Normalize list markers
    .replace(/^\s*[-*]\s+/gm, "• ")
    // Collapse 3+ blank lines
    .replace(/\n{3,}/g, "\n\n")
    .trim();

/** Legacy alias — prefer formatUpscAnswerText for answers */
const stripMarkdown = formatUpscAnswerText;

/**
 * Enforce UPSC 10-scale rubric → marks out of maxMarks
 */
const applyRubricMarks = (rawScores, maxMarks, fallbackMarks) => {
  if (!rawScores || typeof rawScores !== "object") {
    return {
      sectionScores: null,
      marks: Math.min(Math.max(0, Number(fallbackMarks) || 0), maxMarks),
      sum10: null,
    };
  }

  const sectionScores = {};
  let sum10 = 0;
  for (const [key, cap] of Object.entries(RUBRIC_CAPS)) {
    const v = Number(rawScores[key]);
    const clamped = Number.isFinite(v) ? Math.min(Math.max(0, v), cap) : 0;
    sectionScores[key] = clamped;
    sum10 += clamped;
  }
  for (const key of ["currentAffairs", "language"]) {
    if (rawScores[key] != null) {
      sectionScores[key] = Math.min(Math.max(0, Number(rawScores[key]) || 0), 1);
    }
  }

  const scaled = (sum10 / RUBRIC_TOTAL) * maxMarks;
  const marks = Math.min(maxMarks, Math.max(0, Math.round(scaled * 2) / 2));
  return { sectionScores, marks, sum10 };
};

/**
 * Cap inflated marks when qualitative verdict says answer is not topper-level.
 * Fixes cases like 15/15 + Grade C + PARTIALLY_ON_TRACK.
 */
const reconcileMarksWithFeedback = ({
  marks,
  maxMarks,
  onTrackVerdict,
  criticalMistakes = [],
  weaknesses = [],
  missingPoints = [],
  wordLimitStatus,
  aiMarks,
}) => {
  let m = Number(marks);
  if (!Number.isFinite(m)) m = 0;
  m = Math.min(Math.max(0, m), maxMarks);

  const ai = Number(aiMarks);
  // If AI gave a lower honest mark than inflated rubric, prefer the lower one
  if (Number.isFinite(ai) && ai >= 0 && ai < m) {
    m = Math.min(m, ai);
  }

  const verdict = String(onTrackVerdict || "").toUpperCase();
  const crit = (criticalMistakes || []).filter(Boolean).length;
  const weak = (weaknesses || []).filter(Boolean).length;
  const missing = (missingPoints || []).filter(Boolean).length;

  // Hard caps by track verdict (UPSC-realistic)
  if (verdict === "OFF_TRACK") {
    m = Math.min(m, Math.round(maxMarks * 0.35 * 2) / 2); // ≤35%
  } else if (verdict === "PARTIALLY_ON_TRACK") {
    m = Math.min(m, Math.round(maxMarks * 0.72 * 2) / 2); // ≤72% (never full)
  }

  // Critical mistakes / missing content → cannot be full marks
  if (crit >= 1) {
    m = Math.min(m, maxMarks - 0.5);
  }
  if (crit >= 2) {
    m = Math.min(m, Math.round(maxMarks * 0.7 * 2) / 2);
  }
  if (missing >= 2) {
    m = Math.min(m, Math.round(maxMarks * 0.75 * 2) / 2);
  }
  if (weak >= 3) {
    m = Math.min(m, Math.round(maxMarks * 0.8 * 2) / 2);
  }

  if (wordLimitStatus === "SHORT" || wordLimitStatus === "EXCESSIVE") {
    m = Math.min(m, maxMarks - 1);
  } else if (wordLimitStatus === "LONG") {
    m = Math.min(m, maxMarks - 0.5);
  }

  // Never award 100% unless truly ON_TRACK with no critical mistakes
  if (m >= maxMarks && (verdict !== "ON_TRACK" || crit > 0 || missing > 0)) {
    m = maxMarks - 0.5;
  }

  // Round to 0.5
  m = Math.round(m * 2) / 2;
  return Math.min(Math.max(0, m), maxMarks);
};

/**
 * Scale core rubric section_scores so their 10-scale sum matches final marks.
 * Prevents UI showing 10/10 bars while overall is 4.5/15.
 */
const scaleSectionScoresToFinalMarks = (sectionScores, finalMarks, maxMarks) => {
  if (!sectionScores || typeof sectionScores !== "object") return sectionScores;
  if (!maxMarks || maxMarks <= 0) return sectionScores;

  const targetSum10 = (Number(finalMarks) / maxMarks) * RUBRIC_TOTAL;
  let currentSum = 0;
  for (const key of Object.keys(RUBRIC_CAPS)) {
    currentSum += Number(sectionScores[key]) || 0;
  }
  if (currentSum <= 0) {
    // Distribute target evenly by cap weight
    const out = { ...sectionScores };
    for (const [key, cap] of Object.entries(RUBRIC_CAPS)) {
      out[key] = Math.round(((cap / RUBRIC_TOTAL) * targetSum10) * 2) / 2;
      out[key] = Math.min(cap, Math.max(0, out[key]));
    }
    return out;
  }

  // If already close (±0.6 on 10-scale), keep as-is
  if (Math.abs(currentSum - targetSum10) < 0.6) return sectionScores;

  const factor = targetSum10 / currentSum;
  const out = { ...sectionScores };
  let assigned = 0;
  const keys = Object.keys(RUBRIC_CAPS);
  keys.forEach((key, idx) => {
    const cap = RUBRIC_CAPS[key];
    const raw = Number(sectionScores[key]) || 0;
    if (idx === keys.length - 1) {
      // Last bucket absorbs rounding residue
      const rem = Math.round((targetSum10 - assigned) * 2) / 2;
      out[key] = Math.min(cap, Math.max(0, rem));
    } else {
      const scaled = Math.round(raw * factor * 2) / 2;
      out[key] = Math.min(cap, Math.max(0, scaled));
      assigned += out[key];
    }
  });

  // Keep qualitative extras as-is (currentAffairs / language)
  return out;
};

const gradeFromMarks = (obtained, maximum) => {
  const pct = maximum > 0 ? (obtained / maximum) * 100 : 0;
  if (pct >= 80) return "A";
  if (pct >= 65) return "B";
  if (pct >= 50) return "C";
  if (pct >= 35) return "D";
  return "F";
};

const percentileFromMarks = (obtained, maximum) => {
  const pct = maximum > 0 ? (obtained / maximum) * 100 : 0;
  // Soft band estimate only — not a real cohort percentile
  return Math.min(99, Math.max(5, Math.round(pct * 0.9 + 5)));
};

/**
 * Prefer OCR transcript as extractedAnswerText when AI output drifts
 */
const preferOcrTranscript = (aiText, ocrText) => {
  const ocr = String(ocrText || "").trim();
  const ai = String(aiText || "").trim();
  if (!ocr) return ai;
  if (!ai) return ocr;
  // If AI text is much shorter than OCR, keep OCR
  if (ai.length < ocr.length * 0.5) return ocr;
  return ai;
};

/**
 * Soft-check: studentLine should appear in OCR (normalize spaces)
 */
const lineGroundedInOcr = (studentLine, ocrText) => {
  if (!ocrText?.trim() || !studentLine?.trim()) return true;
  const norm = (s) =>
    s
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[^\w\u0900-\u097F\s]/g, "")
      .trim();
  const o = norm(ocrText);
  const line = norm(studentLine);
  if (line.length < 12) return true;
  if (o.includes(line)) return true;
  // Allow partial overlap (first 40 chars)
  const snippet = line.slice(0, Math.min(40, line.length));
  return snippet.length >= 12 && o.includes(snippet);
};
/**
 * Map legacy flat evaluation JSON to premium shape
 */
export const normalizeLegacyFormat = (raw) => {
  const maxMarks = Number(raw.maxMarks) || 15;
  const marks = Number(raw.overallMarks ?? raw.marks);
  if (Number.isNaN(marks)) return null;

  return {
    questionDemand: {
      expectedPoints: toArray(raw.missingDimensions).length
        ? ["See missing dimensions below"]
        : ["Holistic answer coverage"],
      missingAreas: toArray(raw.missingDimensions),
    },
    introduction: {
      studentText: "",
      analysis: raw.contentFeedback ? [String(raw.contentFeedback)] : [],
      strengths: toArray(raw.strengths).slice(0, 3),
      weaknesses: toArray(raw.weaknesses).slice(0, 3),
      suggestions: toArray(raw.suggestions).slice(0, 3),
    },
    body: [
      {
        sectionTitle: "Main Body",
        studentText: String(raw.extractedAnswerText || "").trim(),
        strengths: toArray(raw.strengths),
        weaknesses: toArray(raw.weaknesses),
        suggestions: toArray(raw.suggestions),
      },
    ],
    conclusion: {
      studentText: "",
      analysis: raw.improvedConclusion
        ? [`Model conclusion: ${raw.improvedConclusion}`]
        : [],
      strengths: [],
      weaknesses: [],
      suggestions: [],
    },
    overallFeedback: String(raw.summary || raw.overallFeedback || "").trim(),
    marks,
    maxMarks,
    wordCount: Number(raw.wordCount) || 0,
    wordLimitStatus: raw.wordLimitStatus || "GOOD",
    examinerRemark: String(
      raw.examinerFeedback || raw.examinerRemark || ""
    ).trim(),
    onTrackVerdict: normalizeOnTrack(raw.onTrackVerdict),
    onTrackExplanation: String(raw.onTrackExplanation || "").trim(),
    criticalMistakes: toArray(raw.criticalMistakes),
    factualAccuracyNotes: String(raw.factualAccuracyNotes || "").trim(),
    knowledgeContextUsed: false,
    improvementPriority: toArray(raw.suggestions).slice(0, 5),
    modelAnswerSuggestions: raw.improvedConclusion
      ? [String(raw.improvedConclusion)]
      : [],
    questionText: String(raw.questionText || "").trim(),
    extractedAnswerText: String(raw.extractedAnswerText || "").trim(),
    answers: Array.isArray(raw.answers) ? raw.answers : [],
    constitutionalReferences: [],
    examplesDataSuggestions: [],
    presentationNotes: String(raw.presentationFeedback || "").trim(),
    overallMarks: marks,
    summary: String(raw.summary || "").trim(),
    strengths: toArray(raw.strengths),
    weaknesses: toArray(raw.weaknesses),
    missingDimensions: toArray(raw.missingDimensions),
    presentationFeedback: String(raw.presentationFeedback || "").trim(),
    contentFeedback: String(raw.contentFeedback || "").trim(),
    suggestions: toArray(raw.suggestions),
    improvedConclusion: String(raw.improvedConclusion || "").trim(),
    examinerFeedback: String(raw.examinerFeedback || "").trim(),
  };
};

/**
 * Normalize premium AI evaluation JSON + backward-compatible fields
 */
export const normalizeEvaluationResult = (raw, extras = {}) => {
  if (!raw || typeof raw !== "object") return null;

  if (
    raw.overallMarks !== undefined &&
    !raw.questionDemand &&
    raw.marks === undefined
  ) {
    const legacy = normalizeLegacyFormat(raw);
    if (legacy && extras.knowledgeMeta) {
      legacy.knowledgeContextUsed = Boolean(extras.knowledgeMeta.used);
      legacy.knowledgeMeta = extras.knowledgeMeta;
    }
    return legacy;
  }

  const maxMarks = Number(raw.maxMarks) || Number(extras.maxMarks) || 15;
  let fallbackMarks = Number(raw.marks ?? raw.overallMarks ?? raw.overall_score);
  // Allow missing marks if section_scores present (rubric will compute)
  const hasScores =
    (raw.section_scores && typeof raw.section_scores === "object") ||
    (raw.sectionScores && typeof raw.sectionScores === "object");
  if (Number.isNaN(fallbackMarks) && !hasScores) {
    fallbackMarks = Math.round(maxMarks * 0.5 * 2) / 2;
  }

  const intro = normalizeSection(raw.introduction);
  const conclusion = normalizeSection(raw.conclusion);
  const body = Array.isArray(raw.body)
    ? raw.body.map(normalizeBodySection).filter((b) => b.sectionTitle || b.studentText)
    : [];

  const questionText = String(
    raw.questionText || extras.questionExtract?.questionText || ""
  ).trim();
  const rawExtracted =
    String(raw.extractedAnswerText || "").trim() ||
    [
      intro.studentText,
      ...body.map((b) => b.studentText),
      conclusion.studentText,
    ]
      .filter(Boolean)
      .join("\n\n");
  const extractedAnswerText = preferOcrTranscript(
    rawExtracted,
    extras.ocrTranscript
  );

  const allStrengths = [
    ...intro.strengths,
    ...body.flatMap((b) => b.strengths),
    ...conclusion.strengths,
  ];
  const allWeaknesses = [
    ...intro.weaknesses,
    ...body.flatMap((b) => b.weaknesses),
    ...conclusion.weaknesses,
  ];
  const allSuggestions = [
    ...intro.suggestions,
    ...body.flatMap((b) => b.suggestions),
    ...conclusion.suggestions,
  ];

  const rawSectionScores =
    raw.section_scores && typeof raw.section_scores === "object"
      ? raw.section_scores
      : raw.sectionScores && typeof raw.sectionScores === "object"
        ? raw.sectionScores
        : null;

  const { sectionScores, marks: rubricMarks } = applyRubricMarks(
    rawSectionScores,
    maxMarks,
    Number(raw.marks ?? raw.overallMarks)
  );

  const onTrackVerdictEarly = normalizeOnTrack(raw.onTrackVerdict);
  const criticalMistakes = toArray(raw.criticalMistakes);
  const knowledgeMeta = extras.knowledgeMeta || null;

  const keywordsRaw = raw.keywords && typeof raw.keywords === "object" ? raw.keywords : {};
  const keywords = {
    expected: toArray(keywordsRaw.expected),
    covered: toArray(keywordsRaw.covered),
    missing: toArray(keywordsRaw.missing),
    extra: toArray(keywordsRaw.extra),
  };

  const nextPractice = Array.isArray(raw.next_practice || raw.nextPractice)
    ? (raw.next_practice || raw.nextPractice)
        .map((item) => ({
          type: String(item?.type || "practice"),
          title: String(item?.title || "").trim(),
          description: String(item?.description || "").trim(),
        }))
        .filter((item) => item.title)
    : [];

  const missingPointsEarly = toArray(
    raw.missing_points || raw.questionDemand?.missingAreas || raw.missingDimensions
  );
  const weaknessesEarly = allWeaknesses.length
    ? allWeaknesses
    : criticalMistakes.length
      ? criticalMistakes
      : toArray(raw.weaknesses);

  const wordLimitStatus = ["GOOD", "SHORT", "LONG", "EXCESSIVE"].includes(
    raw.wordLimitStatus
  )
    ? raw.wordLimitStatus
    : "GOOD";

  const clampedMarks = reconcileMarksWithFeedback({
    marks: rubricMarks,
    maxMarks,
    onTrackVerdict: onTrackVerdictEarly,
    criticalMistakes,
    weaknesses: weaknessesEarly,
    missingPoints: missingPointsEarly,
    wordLimitStatus,
    aiMarks: Number(raw.marks ?? raw.overallMarks ?? raw.overall_score),
  });

  // Keep section bars consistent with final marks (no 10/10 bars with low overall)
  const alignedSectionScores = scaleSectionScoresToFinalMarks(
    sectionScores,
    clampedMarks,
    maxMarks
  );

  // Always derive grade/percentile from FINAL marks (ignore inconsistent AI grade like C with 15/15)
  const grade = gradeFromMarks(clampedMarks, maxMarks);
  const confNum = Number(
    raw.confidence ?? raw.questionMeta?.confidence ?? extras.questionExtract?.confidenceScore
  );
  const extractMeta = extras.questionExtract || {};
  const confidenceResolved = Number.isFinite(confNum)
    ? confNum
    : extractMeta.confidence === "high"
      ? 90
      : extractMeta.confidence === "low"
        ? 45
        : 70;

  const paragraphFeedback = Array.isArray(
    raw.paragraph_feedback || raw.paragraphFeedback
  )
    ? (raw.paragraph_feedback || raw.paragraphFeedback).map((p, i) => ({
        paragraphIndex: Number(p?.paragraphIndex) || i + 1,
        text: String(p?.text || "").trim(),
        positives: toArray(p?.positives),
        mistakes: toArray(p?.mistakes),
        suggestions: toArray(p?.suggestions),
      }))
    : [];

  const questionMetaRaw = raw.questionMeta || {};
  const questionMeta = {
    paper: String(questionMetaRaw.paper || extras.metadata?.paper || "").trim(),
    paperType: String(
      questionMetaRaw.paperType || extractMeta.paperType || ""
    ).trim(),
    questionNumber: String(
      questionMetaRaw.questionNumber || extractMeta.questionNumber || ""
    ).trim(),
    wordLimit:
      questionMetaRaw.wordLimit ??
      extractMeta.wordLimit ??
      null,
    marks: questionMetaRaw.marks ?? extractMeta.marks ?? maxMarks,
    topic: String(questionMetaRaw.topic || extractMeta.topic || "").trim(),
    confidence: confidenceResolved,
    needsConfirmation: Boolean(
      questionMetaRaw.needsConfirmation ?? confidenceResolved < 70
    ),
  };

  const improvedAnswer = formatUpscAnswerText(
    raw.improved_answer || raw.improvedAnswer || ""
  );
  // Prefer shared/cached model answer for the same question (token saver + consistency)
  const modelAnswer = formatUpscAnswerText(
    extras.cachedModelAnswer || raw.model_answer || raw.modelAnswer || ""
  );
  const missingPoints = missingPointsEarly;

  const wordCount =
    Math.max(0, Number(raw.wordCount) || 0) ||
    Number(extras.wordCountEstimate) ||
    (extractedAnswerText
      ? extractedAnswerText.split(/\s+/).filter(Boolean).length
      : 0);

  return {
    questionDemand: {
      expectedPoints: toArray(raw.questionDemand?.expectedPoints),
      missingAreas: toArray(raw.questionDemand?.missingAreas).length
        ? toArray(raw.questionDemand?.missingAreas)
        : missingPoints,
    },
    introduction: intro,
    body: body.length
      ? body
      : [
          {
            sectionTitle: "Answer Body",
            studentText: extractedAnswerText,
            lineFeedback: [],
            analysis: [],
            strengths: allStrengths.slice(0, 5),
            weaknesses: allWeaknesses.slice(0, 5),
            suggestions: allSuggestions.slice(0, 5),
          },
        ],
    conclusion,
    overallFeedback: String(
      raw.overallFeedback ||
        raw.summary ||
        raw.examinerRemark ||
        raw.examinerFeedback ||
        "Evaluation completed based on UPSC standards."
    ).trim(),
    marks: clampedMarks,
    maxMarks,
    wordCount,
    expectedWordCount: Number(raw.expectedWordCount) || questionMeta.wordLimit || 0,
    wordLimitStatus,
    examinerRemark: String(
      raw.examinerRemark ||
        raw.examinerFeedback ||
        raw.overallFeedback ||
        raw.summary ||
        "Evaluation completed based on UPSC standards."
    ).trim(),
    onTrackVerdict: onTrackVerdictEarly || "PARTIALLY_ON_TRACK",
    onTrackExplanation: String(raw.onTrackExplanation || "").trim(),
    criticalMistakes:
      criticalMistakes.length > 0
        ? criticalMistakes
        : allWeaknesses.length > 0
          ? allWeaknesses.slice(0, 3)
          : ["Strengthen multi-dimensional analysis with relevant facts and case studies."],
    factualAccuracyNotes: String(raw.factualAccuracyNotes || "").trim(),
    knowledgeContextUsed: Boolean(knowledgeMeta?.used),
    knowledgeMeta: knowledgeMeta || undefined,
    improvementPriority: toArray(raw.improvementPriority),
    modelAnswerSuggestions: toArray(raw.modelAnswerSuggestions),
    questionText,
    extractedAnswerText,
    answers: Array.isArray(raw.answers) ? raw.answers : [],
    constitutionalReferences: toArray(raw.constitutionalReferences),
    examplesDataSuggestions: toArray(raw.examplesDataSuggestions),
    presentationNotes: String(raw.presentationNotes || raw.presentationFeedback || "").trim(),
    overallMarks: clampedMarks,
    overall_score: clampedMarks,
    summary: String(raw.overallFeedback || raw.summary || "").trim(),
    strengths: allStrengths.length ? allStrengths : toArray(raw.strengths),
    weaknesses: allWeaknesses.length
      ? allWeaknesses
      : criticalMistakes.length
        ? criticalMistakes
        : toArray(raw.weaknesses),
    missingDimensions: missingPoints,
    missing_points: missingPoints,
    coveredPoints: toArray(raw.coveredPoints || keywords.covered),
    presentationFeedback: String(
      raw.presentationNotes || raw.presentationFeedback || ""
    ).trim(),
    contentFeedback: intro.analysis.join(" ") || String(raw.contentFeedback || ""),
    suggestions: allSuggestions.length ? allSuggestions : toArray(raw.suggestions),
    improvedConclusion: conclusion.analysis.join("\n") || String(raw.improvedConclusion || ""),
    examinerFeedback: String(
      raw.examinerRemark || raw.examinerFeedback || ""
    ).trim(),
    grade,
    confidence: confidenceResolved,
    percentile: percentileFromMarks(clampedMarks, maxMarks),
    evaluationTimeSec: extras.evaluationTimeSec || undefined,
    section_scores: alignedSectionScores || {
      understanding: 1.5,
      content: 2,
      analysis: 1.5,
      examples: 0.5,
      structure: 0.5,
      presentation: 0.5,
    },
    sectionScores: alignedSectionScores || {
      understanding: 1.5,
      content: 2,
      analysis: 1.5,
      examples: 0.5,
      structure: 0.5,
      presentation: 0.5,
    },
    keywords,
    improved_answer: improvedAnswer,
    improvedAnswer,
    model_answer: modelAnswer,
    modelAnswer,
    next_practice: nextPractice,
    nextPractice,
    paragraph_feedback: paragraphFeedback,
    paragraphFeedback,
    questionMeta,
  };
};

export const validateEvaluationResult = (result) => {
  if (!result) return { valid: false, error: "Empty evaluation result" };

  if (result.marks === undefined || result.maxMarks === undefined) {
    if (result.overallMarks !== undefined) {
      result.marks = Number(result.overallMarks);
      result.maxMarks = result.maxMarks || 15;
    } else {
      return {
        valid: false,
        error: "Missing marks or maxMarks",
      };
    }
  }

  if (!result.examinerRemark?.trim() && !result.examinerFeedback?.trim()) {
    if (result.overallFeedback?.trim()) {
      result.examinerRemark = result.overallFeedback;
    } else {
      result.examinerRemark = "Detailed answer evaluation completed based on UPSC Mains standards.";
    }
  }

  if (!result.overallFeedback?.trim()) {
    result.overallFeedback = result.examinerRemark || "Evaluation completed based on UPSC standards.";
  }

  if (!result.onTrackVerdict) {
    result.onTrackVerdict = "PARTIALLY_ON_TRACK";
  }

  const scores = result.section_scores || result.sectionScores;
  if (!scores || typeof scores !== "object") {
    result.section_scores = {
      understanding: 1.5,
      content: 2,
      analysis: 1.5,
      examples: 0.5,
      structure: 0.5,
      presentation: 0.5,
    };
    result.sectionScores = result.section_scores;
  }

  return { valid: true };
};

/**
 * Soft-remove line feedback that does not appear in OCR (wrong blame prevention).
 * Returns a new object; never mutates input. If too many lines would be dropped, returns input.
 */
function groundLineFeedbackToOcr(result, ocrText) {
  if (!result || !ocrText?.trim()) return result;

  const clone = JSON.parse(JSON.stringify(result));
  const before = countLineFeedbackInResult(clone);
  const filter = (lines) =>
    (lines || []).filter((row) => lineGroundedInOcr(row.studentLine, ocrText));

  if (clone.introduction) {
    clone.introduction.lineFeedback = filter(clone.introduction.lineFeedback);
  }
  if (clone.conclusion) {
    clone.conclusion.lineFeedback = filter(clone.conclusion.lineFeedback);
  }
  for (const b of clone.body || []) {
    b.lineFeedback = filter(b.lineFeedback);
  }
  const after = countLineFeedbackInResult(clone);

  if (before >= 3 && after < Math.max(2, Math.floor(before * 0.4))) {
    console.warn(
      `⚠️ OCR grounding would remove too many lines (${before}→${after}); keeping original lineFeedback`
    );
    return result;
  }
  return clone;
}

/**
 * Pass A: Dedicated vision OCR transcription of all pages
 */
async function transcribeCopyOcr({ apiKey, model, pages, metadata, pagesHash }) {
  try {
    if (pagesHash) {
      const cached = getCachedOcr(pagesHash);
      if (cached?.fullTranscript?.trim()) {
        recordCacheTokenSavings("ocr", 6000);
        return { ...cached, fromCache: true };
      }
    }

    const imageContents = pages.map((page) => ({
      type: "image_url",
      image_url: {
        url: page.dataUrl || `data:${page.mimeType};base64,${page.base64}`,
      },
    }));

    const apiResponse = await callOpenRouterVisionAPI({
      apiKey,
      model,
      systemPrompt: OCR_TRANSCRIBE_SYSTEM_PROMPT,
      userPrompt: buildOcrTranscribeUserPrompt({
        subject: metadata.subject,
        paper: metadata.paper,
        year: metadata.year,
        pageCount: pages.length,
      }),
      images: imageContents,
      temperature: 0.05,
      maxTokens: OCR_MAX_TOKENS,
    });

    if (!apiResponse.success) {
      console.warn("⚠️ OCR transcribe failed:", apiResponse.error);
      return {
        fullTranscript: "",
        questionText: "",
        ocrConfidence: 0,
        wordCountEstimate: 0,
        pageTranscripts: [],
      };
    }

    const parsed = parseJSONFromResponse(apiResponse.content) || {};
    const fullTranscript = String(
      parsed.fullTranscript || parsed.transcript || parsed.text || ""
    ).trim();
    const pageTranscripts = Array.isArray(parsed.pageTranscripts)
      ? parsed.pageTranscripts.map(String)
      : [];
    const merged =
      fullTranscript ||
      pageTranscripts.filter(Boolean).join("\n\n");

    const ocr = {
      fullTranscript: merged,
      questionText: String(parsed.questionText || "").trim(),
      language: String(parsed.language || "").toLowerCase() || undefined,
      ocrConfidence: Number(parsed.ocrConfidence) || (merged ? 70 : 0),
      wordCountEstimate:
        Number(parsed.wordCountEstimate) ||
        (merged ? merged.split(/\s+/).filter(Boolean).length : 0),
      pageTranscripts,
      illegibleRegions: toArray(parsed.illegibleRegions),
    };
    if (pagesHash) setCachedOcr(pagesHash, ocr);
    return ocr;
  } catch (err) {
    console.warn("⚠️ OCR transcribe error:", err.message);
    return {
      fullTranscript: "",
      questionText: "",
      ocrConfidence: 0,
      wordCountEstimate: 0,
      pageTranscripts: [],
    };
  }
}

/**
 * Pass B: Extract question — prefer OCR transcript (text), fallback to vision
 */
async function extractQuestionFromPages({
  apiKey,
  model,
  pages,
  metadata,
  ocrTranscript = "",
  ocrQuestionHint = "",
}) {
  try {
    // Fast path: question already in OCR
    if (ocrQuestionHint?.trim() && ocrQuestionHint.trim().length > 20) {
      return {
        questionText: ocrQuestionHint.trim(),
        directive: "",
        wordLimit: null,
        marks: null,
        paperType: "",
        questionNumber: "",
        topic: "",
        confidence: "medium",
        confidenceScore: 75,
      };
    }

    // Text-only extract from OCR transcript (cheaper + more reliable)
    if (ocrTranscript?.trim() && ocrTranscript.trim().length > 40) {
      const textPrompt = `${buildQuestionExtractUserPrompt({
        subject: metadata.subject,
        paper: metadata.paper,
        year: metadata.year,
        pageCount: pages.length,
      })}

OCR TRANSCRIPT:
${ocrTranscript.slice(0, 4000)}`;

      const textRes = await callOpenRouterAPI({
        apiKey,
        model,
        systemPrompt: QUESTION_EXTRACT_SYSTEM_PROMPT,
        userPrompt: textPrompt,
        temperature: 0.1,
        maxTokens: EXTRACT_MAX_TOKENS,
      });

      if (textRes.success) {
        const parsed = parseJSONFromResponse(textRes.content) || {};
        const confLabel = String(parsed.confidence || "medium").toLowerCase();
        const confidenceScore =
          Number(parsed.confidenceScore) ||
          (confLabel === "high" ? 90 : confLabel === "low" ? 45 : 75);
        const q = String(parsed.questionText || "").trim();
        if (q) {
          return {
            questionText: q,
            directive: String(parsed.directive || "").trim(),
            wordLimit: parsed.wordLimit ?? null,
            marks: parsed.marks ?? null,
            paperType: String(parsed.paperType || "").trim(),
            questionNumber: String(parsed.questionNumber || "").trim(),
            topic: String(parsed.topic || "").trim(),
            confidence: confLabel,
            confidenceScore,
          };
        }
      }
    }

    const extractPages = pages.slice(0, 2);
    const imageContents = extractPages.map((page) => ({
      type: "image_url",
      image_url: {
        url: page.dataUrl || `data:${page.mimeType};base64,${page.base64}`,
      },
    }));

    const apiResponse = await callOpenRouterVisionAPI({
      apiKey,
      model,
      systemPrompt: QUESTION_EXTRACT_SYSTEM_PROMPT,
      userPrompt: buildQuestionExtractUserPrompt({
        subject: metadata.subject,
        paper: metadata.paper,
        year: metadata.year,
        pageCount: extractPages.length,
      }),
      images: imageContents,
      temperature: 0.1,
      maxTokens: EXTRACT_MAX_TOKENS,
    });

    if (!apiResponse.success) {
      console.warn("⚠️ Question extract failed:", apiResponse.error);
      return { questionText: "", directive: "", confidence: "low", confidenceScore: 40 };
    }

    const parsed = parseJSONFromResponse(apiResponse.content) || {};
    const confLabel = String(parsed.confidence || "medium").toLowerCase();
    const confidenceScore =
      Number(parsed.confidenceScore) ||
      (confLabel === "high" ? 90 : confLabel === "low" ? 45 : 70);
    return {
      questionText: String(parsed.questionText || "").trim(),
      directive: String(parsed.directive || "").trim(),
      wordLimit: parsed.wordLimit ?? null,
      marks: parsed.marks ?? null,
      paperType: String(parsed.paperType || "").trim(),
      questionNumber: String(parsed.questionNumber || "").trim(),
      topic: String(parsed.topic || "").trim(),
      confidence: confLabel,
      confidenceScore,
    };
  } catch (err) {
    console.warn("⚠️ Question extract error:", err.message);
    return { questionText: "", directive: "", confidence: "low", confidenceScore: 40 };
  }
}

const callVisionWithRetry = async ({
  apiKey,
  model,
  pages,
  metadata,
  maxMarks,
  knowledgeContext = "",
  extractedQuestionHint = "",
  knowledgeMeta = null,
  questionExtract = null,
  evaluationTimeSec,
  ocrTranscript = "",
  ocrConfidence = null,
  wordCountEstimate = null,
  answerLanguage = "en",
  feedbackLanguage = "en",
  cachedModelAnswer = "",
  textModel = null,
}) => {
  const userPrompt = buildVisionUserPrompt({
    subject: metadata.subject,
    paper: metadata.paper,
    year: metadata.year,
    pageCount: pages.length,
    maxMarks,
    knowledgeContext,
    extractedQuestionHint,
    ocrTranscript,
    ocrConfidence,
    wordCountEstimate,
    answerLanguage,
    feedbackLanguage,
    cachedModelAnswer,
  });

  const ocrOk =
    String(ocrTranscript || "").trim().length >= 80 &&
    (ocrConfidence == null || Number(ocrConfidence) >= 40);
  const useTextOnly = TEXT_EXAMINER_ENABLED && ocrOk;
  const examinerModel =
    (useTextOnly &&
      (textModel ||
        process.env.OPENROUTER_COPY_EVAL_MODEL ||
        process.env.OPENROUTER_MODEL)) ||
    model;
  const isEssay =
    String(metadata?.subject || "").toLowerCase().includes("essay") ||
    String(metadata?.paper || "").toLowerCase().includes("essay") ||
    (wordCountEstimate && wordCountEstimate > 350) ||
    pages.length >= 3;

  const baseMaxTokens = isEssay
    ? Math.max(VISION_MAX_TOKENS, 8192)
    : Math.max(VISION_MAX_TOKENS, 6144);

  const maxTokens = (cachedModelAnswer?.trim() && !isEssay)
    ? Math.min(baseMaxTokens, 6144)
    : baseMaxTokens;

  const imageContents = useTextOnly
    ? []
    : pages.map((page) => ({
        type: "image_url",
        image_url: {
          url: page.dataUrl || `data:${page.mimeType};base64,${page.base64}`,
        },
      }));

  console.log(
    `🎓 Examiner mode: ${useTextOnly ? "TEXT-ONLY (cheap)" : "VISION"} | model=${examinerModel} | maxTokens=${maxTokens}`
  );

  let lastError = "Vision API call failed";
  let lastRaw = "";
  let lastValidationHint = "";

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const retrySuffix =
      attempt > 0
        ? `\n\nIMPORTANT: Previous response failed (${lastValidationHint || "invalid/truncated JSON"}). Return ONLY one COMPACT valid JSON. NO lineFeedback. improved_answer ≤120 words.${
            cachedModelAnswer?.trim()
              ? ' Set "model_answer":"".'
              : " model_answer ≤120 words."
          }${
            feedbackLanguage === "hi"
              ? " Feedback in Hindi."
              : " Feedback in ENGLISH."
          }`
        : "";

    const apiResponse = useTextOnly
      ? await callOpenRouterAPI({
          apiKey,
          model: examinerModel,
          systemPrompt: VISION_EVALUATION_SYSTEM_PROMPT,
          userPrompt: `${userPrompt}${retrySuffix}`,
          temperature: attempt === 0 ? 0.15 : 0.08,
          maxTokens,
        })
      : await callOpenRouterVisionAPI({
          apiKey,
          model: examinerModel,
          systemPrompt: VISION_EVALUATION_SYSTEM_PROMPT,
          userPrompt: `${userPrompt}${retrySuffix}`,
          images: imageContents,
          temperature: attempt === 0 ? 0.15 : 0.08,
          maxTokens,
        });

    if (!apiResponse.success) {
      lastError = apiResponse.error || lastError;
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        continue;
      }
      return { success: false, error: lastError };
    }

    lastRaw = apiResponse.content;
    const parsed = parseJSONFromResponse(apiResponse.content);
    const normalized = normalizeEvaluationResult(parsed, {
      knowledgeMeta,
      questionExtract,
      metadata,
      evaluationTimeSec,
      ocrTranscript,
      wordCountEstimate,
      maxMarks,
      cachedModelAnswer,
    });
    const validation = validateEvaluationResult(normalized);

    if (validation.valid) {
      const grounded = groundLineFeedbackToOcr(
        normalized,
        ocrTranscript || normalized.extractedAnswerText
      );

      if (cachedModelAnswer?.trim()) {
        grounded.model_answer = formatUpscAnswerText(cachedModelAnswer);
        grounded.modelAnswerShared = true;
      }

      grounded.examinerMode = useTextOnly ? "text" : "vision";
      grounded.examinerModel = apiResponse.model || examinerModel;

      return {
        success: true,
        data: grounded,
        model: apiResponse.model,
        usage: apiResponse.usage,
        attempts: attempt + 1,
      };
    }

    lastError = validation.error || "Failed to parse AI evaluation JSON";
    lastValidationHint = lastError;
    console.warn(
      `⚠️ Vision eval attempt ${attempt + 1} invalid: ${lastError}`
    );

    if (attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, 1200));
    }
  }

  return {
    success: false,
    error: lastError,
    rawContent: lastRaw,
  };
};

/**
 * Best flow:
 * A) Vision OCR transcript
 * B) Question extract (OCR-first)
 * C) Admin Knowledge Base (Intelligence hybrid — same as /admin/knowledge_base)
 * D) LLM examiner grounded on OCR + images + MentorsDaily notes
 */
export const evaluateCopyWithVision = async ({
  pages,
  metadata = {},
  apiKey,
  model,
  textModel,
  maxMarks,
}) => {
  if (!apiKey) {
    return { success: false, error: "OPENROUTER_API_KEY is not configured" };
  }

  if (!pages?.length) {
    return { success: false, error: "No images to evaluate" };
  }

  const startedAt = Date.now();
  const visionModel =
    model ||
    process.env.OPENROUTER_VISION_MODEL ||
    process.env.OPENROUTER_MODEL ||
    "google/gemini-2.5-flash-lite";
  const examinerTextModel =
    textModel ||
    process.env.OPENROUTER_COPY_EVAL_MODEL ||
    process.env.OPENROUTER_MODEL ||
    "google/gemini-2.5-flash-lite";
  const resolvedMaxMarks = maxMarks || 15;
  const pagesHash = hashPages(pages);
  const preferredLangHint = String(metadata.language || "auto").toLowerCase();

  // Identical PDF + language + marks → reuse full result (0 new LLM tokens)
  const earlyFeedbackLang =
    preferredLangHint === "hi" || preferredLangHint === "hindi"
      ? "hi"
      : preferredLangHint === "en" || preferredLangHint === "english"
        ? "en"
        : null;
  if (earlyFeedbackLang) {
    const cachedFull = getCachedFullEval(
      pagesHash,
      resolvedMaxMarks,
      earlyFeedbackLang
    );
    if (cachedFull?.success && cachedFull?.data) {
      recordCacheTokenSavings("full-eval", 14000);
      console.log("♻️ Same file cache HIT — returning cached evaluation (0 new tokens)");
      return {
        ...cachedFull,
        data: {
          ...cachedFull.data,
          evaluationTimeSec: Math.round((Date.now() - startedAt) / 1000),
          fromCache: true,
          cacheKind: "full-eval",
        },
      };
    }
  }

  // Pass A: dedicated OCR (cached by page image hash)
  console.log("🔤 Pass A: Vision OCR transcription...");
  const ocr = await transcribeCopyOcr({
    apiKey,
    model: visionModel,
    pages,
    metadata,
    pagesHash,
  });
  console.log(
    `✅ OCR done${ocr.fromCache ? " (cache)" : ""} (confidence=${ocr.ocrConfidence}%, words≈${ocr.wordCountEstimate}, chars=${ocr.fullTranscript?.length || 0}, ocrLang=${ocr.language || "n/a"})`
  );

  const answerLanguage = detectAnswerLanguage(ocr, metadata.language);
  const feedbackLanguage = resolveFeedbackLanguage(answerLanguage);
  console.log(
    `🌐 Answer language: ${answerLanguage} → feedback language: ${feedbackLanguage}` +
      (metadata.language ? ` (user preference: ${metadata.language})` : " (auto-detect)")
  );

  // After language resolve, try full cache again (auto-detect path)
  if (!earlyFeedbackLang) {
    const cachedFull = getCachedFullEval(
      pagesHash,
      resolvedMaxMarks,
      feedbackLanguage
    );
    if (cachedFull?.success && cachedFull?.data) {
      recordCacheTokenSavings("full-eval", 14000);
      console.log("♻️ Same file cache HIT — returning cached evaluation (0 new tokens)");
      return {
        ...cachedFull,
        data: {
          ...cachedFull.data,
          evaluationTimeSec: Math.round((Date.now() - startedAt) / 1000),
          answerLanguage,
          feedbackLanguage,
          fromCache: true,
          cacheKind: "full-eval",
        },
      };
    }
  }

  // Pass B: question extract
  console.log("📝 Pass B: Question detection...");
  const extracted = await extractQuestionFromPages({
    apiKey,
    model: visionModel,
    pages,
    metadata,
    ocrTranscript: ocr.fullTranscript,
    ocrQuestionHint: ocr.questionText,
  });

  const questionText = extracted.questionText || ocr.questionText || "";
  const shared = await resolveSharedModelAnswer({
    questionText,
    subject: metadata.subject,
    feedbackLanguage,
  });
  const questionFp = shared.questionFp || fingerprintQuestion(questionText, metadata.subject);
  const cachedModelAnswer = shared.text || "";
  if (cachedModelAnswer) {
    recordCacheTokenSavings(
      `model-answer:${shared.source || "shared"}`,
      1800
    );
    console.log(
      `♻️ Reusing shared model_answer for same question (source=${shared.source})`
    );
  }

  // Pass C: Direct Pure LLM Examiner (bypassing external KB/RAG)
  const knowledgeMeta = {
    used: false,
    role: "llm_expert_evaluator",
    chunkCount: 0,
    source: "llm_direct",
    kbSubject: null,
    query: "",
    documents: [],
    extractedQuestion: extracted.questionText || "",
    ocrConfidence: ocr.ocrConfidence,
    fromCache: false,
    modelAnswerCached: Boolean(cachedModelAnswer),
  };

  // Pass D: LLM examiner evaluation grounded on OCR
  console.log(
    `🎓 Pass D: LLM examiner evaluation (OCR-grounded, direct LLM expertise, feedback=${feedbackLanguage}${
      cachedModelAnswer ? ", model_answer=cached" : ""
    })...`
  );
  const result = await callVisionWithRetry({
    apiKey,
    model: visionModel,
    textModel: examinerTextModel,
    pages,
    metadata,
    maxMarks: resolvedMaxMarks,
    knowledgeContext: "",
    extractedQuestionHint: questionText,
    knowledgeMeta,
    questionExtract: extracted,
    evaluationTimeSec: Math.round((Date.now() - startedAt) / 1000),
    ocrTranscript: ocr.fullTranscript,
    ocrConfidence: ocr.ocrConfidence,
    wordCountEstimate: ocr.wordCountEstimate,
    answerLanguage,
    feedbackLanguage,
    cachedModelAnswer,
  });

  if (result.success && result.data) {
    result.data.evaluationTimeSec = Math.round((Date.now() - startedAt) / 1000);
    result.data.answerLanguage = answerLanguage;
    result.data.feedbackLanguage = feedbackLanguage;
    result.data.ocrMeta = {
      confidence: ocr.ocrConfidence,
      wordCountEstimate: ocr.wordCountEstimate,
      illegibleRegions: ocr.illegibleRegions || [],
      language: answerLanguage,
      feedbackLanguage,
      fromCache: Boolean(ocr.fromCache),
    };
    result.data.tokenCache = {
      pagesHash: pagesHash.slice(0, 12),
      questionFp: questionFp || null,
      ocrCached: Boolean(ocr.fromCache),
      kbCached: false,
      modelAnswerCached: Boolean(cachedModelAnswer),
      modelAnswerSource: shared.source || null,
    };
    result.data.questionFingerprint = questionFp || null;
    result.data.modelAnswerShared = Boolean(cachedModelAnswer);
    // Ensure extracted text is OCR when available
    if (ocr.fullTranscript?.trim()) {
      result.data.extractedAnswerText = preferOcrTranscript(
        result.data.extractedAnswerText,
        ocr.fullTranscript
      );
      result.data.rawOcrText = ocr.fullTranscript;
    }
    result.questionExtract = extracted;
    result.ocr = ocr;

    if (questionFp && !cachedModelAnswer) {
      setCachedModelAnswer(
        questionFp,
        result.data.model_answer || result.data.modelAnswer
      );
    } else if (questionFp && cachedModelAnswer) {
      // Keep shared answer in memory for next students
      setCachedModelAnswer(questionFp, cachedModelAnswer);
      result.data.model_answer = formatUpscAnswerText(cachedModelAnswer);
    }
    setCachedFullEval(pagesHash, resolvedMaxMarks, feedbackLanguage, {
      success: true,
      data: result.data,
      questionExtract: extracted,
      ocr,
    });
  }

  return result;
};

export default {
  evaluateCopyWithVision,
  normalizeEvaluationResult,
  normalizeLegacyFormat,
  validateEvaluationResult,
  detectAnswerLanguage,
  resolveFeedbackLanguage,
};
