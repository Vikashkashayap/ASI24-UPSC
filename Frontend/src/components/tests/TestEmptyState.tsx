import React, { memo } from "react";
import type { LucideIcon } from "lucide-react";

interface TestEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const TestEmptyState = memo(function TestEmptyState({
  icon: Icon,
  title,
  description,
}: TestEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[20px] border border-dashed border-slate-200 bg-white px-4 py-16 text-center shadow-soft">
      <Icon className="mb-3 h-14 w-14 text-slate-300" />
      <h3 className="text-base font-bold text-slate-800">{title}</h3>
      <p className="mt-1 max-w-sm text-sm font-medium text-slate-500">{description}</p>
    </div>
  );
});
