import React, { memo } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface PerformanceCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "blue" | "cyan" | "violet" | "amber" | "emerald" | "rose";
  trend?: number;
}

const TONE = {
  blue: "from-blue-50 to-white border-blue-100 text-blue-600",
  cyan: "from-cyan-50 to-white border-cyan-100 text-cyan-600",
  violet: "from-violet-50 to-white border-violet-100 text-violet-600",
  amber: "from-amber-50 to-white border-amber-100 text-amber-600",
  emerald: "from-emerald-50 to-white border-emerald-100 text-emerald-600",
  rose: "from-rose-50 to-white border-rose-100 text-rose-600",
};

export const PerformanceCard = memo(function PerformanceCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "blue",
  trend,
}: PerformanceCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className={`rounded-[20px] border bg-gradient-to-br p-4 shadow-soft ${TONE[tone]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-extrabold tabular-nums text-slate-900 sm:text-3xl">{value}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        {hint ? <p className="text-[11px] font-medium text-slate-500">{hint}</p> : null}
        {trend != null && trend !== 0 ? (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              trend > 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
            }`}
          >
            {trend > 0 ? "+" : ""}
            {trend}%
          </span>
        ) : null}
      </div>
    </motion.div>
  );
});
