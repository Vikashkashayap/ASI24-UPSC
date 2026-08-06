import React, { memo } from "react";
import { Bookmark, Play, StickyNote } from "lucide-react";

interface TopicCardProps {
  title: string;
  difficulty?: string;
  weightage?: string;
  completion?: number;
  revision?: boolean;
  bookmarked?: boolean;
  onPractice?: () => void;
  onNotes?: () => void;
  onBookmark?: () => void;
}

export const TopicCard = memo(function TopicCard({
  title,
  difficulty,
  weightage,
  completion = 0,
  revision,
  bookmarked,
  onPractice,
  onNotes,
  onBookmark,
}: TopicCardProps) {
  return (
    <article className="rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-[14px] font-bold text-slate-900 leading-snug">{title}</h4>
        <button
          type="button"
          onClick={onBookmark}
          className="app-chrome-btn flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400"
          aria-label="Bookmark"
        >
          <Bookmark className={`h-4 w-4 ${bookmarked ? "fill-amber-400 text-amber-500" : ""}`} />
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {difficulty ? (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
            {difficulty}
          </span>
        ) : null}
        {weightage ? (
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
            {weightage}
          </span>
        ) : null}
        {revision ? (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
            Revision
          </span>
        ) : null}
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
          style={{ width: `${Math.min(100, completion)}%` }}
        />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onPractice}
          className="app-chrome-btn inline-flex h-10 items-center justify-center gap-1 rounded-xl bg-blue-600 text-[11px] font-bold text-white"
        >
          <Play className="h-3.5 w-3.5" /> Practice
        </button>
        <button
          type="button"
          onClick={onNotes}
          className="app-chrome-btn inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-700"
        >
          <StickyNote className="h-3.5 w-3.5" /> Notes
        </button>
      </div>
    </article>
  );
});
