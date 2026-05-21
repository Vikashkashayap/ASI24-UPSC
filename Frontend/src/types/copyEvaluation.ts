/** Per-line / per-passage feedback tied to what the student actually wrote */
export interface LineFeedback {
  studentLine: string;
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
