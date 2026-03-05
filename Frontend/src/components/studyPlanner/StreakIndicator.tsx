import { Flame } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import { cn } from "../../utils/cn";

export interface StreakIndicatorProps {
  currentStreak: number;
  longestStreak?: number;
  className?: string;
}

export function StreakIndicator({
  currentStreak,
  longestStreak = 0,
  className,
}: StreakIndicatorProps) {
  const { theme } = useTheme();

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-xl px-3 py-2",
        theme === "dark" ? "bg-amber-500/15 border border-amber-500/30" : "bg-amber-50 border border-amber-200",
        className
      )}
    >
      <Flame
        className={cn(
          "w-5 h-5 flex-shrink-0",
          currentStreak > 0 ? "text-amber-500" : "text-amber-500/50"
        )}
      />
      <div className="flex flex-col min-w-0">
        <span
          className={cn(
            "text-sm font-bold tabular-nums",
            theme === "dark" ? "text-amber-200" : "text-amber-800"
          )}
        >
          {currentStreak} day{currentStreak !== 1 ? "s" : ""} streak
        </span>
        {longestStreak > 0 && (
          <span
            className={cn(
              "text-xs",
              theme === "dark" ? "text-amber-400/80" : "text-amber-700/80"
            )}
          >
            Best: {longestStreak} days
          </span>
        )}
      </div>
    </div>
  );
}
