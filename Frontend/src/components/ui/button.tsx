import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "../../utils/cn";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: "primary" | "outline" | "ghost" | "default" | "destructive";
}

const buttonBase =
  "inline-flex items-center justify-center rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020012] disabled:opacity-60 disabled:cursor-not-allowed";

const variants: Record<string, string> = {
  primary:
    "bg-gradient-to-r from-fuchsia-500 to-emerald-400 text-slate-950 hover:from-fuchsia-400 hover:to-emerald-300 px-4 py-2 shadow-[0_18px_70px_rgba(147,51,234,0.6)]",
  default:
    "bg-gradient-to-r from-fuchsia-500 to-emerald-400 text-slate-950 hover:from-fuchsia-400 hover:to-emerald-300 px-4 py-2 shadow-[0_18px_70px_rgba(147,51,234,0.6)]",
  destructive:
    "bg-red-600 text-white hover:bg-red-700 px-4 py-2",
  outline:
    "border border-purple-700/80 bg-black/40 text-slate-200 hover:bg-purple-950/50 px-4 py-2",
  ghost: "text-slate-300 hover:bg-slate-800/80 px-3 py-1.5",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonBase, variants[variant], className)}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
