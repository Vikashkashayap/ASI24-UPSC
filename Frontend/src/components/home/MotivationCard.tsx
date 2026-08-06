import React, { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { Quote } from "lucide-react";

const QUOTES = [
  "Discipline is the bridge between goals and accomplishment.",
  "Small daily improvements are the key to staggering long-term results.",
  "The UPSC journey rewards consistency more than intensity.",
  "Study smart, revise often, and trust the process.",
  "Your future self is watching — make today count.",
  "Clarity comes from engagement, not from thinking harder.",
];

interface MotivationCardProps {
  seed?: number;
}

export const MotivationCard = memo(function MotivationCard({ seed }: MotivationCardProps) {
  const quote = useMemo(() => {
    const idx =
      typeof seed === "number"
        ? Math.abs(seed) % QUOTES.length
        : new Date().getDate() % QUOTES.length;
    return QUOTES[idx];
  }, [seed]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.18 }}
      className="relative overflow-hidden rounded-[20px] border border-amber-100 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-5 shadow-soft"
      aria-label="Daily motivation"
    >
      <motion.div
        className="pointer-events-none absolute -right-8 top-0 h-28 w-28 rounded-full bg-amber-200/40 blur-2xl"
        animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.08, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <Quote className="relative h-6 w-6 text-amber-500/80" />
      <p className="relative mt-3 text-[15px] font-semibold leading-relaxed text-slate-800">
        “{quote}”
      </p>
      <p className="relative mt-3 text-[11px] font-bold uppercase tracking-wider text-amber-700/70">
        Daily Motivation
      </p>
    </motion.section>
  );
});
