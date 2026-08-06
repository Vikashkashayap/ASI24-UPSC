import React, { memo } from "react";
import { motion } from "framer-motion";
import { DashboardStatCard } from "./DashboardStatCard";

interface PerformanceCardProps {
  accuracy?: number | null;
  averageScore?: number | null;
  completion?: number | null;
  weeklyGrowth?: number | null;
  monthlyGrowth?: number | null;
  onViewAll?: () => void;
}

function fmt(n: number | null | undefined, suffix = "%") {
  if (n == null || Number.isNaN(n)) return "—";
  return `${Math.round(n)}${suffix}`;
}

export const PerformanceCard = memo(function PerformanceCard({
  accuracy,
  averageScore,
  completion,
  weeklyGrowth,
  monthlyGrowth,
  onViewAll,
}: PerformanceCardProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }}
      className="space-y-3"
      aria-label="Performance summary"
    >
      <div className="flex items-center justify-between gap-2 px-0.5">
        <h2 className="text-base font-bold text-slate-900">Performance</h2>
        {onViewAll ? (
          <button
            type="button"
            onClick={onViewAll}
            className="app-chrome-btn text-[12px] font-bold text-blue-600 min-h-0 py-1"
          >
            View all
          </button>
        ) : null}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5 sm:gap-3">
        <DashboardStatCard label="Accuracy" value={fmt(accuracy)} tone="blue" />
        <DashboardStatCard label="Avg Score" value={fmt(averageScore)} tone="violet" />
        <DashboardStatCard label="Completion" value={fmt(completion)} tone="green" />
        <DashboardStatCard
          label="Weekly"
          value={weeklyGrowth == null ? "—" : `${weeklyGrowth >= 0 ? "+" : ""}${Math.round(weeklyGrowth)}%`}
          tone="amber"
          hint="Growth"
        />
        <DashboardStatCard
          label="Monthly"
          value={monthlyGrowth == null ? "—" : `${monthlyGrowth >= 0 ? "+" : ""}${Math.round(monthlyGrowth)}%`}
          tone="slate"
          hint="Growth"
        />
      </div>
    </motion.section>
  );
});
