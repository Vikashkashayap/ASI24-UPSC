import React from 'react';
import {
  Award,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Target,
  FileText,
  MessageSquare,
  Layers,
  PenLine,
} from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { Progress } from '../ui/progress';
import { CopyEvaluationAnswerPanel } from './CopyEvaluationAnswerPanel';

export interface VisionAnswerItem {
  questionNumber: string;
  questionText: string;
  answerText: string;
}

export interface VisionEvaluationResult {
  questionText?: string;
  extractedAnswerText?: string;
  answers?: VisionAnswerItem[];
  overallMarks: number;
  maxMarks: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  missingDimensions: string[];
  presentationFeedback: string;
  contentFeedback: string;
  suggestions: string[];
  improvedConclusion: string;
  examinerFeedback: string;
}

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
}

export const CopyEvaluationResultView: React.FC<CopyEvaluationResultViewProps> = ({
  result,
  evaluationId,
  storedPages,
  subject,
  paper,
  fileName,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const percentage = Math.round((result.overallMarks / result.maxMarks) * 100);

  const sectionClass = isDark
    ? 'rounded-xl border border-slate-700/50 bg-slate-800/40 p-4 xs:p-5'
    : 'rounded-xl border border-slate-200 bg-slate-50/80 p-4 xs:p-5';

  return (
    <div className="space-y-5 xs:space-y-6">
      {evaluationId && (
        <CopyEvaluationAnswerPanel
          evaluationId={evaluationId}
          result={result}
          storedPages={storedPages}
        />
      )}

      <h3
        className={`text-sm font-semibold uppercase tracking-wider ${
          isDark ? 'text-slate-400' : 'text-slate-500'
        }`}
      >
        Examiner Feedback & Analysis
      </h3>

      {/* Marks hero card */}
      <div
        className={`relative overflow-hidden rounded-2xl p-5 xs:p-6 border-2 ${
          isDark
            ? 'bg-gradient-to-br from-purple-900/40 via-slate-900 to-emerald-900/20 border-purple-500/30'
            : 'bg-gradient-to-br from-purple-50 via-white to-emerald-50/50 border-purple-200/60'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`p-3 rounded-2xl ${
                isDark ? 'bg-fuchsia-500/20' : 'bg-purple-100'
              }`}
            >
              <Award
                className={`w-8 h-8 ${
                  isDark ? 'text-fuchsia-400' : 'text-purple-600'
                }`}
              />
            </div>
            <div>
              <p
                className={`text-xs font-medium uppercase tracking-wider ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Overall Score
              </p>
              <p className="text-3xl xs:text-4xl font-bold tabular-nums">
                <span
                  className={
                    isDark
                      ? 'text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 to-emerald-300'
                      : 'text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-emerald-600'
                  }
                >
                  {result.overallMarks}
                </span>
                <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>
                  {' '}
                  / {result.maxMarks}
                </span>
              </p>
              {(subject || paper || fileName) && (
                <p
                  className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}
                >
                  {[subject, paper, fileName].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          </div>
          <div className="sm:w-48 w-full">
            <div className="flex justify-between text-xs mb-1.5">
              <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>
                Performance
              </span>
              <span className="font-semibold">{percentage}%</span>
            </div>
            <Progress value={percentage} className="h-2.5" />
          </div>
        </div>
        {result.summary && (
          <p
            className={`mt-4 text-sm leading-relaxed ${
              isDark ? 'text-slate-300' : 'text-slate-700'
            }`}
          >
            {result.summary}
          </p>
        )}
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={sectionClass}>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <h3
              className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}
            >
              Strengths
            </h3>
          </div>
          <ul className="space-y-2">
            {result.strengths?.length ? (
              result.strengths.map((item, i) => (
                <li
                  key={i}
                  className={`text-sm flex gap-2 ${
                    isDark ? 'text-slate-300' : 'text-slate-600'
                  }`}
                >
                  <span className="text-emerald-500 mt-0.5">•</span>
                  {item}
                </li>
              ))
            ) : (
              <li className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                No strengths noted
              </li>
            )}
          </ul>
        </div>

        <div className={sectionClass}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3
              className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}
            >
              Weaknesses
            </h3>
          </div>
          <ul className="space-y-2">
            {result.weaknesses?.length ? (
              result.weaknesses.map((item, i) => (
                <li
                  key={i}
                  className={`text-sm flex gap-2 ${
                    isDark ? 'text-slate-300' : 'text-slate-600'
                  }`}
                >
                  <span className="text-amber-500 mt-0.5">•</span>
                  {item}
                </li>
              ))
            ) : (
              <li className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                No weaknesses noted
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Missing dimensions */}
      {result.missingDimensions?.length > 0 && (
        <div className={sectionClass}>
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-5 h-5 text-orange-500" />
            <h3
              className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}
            >
              Missing Dimensions
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {result.missingDimensions.map((dim, i) => (
              <span
                key={i}
                className={`text-xs px-3 py-1.5 rounded-full ${
                  isDark
                    ? 'bg-orange-500/15 text-orange-300 border border-orange-500/30'
                    : 'bg-orange-50 text-orange-800 border border-orange-200'
                }`}
              >
                {dim}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Content & Presentation feedback */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {result.contentFeedback && (
          <div className={sectionClass}>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-blue-500" />
              <h4
                className={`text-sm font-semibold ${
                  isDark ? 'text-slate-200' : 'text-slate-800'
                }`}
              >
                Content Feedback
              </h4>
            </div>
            <p
              className={`text-sm leading-relaxed ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              {result.contentFeedback}
            </p>
          </div>
        )}
        {result.presentationFeedback && (
          <div className={sectionClass}>
            <div className="flex items-center gap-2 mb-2">
              <PenLine className="w-4 h-4 text-violet-500" />
              <h4
                className={`text-sm font-semibold ${
                  isDark ? 'text-slate-200' : 'text-slate-800'
                }`}
              >
                Presentation Feedback
              </h4>
            </div>
            <p
              className={`text-sm leading-relaxed ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              {result.presentationFeedback}
            </p>
          </div>
        )}
      </div>

      {/* Suggestions */}
      {result.suggestions?.length > 0 && (
        <div className={sectionClass}>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            <h3
              className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}
            >
              Suggestions for Improvement
            </h3>
          </div>
          <ol className="space-y-2 list-decimal list-inside">
            {result.suggestions.map((s, i) => (
              <li
                key={i}
                className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}
              >
                {s}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Improved conclusion */}
      {result.improvedConclusion && (
        <div
          className={`rounded-xl border-2 p-4 xs:p-5 ${
            isDark
              ? 'border-emerald-500/30 bg-emerald-950/20'
              : 'border-emerald-200 bg-emerald-50/50'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-emerald-500" />
            <h3
              className={`font-semibold ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}
            >
              Better Conclusion (Model)
            </h3>
          </div>
          <p
            className={`text-sm leading-relaxed italic ${
              isDark ? 'text-slate-300' : 'text-slate-700'
            }`}
          >
            {result.improvedConclusion}
          </p>
        </div>
      )}

      {/* Examiner feedback */}
      {result.examinerFeedback && (
        <div
          className={`rounded-2xl p-5 xs:p-6 border-2 ${
            isDark
              ? 'bg-gradient-to-br from-slate-800/90 to-purple-900/30 border-fuchsia-500/25'
              : 'bg-gradient-to-br from-slate-50 to-purple-50/30 border-purple-200/50'
          }`}
        >
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare
              className={`w-5 h-5 ${isDark ? 'text-fuchsia-400' : 'text-purple-600'}`}
            />
            <h3
              className={`font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}
            >
              Examiner&apos;s Feedback
            </h3>
          </div>
          <p
            className={`text-sm leading-relaxed ${
              isDark ? 'text-slate-300' : 'text-slate-700'
            }`}
          >
            {result.examinerFeedback}
          </p>
        </div>
      )}
    </div>
  );
};

export default CopyEvaluationResultView;
