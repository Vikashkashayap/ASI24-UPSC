import * as React from "react";
import { cn } from "../../utils/cn";
import { useTheme } from "../../hooks/useTheme";

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  const { theme } = useTheme();

  const base =
    theme === "dark"
      ? "bg-slate-950/80 rounded-2xl border border-fuchsia-500/20 shadow-[0_24px_80px_rgba(15,23,42,0.9)] backdrop-blur-sm"
      : "bg-white rounded-2xl shadow-lg border border-slate-200 backdrop-blur-sm";

  return <div className={cn(base, className)} {...props} />;
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => <div className={cn("px-5 pt-5", className)} {...props} />;

export const CardTitle: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  const { theme } = useTheme();
  return (
    <div
      className={cn(
        "text-sm font-semibold",
        theme === "dark" ? "text-slate-50" : "text-slate-900",
        className
      )}
      {...props}
    />
  );
};

export const CardDescription: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  const { theme } = useTheme();
  return (
    <div
      className={cn(
        "text-xs mt-1",
        theme === "dark" ? "text-slate-400" : "text-slate-600",
        className
      )}
      {...props}
    />
  );
};

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => <div className={cn("px-5 pb-5 pt-3", className)} {...props} />;
