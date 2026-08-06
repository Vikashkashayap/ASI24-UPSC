import React, { memo, useEffect } from "react";
import { createPortal } from "react-dom";
import { Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type PaletteStatus = "current" | "answered" | "marked" | "answered-marked" | "not-visited";

interface QuestionPaletteProps {
  total: number;
  cols: number;
  btnH: string;
  getStatus: (index: number) => PaletteStatus;
  onSelect: (index: number) => void;
  stats: { done: number; marked: number; left: number };
  onSubmit?: () => void;
  submitting?: boolean;
  compact?: boolean;
  title?: string;
}

const STATUS_CLASS: Record<PaletteStatus, string> = {
  current: "border-2 border-blue-600 bg-blue-50 text-blue-700 font-bold",
  answered: "bg-emerald-500 text-white border-emerald-500",
  marked: "bg-amber-400 text-white border-amber-400",
  "answered-marked": "bg-violet-600 text-white border-violet-600",
  "not-visited": "bg-white text-slate-600 border-slate-200 hover:border-slate-300",
};

const COL_CLASS: Record<number, string> = {
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
  7: "grid-cols-7",
  8: "grid-cols-8",
  9: "grid-cols-9",
  10: "grid-cols-10",
};

export const QuestionPalette = memo(function QuestionPalette({
  total,
  cols,
  btnH,
  getStatus,
  onSelect,
  stats,
  onSubmit,
  submitting,
  compact,
  title = "Question Palette",
}: QuestionPaletteProps) {
  const gridClass = COL_CLASS[cols] || "grid-cols-5";

  return (
    <div className="flex h-full min-h-0 flex-col">
      {!compact ? (
        <div className="flex-shrink-0 border-b border-slate-100 px-3 py-2">
          <h2 className="text-xs font-bold text-slate-800">{title}</h2>
          <div className="mt-1 flex gap-2 text-[10px] font-medium">
            <span className="text-emerald-600">{stats.done} done</span>
            <span className="text-amber-500">{stats.marked} marked</span>
            <span className="text-slate-400">{stats.left} left</span>
          </div>
        </div>
      ) : (
        <div className="flex-shrink-0 border-b border-slate-100 px-3 py-2">
          <div className="flex gap-3 text-[11px] font-medium">
            <span className="text-emerald-600">{stats.done} done</span>
            <span className="text-amber-500">{stats.marked} marked</span>
            <span className="text-slate-400">{stats.left} left</span>
          </div>
        </div>
      )}

      <div className="grid flex-shrink-0 grid-cols-2 gap-x-2 gap-y-1 border-b border-slate-100 px-3 py-2 text-[9px] text-slate-500 sm:text-[10px]">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded border border-slate-300 bg-white" /> Not visited
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded bg-emerald-500" /> Answered
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded bg-amber-400" /> Marked
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded bg-violet-600" /> Ans+Marked
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2 sm:px-3">
        <div className={`grid w-full gap-1 ${gridClass}`}>
          {Array.from({ length: total }).map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => onSelect(index)}
              aria-label={`Question ${index + 1}`}
              className={`${btnH} rounded border text-[10px] font-semibold transition-colors sm:text-[11px] ${STATUS_CLASS[getStatus(index)]}`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>

      {onSubmit ? (
        <div className="flex-shrink-0 border-t border-slate-100 p-2 sm:p-3">
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="app-chrome-btn flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-red-500 text-xs font-bold text-white hover:bg-red-600 disabled:opacity-60 sm:text-sm"
          >
            <Send className="h-4 w-4" />
            Submit Test
          </button>
        </div>
      ) : null}
    </div>
  );
});

interface BottomSheetPaletteProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  /** When true (default), only mounts on < xl. Set false for analysis sheets on all breakpoints. */
  mobileOnly?: boolean;
}

export const BottomSheetPalette = memo(function BottomSheetPalette({
  open,
  onClose,
  children,
  title = "Question Palette",
  subtitle,
  mobileOnly = true,
}: BottomSheetPaletteProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div
          className={`fixed inset-0 z-[90] flex items-end justify-center ${
            mobileOnly ? "xl:hidden" : "md:items-center"
          }`}
          role="dialog"
          aria-modal
          aria-label={title}
        >
          <motion.button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-slate-900/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.08}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 550) onClose();
            }}
            className={`relative z-10 flex w-full flex-col overflow-hidden bg-white shadow-2xl ${
              mobileOnly
                ? "h-[min(92dvh,100%)] max-h-[92dvh] rounded-t-[22px] pb-[env(safe-area-inset-bottom,0px)]"
                : "h-[min(92dvh,100%)] max-h-[92dvh] rounded-t-[22px] pb-[env(safe-area-inset-bottom,0px)] md:mb-0 md:h-auto md:max-h-[85vh] md:max-w-lg md:rounded-[24px] md:pb-0"
            }`}
          >
            <div className="flex shrink-0 justify-center pt-2.5 md:hidden">
              <span className="h-1.5 w-10 rounded-full bg-slate-200" />
            </div>
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 pb-3 pt-2">
              <div className="min-w-0">
                <p className="text-[15px] font-extrabold text-slate-900">{title}</p>
                {subtitle ? (
                  <p className="mt-0.5 line-clamp-2 text-[11px] font-medium text-slate-500">{subtitle}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="app-chrome-btn h-10 shrink-0 rounded-xl bg-slate-100 px-3 text-xs font-bold text-slate-600"
              >
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
});
