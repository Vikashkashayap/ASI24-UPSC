import React from 'react';
import { motion } from 'framer-motion';
import { Check, X, Tags, FileQuestion } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { KeywordAnalysis, VisionEvaluationResult } from '../../types/copyEvaluation';

interface KeywordProps {
  keywords?: KeywordAnalysis;
  questionText?: string;
  studentAnswer?: string;
  wordCount?: number;
  expectedWordCount?: number;
}

export const QuestionAnalysisPanel: React.FC<KeywordProps> = ({
  keywords = {},
  questionText,
  wordCount,
  expectedWordCount,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const expected = keywords.expected || [];
  const covered = keywords.covered || [];
  const missing = keywords.missing || [];
  const extra = keywords.extra || [];

  const hasKeywords = expected.length || covered.length || missing.length || extra.length;
  if (!questionText && !hasKeywords && wordCount == null) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-4 xs:p-5 space-y-4 ${
        isDark
          ? 'bg-slate-900/50 border-slate-700/50'
          : 'bg-white border-slate-200 shadow-sm'
      }`}
    >
      <div className="flex items-center gap-2">
        <FileQuestion className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
        <h3 className={`text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
          Question Analysis
        </h3>
      </div>

      {questionText && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Question
          </p>
          <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            {questionText}
          </p>
        </div>
      )}

      {(wordCount != null || expectedWordCount != null) && (
        <div className="flex gap-4 text-xs">
          {wordCount != null && (
            <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>
              Word count: <strong>{wordCount}</strong>
            </span>
          )}
          {expectedWordCount != null && (
            <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>
              Expected: <strong>{expectedWordCount}</strong>
            </span>
          )}
        </div>
      )}

      {hasKeywords && (
        <div className="space-y-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/50">
          <div className="flex items-center gap-1.5">
            <Tags className="w-3.5 h-3.5 text-slate-500" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Keywords
            </p>
          </div>
          <KeywordGroup label="Expected" items={expected} tone="neutral" isDark={isDark} />
          <KeywordGroup label="Covered" items={covered} tone="good" isDark={isDark} />
          <KeywordGroup label="Missing" items={missing} tone="bad" isDark={isDark} />
          <KeywordGroup label="Extra Points" items={extra} tone="info" isDark={isDark} />
        </div>
      )}
    </motion.div>
  );
};

function KeywordGroup({
  label,
  items,
  tone,
  isDark,
}: {
  label: string;
  items: string[];
  tone: 'good' | 'bad' | 'neutral' | 'info';
  isDark: boolean;
}) {
  if (!items.length) return null;
  const chip =
    tone === 'good'
      ? isDark
        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : tone === 'bad'
        ? isDark
          ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
          : 'bg-rose-50 text-rose-800 border-rose-200'
        : tone === 'info'
          ? isDark
            ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
            : 'bg-blue-50 text-blue-800 border-blue-200'
          : isDark
            ? 'bg-slate-800 text-slate-300 border-slate-600'
            : 'bg-slate-50 text-slate-700 border-slate-200';

  return (
    <div>
      <p className={`text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((k, i) => (
          <span
            key={`${k}-${i}`}
            className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border ${chip}`}
          >
            {tone === 'good' && <Check className="w-3 h-3" />}
            {tone === 'bad' && <X className="w-3 h-3" />}
            {k}
          </span>
        ))}
      </div>
    </div>
  );
}

interface MissingChecklistProps {
  covered?: string[];
  missing?: string[];
}

export const MissingContentChecklist: React.FC<MissingChecklistProps> = ({
  covered = [],
  missing = [],
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  if (!covered.length && !missing.length) return null;

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
      <h3 className={`text-sm font-bold mb-3 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
        Missing Content Checklist
      </h3>
      <ul className="space-y-2">
        {covered.map((item, i) => (
          <li
            key={`c-${i}`}
            className={`flex items-start gap-2.5 text-sm ${
              isDark ? 'text-slate-300' : 'text-slate-700'
            }`}
          >
            <span className="mt-0.5 w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 bg-emerald-500/15 text-emerald-500">
              <Check className="w-3.5 h-3.5" strokeWidth={3} />
            </span>
            {item}
          </li>
        ))}
        {missing.map((item, i) => (
          <li
            key={`m-${i}`}
            className={`flex items-start gap-2.5 text-sm ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            <span className="mt-0.5 w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 bg-rose-500/15 text-rose-500">
              <X className="w-3.5 h-3.5" strokeWidth={3} />
            </span>
            {item}
          </li>
        ))}
      </ul>
    </motion.div>
  );
};

export const deriveCoveredFromResult = (result: VisionEvaluationResult): string[] => {
  if (result.coveredPoints?.length) return result.coveredPoints;
  return result.questionDemand?.expectedPoints || [];
};

export default QuestionAnalysisPanel;
