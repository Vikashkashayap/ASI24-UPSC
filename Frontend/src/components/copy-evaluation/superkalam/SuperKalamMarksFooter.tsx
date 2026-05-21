import React from 'react';

import { Download, MessageSquareQuote } from 'lucide-react';

import { useTheme } from '../../../hooks/useTheme';

import { VisionEvaluationResult, getMarks } from '../../../types/copyEvaluation';

import { ModelAnswerPanel } from '../ModelAnswerPanel';

import { FeedbackBulletList } from './FeedbackBulletList';



const WORD_BADGE: Record<string, { light: string; dark: string }> = {

  GOOD: {

    light: 'bg-emerald-100 text-emerald-700 ring-emerald-200',

    dark: 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/30',

  },

  SHORT: {

    light: 'bg-amber-100 text-amber-700 ring-amber-200',

    dark: 'bg-amber-500/20 text-amber-300 ring-amber-500/30',

  },

  LONG: {

    light: 'bg-orange-100 text-orange-700 ring-orange-200',

    dark: 'bg-orange-500/20 text-orange-300 ring-orange-500/30',

  },

  EXCESSIVE: {

    light: 'bg-red-100 text-red-700 ring-red-200',

    dark: 'bg-red-500/20 text-red-300 ring-red-500/30',

  },

};



function getEncouragement(pct: number): { emoji: string; text: string } {

  if (pct >= 75) return { emoji: '🌟', text: 'Excellent work!' };

  if (pct >= 55) return { emoji: '😊', text: 'Good progress — keep pushing!' };

  if (pct >= 40) return { emoji: '🙂', text: 'Almost there! Keep refining!' };

  return { emoji: '💪', text: 'Keep working — you can improve!' };

}



interface Props {

  result: VisionEvaluationResult;

  onDownload?: () => void;

}



