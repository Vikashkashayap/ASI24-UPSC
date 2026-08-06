import React, { memo } from "react";
import { motion } from "framer-motion";

interface ProgressRingProps {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  className?: string;
}

export const ProgressRing = memo(function ProgressRing({
  value,
  size = 88,
  stroke = 8,
  label,
  className = "",
}: ProgressRingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, value));
  const offset = c - (clamped / 100) * c;
  const box =
    size <= 64 ? "h-16 w-16" : size <= 72 ? "h-[72px] w-[72px]" : size <= 88 ? "h-[88px] w-[88px]" : "h-28 w-28";

  return (
    <div className={`relative inline-flex shrink-0 items-center justify-center ${box} ${className}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          className="stroke-slate-200"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#studyProgressGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="studyProgressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-extrabold tabular-nums text-slate-900">{Math.round(clamped)}%</span>
        {label ? (
          <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
        ) : null}
      </div>
    </div>
  );
});
