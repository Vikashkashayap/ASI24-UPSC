import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "../../utils/cn";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: "primary" | "outline" | "ghost" | "default" | "destructive";
}

// Mobile-first button: minimum 44px height for touch targets (MentorsDaily-style: royal blue primary, outline)
const buttonBase =
  "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]/70 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px] px-3 py-2 md:px-4 touch-manipulation";

const variants: Record<string, string> = {
  primary:
    "md-btn-primary border-0",
  default:
    "md-btn-primary border-0",
  destructive:
    "bg-red-600 text-white hover:bg-red-700",
  outline:
    "md-btn-outline border-2",
  ghost: "text-slate-600 hover:bg-blue-50 hover:text-[#2563eb]",
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
