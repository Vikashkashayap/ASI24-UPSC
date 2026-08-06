import React, { memo } from "react";
import { motion } from "framer-motion";
import { Award, Flame, Target, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface BadgeCardProps {
  title: string;
  description: string;
  unlocked?: boolean;
  icon?: LucideIcon;
}

export const BadgeCard = memo(function BadgeCard({
  title,
  description,
  unlocked = false,
  icon: Icon = Award,
}: BadgeCardProps) {
  return (
    <div
      className={`rounded-[20px] border p-4 shadow-soft ${
        unlocked
          ? "border-amber-200 bg-gradient-to-br from-amber-50 to-white"
          : "border-slate-200/80 bg-slate-50 opacity-70"
      }`}
    >
      <span
        className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${
          unlocked ? "bg-amber-100 text-amber-600" : "bg-slate-200 text-slate-400"
        }`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-2 text-[13px] font-bold text-slate-900">{title}</p>
      <p className="mt-0.5 text-[11px] font-medium text-slate-500">{description}</p>
    </div>
  );
});

export const ACHIEVEMENT_PRESETS: { title: string; description: string; icon: LucideIcon; key: string }[] = [
  { key: "streak", title: "Study Streak", description: "3+ consistent days", icon: Flame },
  { key: "tests", title: "100 Tests", description: "Complete 100 attempts", icon: Target },
  { key: "fast", title: "Fast Learner", description: "High weekly growth", icon: Zap },
  { key: "top", title: "Top Performer", description: "80%+ accuracy band", icon: Award },
];

interface EvaluationCardProps {
  structure?: number;
  content?: number;
  introduction?: number;
  body?: number;
  conclusion?: number;
  presentation?: number;
  handwriting?: number;
  expectedScore?: string;
  suggestions?: string[];
}

export const EvaluationCard = memo(function EvaluationCard({
  structure = 0,
  content = 0,
  introduction = 0,
  body = 0,
  conclusion = 0,
  presentation = 0,
  handwriting = 0,
  expectedScore,
  suggestions = [],
}: EvaluationCardProps) {
  const rows = [
    { label: "Structure", value: structure },
    { label: "Content", value: content },
    { label: "Introduction", value: introduction },
    { label: "Body", value: body },
    { label: "Conclusion", value: conclusion },
    { label: "Presentation", value: presentation },
    { label: "Handwriting", value: handwriting },
  ].filter((r) => r.value > 0);

  return (
    <section className="rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-soft">
      <h3 className="text-sm font-bold text-slate-900">AI Copy Analysis</h3>
      {expectedScore ? (
        <p className="mt-1 text-[12px] font-semibold text-blue-600">Expected UPSC score · {expectedScore}</p>
      ) : null}
      <div className="mt-3 space-y-2.5">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="mb-1 flex justify-between text-[11px] font-semibold">
              <span className="text-slate-600">{r.label}</span>
              <span className="tabular-nums text-slate-900">{Math.round(r.value)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, r.value)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      {suggestions.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {suggestions.slice(0, 4).map((s) => (
            <li key={s} className="rounded-xl bg-slate-50 px-3 py-2 text-[12px] font-medium text-slate-600">
              {s}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
});

interface ReportCardProps {
  title: string;
  description: string;
  locked?: boolean;
  progress?: number;
  onDownload?: () => void;
  downloading?: boolean;
  children?: React.ReactNode;
}

export const ReportCard = memo(function ReportCard({
  title,
  description,
  locked,
  progress = 0,
  onDownload,
  downloading,
  children,
}: ReportCardProps) {
  return (
    <section className="rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-soft">
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      <p className="mt-0.5 text-[12px] font-medium text-slate-500">{description}</p>
      {children}
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>
      <button
        type="button"
        disabled={locked || downloading || !onDownload}
        onClick={onDownload}
        className="app-chrome-btn mt-3 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-blue-600 text-[12px] font-bold text-white disabled:opacity-50"
      >
        {locked ? "Locked" : downloading ? "Preparing…" : "Download PDF"}
      </button>
    </section>
  );
});
