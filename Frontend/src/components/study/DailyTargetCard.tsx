import React, { memo } from "react";
import { motion } from "framer-motion";
import type { ComponentType } from "react";

interface DailyTargetCardProps {
  title: string;
  subtitle?: string;
  icon: ComponentType<{ className?: string }>;
  tone?: string;
  onClick?: () => void;
  cta?: string;
}

export const DailyTargetCard = memo(function DailyTargetCard({
  title,
  subtitle,
  icon: Icon,
  tone = "bg-blue-50 text-blue-600",
  onClick,
  cta,
}: DailyTargetCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      whileHover={{ y: -2 }}
      className="flex min-h-[48px] w-full items-center gap-3 rounded-[20px] border border-slate-200/80 bg-white p-3.5 text-left shadow-soft touch-manipulation"
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tone}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-bold text-slate-900">{title}</span>
        {subtitle ? <span className="block text-[11px] font-medium text-slate-500">{subtitle}</span> : null}
      </span>
      {cta ? (
        <span className="shrink-0 rounded-xl bg-blue-600 px-3 py-2 text-[11px] font-bold text-white">{cta}</span>
      ) : null}
    </motion.button>
  );
});
