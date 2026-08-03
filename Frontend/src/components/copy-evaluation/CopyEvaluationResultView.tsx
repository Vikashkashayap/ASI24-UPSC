import React, { useState } from 'react';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { CopyEvaluationAnswerPanel } from './CopyEvaluationAnswerPanel';
import { EvaluationScoreHero } from './EvaluationScoreHero';
import { EvaluationInsightGrid } from './EvaluationInsightGrid';
import {
  QuestionAnalysisPanel,
  MissingContentChecklist,
} from './QuestionAnalysisPanel';
import { ParagraphFeedbackPanel } from './ParagraphFeedbackPanel';
import { ImprovedModelAnswerPanel } from './ImprovedModelAnswerPanel';
import { NextPracticePanel } from './NextPracticePanel';
import {
  VisionEvaluationResult,
  getKeywords,
  getImprovedAnswer,
  getModelAnswer,
  getNextPractice,
  getMissingPoints,
} from '../../types/copyEvaluation';

export type { VisionEvaluationResult } from '../../types/copyEvaluation';

interface StoredPage {
  pageNumber: number;
  fileName: string;
}

interface CopyEvaluationResultViewProps {
  result: VisionEvaluationResult;
  evaluationId?: string;
  storedPages?: StoredPage[];
  subject?: string;
  paper?: string;
  fileName?: string;
  createdAt?: string;
}

export const CopyEvaluationResultView: React.FC<CopyEvaluationResultViewProps> = ({
  result,
  evaluationId,
  storedPages,
  subject,
  paper,
  fileName,
  createdAt,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [showCopy, setShowCopy] = useState(false);

  const missingAreas = getMissingPoints(result);
  const keywords = getKeywords(result);
  const covered =
    result.coveredPoints?.length
      ? result.coveredPoints
      : keywords.covered || [];
  const suggestions =
    result.improvementPriority?.length
      ? result.improvementPriority
      : result.suggestions || [];

  // Avoid repeating the same points in Weaknesses + Critical Mistakes
  const weaknessSet = new Set(
    (result.weaknesses || []).map((w) => w.trim().toLowerCase())
  );
  const uniqueCritical = (result.criticalMistakes || []).filter(
    (m) => m && !weaknessSet.has(m.trim().toLowerCase())
  );
  const weaknesses = [
    ...(result.weaknesses || []),
    ...uniqueCritical,
  ];

  const hasCopy =
    Boolean(evaluationId) &&
    Boolean(
      storedPages?.length ||
        result.extractedAnswerText ||
        result.questionText
    );

  return (
    <div className="space-y-4">
      <EvaluationScoreHero
        result={result}
        subject={subject}
        paper={paper}
        fileName={fileName}
        createdAt={createdAt}
      />

      <EvaluationInsightGrid
        strengths={result.strengths}
        weaknesses={weaknesses}
        suggestions={suggestions}
      />

      <QuestionAnalysisPanel
        keywords={keywords}
        questionText={result.questionText}
        wordCount={result.wordCount}
        expectedWordCount={
          result.expectedWordCount ?? result.questionMeta?.wordLimit ?? undefined
        }
      />

      <MissingContentChecklist covered={covered} missing={missingAreas} />

      <ParagraphFeedbackPanel result={result} />

      {result.presentationNotes?.trim() && (
        <div
          className={`rounded-xl border p-4 ${
            isDark
              ? 'bg-slate-900/50 border-slate-700/50'
              : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <p className="text-xs font-bold tracking-[0.14em] uppercase mb-2 text-slate-500">
            Presentation
          </p>
          <p
            className={`text-sm leading-relaxed ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            {result.presentationNotes}
          </p>
        </div>
      )}

      <ImprovedModelAnswerPanel
        improvedAnswer={getImprovedAnswer(result)}
        modelAnswer={getModelAnswer(result)}
        modelSuggestions={result.modelAnswerSuggestions}
        modelAnswerShared={Boolean(result.modelAnswerShared || result.tokenCache?.modelAnswerCached)}
      />

      <NextPracticePanel items={getNextPractice(result)} />

      {hasCopy && evaluationId && (
        <div
          className={`rounded-xl border overflow-hidden ${
            isDark
              ? 'bg-slate-900/50 border-slate-700/50'
              : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <button
            type="button"
            onClick={() => setShowCopy((v) => !v)}
            className={`w-full flex items-center justify-between px-4 xs:px-5 py-3.5 text-left ${
              isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
            }`}
          >
            <span className="flex items-center gap-2">
              <FileText
                className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
              />
              <span
                className={`text-sm font-bold ${
                  isDark ? 'text-slate-100' : 'text-slate-900'
                }`}
              >
                Your Answer Copy
              </span>
              <span className="text-xs text-slate-500 font-normal">
                Transcript & uploaded pages
              </span>
            </span>
            {showCopy ? (
              <ChevronUp className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            )}
          </button>
          {showCopy && (
            <CopyEvaluationAnswerPanel
              evaluationId={evaluationId}
              result={result}
              storedPages={storedPages}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default CopyEvaluationResultView;
