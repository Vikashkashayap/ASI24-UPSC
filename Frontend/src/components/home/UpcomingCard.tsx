import React, { memo } from "react";
import { motion } from "framer-motion";
import type { ComponentType } from "react";
import { ChevronRight } from "lucide-react";

export interface UpcomingItem {
  id: string;
  title: string;
  meta: string;
  icon: ComponentType<{ className?: string }>;
  tone: string;
  onClick?: () => void;
}

interface UpcomingCardProps {
  items: UpcomingItem[];
}

export const UpcomingCard = memo(function UpcomingCard({ items }: UpcomingCardProps) {
  if (!items.length) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.12 }}
      className="rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-soft"
      aria-label="Upcoming activities"
    >
      <h2 className="text-base font-bold text-slate-900 mb-3">Upcoming</h2>
      <ul className="space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          const Comp = item.onClick ? "button" : "div";
          return (
            <Comp
              key={item.id}
              type={item.onClick ? "button" : undefined}
              onClick={item.onClick}
              className={`w-full flex items-center gap-3 rounded-2xl p-3 text-left transition-colors ${
                item.onClick ? "hover:bg-slate-50 active:scale-[0.99]" : ""
              }`}
            >
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${item.tone}`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-bold text-slate-900 truncate">{item.title}</span>
                <span className="block text-[11px] font-medium text-slate-500 truncate">{item.meta}</span>
              </span>
              {item.onClick ? <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" /> : null}
            </Comp>
          );
        })}
      </ul>
    </motion.section>
  );
});
