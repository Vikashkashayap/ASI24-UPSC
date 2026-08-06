import React, { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { Flame, Clock3, Target, BookOpenCheck } from "lucide-react";

interface DailyProgressCardProps {
  progress: number;
  daysLeft: number;
  daysLabel: string;
  hoursLabel: string;
  minsLabel: string;
  secsLabel: string;
  examLabel: string;
  examDateLabel: string;
  studyHours: number;
  streak: number;
  questionsSolved?: number;
}

function ProgressRing({ value }: { value: number }) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, value));
  const offset = c - (clamped / 100) * c;

  return (
    <svg width="96" height="96" viewBox="0 0 96 96" className="shrink-0 -rotate-90" aria-hidden>
      <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="8" />
      <motion.circle
        cx="48"
        cy="48"
        r={r}
        fill="none"
        stroke="url(#mdProgressGrad)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
      <defs>
        <linearGradient id="mdProgressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export const DailyProgressCard = memo(function DailyProgressCard({
  progress,
  daysLeft,
  daysLabel,
  hoursLabel,
  minsLabel,
  secsLabel,
  examLabel,
  examDateLabel,
  studyHours,
  streak,
  questionsSolved = 0,
}: DailyProgressCardProps) {
  const tiles = useMemo(
    () => [
      { k: "Days", v: daysLabel },
      { k: "Hrs", v: hoursLabel },
      { k: "Mins", v: minsLabel },
      { k: "Secs", v: secsLabel },
    ],
    [daysLabel, hoursLabel, minsLabel, secsLabel]
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 }}
      className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-[#0f1e3d] via-[#1a3366] to-[#1e3a6e] p-4 sm:p-5 text-white shadow-[0_16px_40px_rgba(15,30,61,0.28)]"
      aria-label="Daily progress and exam countdown"
    >
      <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-blue-400/20 blur-2xl" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/60">
            Exam Countdown
          </p>
          <h2 className="mt-1 text-lg font-bold tracking-tight">{examLabel}</h2>
          <p className="mt-0.5 text-xs text-white/65">{examDateLabel}</p>
        </div>
        <div className="relative flex h-24 w-24 items-center justify-center">
          <ProgressRing value={progress} />
          <div className="absolute inset-0 flex rotate-0 flex-col items-center justify-center">
            <span className="text-lg font-extrabold tabular-nums">{Math.round(progress)}%</span>
            <span className="text-[9px] font-semibold uppercase tracking-wide text-white/55">
              Done
            </span>
          </div>
        </div>
      </div>

      <div className="relative mt-4 grid grid-cols-4 gap-2">
        {tiles.map((t) => (
          <div
            key={t.k}
            className="rounded-2xl bg-white/10 ring-1 ring-white/10 px-1 py-2.5 text-center backdrop-blur-sm"
          >
            <p className="text-lg sm:text-xl font-extrabold tabular-nums tracking-tight">{t.v}</p>
            <p className="text-[9px] font-bold uppercase tracking-wider text-white/55">{t.k}</p>
          </div>
        ))}
      </div>

      <div className="relative mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="flex items-center gap-2 rounded-2xl bg-white/8 px-3 py-2.5 ring-1 ring-white/10">
          <Clock3 className="h-4 w-4 text-blue-300 shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] text-white/55 font-semibold">Study Time</p>
            <p className="text-sm font-bold truncate">{studyHours}h / day</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-white/8 px-3 py-2.5 ring-1 ring-white/10">
          <BookOpenCheck className="h-4 w-4 text-emerald-300 shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] text-white/55 font-semibold">Questions</p>
            <p className="text-sm font-bold truncate">{questionsSolved}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-white/8 px-3 py-2.5 ring-1 ring-white/10">
          <Flame className="h-4 w-4 text-orange-300 shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] text-white/55 font-semibold">Streak</p>
            <p className="text-sm font-bold truncate">{streak} day{streak === 1 ? "" : "s"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-white/8 px-3 py-2.5 ring-1 ring-white/10">
          <Target className="h-4 w-4 text-violet-300 shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] text-white/55 font-semibold">Days left</p>
            <p className="text-sm font-bold truncate">{daysLeft}</p>
          </div>
        </div>
      </div>

      <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-400"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, progress)}%` }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      </div>
      <p className="relative mt-2 text-[11px] text-white/60">
        {Math.round(progress)}% elapsed · {daysLeft} days left to Prelims
      </p>
    </motion.section>
  );
});
