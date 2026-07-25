import React from 'react';
import { AlertTriangle, MapPin } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { CopyEvaluationAnswerPanel } from './CopyEvaluationAnswerPanel';
import { EvaluationScoreHero } from './EvaluationScoreHero';
import { VisionEvaluationResult } from '../../types/copyEvaluation';
import { SuperKalamSectionBlock } from './superkalam/SuperKalamSectionBlock';
import { SuperKalamMarksFooter } from './superkalam/SuperKalamMarksFooter';

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

  const expectedPoints = result.questionDemand?.expectedPoints || [];
  const missingAreas =
    result.questionDemand?.missingAreas || result.missingDimensions || [];
  const hasDemand = expectedPoints.length > 0 || missingAreas.length > 0;
  const criticalMistakes = result.criticalMistakes?.filter(Boolean) || [];

  const shellClass = isDark
    ? 'rounded-xl border border-slate-700/50 bg-slate-900/50'
    : 'rounded-xl border border-slate-200 bg-white shadow-sm';

  return (
    <div className="space-y-4">
      <EvaluationScoreHero
        result={result}
        subject={subject}
        paper={paper}
        fileName={fileName}
      />

      <div className={shellClass}>
        {evaluationId &&
          (storedPages?.length ||
            result.extractedAnswerText ||
            result.questionText) && (
            <CopyEvaluationAnswerPanel
              evaluationId={evaluationId}
              result={result}
              storedPages={storedPages}
            />
          )}

        <div className="px-4 xs:px-5 py-1">
          {criticalMistakes.length > 0 && (
            <div
              className={`my-5 rounded-lg border p-4 ${
                isDark
                  ? 'bg-red-950/20 border-red-500/25'
                  : 'bg-red-50/80 border-red-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <h3
                  className={`text-sm font-bold ${
                    isDark ? 'text-slate-100' : 'text-slate-900'
                  }`}
                >
                  Critical Mistakes
                </h3>
              </div>
              <ul
                className={`space-y-2 ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                {criticalMistakes.map((m, i) => (
                  <li key={`cm-${i}`} className="text-sm leading-relaxed flex gap-2.5">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-red-500" />
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hasDemand && (
            <div
              className={`my-5 rounded-lg border p-4 ${
                isDark
                  ? 'bg-slate-800/40 border-slate-700/50'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-rose-500" />
                <h3
                  className={`text-sm font-bold ${
                    isDark ? 'text-slate-100' : 'text-slate-900'
                  }`}
                >
                  Question Demand
                </h3>
              </div>
              {expectedPoints.length > 0 && (
                <div className="mb-3">
                  <p
                    className={`text-xs font-semibold mb-2 ${
                      isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    Examiner expects
                  </p>
                  <ul
                    className={`space-y-1.5 ${
                      isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    {expectedPoints.map((p, i) => (
                      <li key={`e-${i}`} className="text-sm leading-relaxed flex gap-2.5">
                        <span
                          className={`mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            isDark ? 'bg-blue-400' : 'bg-blue-500'
                          }`}
                        />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {missingAreas.length > 0 && (
                <div>
                  <p
                    className={`text-xs font-semibold mb-2 ${
                      isDark ? 'text-orange-400/90' : 'text-orange-700'
                    }`}
                  >
                    Missing in your answer
                  </p>
                  <ul
                    className={`space-y-1.5 ${
                      isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    {missingAreas.map((p, i) => (
                      <li key={`m-${i}`} className="text-sm leading-relaxed flex gap-2.5">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-orange-500" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {result.introduction && (
            <SuperKalamSectionBlock
              label="Introduction"
              section={result.introduction}
            />
          )}

          {result.body?.map((sec, i) => (
            <SuperKalamSectionBlock
              key={i}
              label={sec.sectionTitle || `Body ${i + 1}`}
              section={sec}
            />
          ))}

          {result.conclusion && (
            <SuperKalamSectionBlock
              label="Conclusion"
              section={result.conclusion}
            />
          )}

          {result.presentationNotes?.trim() && (
            <div
              className={`py-4 border-b ${
                isDark ? 'border-slate-700/40' : 'border-slate-100'
              }`}
            >
              <p
                className={`text-xs font-bold tracking-[0.14em] uppercase mb-2 ${
                  isDark ? 'text-slate-500' : 'text-slate-500'
                }`}
              >
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

          <div className="py-5">
            <SuperKalamMarksFooter result={result} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CopyEvaluationResultView;
