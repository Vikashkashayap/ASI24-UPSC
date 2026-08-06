import React, { memo } from "react";
import { motion } from "framer-motion";
import { Play, Clock } from "lucide-react";

interface ContinueLearningCardProps {
  subject: string;
  title: string;
  progress: number;
  eta?: string;
  onContinue: () => void;
}

export const ContinueLearningCard = memo(function ContinueLearningCard({
  subject,
  title,
  progress,
  eta,
  onContinue,
}: ContinueLearningCardProps) {
  const pct = Math.min(100, Math.max(0, progress));

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.08 }}
      className="rounded-[20px] border border-slate-200/80 bg-white p-4 sm:p-5 shadow-soft"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
            Continue Learning
          </p>
          <p className="mt-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
            {subject}
          </p>
          <h3 className="mt-0.5 text-base font-bold text-slate-900 leading-snug line-clamp-2">
            {title}
          </h3>
          {eta ? (
            <p className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-medium text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              {eta}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onContinue}
          className="app-chrome-btn shrink-0 inline-flex h-12 items-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white shadow-md shadow-blue-600/25 active:scale-95 transition-transform"
        >
          <Play className="h-4 w-4 fill-white" />
          Continue
        </button>
      </div>
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-slate-500">
          <span>Remaining progress</span>
          <span className="tabular-nums text-slate-700">{pct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.7 }}
          />
        </div>
      </div>
    </motion.section>
  );
});
