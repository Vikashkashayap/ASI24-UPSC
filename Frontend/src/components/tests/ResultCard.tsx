import React, { memo } from "react";
import { Award } from "lucide-react";

interface ResultCardProps {
  score: number;
  totalMarks: number;
  accuracy?: number;
  correct?: number;
  incorrect?: number;
  skipped?: number;
  rankLabel?: string;
  percentileLabel?: string;
}

export const ResultCard = memo(function ResultCard({
  score,
  totalMarks,
  accuracy,
  correct,
  incorrect,
  skipped,
  rankLabel,
  percentileLabel,
}: ResultCardProps) {
  const pct = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;

  return (
    <section className="overflow-hidden rounded-[20px] border border-slate-200/80 bg-white shadow-soft">
      <div className="bg-gradient-to-br from-blue-600 to-indigo-600 px-4 py-5 text-white">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-blue-100">
          <Award className="h-4 w-4" /> Your Score
        </div>
        <p className="mt-1 text-3xl font-extrabold tabular-nums">
          {score.toFixed(2)}
          <span className="text-lg font-semibold text-blue-100"> / {totalMarks}</span>
        </p>
        <p className="mt-1 text-sm font-semibold text-blue-100">{pct}% of total marks</p>
      </div>
      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">
        {accuracy != null ? (
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-[10px] font-bold uppercase text-slate-400">Accuracy</p>
            <p className="text-base font-extrabold tabular-nums text-slate-900">{Math.round(accuracy)}%</p>
          </div>
        ) : null}
        {correct != null ? (
          <div className="rounded-2xl bg-emerald-50 p-3">
            <p className="text-[10px] font-bold uppercase text-emerald-600/80">Correct</p>
            <p className="text-base font-extrabold tabular-nums text-emerald-700">{correct}</p>
          </div>
        ) : null}
        {incorrect != null ? (
          <div className="rounded-2xl bg-red-50 p-3">
            <p className="text-[10px] font-bold uppercase text-red-500/80">Incorrect</p>
            <p className="text-base font-extrabold tabular-nums text-red-600">{incorrect}</p>
          </div>
        ) : null}
        {skipped != null ? (
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-[10px] font-bold uppercase text-slate-400">Skipped</p>
            <p className="text-base font-extrabold tabular-nums text-slate-700">{skipped}</p>
          </div>
        ) : null}
        {rankLabel ? (
          <div className="rounded-2xl bg-violet-50 p-3">
            <p className="text-[10px] font-bold uppercase text-violet-600/80">Rank</p>
            <p className="text-base font-extrabold text-violet-800">{rankLabel}</p>
          </div>
        ) : null}
        {percentileLabel ? (
          <div className="rounded-2xl bg-amber-50 p-3">
            <p className="text-[10px] font-bold uppercase text-amber-600/80">Percentile</p>
            <p className="text-base font-extrabold text-amber-800">{percentileLabel}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
});
