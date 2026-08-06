import React, { memo } from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";

interface MainsCardProps {
  title: string;
  subtitle?: string;
  progress?: number;
  completed?: number;
  pending?: number;
  onContinue?: () => void;
  accent?: string;
}

export const MainsCard = memo(function MainsCard({
  title,
  subtitle,
  progress = 0,
  completed = 0,
  pending = 0,
  onContinue,
  accent = "from-blue-600 to-indigo-600",
}: MainsCardProps) {
  return (
    <motion.article
      whileHover={{ y: -2 }}
      className="rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-soft"
    >
      <div className={`mb-3 h-1.5 w-12 rounded-full bg-gradient-to-r ${accent}`} />
      <h3 className="text-[15px] font-bold text-slate-900">{title}</h3>
      {subtitle ? <p className="mt-0.5 text-[12px] text-slate-500">{subtitle}</p> : null}
      <div className="mt-3 flex gap-3 text-[11px] font-semibold text-slate-500">
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">{completed} done</span>
        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">{pending} pending</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${accent}`}
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>
      {onContinue ? (
        <button
          type="button"
          onClick={onContinue}
          className="app-chrome-btn mt-3 inline-flex h-11 w-full items-center justify-center gap-1 rounded-2xl bg-slate-900 text-[12px] font-bold text-white active:scale-95"
        >
          Continue <ChevronRight className="h-4 w-4" />
        </button>
      ) : null}
    </motion.article>
  );
});
