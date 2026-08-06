import React, { memo } from "react";
import { Search } from "lucide-react";
import { FilterChips, type FilterChip } from "../study/FilterChips";

interface TestFilterBarProps {
  search: string;
  onSearch: (v: string) => void;
  placeholder?: string;
  subject: string;
  subjects: string[];
  onSubject: (v: string) => void;
  chips?: FilterChip[];
  activeChip?: string;
  onChipChange?: (id: string) => void;
  accentFocus?: string;
}

export const TestFilterBar = memo(function TestFilterBar({
  search,
  onSearch,
  placeholder = "Search tests…",
  subject,
  subjects,
  onSubject,
  chips,
  activeChip,
  onChipChange,
  accentFocus = "focus:border-blue-500 focus:ring-blue-100",
}: TestFilterBarProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={placeholder}
            className={`h-12 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-[14px] font-medium text-slate-900 shadow-soft outline-none placeholder:text-slate-400 focus:ring-4 ${accentFocus}`}
            aria-label="Search tests"
          />
        </div>
        <select
          value={subject}
          onChange={(e) => onSubject(e.target.value)}
          aria-label="Filter by subject"
          className={`h-12 shrink-0 rounded-2xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-800 shadow-soft outline-none focus:ring-4 sm:w-52 ${accentFocus}`}
        >
          <option value="">All subjects</option>
          {subjects.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      {chips && activeChip != null && onChipChange ? (
        <FilterChips chips={chips} activeId={activeChip} onChange={onChipChange} />
      ) : null}
    </div>
  );
});
