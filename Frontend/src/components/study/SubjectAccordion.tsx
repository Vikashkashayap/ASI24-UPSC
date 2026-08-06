import React, { memo } from "react";
import { ChevronDown } from "lucide-react";

interface SubjectAccordionProps {
  title: string;
  progress?: number;
  completed?: number;
  remaining?: number;
  estimatedTime?: string;
  open?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
}

export const SubjectAccordion = memo(function SubjectAccordion({
  title,
  progress = 0,
  completed = 0,
  remaining = 0,
  estimatedTime,
  open,
  onToggle,
  children,
}: SubjectAccordionProps) {
  return (
    <div className="overflow-hidden rounded-[20px] border border-slate-200/80 bg-white shadow-soft">
      <button
        type="button"
        onClick={onToggle}
        className="app-chrome-btn flex w-full items-center gap-3 p-4 text-left"
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-bold text-slate-900">{title}</h3>
          <p className="mt-0.5 text-[11px] font-medium text-slate-500">
            {completed} done · {remaining} left
            {estimatedTime ? ` · ${estimatedTime}` : ""}
          </p>
          <div className="mt-2 h-1.5 max-w-[200px] overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
        </div>
        <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? <div className="border-t border-slate-100 p-3 space-y-2">{children}</div> : null}
    </div>
  );
});
