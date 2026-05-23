import React from 'react';
import { FileSearch, Lightbulb, Quote } from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';
import { LineFeedback } from '../../../types/copyEvaluation';

interface Props {
  items: LineFeedback[];
}

export const LineByLineFeedbackPanel: React.FC<Props> = ({ items }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!items?.length) return null;

  return (
    <div className="space-y-4">
      <div>
        <h4
          className={`text-sm font-bold ${
            isDark ? 'text-slate-100' : 'text-slate-800'
          }`}
        >
          Research &amp; Analysis
        </h4>
        <p
          className={`text-xs mt-1 ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          Har line jo aapne likhi — uska matlab, examiner kya dekhta hai, aur aap kya improve karein
        </p>
      </div>

      <div className="space-y-4">
        {items.map((row, i) => (
          <div
            key={i}
            className={`rounded-xl border overflow-hidden ${
              isDark
                ? 'border-slate-700/60 bg-slate-900/40'
                : 'border-slate-200/90 bg-white shadow-sm'
            }`}
          >
            <div
              className={`flex items-center gap-2 px-4 py-2.5 border-b ${
                isDark
                  ? 'bg-slate-800/50 border-slate-700/50'
                  : 'bg-slate-50 border-slate-100'
              }`}
            >
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  isDark
                    ? 'bg-blue-500/25 text-blue-200'
                    : 'bg-blue-600 text-white'
                }`}
              >
                {i + 1}
              </span>
              <span
                className={`text-xs font-semibold uppercase tracking-wider ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Your line
              </span>
            </div>

            <div
              className={`px-4 py-3 border-b ${
                isDark ? 'border-slate-700/40' : 'border-slate-100'
              }`}
            >
              <div className="flex gap-2">
                <Quote
                  className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                    isDark ? 'text-amber-500/70' : 'text-amber-600/80'
                  }`}
                />
                <p
                  className={`text-sm leading-relaxed font-serif whitespace-pre-wrap ${
                    isDark ? 'text-stone-200' : 'text-stone-800'
                  }`}
                >
                  {row.studentLine}
                </p>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <div
                className={`rounded-lg p-3.5 ${
                  isDark
                    ? 'bg-blue-950/30 border border-blue-500/15'
                    : 'bg-blue-50/70 border border-blue-100'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <FileSearch
                    className={`w-4 h-4 ${
                      isDark ? 'text-blue-400' : 'text-blue-600'
                    }`}
                  />
                  <span
                    className={`text-xs font-bold ${
                      isDark ? 'text-blue-200' : 'text-blue-800'
                    }`}
                  >
                    Research &amp; Analysis
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
                className={`rounded-lg p-3.5 ${
                  isDark
                    ? 'bg-amber-950/25 border border-amber-500/15'
                    : 'bg-amber-50/70 border border-amber-100'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb
                    className={`w-4 h-4 ${
                      isDark ? 'text-amber-400' : 'text-amber-600'
                    }`}
                  />
                  <span
                    className={`text-xs font-bold ${
                      isDark ? 'text-amber-200' : 'text-amber-900'
                    }`}
                  >
                    How to improve this line
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
        ))}
      </div>
    </div>
  );
};

export default LineByLineFeedbackPanel;
