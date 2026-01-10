import * as React from "react";
import { cn } from "../../utils/cn";
import { useTheme } from "../../hooks/useTheme";

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  onValueChange?: (value: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div className={cn("", className)} {...props}>
      {children}
    </div>
  );
};

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {}

export const TabsList: React.FC<TabsListProps> = ({
  className,
  children,
  ...props
}) => {
  const { theme } = useTheme();

  return (
    <div
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-lg p-1",
        theme === "dark" ? "bg-slate-800" : "bg-slate-100",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({
  className,
  children,
  value,
  ...props
}) => {
  const { theme } = useTheme();

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        theme === "dark"
          ? "data-[state=active]:bg-slate-950 data-[state=active]:text-slate-50 data-[state=active]:shadow-sm"
          : "data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export const TabsContent: React.FC<TabsContentProps> = ({
  className,
  children,
  value,
  ...props
}) => {
  return (
    <div
      className={cn(
        "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
