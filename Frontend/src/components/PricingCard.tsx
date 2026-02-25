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
    <Card
      className={`relative rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-lg ${
        plan.isPopular
          ? isDark
            ? "ring-2 ring-fuchsia-500/50 shadow-fuchsia-900/20"
            : "ring-2 ring-fuchsia-400/50 shadow-fuchsia-200/30"
          : isDark
            ? "border-purple-800/60 hover:border-purple-600/50"
            : "border-slate-200 hover:border-purple-200"
      }`}
    >
      {plan.isPopular && (
        <div className="absolute top-0 left-0 right-0 py-1.5 text-center text-xs font-bold bg-gradient-to-r from-fuchsia-500 to-emerald-500 text-white">
          Most Popular
        </div>
      )}
      <CardContent className={`p-6 ${plan.isPopular ? "pt-10" : ""}`}>
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
          <ul className="mt-4 space-y-2">
            {plan.features.map((feature, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
                  isDark ? "bg-emerald-500/20" : "bg-emerald-100"
                }`}>
                  <Check className="w-3 h-3 text-emerald-500" />
                </span>
                <span className={`text-sm ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                  {feature}
                </span>
              </li>
            ))}
          </ul>
        )}
        {children ? (
          <div className="mt-6">{children}</div>
        ) : (
          ctaText && (
            <Button
              className="w-full mt-6"
              variant="primary"
              onClick={onCtaClick}
            >
              {ctaText}
            </Button>
          )
        )}
      </CardContent>
    </Card>
  );
};
