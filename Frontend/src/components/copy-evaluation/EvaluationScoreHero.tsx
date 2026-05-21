import React from 'react';

import { Award, TrendingUp } from 'lucide-react';

import { useTheme } from '../../hooks/useTheme';

import { Progress } from '../ui/progress';

import { VisionEvaluationResult, getMarks } from '../../types/copyEvaluation';



const WORD_LIMIT_COLORS: Record<string, { dark: string; light: string }> = {

  GOOD: {

    dark: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',

    light: 'text-emerald-800 bg-emerald-50 border-emerald-200',

  },

  SHORT: {

    dark: 'text-amber-400 bg-amber-500/15 border-amber-500/30',

    light: 'text-amber-800 bg-amber-50 border-amber-200',

  },

  LONG: {

    dark: 'text-orange-400 bg-orange-500/15 border-orange-500/30',

    light: 'text-orange-800 bg-orange-50 border-orange-200',

  },

  EXCESSIVE: {

    dark: 'text-red-400 bg-red-500/15 border-red-500/30',

    light: 'text-red-800 bg-red-50 border-red-200',

  },

};



interface Props {

  result: VisionEvaluationResult;

  subject?: string;

  paper?: string;

  fileName?: string;

}



export const EvaluationScoreHero: React.FC<Props> = ({

  result,

  subject,

  paper,

  fileName,

}) => {

  const { theme } = useTheme();

  const isDark = theme === 'dark';

  const marks = getMarks(result);

  const percentage = Math.round((marks / result.maxMarks) * 100);

  const wl = result.wordLimitStatus || 'GOOD';

  const wlStyle = WORD_LIMIT_COLORS[wl] || WORD_LIMIT_COLORS.GOOD;



  return (

    <div

      className={`relative overflow-hidden rounded-2xl p-5 xs:p-6 border ${

        isDark

          ? 'bg-gradient-to-br from-purple-950/50 via-slate-900/90 to-emerald-950/30 border-purple-500/25 shadow-2xl shadow-purple-900/20'

          : 'bg-gradient-to-br from-purple-50/90 via-white to-emerald-50/40 border-purple-200/50 shadow-xl shadow-purple-100/25'

      }`}

    >

      <div

        className={`absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl pointer-events-none ${

          isDark ? 'bg-fuchsia-500/15' : 'bg-purple-300/25'

        }`}

      />

      <div

        className={`absolute -bottom-12 -left-12 w-40 h-40 rounded-full blur-3xl pointer-events-none ${

          isDark ? 'bg-emerald-500/10' : 'bg-emerald-300/20'

        }`}

      />



      <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">

        <div className="flex items-center gap-4">

          <div

            className={`p-3.5 rounded-2xl ring-2 ${

              isDark

                ? 'bg-gradient-to-br from-fuchsia-500/25 to-purple-600/20 ring-fuchsia-500/30'

                : 'bg-gradient-to-br from-purple-100 to-fuchsia-50 ring-purple-200/60'

            }`}

          >

            <Award

              className={`w-8 h-8 ${

                isDark ? 'text-fuchsia-300' : 'text-purple-600'

              }`}

            />

          </div>

          <div>

            <p

              className={`text-[10px] font-bold uppercase tracking-[0.2em] ${

                isDark ? 'text-purple-300/80' : 'text-purple-600'

              }`}

            >

              Examiner Score

            </p>

            <p className="text-3xl xs:text-4xl font-bold tabular-nums mt-0.5">

              <span

                className={

                  isDark

                    ? 'text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 via-purple-300 to-emerald-300'

                    : 'text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-fuchsia-600 to-emerald-600'

                }

              >

                {marks}

              </span>

              <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>

                {' '}

                / {result.maxMarks}

              </span>

            </p>

            {(subject || paper || fileName) && (

              <p

                className={`text-xs mt-1.5 truncate max-w-[280px] ${

                  isDark ? 'text-slate-500' : 'text-slate-500'

                }`}

              >

                {[subject, paper, fileName].filter(Boolean).join(' · ')}

              </p>

            )}

          </div>

        </div>



        <div className="flex flex-col sm:flex-row gap-4 sm:items-end lg:min-w-[280px]">

          <div className="flex-1 sm:w-52 w-full">

            <div className="flex justify-between text-xs mb-2">

              <span

                className={`flex items-center gap-1 font-medium ${

                  isDark ? 'text-slate-400' : 'text-slate-600'

                }`}

              >

                <TrendingUp className="w-3.5 h-3.5" />

                Performance

              </span>

              <span

                className={`font-bold tabular-nums ${

                  isDark ? 'text-emerald-400' : 'text-emerald-600'

                }`}

              >

                {percentage}%

              </span>

            </div>

            <Progress value={percentage} className="h-2.5" />

          </div>

          <div className="flex gap-2 flex-wrap">

            {result.wordCount != null && result.wordCount > 0 && (

              <span

                className={`text-xs px-3 py-1.5 rounded-full border font-medium ${

                  isDark

                    ? 'bg-slate-800/80 text-slate-300 border-slate-600'

                    : 'bg-white/90 text-slate-700 border-slate-200 shadow-sm'

                }`}

              >

                ~{result.wordCount} words

              </span>

            )}

            <span

              className={`text-xs px-3 py-1.5 rounded-full border font-semibold ${

                isDark ? wlStyle.dark : wlStyle.light

              }`}

            >

              {wl}

            </span>

          </div>

        </div>

      </div>



      {(result.overallFeedback || result.summary) && (

        <p

          className={`relative mt-4 pt-4 border-t text-sm leading-relaxed ${

            isDark

              ? 'border-purple-500/20 text-slate-300'

              : 'border-purple-100 text-slate-700'

          }`}

        >

          {result.overallFeedback || result.summary}

        </p>

      )}

    </div>

  );

};



export default EvaluationScoreHero;

