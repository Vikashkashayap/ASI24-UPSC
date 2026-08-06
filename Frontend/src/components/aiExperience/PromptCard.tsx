import React, { memo } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface PromptCardProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  onClick: () => void;
  tone?: string;
}

export const PromptCard = memo(function PromptCard({
  title,
  description,
  icon: Icon,
  onClick,
  tone = "bg-blue-50 text-blue-600",
}: PromptCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className="app-chrome-btn flex min-h-[72px] w-full flex-col items-start gap-1 rounded-[20px] border border-slate-200/80 bg-white p-3.5 text-left shadow-soft"
    >
      <span className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl ${tone}`}>
        <Icon className="h-4 w-4" />
      </span>
      <p className="text-[13px] font-bold text-slate-900">{title}</p>
      {description ? <p className="text-[11px] font-medium text-slate-500">{description}</p> : null}
    </motion.button>
  );
});

export const SUGGESTED_PROMPTS: { title: string; prompt: string; description: string }[] = [
  { title: "Explain Topic", prompt: "Explain the basic structure doctrine for UPSC Prelims and Mains.", description: "Concept clarity" },
  { title: "Generate Notes", prompt: "Create concise revision notes on Fundamental Rights.", description: "Quick notes" },
  { title: "Generate MCQs", prompt: "Give me 5 Prelims MCQs on Indian Polity with answers.", description: "Practice set" },
  { title: "Evaluate Answer", prompt: "How should I structure a 15-marker GS2 answer on federalism?", description: "Answer writing" },
  { title: "Summarize PDF", prompt: "How should I extract UPSC-ready notes from a long PDF chapter?", description: "PDF workflow" },
  { title: "Revision Plan", prompt: "Build a 3-day revision plan for Environment & Ecology.", description: "Study plan" },
  { title: "Current Affairs", prompt: "Summarize today's most important current affairs for UPSC.", description: "Daily CA" },
  { title: "PYQs", prompt: "Suggest important previous year questions on Indian Economy for Prelims.", description: "PYQ drill" },
  { title: "Daily Quiz", prompt: "Give me a 10-question daily quiz mixing Polity and Current Affairs.", description: "Quick test" },
];
