import React, { memo } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Play, CheckCircle2, Clock, Flag } from "lucide-react";

interface TaskCardProps {
  title: string;
  estimatedTime?: string;
  difficulty?: string;
  status: "pending" | "active" | "done" | "locked";
  progress?: number;
  onStart?: () => void;
  onResume?: () => void;
  /** Mobile swipe-right completes / starts when unlocked */
  onSwipeComplete?: () => void;
}

const STATUS = {
  pending: { label: "Pending", cls: "bg-slate-100 text-slate-600" },
  active: { label: "Up next", cls: "bg-blue-50 text-blue-700" },
  done: { label: "Completed", cls: "bg-emerald-50 text-emerald-700" },
  locked: { label: "Locked", cls: "bg-slate-100 text-slate-400" },
};

export const TaskCard = memo(function TaskCard({
  title,
  estimatedTime,
  difficulty,
  status,
  progress = 0,
  onStart,
  onResume,
  onSwipeComplete,
}: TaskCardProps) {
  const meta = STATUS[status];
  const x = useMotionValue(0);
  const reveal = useTransform(x, [0, 96], [0, 1]);
  const canSwipe = Boolean(onSwipeComplete) && status !== "locked" && status !== "done";

  return (
    <div className="relative overflow-hidden rounded-[20px]">
      {canSwipe ? (
        <motion.div
          style={{ opacity: reveal }}
          className="absolute inset-y-0 left-0 flex w-24 items-center justify-center bg-emerald-500 text-[11px] font-bold text-white"
          aria-hidden
        >
          Start
        </motion.div>
      ) : null}

      <motion.article
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ x }}
        drag={canSwipe ? "x" : false}
        dragConstraints={{ left: 0, right: 110 }}
        dragElastic={0.08}
        onDragEnd={(_, info) => {
          const should = info.offset.x > 72 || info.velocity.x > 400;
          void animate(x, 0, { type: "spring", stiffness: 420, damping: 32 });
          if (should && onSwipeComplete) onSwipeComplete();
        }}
        className="relative touch-pan-y rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-soft"
      >
        <div className="flex items-start gap-3">
          <span
            className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
              status === "done" ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
            }`}
          >
            {status === "done" ? <CheckCircle2 className="h-5 w-5" /> : <Flag className="h-5 w-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[14px] font-bold leading-snug text-slate-900">{title}</h3>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.cls}`}>{meta.label}</span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-2 text-[11px] font-medium text-slate-500">
              {estimatedTime ? (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> {estimatedTime}
                </span>
              ) : null}
              {difficulty ? <span className="rounded-full bg-slate-100 px-2 py-0.5">{difficulty}</span> : null}
            </div>
            {progress > 0 && status !== "done" ? (
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, progress)}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            ) : null}
            {(onStart || onResume) && status !== "locked" && status !== "done" ? (
              <button
                type="button"
                onClick={onResume || onStart}
                className="app-chrome-btn mt-3 inline-flex h-11 items-center gap-2 rounded-2xl bg-blue-600 px-4 text-[12px] font-bold text-white active:scale-95"
              >
                <Play className="h-3.5 w-3.5 fill-white" />
                {onResume ? "Resume" : "Start"}
              </button>
            ) : null}
            {status === "done" ? (
              <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> Completed
              </span>
            ) : null}
          </div>
        </div>
      </motion.article>
    </div>
  );
});
