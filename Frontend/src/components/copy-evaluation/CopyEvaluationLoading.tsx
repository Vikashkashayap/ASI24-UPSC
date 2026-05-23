import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  Upload,
  FileSearch,
  Brain,
  PenLine,
  ClipboardCheck,
  Target,
  BookOpen,
} from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

const LOADING_STEPS = [
  { icon: Upload, text: 'Uploading answer copy...' },
  { icon: FileSearch, text: 'Analyzing handwriting...' },
  { icon: Target, text: 'Understanding question demand...' },
  { icon: BookOpen, text: 'Evaluating introduction...' },
  { icon: Brain, text: 'Checking answer structure...' },
  { icon: PenLine, text: 'Reviewing body & conclusion...' },
  { icon: ClipboardCheck, text: 'Generating examiner feedback...' },
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
  const [stepIndex, setStepIndex] = useState(0);
  const isDark = theme === 'dark';

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((i) => (i + 1) % LOADING_STEPS.length);
    }, 2400);
    return () => clearInterval(interval);
  }, []);

  const StepIcon = LOADING_STEPS[stepIndex].icon;
  const displayProgress = progress ?? Math.min(95, 15 + stepIndex * 12);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border-2 p-8 xs:p-10 text-center ${
        isDark
          ? 'bg-gradient-to-br from-slate-900 via-blue-950/40 to-slate-900 border-blue-500/30'
          : 'bg-gradient-to-br from-white via-blue-50/50 to-white border-blue-200/60'
      }`}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl ${
            isDark ? 'bg-blue-500/20' : 'bg-blue-300/30'
          } animate-pulse`}
        />
        <div
          className={`absolute -bottom-16 -left-16 w-48 h-48 rounded-full blur-3xl ${
            isDark ? 'bg-emerald-500/15' : 'bg-emerald-300/25'
          } animate-pulse`}
          style={{ animationDelay: '1s' }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="relative">
          <div
            className={`w-20 h-20 rounded-2xl flex items-center justify-center ${
              isDark ? 'bg-blue-500/20' : 'bg-blue-100'
            }`}
          >
            <Sparkles
              className={`w-10 h-10 animate-pulse ${
                isDark ? 'text-indigo-400' : 'text-blue-600'
              }`}
            />
          </div>
          <div className="absolute -inset-2 rounded-3xl border-2 border-indigo-500/30 animate-ping opacity-40" />
        </div>

        <div>
          <h3
            className={`text-lg xs:text-xl font-bold mb-1 ${
              isDark ? 'text-slate-100' : 'text-slate-800'
            }`}
          >
            Premium Examiner Evaluation
          </h3>
          {fileName && (
            <p className={`text-xs truncate max-w-xs mx-auto ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              {fileName}
            </p>
          )}
        </div>

        <div
          className={`flex items-center gap-3 px-5 py-3 rounded-xl transition-all duration-500 min-w-[280px] ${
            isDark ? 'bg-slate-800/80 border border-slate-700/50' : 'bg-white border border-slate-200 shadow-sm'
          }`}
        >
          <StepIcon
            className={`w-5 h-5 flex-shrink-0 ${isDark ? 'text-indigo-400' : 'text-blue-600'}`}
          />
          <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            {LOADING_STEPS[stepIndex].text}
          </p>
        </div>

        <div className="w-full max-w-sm">
          <div className="flex justify-between text-xs mb-1.5">
            <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Progress</span>
            <span className="font-semibold tabular-nums">{displayProgress}%</span>
          </div>
          <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-700 ease-out"
              style={{ width: `${displayProgress}%` }}
            />
          </div>
          <p className={`text-[10px] mt-2 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
            Vision AI reads your handwriting directly — typically 1–3 minutes
          </p>
        </div>

        <div className="flex gap-1.5 flex-wrap justify-center max-w-xs">
          {LOADING_STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i === stepIndex
                  ? 'bg-indigo-500 scale-125'
                  : isDark
                    ? 'bg-slate-600'
                    : 'bg-slate-300'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CopyEvaluationLoading;
