import React, { memo } from "react";
import { motion } from "framer-motion";

interface AnalyticsCardProps {
  label: string;
  value: string;
  hint?: string;
  tone?: string;
}

export const AnalyticsCard = memo(function AnalyticsCard({
  label,
  value,
  hint,
  tone = "from-blue-50 to-indigo-50 text-blue-800",
}: AnalyticsCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`rounded-[20px] bg-gradient-to-br p-4 shadow-soft ring-1 ring-black/5 ${tone}`}
    >
      <p className="text-[11px] font-bold uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-1 text-xl font-extrabold tabular-nums">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] font-medium opacity-60">{hint}</p> : null}
    </motion.div>
  );
});
