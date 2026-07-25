import React from 'react';
import { FileSearch, Lightbulb, Quote } from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';
import { LineFeedback, LineVerdict } from '../../../types/copyEvaluation';

interface Props {
  items: LineFeedback[];
}

const VERDICT_STYLE: Record<
  Exclude<LineVerdict, ''>,
  { label: string; dark: string; light: string }
> = {
  CORRECT: {
    label: 'Correct',
    dark: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    light: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  PARTIALLY_CORRECT: {
    label: 'Partial',
    dark: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    light: 'bg-amber-50 text-amber-900 border-amber-200',
  },
  INCORRECT: {
    label: 'Incorrect',
    dark: 'bg-red-500/20 text-red-300 border-red-500/30',
    light: 'bg-red-50 text-red-800 border-red-200',
  },
  IRRELEVANT: {
    label: 'Irrelevant',
    dark: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    light: 'bg-orange-50 text-orange-900 border-orange-200',
  },
  INCOMPLETE: {
    label: 'Incomplete',
    dark: 'bg-slate-500/25 text-slate-300 border-slate-500/30',
    light: 'bg-slate-100 text-slate-700 border-slate-300',
  },
};

export const LineByLineFeedbackPanel: React.FC<Props> = ({ items }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!items?.length) return null;

  return (
    <div className="space-y-3">
      <div>
        <h4
          className={`text-sm font-bold ${
            isDark ? 'text-slate-100' : 'text-slate-800'
          }`}
        >
          Line-wise Feedback
        </h4>
        <p
          className={`text-xs mt-0.5 ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          Correct · Partial · Incorrect — with how to fix
        </p>
      </div>

      <div className="space-y-3">
        {items.map((row, i) => {
          const verdictKey = (row.verdict || '') as Exclude<LineVerdict, ''>;
          const verdictStyle = VERDICT_STYLE[verdictKey];

          return (
            <div
              key={i}
              className={`rounded-lg border overflow-hidden ${
                isDark
                  ? 'border-slate-700/60 bg-slate-900/40'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div
                className={`flex items-center gap-2 px-3 py-2 border-b ${
                  isDark
                    ? 'bg-slate-800/50 border-slate-700/50'
                    : 'bg-slate-50 border-slate-100'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    isDark
                      ? 'bg-blue-500/25 text-blue-200'
                      : 'bg-blue-600 text-white'
                  }`}
                >
                  {i + 1}
                </span>
                <span
                  className={`text-xs font-semibold ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  Your line
                </span>
                {verdictStyle && (
                  <span
                    className={`ml-auto text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border ${
                      isDark ? verdictStyle.dark : verdictStyle.light
                    }`}
                  >
                    {verdictStyle.label}
                  </span>
                )}
              </div>

              <div
                className={`px-3 py-2.5 border-b ${
                  isDark ? 'border-slate-700/40' : 'border-slate-100'
                }`}
              >
                <div className="flex gap-2">
                  <Quote
                    className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${
                      isDark ? 'text-amber-500/70' : 'text-amber-600/80'
                    }`}
                  />
                  <p
                    className={`text-sm leading-relaxed whitespace-pre-wrap ${
                      isDark ? 'text-stone-200' : 'text-stone-800'
                    }`}
                  >
                    {row.studentLine}
                  </p>
                </div>
              </div>

              <div className="p-3 space-y-2.5">
                <div
                  className={`rounded-md p-3 ${
                    isDark
                      ? 'bg-blue-950/30 border border-blue-500/15'
                      : 'bg-blue-50/70 border border-blue-100'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <FileSearch
                      className={`w-3.5 h-3.5 ${
                        isDark ? 'text-blue-400' : 'text-blue-600'
                      }`}
                    />
                    <span
                      className={`text-xs font-bold ${
                        isDark ? 'text-blue-200' : 'text-blue-800'
                      }`}
                    >
                      Examiner note
                    </span>
                  </div>
                  <p
                    className={`text-sm leading-relaxed ${
                      isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    {row.examinerAnalysis}
                  </p>
                </div>

                <div
                  className={`rounded-md p-3 ${
                    isDark
                      ? 'bg-amber-950/25 border border-amber-500/15'
                      : 'bg-amber-50/70 border border-amber-100'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Lightbulb
                      className={`w-3.5 h-3.5 ${
                        isDark ? 'text-amber-400' : 'text-amber-600'
                      }`}
                    />
                    <span
                      className={`text-xs font-bold ${
                        isDark ? 'text-amber-200' : 'text-amber-900'
                      }`}
                    >
                      How to improve
                    </span>
                  </div>
                  <p
                    className={`text-sm leading-relaxed ${
                      isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    {row.howToImprove}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LineByLineFeedbackPanel;
