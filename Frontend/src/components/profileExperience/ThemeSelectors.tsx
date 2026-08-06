import React, { memo } from "react";
import type { AppearancePrefs, PersonalizationPrefs } from "./prefs";

interface ThemeSelectorProps {
  value: AppearancePrefs["theme"];
  onChange: (v: AppearancePrefs["theme"]) => void;
}

export const ThemeSelector = memo(function ThemeSelector({ value, onChange }: ThemeSelectorProps) {
  const options: { id: AppearancePrefs["theme"]; label: string }[] = [
    { id: "light", label: "Light" },
    { id: "dark", label: "Dark" },
    { id: "system", label: "System" },
  ];
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Theme">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={`app-chrome-btn min-h-[48px] rounded-2xl border text-[12px] font-bold ${
            value === o.id
              ? "border-blue-600 bg-blue-600 text-white"
              : "border-slate-200 bg-white text-slate-600"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
});

interface LanguageSelectorProps {
  value: PersonalizationPrefs["language"];
  onChange: (v: PersonalizationPrefs["language"]) => void;
}

export const LanguageSelector = memo(function LanguageSelector({ value, onChange }: LanguageSelectorProps) {
  const options: { id: PersonalizationPrefs["language"]; label: string }[] = [
    { id: "en", label: "English" },
    { id: "hi", label: "Hindi" },
    { id: "bilingual", label: "Bilingual" },
  ];
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Language">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={`app-chrome-btn min-h-[48px] rounded-2xl border text-[12px] font-bold ${
            value === o.id
              ? "border-indigo-600 bg-indigo-600 text-white"
              : "border-slate-200 bg-white text-slate-600"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
});

interface AccentSelectorProps {
  value: string;
  onChange: (v: string) => void;
}

const ACCENTS = [
  { id: "blue", className: "bg-blue-600" },
  { id: "indigo", className: "bg-indigo-600" },
  { id: "emerald", className: "bg-emerald-600" },
  { id: "amber", className: "bg-amber-500" },
  { id: "rose", className: "bg-rose-500" },
];

export const AccentSelector = memo(function AccentSelector({ value, onChange }: AccentSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Accent color">
      {ACCENTS.map((a) => (
        <button
          key={a.id}
          type="button"
          role="radio"
          aria-checked={value === a.id}
          aria-label={a.id}
          onClick={() => onChange(a.id)}
          className={`h-10 w-10 rounded-2xl ${a.className} ${
            value === a.id ? "ring-2 ring-offset-2 ring-slate-900" : ""
          }`}
        />
      ))}
    </div>
  );
});
