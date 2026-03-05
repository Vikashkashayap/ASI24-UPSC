import { useTheme } from "../../hooks/useTheme";
import { cn } from "../../utils/cn";

export interface ProgressBarProps {
  label: string;
  value: number;
  max?: number;
  showCount?: boolean;
  className?: string;
}

export function ProgressBar({
  label,
  value,
  max = 100,
  showCount = true,
  className,
}: ProgressBarProps) {
  const { theme } = useTheme();
  const percent = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex justify-between text-xs">
        <span className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>
          {label}
        </span>
        {showCount && (
          <span className={theme === "dark" ? "text-slate-300" : "text-slate-700"}>
            {value}/{max} ({percent}%)
          </span>
        )}
      </div>
      <div
        className={cn(
          "h-2 w-full overflow-hidden rounded-full",
          theme === "dark" ? "bg-slate-800" : "bg-slate-200"
        )}
      >
        <div
          className={cn(
            "h-full transition-all duration-300 rounded-full",
            theme === "dark" ? "bg-emerald-500" : "bg-emerald-600"
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
