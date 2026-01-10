import * as React from "react";
import { cn } from "../../utils/cn";
import { useTheme } from "../../hooks/useTheme";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline";
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "default",
  ...props
}) => {
  const { theme } = useTheme();

  const variants = {
    default: theme === "dark"
      ? "bg-fuchsia-600 text-white hover:bg-fuchsia-700"
      : "bg-slate-900 text-white hover:bg-slate-800",
    secondary: theme === "dark"
      ? "bg-slate-800 text-slate-200 hover:bg-slate-700"
      : "bg-slate-100 text-slate-900 hover:bg-slate-200",
    outline: theme === "dark"
      ? "border border-slate-600 text-slate-300 hover:bg-slate-800"
      : "border border-slate-300 text-slate-700 hover:bg-slate-100"
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
        variants[variant],
        className
      )}
      {...props}
    />
  );
};
