import React, { memo } from "react";

interface AnalyticsBarProps {
  label: string;
  value: number;
  max?: number;
  tone?: string;
}

export const AnalyticsChart = memo(function AnalyticsChart({
  items,
  title = "Subject analysis",
}: {
  title?: string;
  items: AnalyticsBarProps[];
}) {
  const peak = Math.max(1, ...items.map((i) => i.max ?? i.value));
  return (
    <section className="rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-soft">
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      <div className="mt-3 space-y-3">
        {items.map((item) => {
          const pct = Math.round(((item.value) / peak) * 100);
          return (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between text-[11px] font-semibold">
                <span className="text-slate-600">{item.label}</span>
                <span className="tabular-nums text-slate-900">{item.value}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${item.tone || "bg-gradient-to-r from-blue-500 to-indigo-500"}`}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
});

export const LeaderboardCard = memo(function LeaderboardCard({
  rows,
}: {
  rows: { rank: number; name: string; score: string; you?: boolean }[];
}) {
  return (
    <section className="rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-soft">
      <h3 className="text-sm font-bold text-slate-900">Leaderboard</h3>
      <ul className="mt-3 space-y-2">
        {rows.map((r) => (
          <li
            key={r.rank}
            className={`flex items-center justify-between rounded-2xl px-3 py-2.5 text-[13px] font-semibold ${
              r.you ? "bg-blue-50 text-blue-800" : "bg-slate-50 text-slate-700"
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-white text-[11px] font-extrabold tabular-nums shadow-sm">
                {r.rank}
              </span>
              {r.name}
            </span>
            <span className="tabular-nums">{r.score}</span>
          </li>
        ))}
      </ul>
    </section>
  );
});

export const SubjectCard = memo(function SubjectCard({
  title,
  accuracy,
  tone = "strong",
}: {
  title: string;
  accuracy: number;
  tone?: "strong" | "weak";
}) {
  return (
    <div
      className={`rounded-[20px] border p-3.5 shadow-soft ${
        tone === "strong"
          ? "border-emerald-100 bg-gradient-to-br from-emerald-50 to-white"
          : "border-amber-100 bg-gradient-to-br from-amber-50 to-white"
      }`}
    >
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {tone === "strong" ? "Strong" : "Needs work"}
      </p>
      <p className="mt-1 text-sm font-bold text-slate-900">{title}</p>
      <p className="mt-1 text-lg font-extrabold tabular-nums text-slate-800">{Math.round(accuracy)}%</p>
    </div>
  );
});
