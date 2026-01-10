import * as React from "react";
import { cn } from "../../utils/cn";
import { useTheme } from "../../hooks/useTheme";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
}

export const Progress: React.FC<ProgressProps> = ({
  className,
  value = 0,
  max = 100,
  ...props
}) => {
  const { theme } = useTheme();

  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div
      className={cn(
        "relative h-4 w-full overflow-hidden rounded-full",
        theme === "dark" ? "bg-slate-800" : "bg-slate-200",
        className
      )}
      {...props}
    >
      <div
        className={cn(
          "h-full w-full flex-1 transition-all",
          theme === "dark" ? "bg-fuchsia-600" : "bg-slate-900"
        )}
        style={{
          transform: `translateX(-${100 - percentage}%)`,
        }}
      />
    </div>
  );
};
