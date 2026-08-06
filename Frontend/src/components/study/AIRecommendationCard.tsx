import React, { memo } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface AIRecommendationCardProps {
  message: string;
  cta?: string;
  onAction?: () => void;
}

export const AIRecommendationCard = memo(function AIRecommendationCard({
  message,
  cta = "Follow recommendation",
  onAction,
}: AIRecommendationCardProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-[20px] border border-indigo-100 bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-500 p-4 text-white shadow-[0_14px_36px_rgba(37,99,235,0.25)]"
    >
      <div className="pointer-events-none absolute inset-0 bg-white/5 backdrop-blur-[1px]" />
      <div className="relative flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/30">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-blue-100/90">AI Recommendation</p>
          <p className="mt-1 text-[13px] font-semibold leading-snug text-white">{message}</p>
          {onAction ? (
            <button
              type="button"
              onClick={onAction}
              className="app-chrome-btn mt-3 inline-flex h-11 items-center rounded-2xl bg-white px-4 text-[12px] font-bold text-blue-700 active:scale-95"
            >
              {cta}
            </button>
          ) : null}
        </div>
      </div>
    </motion.section>
  );
});
