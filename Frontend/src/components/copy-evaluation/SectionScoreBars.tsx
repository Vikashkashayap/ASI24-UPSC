import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { SectionScores } from '../../types/copyEvaluation';

/** Core UPSC 10-scale rubric (sums to 10). */
const CORE_LABELS: { key: keyof SectionScores; label: string; max: number }[] = [
  { key: 'understanding', label: 'Understanding', max: 2 },
  { key: 'content', label: 'Content', max: 3 },
  { key: 'analysis', label: 'Analysis', max: 2 },
  { key: 'examples', label: 'Examples', max: 1 },
  { key: 'structure', label: 'Structure', max: 1 },
  { key: 'presentation', label: 'Presentation', max: 1 },
];

/** Qualitative extras — shown separately, not part of 10-scale. */
const EXTRA_LABELS: { key: keyof SectionScores; label: string; max: number }[] = [
  { key: 'currentAffairs', label: 'Current Affairs', max: 1 },
  { key: 'language', label: 'Language', max: 1 },
];

interface Props {
  scores?: SectionScores;
  maxMarks?: number;
  obtainedMarks?: number;
}

export const SectionScoreBars: React.FC<Props> = ({
  scores = {},
  maxMarks = 10,
  obtainedMarks,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const core = CORE_LABELS.map((l) => {
    const raw = scores[l.key];
    if (raw == null) return null;
    return { ...l, value: Number(raw) };
  }).filter(Boolean) as { key: string; label: string; max: number; value: number }[];

  const extras = EXTRA_LABELS.map((l) => {
    const raw = scores[l.key];
    if (raw == null) return null;
    return { ...l, value: Number(raw) };
  }).filter(Boolean) as { key: string; label: string; max: number; value: number }[];

  if (!core.length && !extras.length) {
    const custom = Object.entries(scores)
      .filter(([, v]) => v != null)
      .map(([key, value]) => ({
        key,
        label: key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
        max: 2,
        value: Number(value),
      }));
    if (!custom.length) return null;
    return <Bars entries={custom} isDark={isDark} footer={null} />;
  }

  const sum10 = core.reduce((s, e) => s + e.value, 0);
  const footer = (
    <p className={`text-xs mt-4 pt-3 border-t ${isDark ? 'border-slate-700 text-slate-400' : 'border-slate-100 text-slate-500'}`}>
      Rubric {sum10.toFixed(sum10 % 1 ? 1 : 0)}/10
      {obtainedMarks != null && maxMarks
        ? ` · Overall ${Number.isInteger(obtainedMarks) ? obtainedMarks : obtainedMarks.toFixed(1)}/${maxMarks}`
        : ''}
    </p>
  );

  return (
    <div className="space-y-4">
      <Bars
        entries={core.length ? core : extras}
        isDark={isDark}
        footer={core.length ? footer : null}
        title="Section-wise Score"
        subtitle="UPSC 10-point rubric"
      />
      {core.length > 0 && extras.length > 0 && (
        <Bars
          entries={extras}
          isDark={isDark}
          footer={null}
          title="Qualitative"
          subtitle="Not added to rubric total"
        />
      )}
    </div>
  );
};

function Bars({
  entries,
  isDark,
  footer,
  title = 'Section-wise Score',
  subtitle,
}: {
  entries: { key: string; label: string; max: number; value: number }[];
  isDark: boolean;
  footer: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-4 xs:p-5 ${
        isDark
          ? 'bg-slate-900/50 border-slate-700/50'
          : 'bg-white border-slate-200 shadow-sm'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <BarChart3 className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
        <h3 className={`text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
          {title}
        </h3>
      </div>
      {subtitle && (
        <p className={`text-xs mb-4 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
          {subtitle}
        </p>
      )}
      {!subtitle && <div className="mb-3" />}
      <div className="space-y-3.5">
        {entries.map((e, i) => {
          const pct = Math.min(100, (e.value / (e.max || 1)) * 100);
          const barColor =
            pct >= 80
              ? 'from-emerald-500 to-emerald-400'
              : pct >= 50
                ? 'from-blue-600 to-sky-400'
                : pct >= 30
                  ? 'from-amber-500 to-orange-400'
                  : 'from-red-500 to-rose-400';
          return (
            <div key={e.key}>
              <div className="flex justify-between text-xs mb-1.5">
                <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{e.label}</span>
                <span className="font-semibold tabular-nums text-slate-500">
                  {Number.isInteger(e.value) ? e.value : e.value.toFixed(1)}/{e.max}
                </span>
              </div>
              <div
                className={`h-2 rounded-full overflow-hidden ${
                  isDark ? 'bg-slate-800' : 'bg-slate-100'
                }`}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ delay: 0.1 + i * 0.06, duration: 0.7, ease: 'easeOut' }}
                  className={`h-full rounded-full bg-gradient-to-r ${barColor}`}
                />
              </div>
            </div>
          );
        })}
      </div>
      {footer}
    </motion.div>
  );
}

export default SectionScoreBars;
