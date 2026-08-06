import React, { memo } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Download,
  Eye,
  FileText,
  Sparkles,
  Trash2,
} from "lucide-react";

export type CopyStatus = "completed" | "pending" | "failed" | "evaluated" | string;

interface CopyCardProps {
  title: string;
  question?: string;
  subject?: string;
  paper?: string;
  year?: number;
  exam?: string;
  marksLabel?: string;
  grade?: string;
  status: CopyStatus;
  submittedAt?: string;
  evaluator?: string;
  onOpen?: () => void;
  onDownload?: () => void;
  onDelete?: (e: React.MouseEvent) => void;
  onAiReview?: () => void;
}

const STATUS_CLS: Record<string, string> = {
  completed: "bg-emerald-50 text-emerald-700",
  evaluated: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  failed: "bg-rose-50 text-rose-700",
};

export const CopyCard = memo(function CopyCard({
  title,
  question,
  subject,
  paper,
  year,
  exam,
  marksLabel,
  grade,
  status,
  submittedAt,
  evaluator,
  onOpen,
  onDownload,
  onDelete,
  onAiReview,
}: CopyCardProps) {
  const statusCls = STATUS_CLS[status] || "bg-slate-100 text-slate-600";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="flex flex-col rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-soft"
    >
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <FileText className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-[14px] font-bold text-slate-900">{title}</h3>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-slate-500">
                {submittedAt ? (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {submittedAt}
                  </span>
                ) : null}
                {subject ? <span>· {subject}</span> : null}
                {paper ? <span>· {paper}</span> : null}
                {year ? <span>· {year}</span> : null}
              </div>
            </div>
          </div>
        </button>
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="app-chrome-btn flex h-9 w-9 items-center justify-center rounded-xl text-rose-500 hover:bg-rose-50"
            aria-label="Delete evaluation"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {question ? (
        <p className="mt-3 line-clamp-2 text-[12px] font-medium leading-relaxed text-slate-500">
          <span className="font-bold text-slate-700">Q: </span>
          {question}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusCls}`}>
          {status}
        </span>
        {grade ? (
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
            Grade {grade}
          </span>
        ) : null}
        {exam ? (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{exam}</span>
        ) : null}
        {evaluator ? (
          <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">
            {evaluator}
          </span>
        ) : null}
      </div>

      {marksLabel ? (
        <p className="mt-3 text-lg font-extrabold tabular-nums text-slate-900">{marksLabel}</p>
      ) : null}

      <div className="mt-auto grid grid-cols-2 gap-2 pt-3">
        <button
          type="button"
          onClick={onOpen}
          className="app-chrome-btn inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-blue-600 text-[12px] font-bold text-white active:scale-[0.98]"
        >
          <Eye className="h-3.5 w-3.5" /> View
        </button>
        {onDownload ? (
          <button
            type="button"
            onClick={onDownload}
            className="app-chrome-btn inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-slate-200 text-[12px] font-bold text-slate-700 active:scale-[0.98]"
          >
            <Download className="h-3.5 w-3.5" /> PDF
          </button>
        ) : onAiReview ? (
          <button
            type="button"
            onClick={onAiReview}
            className="app-chrome-btn inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-indigo-200 bg-indigo-50 text-[12px] font-bold text-indigo-700 active:scale-[0.98]"
          >
            <Sparkles className="h-3.5 w-3.5" /> AI Review
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpen}
            className="app-chrome-btn inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-indigo-200 bg-indigo-50 text-[12px] font-bold text-indigo-700 active:scale-[0.98]"
          >
            <Sparkles className="h-3.5 w-3.5" /> Feedback
          </button>
        )}
      </div>
    </motion.article>
  );
});
