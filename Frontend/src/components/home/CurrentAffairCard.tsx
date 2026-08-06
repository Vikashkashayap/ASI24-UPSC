import React, { memo } from "react";
import { motion } from "framer-motion";
import { Bookmark, ArrowRight, Newspaper } from "lucide-react";

export interface CurrentAffairItem {
  id: string;
  title: string;
  category?: string;
  date?: string;
  slug?: string;
}

interface CurrentAffairCardProps {
  items: CurrentAffairItem[];
  onRead: (item: CurrentAffairItem) => void;
  onViewAll?: () => void;
}

export const CurrentAffairCard = memo(function CurrentAffairCard({
  items,
  onRead,
  onViewAll,
}: CurrentAffairCardProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.16 }}
      aria-label="Current affairs"
    >
      <div className="mb-3 flex items-center justify-between gap-2 px-0.5">
        <h2 className="text-base font-bold text-slate-900">Current Affairs</h2>
        {onViewAll ? (
          <button
            type="button"
            onClick={onViewAll}
            className="app-chrome-btn text-[12px] font-bold text-blue-600 min-h-0 py-1"
          >
            See all
          </button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-slate-200 bg-white p-5 text-center text-sm text-slate-500">
          <Newspaper className="mx-auto mb-2 h-6 w-6 text-slate-300" />
          Latest briefs will appear here
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {items.slice(0, 3).map((item) => (
            <article
              key={item.id}
              className="rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-soft"
            >
              {item.category ? (
                <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                  {item.category}
                </span>
              ) : null}
              <h3 className="mt-2 text-[13px] font-bold text-slate-900 leading-snug line-clamp-3 min-h-[3.6em]">
                {item.title}
              </h3>
              {item.date ? (
                <p className="mt-2 text-[11px] font-medium text-slate-400">{item.date}</p>
              ) : null}
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onRead(item)}
                  className="app-chrome-btn inline-flex h-11 flex-1 items-center justify-center gap-1 rounded-xl bg-blue-600 text-[12px] font-bold text-white active:scale-95"
                >
                  Read <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="app-chrome-btn flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-500"
                  aria-label="Bookmark"
                  title="Bookmark"
                >
                  <Bookmark className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </motion.section>
  );
});
