import React from "react";
import type { ExamLang } from "../../hooks/useExamLanguage";

interface ExamLanguageToggleProps {
  lang: ExamLang;
  onChange: (lang: ExamLang) => void;
  compact?: boolean;
  className?: string;
}

/** Instant language switch — reads pre-stored DB fields only (no API). */
export const ExamLanguageToggle: React.FC<ExamLanguageToggleProps> = ({
  lang,
  onChange,
  compact = false,
  className = "",
}) => {
  return (
    <div
      className={`inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 ${className}`}
      role="group"
      aria-label="Exam language"
    >
      {(["hi", "en"] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => onChange(code)}
          className={`${compact ? "px-2 py-1 text-[10px]" : "px-2.5 py-1 text-[11px]"} sm:text-xs font-semibold rounded-md transition-colors touch-manipulation ${
            lang === code
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-white"
          }`}
        >
          {code === "hi" ? "हिंदी" : "English"}
        </button>
      ))}
    </div>
  );
};
