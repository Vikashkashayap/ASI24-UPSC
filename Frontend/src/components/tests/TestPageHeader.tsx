import React, { memo } from "react";
import type { LucideIcon } from "lucide-react";

interface TestPageHeaderProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  accent?: "blue" | "amber" | "violet";
  action?: React.ReactNode;
}

const ACCENT = {
  blue: {
    wrap: "from-white via-blue-50/40 to-white border-blue-200/60",
    blob: "from-blue-500/10",
    icon: "bg-blue-100 text-blue-600",
    title: "from-blue-700 via-blue-800 to-slate-800",
  },
  amber: {
    wrap: "from-white via-amber-50/40 to-white border-amber-200/60",
    blob: "from-amber-500/10",
    icon: "bg-amber-100 text-amber-600",
    title: "from-amber-600 via-amber-700 to-amber-900",
  },
  violet: {
    wrap: "from-white via-violet-50/40 to-white border-violet-200/60",
    blob: "from-violet-500/10",
    icon: "bg-violet-100 text-violet-600",
    title: "from-violet-700 via-indigo-800 to-slate-800",
  },
};

export const TestPageHeader = memo(function TestPageHeader({
  title,
  subtitle,
  icon: Icon,
  accent = "blue",
  action,
}: TestPageHeaderProps) {
  const a = ACCENT[accent];
  return (
    <header
      className={`relative overflow-hidden rounded-[20px] border bg-gradient-to-br p-5 shadow-soft sm:p-6 ${a.wrap}`}
    >
      <div className={`pointer-events-none absolute -right-8 -top-8 h-48 w-48 rounded-full bg-gradient-to-br ${a.blob} to-transparent blur-3xl`} />
      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${a.icon}`}>
            <Icon className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h1 className={`bg-gradient-to-r bg-clip-text text-2xl font-extrabold tracking-tight text-transparent sm:text-3xl ${a.title}`}>
              {title}
            </h1>
            <p className="mt-0.5 text-sm font-medium text-slate-600">{subtitle}</p>
          </div>
        </div>
        {action}
      </div>
    </header>
  );
});
