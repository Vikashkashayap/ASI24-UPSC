import React from 'react';
import { Award } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import {
  VisionEvaluationResult,
  OnTrackVerdict,
  getMarks,
} from '../../types/copyEvaluation';

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

const ON_TRACK_STYLE: Record<
  Exclude<OnTrackVerdict, ''>,
  { label: string; dark: string; light: string }
> = {
  ON_TRACK: {
    label: 'On Track',
    dark: 'text-emerald-300 bg-emerald-500/20 border-emerald-500/35',
    light: 'text-emerald-800 bg-emerald-50 border-emerald-200',
  },
  PARTIALLY_ON_TRACK: {
    label: 'Partially On Track',
    dark: 'text-amber-300 bg-amber-500/20 border-amber-500/35',
    light: 'text-amber-900 bg-amber-50 border-amber-200',
  },
  OFF_TRACK: {
    label: 'Off Track',
    dark: 'text-red-300 bg-red-500/20 border-red-500/35',
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
  const wl = result.wordLimitStatus || 'GOOD';
  const wlStyle = WORD_LIMIT_COLORS[wl] || WORD_LIMIT_COLORS.GOOD;
  const onTrackKey = (result.onTrackVerdict || '') as Exclude<OnTrackVerdict, ''>;
  const onTrackStyle = ON_TRACK_STYLE[onTrackKey];

  const examinerNote =
    result.examinerRemark ||
    result.onTrackExplanation ||
    result.overallFeedback ||
    result.summary ||
    '';

  return (
    <div
      className={`rounded-xl border p-5 ${
        isDark
          ? 'bg-slate-900/70 border-slate-700/60'
          : 'bg-white border-slate-200 shadow-sm'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={`p-2.5 rounded-lg ${
              isDark ? 'bg-blue-500/15' : 'bg-blue-50'
            }`}
          >
            <Award
              className={`w-6 h-6 ${isDark ? 'text-blue-300' : 'text-blue-600'}`}
            />
          </div>
          <div>
            <p
              className={`text-[10px] font-semibold uppercase tracking-wider ${
                isDark ? 'text-slate-500' : 'text-slate-500'
              }`}
            >
              Marks
            </p>
            <p className="text-3xl font-bold tabular-nums mt-0.5">
              <span className={isDark ? 'text-slate-100' : 'text-slate-900'}>
                {marks}
              </span>
              <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>
                {' '}
                / {result.maxMarks}
              </span>
            </p>
            {(subject || paper || fileName) && (
              <p
                className={`text-xs mt-1 truncate max-w-[260px] ${
                  isDark ? 'text-slate-500' : 'text-slate-500'
                }`}
              >
                {[subject, paper].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 sm:justify-end">
          {onTrackStyle && (
            <span
              className={`text-xs px-2.5 py-1 rounded-md border font-semibold ${
                isDark ? onTrackStyle.dark : onTrackStyle.light
              }`}
            >
              {onTrackStyle.label}
            </span>
          )}
          {result.wordCount != null && result.wordCount > 0 && (
            <span
              className={`text-xs px-2.5 py-1 rounded-md border ${
                isDark
                  ? 'bg-slate-800 text-slate-300 border-slate-600'
                  : 'bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              ~{result.wordCount} words
            </span>
          )}
          <span
            className={`text-xs px-2.5 py-1 rounded-md border font-semibold ${
              isDark ? wlStyle.dark : wlStyle.light
            }`}
          >
            Word limit: {wl}
          </span>
        </div>
      </div>

      {examinerNote && (
        <p
          className={`mt-4 pt-4 border-t text-sm leading-relaxed ${
            isDark
              ? 'border-slate-700/60 text-slate-300'
              : 'border-slate-100 text-slate-700'
          }`}
        >
          {examinerNote}
        </p>
      )}
    </div>
  );
};

export default EvaluationScoreHero;
