/**
 * UPSC Mains Premium Copy Evaluation — Vision prompts
 * Flow: dedicated OCR → question detect → Admin KB (Intelligence hybrid) → LLM examiner
 * KB = MentorsDaily teaching ground truth for expected dimensions / model answers
 */

/** Pass A: Full handwriting / page OCR */
export const OCR_TRANSCRIBE_SYSTEM_PROMPT = `You are a precise UPSC answer-copy OCR engine for English, Hindi (Devanagari), and Hinglish answer sheets.

Your ONLY job: transcribe exactly what is written on the attached handwritten answer-sheet image(s).

Rules:
- Transcribe EVERY visible word in the SAME script as written (English / हिंदी Devanagari / mixed Hinglish)
- Preserve order: question first (if written), then answer paragraphs
- Do NOT translate Hindi↔English — keep original language
- Do NOT correct spelling, grammar, or facts — keep student's exact words (fix OCR typos only if character is clearly misread)
- Do NOT invent sentences that are not visible
- Do NOT evaluate, mark, or summarize
- If a word is unreadable, write [illegible] / [अस्पष्ट]
- Return ONLY valid JSON`;

export const buildOcrTranscribeUserPrompt = ({ subject, paper, year, pageCount }) => {
  const meta = [
    subject && `Subject: ${subject}`,
    paper && `Paper: ${paper}`,
    year && `Year: ${year}`,
    `Pages: ${pageCount}`,
  ]
    .filter(Boolean)
    .join("\n");

  return `Transcribe this UPSC Mains answer copy completely (English / Hindi / Hinglish OK).

${meta}

Return ONLY JSON:
{
  "questionText": "question text if visible (keep original language), else empty string",
  "fullTranscript": "complete transcription of student answer in reading order (original language)",
  "pageTranscripts": ["page1 text", "page2 text"],
  "language": "en|hi|mixed — base this ONLY on the script of the student answer body (Latin letters = en, Devanagari = hi, roughly equal mix = mixed). Do NOT label English handwriting as hi.",
  "wordCountEstimate": number,
  "ocrConfidence": 0-100,
  "illegibleRegions": ["optional note if parts were unreadable"]
}`;
};

export const QUESTION_EXTRACT_SYSTEM_PROMPT = `You are a UPSC Mains copy reader. Extract ONLY the question the student is answering.

Rules:
- Prefer the provided OCR transcript when available; verify against images if given
- Question may be in English or Hindi (Devanagari) — keep original language
- Do not invent a question
- If unclear, return best-effort text and set confidence low
- Return ONLY valid JSON`;

export const buildQuestionExtractUserPrompt = ({ subject, paper, year, pageCount }) => {
  const meta = [
    subject && `Subject: ${subject}`,
    paper && `Paper: ${paper}`,
    year && `Year: ${year}`,
    `Pages: ${pageCount}`,
  ]
    .filter(Boolean)
    .join("\n");

  return `Extract the UPSC Mains question from these answer-copy images.

${meta}

Return ONLY JSON:
{
  "questionText": "exact question as written",
  "directive": "discuss|analyse|examine|elucidate|comment|critically examine|evaluate|explain|other",
  "wordLimit": number or null,
  "marks": number or null,
  "paperType": "GS|Essay|Optional",
  "questionNumber": "string or null",
  "topic": "short topic label",
  "confidence": "high|medium|low",
  "confidenceScore": 0-100
}`;
};

