import React, { memo } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { CalendarDays, CheckCircle2, Flame, Target } from "lucide-react";

interface PlannerStatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  tone?: string;
}

export const PlannerStatCard = memo(function PlannerStatCard({
  label,
  value,
  hint,
  icon: Icon = Target,
  tone = "bg-blue-50 text-blue-600",
}: PlannerStatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[20px] border border-slate-200/80 bg-white p-3.5 shadow-soft"
    >
      <span className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl ${tone}`}>
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-lg font-extrabold tabular-nums text-slate-900">{value}</p>
      {hint ? <p className="text-[11px] font-medium text-slate-500">{hint}</p> : null}
    </motion.div>
  );
});

interface GamificationStripProps {
  streak: number;
  longest: number;
  xp: number;
  level?: number;
}

export const GamificationStrip = memo(function GamificationStrip({
  streak,
  longest,
  xp,
  level = Math.max(1, Math.floor(xp / 100) + 1),
}: GamificationStripProps) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      <PlannerStatCard label="Current streak" value={`${streak}d`} icon={Flame} tone="bg-orange-50 text-orange-600" />
      <PlannerStatCard label="Best streak" value={`${longest}d`} icon={CheckCircle2} tone="bg-emerald-50 text-emerald-600" />
      <PlannerStatCard label="XP" value={String(xp)} icon={Target} tone="bg-violet-50 text-violet-600" />
      <PlannerStatCard label="Level" value={`Lv ${level}`} icon={CalendarDays} tone="bg-blue-50 text-blue-600" hint="Keep logging tasks" />
    </div>
  );
});

interface InsightCardProps {
  title: string;
  body: string;
  cta?: string;
  onAction?: () => void;
}

export const InsightCard = memo(function InsightCard({ title, body, cta, onAction }: InsightCardProps) {
  return (
    <div className="rounded-[20px] border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-4 shadow-soft">
      <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-600">{title}</p>
      <p className="mt-1 text-[13px] font-semibold leading-snug text-slate-800">{body}</p>
      {cta && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="app-chrome-btn mt-3 inline-flex h-10 items-center rounded-2xl bg-indigo-600 px-3 text-[12px] font-bold text-white"
        >
          {cta}
        </button>
      ) : null}
    </div>
  );
});
