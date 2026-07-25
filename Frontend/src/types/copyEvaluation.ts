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
  chunkCount?: number;
  source?: string;
  kbSubject?: string | null;
  query?: string;
  extractedQuestion?: string;
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
  wordLimitStatus?: 'GOOD' | 'SHORT' | 'LONG' | 'EXCESSIVE';
  examinerRemark?: string;
  onTrackVerdict?: OnTrackVerdict;
  onTrackExplanation?: string;
  criticalMistakes?: string[];
  factualAccuracyNotes?: string;
  knowledgeContextUsed?: boolean;
  knowledgeMeta?: KnowledgeMeta;
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
  presentationFeedback?: string;
  contentFeedback?: string;
  suggestions?: string[];
  improvedConclusion?: string;
  examinerFeedback?: string;
}

export const getMarks = (r: VisionEvaluationResult) =>
  r.marks ?? r.overallMarks ?? 0;
