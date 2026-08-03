import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Award, Clock, Gauge, Sparkles, BookOpen } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import {
  VisionEvaluationResult,
  OnTrackVerdict,
  getMarks,
  getGrade,
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
  createdAt?: string;
}

function CircularScore({
  marks,
  maxMarks,
  isDark,
}: {
  marks: number;
  maxMarks: number;
  isDark: boolean;
}) {
  const [animated, setAnimated] = useState(0);
  const pct = Math.min(100, Math.max(0, (marks / (maxMarks || 1)) * 100));
  const r = 54;
  const c = 2 * Math.PI * r;
  const offset = c - (animated / 100) * c;

  useEffect(() => {
    const t = requestAnimationFrame(() => setAnimated(pct));
    return () => cancelAnimationFrame(t);
  }, [pct]);

  return (
    <div className="relative w-[140px] h-[140px] flex-shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          strokeWidth="10"
          className={isDark ? 'stroke-slate-700' : 'stroke-slate-100'}
        />
        <motion.circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          className="stroke-blue-600"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className={`text-3xl font-bold tabular-nums leading-none ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
          {Number.isInteger(marks) ? marks : marks.toFixed(1)}
        </p>
        <p className={`text-xs mt-1 font-medium ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
          / {maxMarks}
        </p>
      </div>
    </div>
  );
}

export const EvaluationScoreHero: React.FC<Props> = ({
  result,
  subject,
  paper,
  fileName,
  createdAt,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const marks = getMarks(result);
  const maxMarks = result.maxMarks || 10;
  const grade = getGrade(result);
  const confidence = result.confidence ?? result.questionMeta?.confidence;
  const percentile = result.percentile;
  const evalTime = result.evaluationTimeSec;
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

  const metaItems = [
    {
      icon: Award,
      label: 'Grade',
      value: grade,
    },
    percentile != null && {
      icon: Gauge,
      label: 'Percentile',
      value: `${percentile}`,
    },
    confidence != null && {
      icon: Sparkles,
      label: 'Confidence',
      value: `${Math.round(confidence)}%`,
    },
    evalTime != null && {
      icon: Clock,
      label: 'Eval Time',
      value: evalTime < 60 ? `${evalTime}s` : `${Math.round(evalTime / 60)}m`,
    },
  ].filter(Boolean) as { icon: typeof Award; label: string; value: string }[];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className={`rounded-2xl border p-5 xs:p-6 ${
        isDark
          ? 'bg-slate-900/80 border-slate-700/60'
          : 'bg-white border-slate-200 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.1)]'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-6">
        <CircularScore marks={marks} maxMarks={maxMarks} isDark={isDark} />

        <div className="flex-1 min-w-0">
          <p
            className={`text-[10px] font-semibold uppercase tracking-[0.14em] mb-1 ${
              isDark ? 'text-slate-500' : 'text-slate-500'
            }`}
          >
            Overall Score
          </p>
          <h2
            className={`text-xl font-bold tracking-tight mb-3 ${
              isDark ? 'text-slate-50' : 'text-slate-900'
            }`}
          >
            Examiner Evaluation Complete
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {metaItems.map((item) => (
              <div
                key={item.label}
                className={`rounded-xl px-3 py-2.5 border ${
                  isDark
                    ? 'bg-slate-800/60 border-slate-700/50'
                    : 'bg-slate-50 border-slate-100'
                }`}
              >
                <div className="flex items-center gap-1 mb-0.5">
                  <item.icon className="w-3 h-3 text-slate-500" />
                  <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                    {item.label}
                  </span>
                </div>
                <p
                  className={`text-lg font-bold tabular-nums ${
                    item.label === 'Grade'
                      ? isDark
                        ? 'text-blue-300'
                        : 'text-blue-700'
                      : isDark
                        ? 'text-slate-100'
                        : 'text-slate-900'
                  }`}
                >
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
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
                ~{result.wordCount}
                {result.expectedWordCount ? ` / ${result.expectedWordCount}` : ''} words
              </span>
            )}
            <span
              className={`text-xs px-2.5 py-1 rounded-md border font-semibold ${
                isDark ? wlStyle.dark : wlStyle.light
              }`}
            >
              Word limit: {wl}
            </span>
            {(subject || paper) && (
              <span
                className={`text-xs px-2.5 py-1 rounded-md border truncate max-w-[200px] ${
                  isDark
                    ? 'bg-slate-800 text-slate-400 border-slate-600'
                    : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                {[subject, paper].filter(Boolean).join(' · ')}
              </span>
            )}
            {(result.knowledgeContextUsed || result.knowledgeMeta?.used) && (
              <span
                className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border font-semibold ${
                  isDark
                    ? 'text-indigo-300 bg-indigo-500/15 border-indigo-500/35'
                    : 'text-indigo-800 bg-indigo-50 border-indigo-200'
                }`}
                title={
                  result.knowledgeMeta?.documents?.length
                    ? `Grounded in: ${result.knowledgeMeta.documents.join(', ')}`
                    : 'Evaluated using MentorsDaily Knowledge Base'
                }
              >
                <BookOpen className="w-3 h-3" />
                KB grounded
                {result.knowledgeMeta?.chunkCount
                  ? ` · ${result.knowledgeMeta.chunkCount}`
                  : ''}
              </span>
            )}
            {(result.feedbackLanguage || result.answerLanguage) && (
              <span
                className={`text-xs px-2.5 py-1 rounded-md border font-semibold ${
                  isDark
                    ? 'text-sky-300 bg-sky-500/15 border-sky-500/35'
                    : 'text-sky-800 bg-sky-50 border-sky-200'
                }`}
              >
                {(result.feedbackLanguage || result.answerLanguage) === 'hi'
                  ? 'Feedback: Hindi'
                  : 'Feedback: English'}
              </span>
            )}
          </div>
        </div>
      </div>

      {examinerNote && (
        <p
          className={`mt-5 pt-4 border-t text-sm leading-relaxed ${
            isDark
              ? 'border-slate-700/60 text-slate-300'
              : 'border-slate-100 text-slate-700'
          }`}
        >
          {examinerNote}
        </p>
      )}

      {(fileName || createdAt) && (
        <p className="mt-2 text-[11px] text-slate-500">
          {[fileName, createdAt && new Date(createdAt).toLocaleString()].filter(Boolean).join(' · ')}
        </p>
      )}
    </motion.div>
  );
};

export default EvaluationScoreHero;
