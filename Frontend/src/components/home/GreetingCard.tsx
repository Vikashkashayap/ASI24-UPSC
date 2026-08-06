import React, { memo } from "react";
import { motion } from "framer-motion";

interface GreetingCardProps {
  greeting: string;
  firstName: string;
  subtitle?: string;
  gender?: string | null;
  onNotify?: () => void;
  onProfile?: () => void;
}

export const GreetingCard = memo(function GreetingCard({
  greeting,
  firstName,
  subtitle = "Keep learning. You're closer to your UPSC dream today.",
}: GreetingCardProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="min-w-0"
      aria-label="Welcome"
    >
      <p className="text-[13px] font-semibold text-slate-500">
        {greeting} <span aria-hidden>👋</span>
      </p>
      <h1 className="mt-0.5 text-[26px] font-extrabold leading-tight tracking-tight text-slate-900 sm:text-[30px]">
        <span className="bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
          {firstName}
        </span>
      </h1>
      <p className="mt-1.5 max-w-md text-[13px] leading-snug text-slate-500">{subtitle}</p>
    </motion.section>
  );
});
