import React, { memo } from "react";
import type { LucideIcon } from "lucide-react";

interface TestStatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: string;
}

export const TestStatCard = memo(function TestStatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "bg-blue-50 text-blue-600",
}: TestStatCardProps) {
  return (
    <div className="rounded-[20px] border border-slate-200/80 bg-white p-3.5 shadow-soft">
      <span className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl ${tone}`}>
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-lg font-extrabold tabular-nums text-slate-900">{value}</p>
      {hint ? <p className="text-[11px] font-medium text-slate-500">{hint}</p> : null}
    </div>
  );
});
