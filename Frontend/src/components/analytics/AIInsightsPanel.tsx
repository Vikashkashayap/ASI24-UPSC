import React, { memo } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

/** Re-export friendly alias for analytics pages */
export { AISummaryCard as AnalyticsAISummary } from "../tests/AISummaryCard";
export { ProgressRing } from "../study/ProgressRing";
export { LeaderboardCard } from "../tests/AnalyticsChart";
export { AnalyticsCard as StatAnalyticsCard } from "../study/AnalyticsCard";

interface InsightItem {
  id: string;
  text: string;
}

interface AIInsightsPanelProps {
  title?: string;
  insights: InsightItem[];
  cta?: string;
  onAction?: () => void;
}

export const AIInsightsPanel = memo(function AIInsightsPanel({
  title = "AI Analytics",
  insights,
  cta,
  onAction,
}: AIInsightsPanelProps) {
  if (insights.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-[20px] border border-indigo-100 bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-500 p-4 text-white shadow-[0_14px_36px_rgba(37,99,235,0.22)] sm:p-5"
    >
      <div className="pointer-events-none absolute inset-0 bg-white/5 backdrop-blur-[1px]" />
      <div className="relative">
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/30">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-100/90">{title}</p>
            <p className="text-sm font-bold text-white">Personalized performance insights</p>
          </div>
        </div>
        <ul className="mt-4 space-y-2">
          {insights.map((item) => (
            <li
              key={item.id}
              className="rounded-2xl bg-white/10 px-3 py-2.5 text-[13px] font-semibold leading-snug ring-1 ring-white/15"
            >
              {item.text}
            </li>
          ))}
        </ul>
        {cta && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="app-chrome-btn mt-4 inline-flex h-11 items-center rounded-2xl bg-white px-4 text-[12px] font-bold text-blue-700 active:scale-95"
          >
            {cta}
          </button>
        ) : null}
      </div>
    </motion.section>
  );
});

export const AnalyticsSkeleton = memo(function AnalyticsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-busy>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-[20px] bg-slate-100" />
      ))}
    </div>
  );
});
