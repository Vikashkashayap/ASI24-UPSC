import React, { memo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Bookmark, ChevronRight, Clock3, Headphones, Share2 } from "lucide-react";

interface CurrentAffairCardProps {
  to: string;
  title: string;
  summary: string;
  gsPaper?: string;
  difficulty?: string;
  keywords?: string[];
  readTime?: string;
  onBookmark?: (e: React.MouseEvent) => void;
}

export const CurrentAffairCard = memo(function CurrentAffairCard({
  to,
  title,
  summary,
  gsPaper,
  difficulty,
  keywords = [],
  readTime = "3 min",
  onBookmark,
}: CurrentAffairCardProps) {
  const diffCls =
    difficulty === "Easy"
      ? "bg-emerald-50 text-emerald-700"
      : difficulty === "Hard"
        ? "bg-amber-50 text-amber-700"
        : "bg-slate-100 text-slate-600";

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}${window.location.pathname.replace(/\/?$/, "/")}${to}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text: summary, url });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      /* user cancelled share */
    }
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      className="group relative overflow-hidden rounded-[20px] border border-slate-200/80 bg-white shadow-soft"
    >
      <Link to={to} relative="path" className="block p-4 pr-14">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {gsPaper ? (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">{gsPaper}</span>
          ) : null}
          {difficulty ? (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${diffCls}`}>{difficulty}</span>
          ) : null}
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400">
            <Clock3 className="h-3 w-3" /> {readTime}
          </span>
        </div>
        <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-slate-900">{title}</h3>
        <p className="mt-1.5 line-clamp-2 text-[12px] font-medium text-slate-500">{summary}</p>
        {keywords.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1">
            {keywords.slice(0, 4).map((kw) => (
              <span key={kw} className="rounded-md bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                {kw}
              </span>
            ))}
          </div>
        ) : null}
        <div className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold text-blue-600">
          Read more <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </div>
      </Link>
      <div className="absolute right-2 top-2 flex flex-col gap-1">
        {onBookmark ? (
          <button
            type="button"
            onClick={onBookmark}
            className="app-chrome-btn flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400"
            aria-label="Bookmark"
          >
            <Bookmark className="h-4 w-4" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleShare}
          className="app-chrome-btn flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400"
          aria-label="Share article"
        >
          <Share2 className="h-3.5 w-3.5" />
        </button>
        <span
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-300"
          title="Listen — coming soon"
          aria-hidden
        >
          <Headphones className="h-3.5 w-3.5" />
        </span>
      </div>
    </motion.article>
  );
});
