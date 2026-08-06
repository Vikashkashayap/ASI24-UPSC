import React, { memo } from "react";
import { motion } from "framer-motion";
import {
  Play,
  RotateCcw,
  Eye,
  Clock,
  FileText,
  Loader2,
  BookOpen,
  Lock,
} from "lucide-react";

export type TestCardStatus = "live" | "upcoming" | "locked" | "in_progress" | "done" | "not_started";

interface TestCardProps {
  title: string;
  subject?: string;
  difficulty?: string;
  durationMinutes?: number;
  questions?: number;
  marks?: number;
  language?: string;
  attemptCount?: number;
  progress?: number;
  scoreLabel?: string;
  meta?: string;
  status: TestCardStatus;
  accent?: "blue" | "amber" | "violet" | "emerald";
  starting?: boolean;
  onStart?: () => void;
  onResume?: () => void;
  onReview?: () => void;
}

const ACCENT = {
  blue: {
    icon: "bg-blue-50 text-blue-600",
    cta: "bg-blue-600 hover:bg-blue-700 shadow-blue-600/25",
    ring: "hover:border-blue-300",
  },
  amber: {
    icon: "bg-amber-50 text-amber-600",
    cta: "bg-amber-600 hover:bg-amber-700 shadow-amber-600/25",
    ring: "hover:border-amber-300",
  },
  violet: {
    icon: "bg-violet-50 text-violet-600",
    cta: "bg-violet-600 hover:bg-violet-700 shadow-violet-600/25",
    ring: "hover:border-violet-300",
  },
  emerald: {
    icon: "bg-emerald-50 text-emerald-600",
    cta: "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25",
    ring: "hover:border-emerald-300",
  },
};

const STATUS_BADGE: Record<TestCardStatus, string> = {
  live: "bg-emerald-50 text-emerald-700",
  upcoming: "bg-sky-50 text-sky-700",
  locked: "bg-slate-100 text-slate-500",
  in_progress: "bg-amber-50 text-amber-700",
  done: "bg-emerald-50 text-emerald-700",
  not_started: "bg-slate-100 text-slate-600",
};

const STATUS_LABEL: Record<TestCardStatus, string> = {
  live: "Live",
  upcoming: "Upcoming",
  locked: "Locked",
  in_progress: "In progress",
  done: "Completed",
  not_started: "Not started",
};

export const TestCard = memo(function TestCard({
  title,
  subject,
  difficulty,
  durationMinutes,
  questions,
  marks,
  language,
  attemptCount,
  progress,
  scoreLabel,
  meta,
  status,
  accent = "blue",
  starting,
  onStart,
  onResume,
  onReview,
}: TestCardProps) {
  const tone = ACCENT[accent];

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      className={`group relative flex flex-col overflow-hidden rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-soft transition-colors ${tone.ring}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 opacity-80" />

      <div className="flex items-start justify-between gap-2">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${tone.icon}`}>
          {status === "locked" ? <Lock className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_BADGE[status]}`}>
          {STATUS_LABEL[status]}
        </span>
      </div>

      <h3 className="mt-3 min-h-[2.5rem] text-[15px] font-bold leading-snug text-slate-900 line-clamp-2" title={title}>
        {title}
      </h3>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {subject ? (
          <span className="max-w-[60%] truncate text-[12px] font-semibold text-slate-600">{subject}</span>
        ) : null}
        {difficulty ? (
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold capitalize text-slate-600">
            {difficulty}
          </span>
        ) : null}
        {language ? (
          <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">{language}</span>
        ) : null}
      </div>

      <div className="mt-3 space-y-1.5 text-[11px] font-medium text-slate-500">
        {(questions != null || durationMinutes != null || marks != null) && (
          <div className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span>
              {questions != null ? `${questions} Q` : null}
              {durationMinutes != null ? `${questions != null ? " · " : ""}${durationMinutes} min` : null}
              {marks != null ? ` · ${marks} marks` : null}
            </span>
          </div>
        )}
        {meta ? (
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{meta}</span>
          </div>
        ) : null}
        {attemptCount != null ? (
          <p className="text-[10px] font-semibold text-slate-400">Attempts: {attemptCount}</p>
        ) : null}
      </div>

      {typeof progress === "number" && progress > 0 && status !== "done" ? (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, progress)}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      ) : null}

      {scoreLabel ? (
        <div className="mt-3 rounded-xl bg-emerald-50 px-2.5 py-2 text-sm font-bold text-emerald-700">{scoreLabel}</div>
      ) : (
        <div className="mt-3 h-[38px]" aria-hidden />
      )}

      <div className="mt-auto pt-3">
        {status === "done" && onReview ? (
          <button
            type="button"
            onClick={onReview}
            className="app-chrome-btn inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white text-[12px] font-bold text-slate-700 active:scale-[0.98]"
          >
            <Eye className="h-3.5 w-3.5" /> Review
          </button>
        ) : status === "in_progress" && onResume ? (
          <button
            type="button"
            onClick={onResume}
            className={`app-chrome-btn inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl text-[12px] font-bold text-white shadow-md active:scale-[0.98] ${tone.cta}`}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Resume
          </button>
        ) : status === "locked" ? (
          <button
            type="button"
            disabled
            className="app-chrome-btn inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl bg-slate-100 text-[12px] font-bold text-slate-400"
          >
            <Lock className="h-3.5 w-3.5" /> Locked
          </button>
        ) : onStart ? (
          <button
            type="button"
            onClick={onStart}
            disabled={starting}
            className={`app-chrome-btn inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl text-[12px] font-bold text-white shadow-md active:scale-[0.98] disabled:opacity-60 ${tone.cta}`}
          >
            {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            Start Test
          </button>
        ) : null}
      </div>
    </motion.article>
  );
});
