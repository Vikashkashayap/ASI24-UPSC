import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileSearch,
  PenLine,
  HelpCircle,
  BookOpenCheck,
  MessageSquareText,
  Calculator,
  FileCheck2,
  Check,
} from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

const LOADING_STEPS = [
  { icon: Upload, text: 'Uploading PDF', detail: 'Securely transferring your answer copy' },
  { icon: FileSearch, text: 'Extracting Text', detail: 'Reading pages and layout' },
  { icon: PenLine, text: 'Reading Handwriting', detail: 'Transcribing your written answer' },
  { icon: HelpCircle, text: 'Understanding Question', detail: 'Detecting paper, demand & marks' },
  {
    icon: BookOpenCheck,
    text: 'Comparing with UPSC Model Answer',
    detail: 'Matching expected dimensions & keywords',
  },
  {
    icon: MessageSquareText,
    text: 'Generating Feedback',
    detail: 'Line-by-line examiner remarks',
  },
  { icon: Calculator, text: 'Calculating Marks', detail: 'Applying UPSC-style rubric' },
  { icon: FileCheck2, text: 'Preparing Report', detail: 'Building your evaluation dashboard' },
];

interface CopyEvaluationLoadingProps {
  fileName?: string;
  progress?: number;
}

export const CopyEvaluationLoading: React.FC<CopyEvaluationLoadingProps> = ({
  fileName,
  progress,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((i) => {
        if (i >= LOADING_STEPS.length - 1) return i;
        return i + 1;
      });
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  // Sync step loosely with progress when provided
  useEffect(() => {
    if (progress == null) return;
    const mapped = Math.min(
      LOADING_STEPS.length - 1,
      Math.floor((progress / 100) * LOADING_STEPS.length)
    );
    setStepIndex((prev) => Math.max(prev, mapped));
  }, [progress]);

  const displayProgress =
    progress ?? Math.min(94, 8 + stepIndex * Math.floor(86 / LOADING_STEPS.length));
  const CurrentIcon = LOADING_STEPS[stepIndex].icon;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-6 xs:p-8 sm:p-10 ${
        isDark
          ? 'bg-slate-900/90 border-slate-700/60'
          : 'bg-white border-slate-200 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.1)]'
      }`}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ opacity: [0.3, 0.55, 0.3], scale: [1, 1.08, 1] }}
          transition={{ repeat: Infinity, duration: 4 }}
          className={`absolute -top-24 -right-20 w-72 h-72 rounded-full blur-3xl ${
            isDark ? 'bg-blue-600/20' : 'bg-blue-400/25'
          }`}
        />
        <motion.div
          animate={{ opacity: [0.2, 0.4, 0.2] }}
          transition={{ repeat: Infinity, duration: 5, delay: 1 }}
          className={`absolute -bottom-20 -left-16 w-56 h-56 rounded-full blur-3xl ${
            isDark ? 'bg-emerald-500/15' : 'bg-emerald-300/30'
          }`}
        />
      </div>

      <div className="relative z-10 max-w-lg mx-auto">
        <div className="text-center mb-8">
          <motion.div
            key={stepIndex}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative inline-flex mb-5"
          >
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                isDark ? 'bg-blue-500/20' : 'bg-blue-100'
              }`}
            >
              <CurrentIcon
                className={`w-8 h-8 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
              />
            </div>
            <motion.span
              className="absolute -inset-2 rounded-3xl border-2 border-blue-500/30"
              animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
          </motion.div>

          <h3
            className={`text-lg xs:text-xl font-bold tracking-tight ${
              isDark ? 'text-slate-100' : 'text-slate-900'
            }`}
          >
            AI Examiner at Work
          </h3>
          {fileName && (
            <p className="text-xs mt-1 truncate max-w-xs mx-auto text-slate-500">
              {fileName}
            </p>
          )}
        </div>

        {/* Active step callout */}
        <AnimatePresence mode="wait">
          <motion.div
            key={LOADING_STEPS[stepIndex].text}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className={`mb-6 px-4 py-3.5 rounded-xl text-center ${
              isDark
                ? 'bg-slate-800/80 border border-slate-700/50'
                : 'bg-slate-50 border border-slate-200'
            }`}
          >
            <p
              className={`text-sm font-semibold ${
                isDark ? 'text-slate-100' : 'text-slate-800'
              }`}
            >
              {LOADING_STEPS[stepIndex].text}
            </p>
            <p className="text-xs mt-0.5 text-slate-500">
              {LOADING_STEPS[stepIndex].detail}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Vertical step list */}
        <ol className="space-y-0 mb-8">
          {LOADING_STEPS.map((step, i) => {
            const done = i < stepIndex;
            const active = i === stepIndex;
            const Icon = step.icon;
            return (
              <li key={step.text} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <motion.div
                    animate={
                      active
                        ? { scale: [1, 1.08, 1] }
                        : { scale: 1 }
                    }
                    transition={
                      active
                        ? { repeat: Infinity, duration: 1.6 }
                        : undefined
                    }
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border ${
                      done
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : active
                          ? isDark
                            ? 'bg-blue-500/25 border-blue-400 text-blue-300'
                            : 'bg-blue-100 border-blue-500 text-blue-600'
                          : isDark
                            ? 'bg-slate-800 border-slate-700 text-slate-600'
                            : 'bg-slate-100 border-slate-200 text-slate-400'
                    }`}
                  >
                    {done ? (
                      <Check className="w-4 h-4" strokeWidth={3} />
                    ) : (
                      <Icon className="w-3.5 h-3.5" />
                    )}
                  </motion.div>
                  {i < LOADING_STEPS.length - 1 && (
                    <div
                      className={`w-0.5 flex-1 min-h-[18px] my-0.5 ${
                        done
                          ? 'bg-emerald-500'
                          : isDark
                            ? 'bg-slate-700'
                            : 'bg-slate-200'
                      }`}
                    />
                  )}
                </div>
                <div className={`pb-3 pt-1.5 ${i === LOADING_STEPS.length - 1 ? 'pb-0' : ''}`}>
                  <p
                    className={`text-sm font-medium leading-tight ${
                      done || active
                        ? isDark
                          ? 'text-slate-200'
                          : 'text-slate-800'
                        : isDark
                          ? 'text-slate-600'
                          : 'text-slate-400'
                    }`}
                  >
                    {step.text}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Progress</span>
            <span className="font-semibold tabular-nums">{displayProgress}%</span>
          </div>
          <div
            className={`h-2 rounded-full overflow-hidden ${
              isDark ? 'bg-slate-800' : 'bg-slate-200'
            }`}
          >
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-400"
              initial={{ width: 0 }}
              animate={{ width: `${displayProgress}%` }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            />
          </div>
          <p className="text-[11px] mt-2.5 text-center text-slate-500">
            Typically 1–3 minutes · Please keep this tab open
          </p>
        </div>
      </div>
    </div>
  );
};

export default CopyEvaluationLoading;
