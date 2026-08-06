import React, { memo } from "react";
import { motion } from "framer-motion";
import { Bookmark, Clock3, Sparkles } from "lucide-react";

interface SubjectAnalyticsCardProps {
  title: string;
  progress?: number;
  accuracy?: number;
  averageScore?: number;
  weakTopics?: string[];
  strongTopics?: string[];
  revisionPending?: number;
  practicePending?: number;
  estimatedCompletion?: string;
}

export const SubjectAnalyticsCard = memo(function SubjectAnalyticsCard({
  title,
  progress = 0,
  accuracy,
  averageScore,
  weakTopics = [],
  strongTopics = [],
  revisionPending,
  practicePending,
  estimatedCompletion,
}: SubjectAnalyticsCardProps) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-soft"
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-[15px] font-bold text-slate-900">{title}</h4>
        {accuracy != null ? (
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
            {Math.round(accuracy)}% acc
          </span>
        ) : null}
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, progress)}%` }}
          transition={{ duration: 0.6 }}
        />
      </div>
      <p className="mt-1 text-[11px] font-semibold text-slate-400">{Math.round(progress)}% complete</p>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-medium text-slate-600">
        {averageScore != null ? <span>Avg score · {Math.round(averageScore)}</span> : null}
        {revisionPending != null ? <span>Revision · {revisionPending}</span> : null}
        {practicePending != null ? <span>Practice · {practicePending}</span> : null}
        {estimatedCompletion ? (
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5" /> {estimatedCompletion}
          </span>
        ) : null}
      </div>

      {strongTopics.length > 0 ? (
        <div className="mt-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">Strong</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {strongTopics.slice(0, 3).map((t) => (
              <span key={t} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                {t}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {weakTopics.length > 0 ? (
        <div className="mt-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-amber-600">Needs work</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {weakTopics.slice(0, 3).map((t) => (
              <span key={t} className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                {t}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </motion.article>
  );
});

interface TopicAnalyticsCardProps {
  title: string;
  progress?: number;
  accuracy?: number;
  averageTime?: string;
  mistakes?: number;
  attempts?: number;
  bookmarked?: boolean;
  recommendation?: string;
}

export const TopicAnalyticsCard = memo(function TopicAnalyticsCard({
  title,
  progress = 0,
  accuracy,
  averageTime,
  mistakes,
  attempts,
  bookmarked,
  recommendation,
}: TopicAnalyticsCardProps) {
  return (
    <details className="group overflow-hidden rounded-[20px] border border-slate-200/80 bg-white shadow-soft open:shadow-md">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <h4 className="text-[14px] font-bold text-slate-900">{title}</h4>
          <p className="mt-0.5 text-[11px] font-medium text-slate-500">
            {Math.round(progress)}% · {accuracy != null ? `${Math.round(accuracy)}% accuracy` : "—"}
          </p>
        </div>
        {bookmarked ? <Bookmark className="h-4 w-4 fill-amber-400 text-amber-500" /> : null}
      </summary>
      <div className="space-y-2 border-t border-slate-100 px-4 pb-4 pt-3 text-[12px] font-medium text-slate-600">
        {averageTime ? <p>Avg time · {averageTime}</p> : null}
        {mistakes != null ? <p>Mistakes · {mistakes}</p> : null}
        {attempts != null ? <p>Attempts · {attempts}</p> : null}
        {recommendation ? (
          <p className="inline-flex items-start gap-1.5 rounded-2xl bg-indigo-50 px-3 py-2 text-indigo-700">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {recommendation}
          </p>
        ) : null}
      </div>
    </details>
  );
});
