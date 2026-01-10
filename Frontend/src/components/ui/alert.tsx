import * as React from "react";
import { cn } from "../../utils/cn";
import { useTheme } from "../../hooks/useTheme";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Alert: React.FC<AlertProps> = ({
  className,
  children,
  ...props
}) => {
  const { theme } = useTheme();

  return (
    <div
      className={cn(
        "relative w-full rounded-lg border p-4",
        theme === "dark"
          ? "border-slate-700 bg-slate-800/50 text-slate-200"
          : "border-slate-200 bg-slate-50 text-slate-900",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export interface AlertDescriptionProps extends React.HTMLAttributes<HTMLDivElement> {}

export const AlertDescription: React.FC<AlertDescriptionProps> = ({
  className,
  ...props
}) => {
  return (
    <div
      className={cn("text-sm [&_p]:leading-relaxed", className)}
      {...props}
    />
  );
};
