import React, { memo } from "react";
import { motion } from "framer-motion";

interface DashboardStatCardProps {
  label: string;
  value: string;
  hint?: string;
  tone?: "blue" | "green" | "amber" | "violet" | "slate";
}

const TONE: Record<NonNullable<DashboardStatCardProps["tone"]>, string> = {
  blue: "from-blue-50 to-indigo-50 text-blue-700 ring-blue-100",
  green: "from-emerald-50 to-teal-50 text-emerald-700 ring-emerald-100",
  amber: "from-amber-50 to-orange-50 text-amber-700 ring-amber-100",
  violet: "from-violet-50 to-fuchsia-50 text-violet-700 ring-violet-100",
  slate: "from-slate-50 to-slate-100 text-slate-700 ring-slate-200",
};

export const DashboardStatCard = memo(function DashboardStatCard({
  label,
  value,
  hint,
  tone = "blue",
}: DashboardStatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={`rounded-[20px] bg-gradient-to-br p-4 ring-1 shadow-soft ${TONE[tone]}`}
    >
      <p className="text-[11px] font-bold uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-1 text-xl font-extrabold tabular-nums tracking-tight">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] font-medium opacity-60">{hint}</p> : null}
    </motion.div>
  );
});
