import React, { memo } from "react";
import { motion } from "framer-motion";
import { Sparkles, MessageCircle } from "lucide-react";

interface AIMentorCardProps {
  onAsk: () => void;
}

export const AIMentorCard = memo(function AIMentorCard({ onAsk }: AIMentorCardProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.14 }}
      className="relative overflow-hidden rounded-[20px] border border-white/40 bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-500 p-5 text-white shadow-[0_16px_40px_rgba(37,99,235,0.28)]"
      aria-label="AI Mentor"
    >
      <div className="pointer-events-none absolute inset-0 bg-white/5 backdrop-blur-[2px]" />
      <div className="pointer-events-none absolute -right-6 -top-8 h-32 w-32 rounded-full bg-white/15" />
      <div className="pointer-events-none absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-indigo-300/20" />

      <div className="relative flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md ring-1 ring-white/30">
          <Sparkles className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold">AI Mentor</h2>
            <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-100 ring-1 ring-emerald-300/40">
              Live
            </span>
          </div>
          <p className="mt-1 text-[13px] font-medium text-blue-50/90 leading-snug">
            Need help with today&apos;s preparation?
          </p>
        </div>
      </div>

      <div className="relative mt-4 rounded-2xl bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur-md">
        <div className="flex items-start gap-2 text-[12px] text-blue-50/95">
          <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 opacity-80" />
          <span>Want a quick revision on Repo vs Reverse Repo?</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onAsk}
        className="app-chrome-btn relative mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white text-sm font-bold text-blue-700 shadow-lg active:scale-[0.98] transition-transform"
      >
        Ask AI Mentor
      </button>
    </motion.section>
  );
});
