import React, { memo } from "react";
import { Clock } from "lucide-react";

interface ExamTimerProps {
  remainingSeconds: number;
  className?: string;
}

function formatCountdown(totalSeconds: number) {
  const s = Math.max(0, totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export const ExamTimer = memo(function ExamTimer({ remainingSeconds, className = "" }: ExamTimerProps) {
  const urgent = remainingSeconds < 300;
  return (
    <div
      className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 font-mono text-sm font-bold tabular-nums sm:text-base ${
        urgent
          ? "bg-red-50 text-red-600 ring-1 ring-red-200"
          : "bg-slate-900 text-white shadow-md shadow-slate-900/20"
      } ${className}`}
      aria-label="Time remaining"
      role="timer"
    >
      <Clock className="h-3.5 w-3.5 shrink-0 opacity-80 sm:h-4 sm:w-4" />
      {formatCountdown(remainingSeconds)}
    </div>
  );
});
