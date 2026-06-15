/**
 * Premium Vision Copy Evaluation Service
 * Handwritten answer analysis via OpenRouter Gemini vision (no OCR).
 */

import {
  VISION_EVALUATION_SYSTEM_PROMPT,
  buildVisionUserPrompt,
} from "../prompts/copyEvaluationPrompts.js";
import { VISION_MAX_TOKENS } from "../config/openRouterDefaults.js";
import { getVisionModel } from "../config/openRouterModels.js";
import {
  callOpenRouterVisionAPI,
  parseJSONFromResponse,
} from "./openRouterService.js";

const MAX_RETRIES = 2;
const MAX_LINE_FEEDBACK = 15;

const toArray = (val) => {
  if (Array.isArray(val)) return val.map(String).filter(Boolean);
  if (typeof val === "string" && val.trim()) return [val.trim()];
  return [];
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
    )
    .slice(0, MAX_LINE_FEEDBACK);
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
export const normalizeEvaluationResult = (raw) => {
  if (!raw || typeof raw !== "object") return null;

  if (
    raw.overallMarks !== undefined &&
    !raw.questionDemand &&
    raw.marks === undefined
  ) {
    return normalizeLegacyFormat(raw);
  }

  const marks = Number(raw.marks ?? raw.overallMarks);
  const maxMarks = Number(raw.maxMarks) || 15;
  if (Number.isNaN(marks)) return null;

  const intro = normalizeSection(raw.introduction);
  const conclusion = normalizeSection(raw.conclusion);
  const body = Array.isArray(raw.body)
    ? raw.body.map(normalizeBodySection).filter((b) => b.sectionTitle || b.studentText)
    : [];

  const questionText = String(raw.questionText || "").trim();
  const extractedAnswerText =
    String(raw.extractedAnswerText || "").trim() ||
    [
      intro.studentText,
      ...body.map((b) => b.studentText),
      conclusion.studentText,
    ]
      .filter(Boolean)
      .join("\n\n");

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

  const clampedMarks = Math.min(Math.max(0, marks), maxMarks);
  const wordLimitStatus = ["GOOD", "SHORT", "LONG", "EXCESSIVE"].includes(
    raw.wordLimitStatus
  )
    ? raw.wordLimitStatus
    : "GOOD";

  return {
    questionDemand: {
      expectedPoints: toArray(raw.questionDemand?.expectedPoints),
      missingAreas: toArray(raw.questionDemand?.missingAreas),
    },
    introduction: intro,
    body: body.length
      ? body
      : [
          {
            sectionTitle: "Answer Body",
            studentText: extractedAnswerText,
            strengths: allStrengths.slice(0, 5),
            weaknesses: allWeaknesses.slice(0, 5),
            suggestions: allSuggestions.slice(0, 5),
          },
        ],
    conclusion,
    overallFeedback: String(raw.overallFeedback || raw.summary || "").trim(),
    marks: clampedMarks,
    maxMarks,
    wordCount: Math.max(0, Number(raw.wordCount) || 0),
    wordLimitStatus,
    examinerRemark: String(
      raw.examinerRemark || raw.examinerFeedback || ""
    ).trim(),
    improvementPriority: toArray(raw.improvementPriority),
    modelAnswerSuggestions: toArray(raw.modelAnswerSuggestions),
    questionText,
    extractedAnswerText,
    answers: Array.isArray(raw.answers) ? raw.answers : [],
    constitutionalReferences: toArray(raw.constitutionalReferences),
    examplesDataSuggestions: toArray(raw.examplesDataSuggestions),
    presentationNotes: String(raw.presentationNotes || raw.presentationFeedback || "").trim(),
    overallMarks: clampedMarks,
    summary: String(raw.overallFeedback || raw.summary || "").trim(),
    strengths: allStrengths.length ? allStrengths : toArray(raw.strengths),
    weaknesses: allWeaknesses.length ? allWeaknesses : toArray(raw.weaknesses),
    missingDimensions: toArray(raw.questionDemand?.missingAreas),
    presentationFeedback: String(
      raw.presentationNotes || raw.presentationFeedback || ""
    ).trim(),
    contentFeedback: intro.analysis.join(" ") || String(raw.contentFeedback || ""),
    suggestions: allSuggestions.length ? allSuggestions : toArray(raw.suggestions),
    improvedConclusion: conclusion.analysis.join("\n") || String(raw.improvedConclusion || ""),
    examinerFeedback: String(
      raw.examinerRemark || raw.examinerFeedback || ""
    ).trim(),
  };
};

