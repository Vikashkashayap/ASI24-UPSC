import React, { memo } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";

interface SettingsCardProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  tone?: string;
  onClick?: () => void;
  trailing?: React.ReactNode;
  children?: React.ReactNode;
}

export const SettingsCard = memo(function SettingsCard({
  title,
  description,
  icon: Icon,
  tone = "bg-blue-50 text-blue-600",
  onClick,
  trailing,
  children,
}: SettingsCardProps) {
  const Comp: "button" | "div" = onClick ? "button" : "div";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[20px] border border-slate-200/80 bg-white shadow-soft"
    >
      {Comp === "button" ? (
        <button
          type="button"
          onClick={onClick}
          className="app-chrome-btn flex w-full min-h-[56px] items-center gap-3 p-4 text-left"
        >
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tone}`}>
            <Icon className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-bold text-slate-900">{title}</span>
            {description ? (
              <span className="mt-0.5 block text-[12px] font-medium text-slate-500">{description}</span>
            ) : null}
          </span>
          {trailing ?? <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />}
        </button>
      ) : (
        <div className="flex w-full items-center gap-3 p-4 text-left">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tone}`}>
            <Icon className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-bold text-slate-900">{title}</span>
            {description ? (
              <span className="mt-0.5 block text-[12px] font-medium text-slate-500">{description}</span>
            ) : null}
          </span>
          {trailing}
        </div>
      )}
      {children ? <div className="border-t border-slate-100 px-4 pb-4 pt-2">{children}</div> : null}
    </motion.div>
  );
});

interface SettingsRowProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
}

export const SettingsRow = memo(function SettingsRow({ label, hint, children }: SettingsRowProps) {
  return (
    <div className="flex min-h-[48px] items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-slate-800">{label}</p>
        {hint ? <p className="text-[11px] font-medium text-slate-500">{hint}</p> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
});

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}

export const ToggleSwitch = memo(function ToggleSwitch({ checked, onChange, label }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 rounded-full transition-colors ${checked ? "bg-blue-600" : "bg-slate-200"}`}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
          checked ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
});