export const SuperKalamMarksFooter: React.FC<Props> = ({ result, onDownload }) => {

  const { theme } = useTheme();

  const isDark = theme === 'dark';

  const marks = getMarks(result);

  const max = result.maxMarks || 15;

  const pct = (marks / max) * 100;

  const { emoji, text } = getEncouragement(pct);

  const wl = result.wordLimitStatus || 'GOOD';

  const wlBadge = WORD_BADGE[wl] || WORD_BADGE.GOOD;



  const cardBase = isDark

    ? 'rounded-xl border border-slate-700/60 bg-slate-800/40 backdrop-blur-sm'

    : 'rounded-xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/40';



  return (

    <div className="space-y-6">

      <div className="flex items-center gap-3">

        <div

          className={`w-1 h-8 rounded-full ${

            isDark

              ? 'bg-gradient-to-b from-fuchsia-400 to-emerald-400'

              : 'bg-gradient-to-b from-fuchsia-500 to-emerald-500'

          }`}

        />

        <p

          className={`text-xs font-bold tracking-[0.15em] uppercase ${

            isDark ? 'text-slate-400' : 'text-slate-500'

          }`}

        >

          Overall feedback

        </p>

      </div>



      {(result.overallFeedback || result.summary) && (

        <p

          className={`text-sm leading-relaxed ${

            isDark ? 'text-slate-300' : 'text-slate-700'

          }`}

        >

          {result.overallFeedback || result.summary}

        </p>

      )}



      {(result.examinerRemark || result.examinerFeedback) && (

        <div

          className={`flex gap-3 rounded-xl border p-4 ${

            isDark

              ? 'bg-purple-950/25 border-purple-500/20'

              : 'bg-purple-50/60 border-purple-200/60'

          }`}

        >

          <MessageSquareQuote

            className={`w-5 h-5 flex-shrink-0 mt-0.5 ${

              isDark ? 'text-purple-400' : 'text-purple-600'

            }`}

          />

          <p

            className={`text-sm leading-relaxed italic ${

              isDark ? 'text-slate-300' : 'text-slate-600'

            }`}

          >

            {result.examinerRemark || result.examinerFeedback}

          </p>

        </div>

      )}



      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        <div className={`${cardBase} p-5`}>

          <div className="flex items-start gap-4">

            <div className="relative flex-shrink-0">

              <div

                className="w-16 h-16 rounded-full eval-score-ring p-[3px]"

              >

                <div

                  className={`w-full h-full rounded-full flex items-center justify-center text-lg font-bold ${

                    isDark ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'

                  }`}

                >

                  {Math.round(pct)}%

                </div>

              </div>

            </div>

            <div className="flex-1 min-w-0">

              <p

                className={`text-xs font-medium uppercase tracking-wider ${

                  isDark ? 'text-slate-500' : 'text-slate-500'

                }`}

              >

                Marks scored

              </p>

              <p

                className={`text-2xl font-bold tabular-nums mt-0.5 ${

                  isDark ? 'text-slate-100' : 'text-slate-900'

                }`}

              >

                {marks}

                <span

                  className={`text-lg font-medium ${

                    isDark ? 'text-slate-500' : 'text-slate-400'

                  }`}

                >

                  /{max}

                </span>

              </p>

              <p

                className={`text-xs mt-1 flex items-center gap-1 ${

                  isDark ? 'text-slate-400' : 'text-slate-600'

                }`}

              >

                <span>{emoji}</span> {text}

              </p>

            </div>

          </div>

          <div className="mt-4 relative h-2.5 rounded-full overflow-hidden">

            <div

              className="absolute inset-0 rounded-full opacity-90"

              style={{

                background:

                  'linear-gradient(to right, #ef4444, #f59e0b, #84cc16, #22c55e)',

              }}

            />

            <div

              className={`absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 shadow-lg transition-all duration-500 ${

                isDark ? 'bg-white border-slate-800' : 'bg-white border-slate-700'

              }`}

              style={{ left: `calc(${Math.min(100, Math.max(0, pct))}% - 7px)` }}

            />

          </div>

          <div

            className={`flex justify-between text-[10px] mt-1.5 ${

              isDark ? 'text-slate-600' : 'text-slate-400'

            }`}

          >

            <span>0</span>

            <span>{max}</span>

          </div>

        </div>



        <div className={`${cardBase} p-5 flex flex-col justify-center`}>

          <p

            className={`text-xs font-medium uppercase tracking-wider ${

              isDark ? 'text-slate-500' : 'text-slate-500'

            }`}

          >

            Word count

          </p>

          <div className="flex items-center gap-3 mt-2">

            <p

              className={`text-3xl font-bold tabular-nums ${

                isDark ? 'text-slate-100' : 'text-slate-900'

              }`}

            >

              {result.wordCount ?? '—'}

            </p>

            <span

              className={`text-xs font-bold px-3 py-1.5 rounded-full ring-1 ${

                isDark ? wlBadge.dark : wlBadge.light

              }`}

            >

              {wl}

            </span>

          </div>

        </div>

      </div>



      {(result.improvementPriority?.length ?? 0) > 0 && (

        <div

          className={`rounded-xl border p-4 ${

            isDark

              ? 'bg-slate-800/30 border-slate-700/50'

              : 'bg-slate-50 border-slate-200'

          }`}

        >

          <FeedbackBulletList

            variant="suggestions"

            items={result.improvementPriority!}

            title="Priority improvements"

          />

        </div>

      )}



      <div

        className={`flex flex-wrap items-center justify-between gap-4 pt-5 border-t ${

          isDark ? 'border-slate-700/50' : 'border-slate-200'

        }`}

      >

        <ModelAnswerPanel suggestions={result.modelAnswerSuggestions || []} />

        {onDownload && (

          <button

            type="button"

            onClick={onDownload}

            className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-all ${

              isDark

                ? 'text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-600'

                : 'text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200'

            }`}

          >

            <Download className="w-4 h-4" />

            Download report

          </button>

        )}

      </div>

    </div>

  );

};



export default SuperKalamMarksFooter;

