import React, { memo } from "react";
import { motion } from "framer-motion";
import { PenLine, History, Clock3 } from "lucide-react";

interface AnswerWritingCardProps {
  question: string;
  status?: string;
  onAttempt?: () => void;
  onHistory?: () => void;
}

export const AnswerWritingCard = memo(function AnswerWritingCard({
  question,
  status = "Today's Question",
  onAttempt,
  onHistory,
}: AnswerWritingCardProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-soft"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
          <PenLine className="h-5 w-5" />
        </span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-violet-600">{status}</p>
          <p className="text-[12px] font-medium text-slate-400 inline-flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5" /> Answer Writing
          </p>
        </div>
      </div>
      <p className="mt-3 text-[14px] font-semibold leading-snug text-slate-900">{question}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onAttempt}
          className="app-chrome-btn h-11 rounded-2xl bg-blue-600 text-[12px] font-bold text-white active:scale-95"
        >
          Attempt Now
        </button>
        <button
          type="button"
          onClick={onHistory}
          className="app-chrome-btn inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white text-[12px] font-bold text-slate-700 active:scale-95"
        >
          <History className="h-3.5 w-3.5" /> Previous
        </button>
      </div>
    </motion.section>
  );
});
