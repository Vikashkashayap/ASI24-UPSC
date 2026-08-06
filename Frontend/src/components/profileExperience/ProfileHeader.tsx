import React, { memo } from "react";
import { motion } from "framer-motion";
import { Crown, Flame, Sparkles, Trophy, Zap } from "lucide-react";
import { GenderAvatar } from "../GenderAvatar";

export interface ProfileHeaderProps {
  name?: string;
  email?: string;
  gender?: string;
  examLabel: string;
  level: number;
  xp: number;
  streak: number;
  studyHours?: string;
  joinedSince?: string;
  subscription?: string;
  readiness?: number;
  editing?: boolean;
  onEdit?: () => void;
  actions?: React.ReactNode;
}

export const ProfileHeader = memo(function ProfileHeader({
  name,
  email,
  gender,
  examLabel,
  level,
  xp,
  streak,
  studyHours,
  joinedSince,
  subscription,
  readiness,
  actions,
}: ProfileHeaderProps) {
  const xpInLevel = xp % 100;
  const nextLevelXp = 100;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-[20px] border border-slate-200/80 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-800 p-5 text-white shadow-[0_20px_50px_rgba(30,64,175,0.28)] md:p-6"
      aria-label="Profile hero"
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-16 left-10 h-40 w-40 rounded-full bg-sky-400/20 blur-3xl" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="relative">
            <GenderAvatar gender={gender} name={name} size="md" className="ring-2 ring-white/40" />
            <span className="absolute -bottom-1 -right-1 flex h-7 min-w-7 items-center justify-center rounded-full bg-amber-400 px-1.5 text-[10px] font-extrabold text-slate-900 shadow">
              Lv{level}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-200/90">Student Profile</p>
            <h1 className="truncate text-xl font-extrabold tracking-tight md:text-2xl">{name || "Student"}</h1>
            <p className="truncate text-sm font-medium text-blue-100/80">{email}</p>
            <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold ring-1 ring-white/15">
              <Crown className="h-3.5 w-3.5 text-amber-300" />
              {examLabel}
            </p>
          </div>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>

      <div className="relative mt-5">
        <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold">
          <span className="inline-flex items-center gap-1 text-blue-100">
            <Zap className="h-3.5 w-3.5 text-amber-300" /> XP Progress
          </span>
          <span className="tabular-nums text-white/90">
            {xpInLevel}/{nextLevelXp} · {xp} total
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-white/15">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-amber-300 to-orange-400"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, (xpInLevel / nextLevelXp) * 100)}%` }}
            transition={{ duration: 0.6 }}
          />
        </div>
      </div>

      <div className="relative mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat chip={<Flame className="h-3.5 w-3.5 text-orange-300" />} label="Streak" value={`${streak}d`} />
        <Stat chip={<Trophy className="h-3.5 w-3.5 text-amber-300" />} label="Level" value={`Lv ${level}`} />
        <Stat chip={<Sparkles className="h-3.5 w-3.5 text-sky-300" />} label="Study" value={studyHours || "—"} />
        <Stat
          chip={<Crown className="h-3.5 w-3.5 text-violet-200" />}
          label="Plan"
          value={subscription || "Free"}
        />
      </div>

      <div className="relative mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-medium text-blue-100/80">
        {joinedSince ? <span>Joined {joinedSince}</span> : null}
        {typeof readiness === "number" ? <span>AI Readiness {readiness}%</span> : null}
      </div>
    </motion.section>
  );
});

function Stat({ chip, label, value }: { chip: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-2.5 ring-1 ring-white/10 backdrop-blur-sm">
      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-blue-100/80">
        {chip}
        {label}
      </div>
      <p className="mt-0.5 truncate text-sm font-extrabold tabular-nums">{value}</p>
    </div>
  );
}
