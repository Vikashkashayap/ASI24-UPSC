import { motion } from "framer-motion";
import { RefreshCw, CalendarDays, TrendingUp, Quote } from "lucide-react";
import { Button } from "../ui/button";
import { useTheme } from "../../hooks/useTheme";
import { cn } from "../../utils/cn";
import { getGreeting } from "./plannerUtils";
import type { StudyPlanProgress } from "../../services/api";

interface Props {
  userName?: string;
  examType?: string;
  daysRemaining: number | null;
  motivationalLine: string;
  dailyQuote?: string;
  progress: StudyPlanProgress | null;
  readinessScore: number;
  onRegenerate: () => void;
  onRefreshMotivation: () => void;
  regenerating?: boolean;
}

export function PlannerHero({
  userName,
  examType = "UPSC",
  daysRemaining,
  motivationalLine,
  dailyQuote,
  progress,
  readinessScore,
  onRegenerate,
  onRefreshMotivation,
  regenerating,
}: Props) {
  const { theme } = useTheme();
  const daily = progress?.daily;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative overflow-hidden rounded-3xl p-6 md:p-8 border",
        theme === "dark"
          ? "bg-gradient-to-br from-slate-900/90 via-indigo-950/40 to-indigo-950/50 border-indigo-500/20 backdrop-blur-xl"
          : "bg-gradient-to-br from-white/80 via-indigo-50/50 to-indigo-50/40 border-indigo-200/60 backdrop-blur-xl shadow-xl shadow-indigo-500/5"
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-400/10 via-transparent to-transparent pointer-events-none" />
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-3 flex-1">
          <p className={cn("text-sm font-medium", theme === "dark" ? "text-indigo-300" : "text-indigo-600")}>
            {getGreeting()}{userName ? `, ${userName.split(" ")[0]}` : ""} 👋
          </p>
          <h1 className={cn("text-2xl md:text-4xl font-bold tracking-tight", theme === "dark" ? "text-white" : "text-slate-900")}>
            Your AI {examType} Coach
          </h1>
          <p className={cn("text-base md:text-lg italic max-w-xl", theme === "dark" ? "text-slate-300" : "text-slate-600")}>
            "{motivationalLine || "Every hour you study today is a vote for your future rank."}"
          </p>
          {dailyQuote && (
            <p className={cn("flex items-start gap-2 text-sm", theme === "dark" ? "text-slate-400" : "text-slate-500")}>
              <Quote className="w-4 h-4 shrink-0 mt-0.5" />
              {dailyQuote}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
          {daysRemaining != null && (
            <div className={cn("flex items-center gap-3 px-4 py-3 rounded-2xl border", theme === "dark" ? "bg-amber-500/10 border-amber-500/30" : "bg-amber-50 border-amber-200")}>
              <CalendarDays className="text-amber-500 w-8 h-8" />
              <div>
                <p className="text-2xl font-bold tabular-nums">{daysRemaining}</p>
                <p className="text-xs opacity-80">days to exam</p>
              </div>
            </div>
          )}
          <div className={cn("flex items-center gap-3 px-4 py-3 rounded-2xl border", theme === "dark" ? "bg-emerald-500/10 border-emerald-500/30" : "bg-emerald-50 border-emerald-200")}>
            <TrendingUp className="text-emerald-500 w-8 h-8" />
            <div>
              <p className="text-2xl font-bold">{readinessScore}%</p>
              <p className="text-xs opacity-80">readiness</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <div className="flex justify-between text-xs mb-1">
            <span>Today&apos;s progress</span>
            <span className="font-semibold">{daily?.percent ?? 0}%</span>
          </div>
          <div className={cn("h-2.5 rounded-full overflow-hidden", theme === "dark" ? "bg-slate-700" : "bg-slate-200")}>
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-indigo-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${daily?.percent ?? 0}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <p className="text-xs mt-1 opacity-70">{daily?.completed ?? 0} / {daily?.total ?? 0} tasks done</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onRefreshMotivation} className="shrink-0 text-sm">
            New motivation
          </Button>
          <Button type="button" onClick={onRegenerate} disabled={regenerating} className="shrink-0 bg-gradient-to-r from-indigo-600 to-indigo-600 border-0">
            <RefreshCw className={cn("w-4 h-4 mr-2", regenerating && "animate-spin")} />
            Regenerate Smart Plan
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