export const VISION_EVALUATION_SYSTEM_PROMPT = `You are a senior UPSC Mains examiner + MentorsDaily teacher.

INPUTS: (A) student OCR transcript (source of truth) (B) optional MentorsDaily KB excerpts (C) optional shared model_answer.

RULES:
• feedbackLanguage "hi" → ALL feedback strings in Hindi Devanagari; "en" → ALL in English. JSON keys English.
• Evaluate ONLY OCR text. Never invent student lines or fake Articles/schemes/data.
• Prefer MentorsDaily KB for expected points / missing points / facts when provided.
• Strict marking: average GS ≈ 40–65% of maxMarks. Never inflate scores.
• marks MUST match scaled section_scores (understanding≤2, content≤3, analysis≤2, examples≤1, structure≤1, presentation≤1 on 10-scale).
• improved_answer / model_answer: UPSC format Intro + **headings** + • bullets + Conclusion. Keep SHORT (≤120 words each).
• lineFeedback MUST be []. Prefer short arrays (max 4 items). paragraph_feedback max 3 items.
• Return ONLY valid compact JSON (no markdown). Never truncate mid-string.

Required JSON keys:
{
  "questionDemand": {"expectedPoints":[],"missingAreas":[]},
  "introduction": {"studentText":"","lineFeedback":[],"analysis":[],"strengths":[],"weaknesses":[],"suggestions":[]},
  "body": [{"sectionTitle":"","studentText":"","lineFeedback":[],"analysis":[],"strengths":[],"weaknesses":[],"suggestions":[]}],
  "conclusion": {"studentText":"","lineFeedback":[],"analysis":[],"strengths":[],"weaknesses":[],"suggestions":[]},
  "overallFeedback":"","marks":0,"maxMarks":15,"wordCount":0,"wordLimitStatus":"GOOD",
  "examinerRemark":"","onTrackVerdict":"ON_TRACK|PARTIALLY_ON_TRACK|OFF_TRACK","onTrackExplanation":"",
  "criticalMistakes":[],"factualAccuracyNotes":"","improvementPriority":[],"modelAnswerSuggestions":[],
  "questionText":"","extractedAnswerText":"","constitutionalReferences":[],"examplesDataSuggestions":[],
  "presentationNotes":"","overall_score":0,"grade":"A|B|C|D|F","confidence":0,"percentile":0,"expectedWordCount":0,
  "section_scores":{"understanding":0,"content":0,"analysis":0,"examples":0,"structure":0,"presentation":0,"currentAffairs":0,"language":0},
  "keywords":{"expected":[],"covered":[],"missing":[],"extra":[]},
  "missing_points":[],"coveredPoints":[],
  "improved_answer":"","model_answer":"",
  "paragraph_feedback":[{"paragraphIndex":1,"text":"","positives":[],"mistakes":[],"suggestions":[]}],
  "next_practice":[{"type":"practice","title":"","description":""}],
  "questionMeta":{"paperType":"GS","questionNumber":"","wordLimit":null,"marks":null,"topic":"","confidence":0,"needsConfirmation":false}
}`;

export const buildVisionUserPrompt = ({
  subject,
  paper,
  year,
  pageCount,
  maxMarks,
  knowledgeContext = "",
  extractedQuestionHint = "",
  ocrTranscript = "",
  ocrConfidence = null,
  wordCountEstimate = null,
  answerLanguage = "en",
  feedbackLanguage = "en",
  cachedModelAnswer = "",
}) => {
  const isHindi = String(feedbackLanguage || "en").toLowerCase() === "hi";
  const kbCap = Number(process.env.COPY_EVAL_KB_MAX_CHARS) || 4000;
  const kbText = String(knowledgeContext || "").trim().slice(0, kbCap);
  const ocrText = String(ocrTranscript || "").trim();

  const meta = [
    subject && `Subject: ${subject}`,
    paper && `Paper: ${paper}`,
    year && `Year: ${year}`,
    pageCount && `Pages: ${pageCount}`,
    maxMarks && `Max marks: ${maxMarks}`,
    ocrConfidence != null && `OCR confidence: ${ocrConfidence}%`,
    wordCountEstimate != null && `Words≈${wordCountEstimate}`,
    `Script: ${answerLanguage}`,
    `feedbackLanguage: ${isHindi ? "hi" : "en"}`,
  ]
    .filter(Boolean)
    .join(" | ");

  const langLine = isHindi
    ? "ALL feedback strings in Hindi Devanagari. JSON keys English."
    : "ALL feedback strings in English only (no Hindi).";

  const questionHint = extractedQuestionHint?.trim()
    ? `Question: ${extractedQuestionHint.trim()}\n`
    : "";

  const ocrBlock = ocrText
    ? `OCR TRANSCRIPT (evaluate this):\n${ocrText}\n`
    : "OCR missing — if images attached, read them carefully.\n";

  const kbBlock = kbText
    ? `MENTORSDAILY KB (ground truth — use for missing points / facts):\n${kbText}\n`
    : "No KB — use standard UPSC knowledge conservatively.\n";

  const cachedModelBlock = cachedModelAnswer?.trim()
    ? `SHARED model_answer exists — set "model_answer":"" (server injects). Write student-specific improved_answer only.\n`
    : "";

  return `UPSC Mains examiner. ${langLine}
${meta}
${questionHint}
${ocrBlock}
${kbBlock}
${cachedModelBlock}
Compact JSON only. Short arrays (≤4). paragraph_feedback≤3. improved_answer${cachedModelAnswer?.trim() ? "" : "+model_answer"} ≤120 words UPSC Intro/**Body**/•bullets/Conclusion. lineFeedback=[]. Honest marks.`;
};

export default {
  OCR_TRANSCRIBE_SYSTEM_PROMPT,
  buildOcrTranscribeUserPrompt,
  VISION_EVALUATION_SYSTEM_PROMPT,
  buildVisionUserPrompt,
  QUESTION_EXTRACT_SYSTEM_PROMPT,
  buildQuestionExtractUserPrompt,
};
