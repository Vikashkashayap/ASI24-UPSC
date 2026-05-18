import React from "react";
import { useTheme } from "../hooks/useTheme";

export interface SubjectToggleProps {
  options: readonly string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  disabled?: boolean;
  /** Single-select mode (e.g. CSAT category) – only one option at a time */
  singleSelect?: boolean;
  /** Optional label for accessibility */
  label?: string;
}

/**
 * Reusable multi-select (or single-select) toggle button group.
 * Selected items use gradient purple; unselected use existing theme styles.
 */
export const SubjectToggle: React.FC<SubjectToggleProps> = ({
  options,
  selected,
  onChange,
  disabled = false,
  singleSelect = false,
  label,
}) => {
  const { theme } = useTheme();

  const toggle = (option: string) => {
    if (disabled) return;
    if (singleSelect) {
      onChange(selected.includes(option) ? [] : [option]);
      return;
    }
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <div>
      {label && (
        <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
          {label}
        </label>
      )}
      <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2 sm:gap-3">
        {options.map((option) => {
          const isSelected = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggle(option)}
              disabled={disabled}
              className={`min-w-0 min-h-[44px] sm:min-h-0 px-2 sm:px-4 py-2.5 sm:py-3 rounded-lg border transition-colors touch-manipulation text-xs sm:text-sm font-medium
                ${isSelected
                  ? "bg-gradient-to-r from-purple-600 to-purple-500 text-white border-purple-600 shadow-md"
                  : theme === "dark"
                    ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 active:bg-slate-700"
                    : "border-slate-300 bg-white hover:bg-slate-50 text-slate-800 active:bg-slate-100"
                }
                ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}
              `}
            >
              <span className="truncate block text-center">{option}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
