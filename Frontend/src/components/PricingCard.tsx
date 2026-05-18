import React from "react";
import { Check } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { useTheme } from "../hooks/useTheme";
import type { PricingPlanType } from "../services/api";

interface PricingCardProps {
  plan: PricingPlanType;
  ctaText?: string;
  onCtaClick?: () => void;
  children?: React.ReactNode;
}

export const PricingCard: React.FC<PricingCardProps> = ({
  plan,
  ctaText = "Get Started",
  onCtaClick,
  children,
}) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="flex flex-col items-stretch h-full">
      {/* Most Popular — above the card, outside the border (bhr line ke) */}
      {plan.isPopular && (
        <div className="mb-2 flex justify-center">
          <span className="inline-block rounded-t-lg px-4 py-1.5 text-xs font-bold bg-[#2563eb] text-white shadow-sm">
            Most Popular
          </span>
        </div>
      )}

      <Card
        className={`relative flex flex-col flex-1 min-h-0 rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-lg ${
          plan.isPopular
            ? isDark
              ? "ring-2 ring-blue-400/50 shadow-blue-900/20"
              : "ring-2 ring-blue-300/60 shadow-blue-200/30"
            : isDark
              ? "border-slate-700 hover:border-slate-600"
              : "border-slate-200 hover:border-slate-300"
        }`}
      >
        <CardContent className={`flex flex-col flex-1 min-h-0 p-6 ${plan.isPopular ? "" : ""}`}>
          <div className="flex flex-col flex-1 min-h-0">
            <h3 className={`text-xl font-bold mb-1 ${isDark ? "text-slate-50" : "text-slate-900"}`}>
              {plan.name}
            </h3>
            <div className="mt-4 flex items-baseline gap-1">
              <span className={`text-3xl font-extrabold ${isDark ? "text-slate-50" : "text-slate-900"}`}>
                ₹{plan.price}
              </span>
            </div>
            <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              {plan.duration}
            </p>
            {plan.description && (
              <p className={`mt-3 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                {plan.description}
              </p>
            )}
            {plan.features && plan.features.length > 0 && (
              <ul className="mt-4 space-y-2 flex-1">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
                      isDark ? "bg-emerald-500/20" : "bg-emerald-100"
                    }`}>
                      <Check className={`w-3 h-3 ${isDark ? "text-emerald-400" : "text-emerald-600"}`} />
                    </span>
                    <span className={`text-sm ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {/* Subscribe / CTA fixed at bottom */}
            <div className="mt-6 pt-4 border-t border-slate-200/80 dark:border-slate-700/80 flex-shrink-0">
              {children ? (
                <div className="w-full">{children}</div>
              ) : (
                ctaText && (
                  <Button
                    className="w-full"
                    variant="primary"
                    onClick={onCtaClick}
                  >
                    {ctaText}
                  </Button>
                )
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
