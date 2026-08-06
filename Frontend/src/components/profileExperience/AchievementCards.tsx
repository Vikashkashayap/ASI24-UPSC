import React, { memo } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Award, Coins, Medal, Star, Trophy, Zap } from "lucide-react";

interface AchievementCardProps {
  title: string;
  description: string;
  unlocked?: boolean;
  progress?: number;
  icon?: LucideIcon;
}

export const AchievementCard = memo(function AchievementCard({
  title,
  description,
  unlocked = false,
  progress,
  icon: Icon = Trophy,
}: AchievementCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`rounded-[20px] border p-3.5 shadow-soft ${
        unlocked ? "border-amber-200 bg-gradient-to-br from-amber-50 to-white" : "border-slate-200/80 bg-white"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
            unlocked ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-400"
          }`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-[13px] font-bold text-slate-900">{title}</h3>
            {unlocked ? (
              <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-700">
                Unlocked
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[11px] font-medium text-slate-500">{description}</p>
          {typeof progress === "number" && !unlocked ? (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full origin-left rounded-full bg-blue-500 transition-transform duration-500"
                style={{ transform: `scaleX(${Math.min(1, Math.max(0, progress / 100))})` }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </motion.article>
  );
});

interface BadgeCardProps {
  name: string;
  earned?: boolean;
}

export const BadgeCard = memo(function BadgeCard({ name, earned = true }: BadgeCardProps) {
  return (
    <div
      className={`flex min-h-[72px] flex-col items-center justify-center rounded-[20px] border px-2 py-3 text-center shadow-soft ${
        earned ? "border-violet-100 bg-violet-50/60" : "border-slate-200 bg-slate-50 opacity-60"
      }`}
    >
      <Medal className={`mb-1 h-5 w-5 ${earned ? "text-violet-600" : "text-slate-400"}`} />
      <p className="text-[11px] font-bold leading-tight text-slate-800">{name}</p>
    </div>
  );
});

interface RewardCardProps {
  title: string;
  value: string;
  icon?: LucideIcon;
  tone?: string;
}

export const RewardCard = memo(function RewardCard({
  title,
  value,
  icon: Icon = Star,
  tone = "bg-blue-50 text-blue-600",
}: RewardCardProps) {
  return (
    <div className="rounded-[20px] border border-slate-200/80 bg-white p-3.5 shadow-soft">
      <span className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl ${tone}`}>
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">{title}</p>
      <p className="text-lg font-extrabold tabular-nums text-slate-900">{value}</p>
    </div>
  );
});

export const GAMIFICATION_ICONS = { Zap, Coins, Trophy, Award, Star, Medal };
