import React, { memo } from "react";
import { Crown } from "lucide-react";
import type { LayoutTheme } from "./types";
import { formatExpiryDate } from "./navStyles";

interface SubscriptionCardProps {
  planName: string;
  endDate?: string | null;
  theme: LayoutTheme;
  onClick?: () => void;
}

export const SubscriptionCard = memo(function SubscriptionCard({
  planName,
  endDate,
  theme,
  onClick,
}: SubscriptionCardProps) {
  const expiry = formatExpiryDate(endDate);
  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      title={planName}
      className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-150 ${
        onClick ? "hover:brightness-[1.03] active:scale-[0.99] cursor-pointer" : ""
      } ${
        theme === "dark"
          ? "bg-gradient-to-br from-blue-600/25 to-blue-500/10 text-blue-100 ring-1 ring-blue-400/25"
          : "bg-gradient-to-br from-blue-50 to-sky-50 text-blue-900 ring-1 ring-blue-200/80"
      }`}
    >
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${
          theme === "dark" ? "bg-blue-500/30 text-blue-200" : "bg-blue-600 text-white"
        }`}
      >
        <Crown className="w-3.5 h-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={`text-[12px] font-semibold leading-snug truncate ${
            theme === "dark" ? "text-white" : "text-blue-950"
          }`}
        >
          {planName}
        </p>
        <p
          className={`text-[10px] font-medium truncate ${
            theme === "dark" ? "text-blue-200/80" : "text-blue-700/80"
          }`}
        >
          Active{expiry ? ` · until ${expiry}` : ""}
        </p>
      </div>
    </Wrapper>
  );
});