export const validateEvaluationResult = (result) => {
  if (!result) return { valid: false, error: "Empty evaluation result" };

  if (result.marks === undefined || result.maxMarks === undefined) {
    return {
      valid: false,
      error: "Missing marks or maxMarks",
    };
  }

  if (!result.examinerRemark?.trim() && !result.examinerFeedback?.trim()) {
    return {
      valid: false,
      error: "Missing examiner remark",
    };
  }

  if (!result.overallFeedback?.trim() && !result.examinerRemark?.trim()) {
    return {
      valid: false,
      error: "Evaluation lacks overall feedback and examiner remark",
    };
  }

  const hasAnswer =
    Boolean(result.extractedAnswerText?.trim()) ||
    Boolean(result.introduction?.studentText?.trim()) ||
    (result.body || []).some((b) => b.studentText?.trim());

  const lineCount = countLineFeedbackInResult(result);
  const expectedUnits = countExpectedLineUnits(result);

  if (hasAnswer && lineCount < 3) {
    return {
      valid: false,
      error:
        "Missing line-by-line Research & Analysis (lineFeedback) — need detailed per-line feedback",
    };
  }

  if (expectedUnits >= 4 && lineCount < Math.min(expectedUnits - 1, 6)) {
    return {
      valid: false,
      error: `Insufficient line-by-line feedback: got ${lineCount}, expected at least ${Math.min(expectedUnits - 1, 8)} entries for this answer length`,
    };
  }

  const shallowLines = [
    ...(result.introduction?.lineFeedback || []),
    ...(result.body || []).flatMap((b) => b.lineFeedback || []),
    ...(result.conclusion?.lineFeedback || []),
  ].filter(
    (row) =>
      row.examinerAnalysis.length < 40 || row.howToImprove.length < 40
  );

  if (hasAnswer && shallowLines.length > lineCount * 0.5 && lineCount > 0) {
    return {
      valid: false,
      error:
        "Line feedback too shallow — examinerAnalysis and howToImprove must be 1–2 detailed sentences each",
    };
  }

  return { valid: true };
};

const callVisionWithRetry = async ({
  apiKey,
  model,
  pages,
  metadata,
  maxMarks,
}) => {
  const userPrompt = buildVisionUserPrompt({
    subject: metadata.subject,
    paper: metadata.paper,
    year: metadata.year,
    pageCount: pages.length,
    maxMarks,
  });

  const imageContents = pages.map((page) => ({
    type: "image_url",
    image_url: {
      url: page.dataUrl || `data:${page.mimeType};base64,${page.base64}`,
    },
  }));

  let lastError = "Vision API call failed";
  let lastRaw = "";
  let lastValidationHint = "";

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const apiResponse = await callOpenRouterVisionAPI({
      apiKey,
      model,
      systemPrompt: VISION_EVALUATION_SYSTEM_PROMPT,
      userPrompt:
        attempt > 0
          ? `${userPrompt}\n\nIMPORTANT: Previous response failed validation (${lastValidationHint || "incomplete line-by-line feedback"}). Return ONLY valid JSON. Include lineFeedback[] for introduction, body, and conclusion — each with studentLine (exact quote), examinerAnalysis (1–2 sentences), howToImprove (1–2 actionable sentences). Need at least 4+ lineFeedback entries. No generic one-line feedback.`
          : userPrompt,
      images: imageContents,
      temperature: attempt === 0 ? 0.2 : 0.1,
      maxTokens: VISION_MAX_TOKENS,
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
    const normalized = normalizeEvaluationResult(parsed);
    const validation = validateEvaluationResult(normalized);

    if (validation.valid) {
      return {
        success: true,
        data: normalized,
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
 * Evaluate answer copy images via OpenRouter vision
 */
export const evaluateCopyWithVision = async ({
  pages,
  metadata = {},
  apiKey,
  model,
  maxMarks,
}) => {
  if (!apiKey) {
    return { success: false, error: "OPENROUTER_API_KEY is not configured" };
  }

  if (!pages?.length) {
    return { success: false, error: "No images to evaluate" };
  }

  const visionModel = model || getVisionModel();

  return callVisionWithRetry({
    apiKey,
    model: visionModel,
    pages,
    metadata,
    maxMarks: maxMarks || 15,
  });
};

export default {
  evaluateCopyWithVision,
  normalizeEvaluationResult,
  normalizeLegacyFormat,
  validateEvaluationResult,
};
