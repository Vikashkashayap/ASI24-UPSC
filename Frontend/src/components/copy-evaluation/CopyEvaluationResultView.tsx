import React from 'react';
import { FileText, MapPin, Sparkles } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { CopyEvaluationAnswerPanel } from './CopyEvaluationAnswerPanel';
import { EvaluationScoreHero } from './EvaluationScoreHero';
import { VisionEvaluationResult } from '../../types/copyEvaluation';
import { SuperKalamSectionBlock } from './superkalam/SuperKalamSectionBlock';
import { SuperKalamMarksFooter } from './superkalam/SuperKalamMarksFooter';
import { StrengthWeaknessGrid } from './superkalam/StrengthWeaknessGrid';
import { FeedbackBulletList } from './superkalam/FeedbackBulletList';

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
  onDownload?: () => void;
}

export const CopyEvaluationResultView: React.FC<CopyEvaluationResultViewProps> = ({
  result,
  evaluationId,
  storedPages,
  subject,
  paper,
  fileName,
  onDownload,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const expectedPoints =
    result.questionDemand?.expectedPoints?.length
      ? result.questionDemand.expectedPoints
      : result.missingDimensions || [];
  const missingAreas = result.questionDemand?.missingAreas || [];
  const hasDemand = expectedPoints.length > 0 || missingAreas.length > 0;

  const globalStrengths = result.strengths?.filter(Boolean) || [];
  const globalWeaknesses = result.weaknesses?.filter(Boolean) || [];
  const showGlobalSummary =
    globalStrengths.length > 0 || globalWeaknesses.length > 0;

  const shellClass = isDark
    ? 'rounded-2xl border border-slate-700/50 bg-slate-900/60 shadow-2xl shadow-black/20 backdrop-blur-sm'
    : 'rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/50';

  return (
    <div className="space-y-5 eval-report-glow">
      <EvaluationScoreHero
        result={result}
        subject={subject}
        paper={paper}
        fileName={fileName}
      />

      <div className={shellClass}>
        {/* Report header */}
        <div
          className={`relative overflow-hidden px-5 py-4 border-b ${
            isDark ? 'border-slate-700/60 bg-slate-800/40' : 'border-slate-200 bg-gradient-to-r from-slate-50 to-purple-50/40'
          }`}
        >
          <div className="absolute inset-x-0 top-0 h-0.5 eval-shimmer-bar opacity-80" />
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl ${
                isDark
                  ? 'bg-gradient-to-br from-purple-500/25 to-fuchsia-500/15 ring-1 ring-purple-500/30'
                  : 'bg-gradient-to-br from-purple-100 to-fuchsia-50 ring-1 ring-purple-200/60'
              }`}
            >
              <FileText
                className={`w-5 h-5 ${isDark ? 'text-purple-300' : 'text-purple-600'}`}
              />
            </div>
            <div>
              <h2
                className={`text-base font-bold tracking-tight ${
                  isDark ? 'text-slate-100' : 'text-slate-900'
                }`}
              >
                Examiner Report
              </h2>
              <p
                className={`text-xs flex items-center gap-1.5 mt-0.5 ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                <Sparkles className="w-3 h-3 text-fuchsia-500" />
                Section-wise premium feedback
              </p>
            </div>
          </div>
        </div>

        {evaluationId &&
          (storedPages?.length || result.extractedAnswerText || result.questionText) && (
            <CopyEvaluationAnswerPanel
              evaluationId={evaluationId}
              result={result}
              storedPages={storedPages}
            />
          )}

        <div className="px-4 xs:px-6 py-1">
          {hasDemand && (
            <div
              className={`my-6 rounded-xl border p-5 ${
                isDark
                  ? 'bg-gradient-to-br from-rose-950/20 to-slate-900/40 border-rose-500/20'
                  : 'bg-gradient-to-br from-rose-50/80 to-white border-rose-200/60 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-2.5 mb-4">
                <div
                  className={`p-1.5 rounded-lg ${
                    isDark ? 'bg-rose-500/15' : 'bg-rose-100'
                  }`}
                >
                  <MapPin className="w-4 h-4 text-rose-500" />
                </div>
                <h3
                  className={`text-sm font-bold ${
                    isDark ? 'text-slate-100' : 'text-slate-900'
                  }`}
                >
                  Demand of the Question
                </h3>
              </div>
              <ul className={`space-y-2.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {expectedPoints.map((p, i) => (
                  <li key={`e-${i}`} className="text-sm leading-relaxed flex gap-3">
                    <span
                      className={`mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        isDark ? 'bg-purple-400' : 'bg-purple-500'
                      }`}
                    />
                    <span>{p}</span>
                  </li>
                ))}
                {missingAreas.map((p, i) => (
                  <li key={`m-${i}`} className="text-sm leading-relaxed flex gap-3">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-orange-500" />
                    <span>
                      <span className="font-semibold text-orange-600 dark:text-orange-400">
                        Gap:{' '}
                      </span>
                      {p}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {showGlobalSummary && (
            <div
              className={`py-6 border-b ${isDark ? 'border-slate-700/50' : 'border-slate-100'}`}
            >
              <StrengthWeaknessGrid
                strengths={globalStrengths}
                weaknesses={globalWeaknesses}
              />
              {(result.examplesDataSuggestions?.length ?? 0) > 0 && (
                <div className="mt-6">
                  <FeedbackBulletList
                    variant="suggestions"
                    items={result.examplesDataSuggestions!}
                    title="Suggestions to improve"
                  />
                </div>
              )}
            </div>
          )}

          {result.introduction && (
            <SuperKalamSectionBlock
              label="Introduction"
              section={result.introduction}
              showStrengthWeakness={false}
            />
          )}

          {result.body?.map((sec, i) => (
            <SuperKalamSectionBlock
              key={i}
              label={sec.sectionTitle?.toUpperCase() || `Body ${i + 1}`}
              section={sec}
              showStrengthWeakness
            />
          ))}

          {result.conclusion && (
            <SuperKalamSectionBlock
              label="Conclusion"
              section={result.conclusion}
              showStrengthWeakness={false}
            />
          )}

          {(result.constitutionalReferences?.length ?? 0) > 0 && (
            <div
              className={`py-5 border-b ${isDark ? 'border-slate-700/50' : 'border-slate-100'}`}
            >
              <p
                className={`text-[10px] font-semibold tracking-[0.2em] uppercase mb-3 ${
                  isDark ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                Constitutional references
              </p>
              <ul
                className={`space-y-2 text-sm rounded-lg p-4 ${
                  isDark
                    ? 'bg-slate-800/40 text-slate-300 border border-slate-700/50'
                    : 'bg-slate-50 text-slate-600 border border-slate-100'
                }`}
              >
                {result.constitutionalReferences!.map((r, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-purple-500">•</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.presentationNotes && (
            <div
              className={`py-5 border-b ${isDark ? 'border-slate-700/50' : 'border-slate-100'}`}
            >
              <p
                className={`text-[10px] font-semibold tracking-[0.2em] uppercase mb-2 ${
                  isDark ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                Presentation
              </p>
              <p
                className={`text-sm leading-relaxed italic ${
                  isDark ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                {result.presentationNotes}
              </p>
            </div>
          )}

          <div className="py-6">
            <SuperKalamMarksFooter result={result} onDownload={onDownload} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CopyEvaluationResultView;
