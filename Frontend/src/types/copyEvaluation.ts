/** Per-line / per-passage feedback tied to what the student actually wrote */
export type LineVerdict =
  | 'CORRECT'
  | 'PARTIALLY_CORRECT'
  | 'INCORRECT'
  | 'IRRELEVANT'
  | 'INCOMPLETE'
  | '';

export type OnTrackVerdict =
  | 'ON_TRACK'
  | 'PARTIALLY_ON_TRACK'
  | 'OFF_TRACK'
  | '';

export interface LineFeedback {
  studentLine: string;
  verdict?: LineVerdict;
  examinerAnalysis: string;
  howToImprove: string;
}

export interface SectionFeedback {
  studentText?: string;
  analysis?: string[];
  lineFeedback?: LineFeedback[];
  strengths?: string[];
  weaknesses?: string[];
  suggestions?: string[];
}

export interface BodySection {
  sectionTitle: string;
  studentText?: string;
  analysis?: string[];
  lineFeedback?: LineFeedback[];
  strengths?: string[];
  weaknesses?: string[];
  suggestions?: string[];
}

export interface QuestionDemand {
  expectedPoints?: string[];
  missingAreas?: string[];
}

export interface KnowledgeMeta {
  used?: boolean;
  role?: string;
  chunkCount?: number;
  source?: string;
  kbSubject?: string | null;
  query?: string;
  documents?: string[];
  extractedQuestion?: string;
  ocrConfidence?: number;
}

export interface SectionScores {
  understanding?: number;
  content?: number;
  analysis?: number;
  examples?: number;
  structure?: number;
  presentation?: number;
  currentAffairs?: number;
  language?: number;
  /** Normalized 0–max for display bars */
  [key: string]: number | undefined;
}

export interface KeywordAnalysis {
  expected?: string[];
  covered?: string[];
  missing?: string[];
  extra?: string[];
}

export interface QuestionMeta {
  paper?: string;
  paperType?: 'GS' | 'Essay' | 'Optional' | string;
  questionNumber?: string;
  wordLimit?: number | null;
  marks?: number | null;
  topic?: string;
  confidence?: number;
  needsConfirmation?: boolean;
}

export interface NextPracticeItem {
  type?: 'pyq' | 'notes' | 'weak_topic' | 'practice' | string;
  title: string;
  description?: string;
}

export interface ParagraphFeedback {
  paragraphIndex?: number;
  text?: string;
  positives?: string[];
  mistakes?: string[];
  suggestions?: string[];
}

export interface VisionEvaluationResult {
  questionDemand?: QuestionDemand;
  introduction?: SectionFeedback;
  body?: BodySection[];
  conclusion?: SectionFeedback;
  overallFeedback?: string;
  marks: number;
  maxMarks: number;
  wordCount?: number;
  expectedWordCount?: number;
  wordLimitStatus?: 'GOOD' | 'SHORT' | 'LONG' | 'EXCESSIVE';
  examinerRemark?: string;
  onTrackVerdict?: OnTrackVerdict;
  onTrackExplanation?: string;
  criticalMistakes?: string[];
  factualAccuracyNotes?: string;
  knowledgeContextUsed?: boolean;
  knowledgeMeta?: KnowledgeMeta;
  answerLanguage?: 'hi' | 'en' | 'mixed' | string;
  feedbackLanguage?: 'hi' | 'en' | string;
  improvementPriority?: string[];
  modelAnswerSuggestions?: string[];
  constitutionalReferences?: string[];
  examplesDataSuggestions?: string[];
  presentationNotes?: string;
  questionText?: string;
  extractedAnswerText?: string;
  answers?: { questionNumber: string; questionText: string; answerText: string }[];
  overallMarks?: number;
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  missingDimensions?: string[];
  missing_points?: string[];
  presentationFeedback?: string;
  contentFeedback?: string;
  suggestions?: string[];
  improvedConclusion?: string;
  examinerFeedback?: string;
  /** Premium structured fields */
  overall_score?: number;
  grade?: string;
  confidence?: number;
  percentile?: number;
  evaluationTimeSec?: number;
  section_scores?: SectionScores;
  sectionScores?: SectionScores;
  keywords?: KeywordAnalysis;
  improved_answer?: string;
  improvedAnswer?: string;
  model_answer?: string;
  modelAnswer?: string;
  next_practice?: NextPracticeItem[];
  nextPractice?: NextPracticeItem[];
  paragraph_feedback?: ParagraphFeedback[];
  paragraphFeedback?: ParagraphFeedback[];
  coveredPoints?: string[];
  questionMeta?: QuestionMeta;
}

export const getMarks = (r: VisionEvaluationResult) =>
  r.marks ?? r.overall_score ?? r.overallMarks ?? 0;

export const getGrade = (r: VisionEvaluationResult) => {
  const marks = getMarks(r);
  const max = r.maxMarks || 10;
  const pct = (marks / max) * 100;
  const fromMarks =
    pct >= 80 ? 'A' : pct >= 65 ? 'B' : pct >= 50 ? 'C' : pct >= 35 ? 'D' : 'F';
  // Prefer marks-derived grade when stored grade clearly conflicts (e.g. C with 15/15)
  if (r.grade) {
    const g = String(r.grade).toUpperCase();
    if (g === fromMarks) return g;
    // Conflict: trust marks
    return fromMarks;
  }
  return fromMarks;
};

export const getSectionScores = (r: VisionEvaluationResult): SectionScores =>
  r.section_scores || r.sectionScores || {};

export const getKeywords = (r: VisionEvaluationResult): KeywordAnalysis =>
  r.keywords || {};

export const getImprovedAnswer = (r: VisionEvaluationResult) =>
  r.improved_answer || r.improvedAnswer || '';

export const getModelAnswer = (r: VisionEvaluationResult) =>
  r.model_answer || r.modelAnswer || '';

export const getNextPractice = (r: VisionEvaluationResult): NextPracticeItem[] =>
  r.next_practice || r.nextPractice || [];

export const getMissingPoints = (r: VisionEvaluationResult): string[] =>
  r.missing_points ||
  r.missingDimensions ||
  r.questionDemand?.missingAreas ||
  [];
