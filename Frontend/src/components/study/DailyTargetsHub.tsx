import React, { memo, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Play,
  BookOpenCheck,
  ClipboardList,
  Sparkles,
  Flame,
  Clock3,
  Target,
} from "lucide-react";
import { ProgressRing } from "./ProgressRing";
import { DailyTargetCard } from "./DailyTargetCard";
import { AIRecommendationCard } from "./AIRecommendationCard";

interface DailyTargetsHubProps {
  progress: number;
  completedPct: number;
  timeStudiedLabel: string;
  questionsSolved: number;
  remainingTasks: number;
  streak: number;
  weeklyStreak?: number;
  studyHours: number;
  accuracy?: number | null;
  onResume: () => void;
  onQuickRevision: () => void;
  onPractice: () => void;
  onAskAI: () => void;
  aiMessage: string;
}

export const DailyTargetsHub = memo(function DailyTargetsHub({
  progress,
  completedPct,
  timeStudiedLabel,
  questionsSolved,
  remainingTasks,
  streak,
  weeklyStreak = streak,
  studyHours,
  accuracy,
  onResume,
  onQuickRevision,
  onPractice,
  onAskAI,
  aiMessage,
}: DailyTargetsHubProps) {
  const stats = useMemo(
    () => [
      { label: "Questions", value: String(questionsSolved), icon: BookOpenCheck, tone: "bg-emerald-50 text-emerald-600" },
      { label: "Study Time", value: timeStudiedLabel, icon: Clock3, tone: "bg-blue-50 text-blue-600" },
      {
        label: "Accuracy",
        value: accuracy == null ? "—" : `${Math.round(accuracy)}%`,
        icon: Target,
        tone: "bg-violet-50 text-violet-600",
      },
      { label: "Streak", value: `${streak}d`, icon: Flame, tone: "bg-orange-50 text-orange-600" },
    ],
    [questionsSolved, timeStudiedLabel, accuracy, streak]
  );

  return (
    <section className="space-y-3" aria-label="Daily targets overview">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[20px] border border-slate-200/80 bg-white p-4 sm:p-5 shadow-soft"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Today&apos;s Goal</p>
            <h2 className="mt-1 text-lg font-extrabold tracking-tight text-slate-900">
              Hit today&apos;s learning targets
            </h2>
            <p className="mt-1 text-[12px] font-medium text-slate-500">
              {remainingTasks} remaining · {Math.round(completedPct)}% complete · {studyHours}h planned
            </p>
            <p className="mt-1 text-[11px] font-semibold text-slate-400">
              Current streak {streak} · Weekly {weeklyStreak}
            </p>
          </div>
          <ProgressRing value={progress} label="Done" />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ${s.tone}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">{s.label}</p>
                <p className="text-sm font-extrabold tabular-nums text-slate-900">{s.value}</p>
              </div>
            );
          })}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <DailyTargetCard
          title="Resume Study"
          subtitle="Continue where you left"
          icon={Play}
          tone="bg-blue-50 text-blue-600"
          cta="Go"
          onClick={onResume}
        />
        <DailyTargetCard
          title="Quick Revision"
          subtitle="Flash key topics"
          icon={Sparkles}
          tone="bg-violet-50 text-violet-600"
          cta="Revise"
          onClick={onQuickRevision}
        />
        <DailyTargetCard
          title="Practice Questions"
          subtitle="MCQ drill session"
          icon={ClipboardList}
          tone="bg-emerald-50 text-emerald-600"
          cta="Start"
          onClick={onPractice}
        />
        <DailyTargetCard
          title="AI Recommendation"
          subtitle="Personalized next step"
          icon={Sparkles}
          tone="bg-amber-50 text-amber-600"
          cta="Ask"
          onClick={onAskAI}
        />
      </div>

      <AIRecommendationCard message={aiMessage} cta="Resume recommended task" onAction={onResume} />
    </section>
  );
});
