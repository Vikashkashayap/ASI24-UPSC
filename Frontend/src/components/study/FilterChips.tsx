import React, { memo } from "react";

export interface FilterChip {
  id: string;
  label: string;
}

interface FilterChipsProps {
  chips: FilterChip[];
  activeId: string;
  onChange: (id: string) => void;
}

export const FilterChips = memo(function FilterChips({ chips, activeId, onChange }: FilterChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" role="tablist">
      {chips.map((chip) => {
        const active = chip.id === activeId;
        return (
          <button
            key={chip.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(chip.id)}
            className={`app-chrome-btn h-10 shrink-0 rounded-full px-4 text-[12px] font-bold transition-colors ${
              active
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                : "bg-white text-slate-600 border border-slate-200 hover:border-blue-200 hover:text-blue-700"
            }`}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
});
