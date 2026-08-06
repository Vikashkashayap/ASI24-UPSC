import React, { memo } from "react";
import { motion } from "framer-motion";
import type { ComponentType } from "react";

interface QuickActionCardProps {
  label: string;
  description?: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number | string }>;
  gradient: string;
  onClick: () => void;
}

export const QuickActionCard = memo(function QuickActionCard({
  label,
  description,
  icon: Icon,
  gradient,
  onClick,
}: QuickActionCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -3, scale: 1.02 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
      className={`relative overflow-hidden rounded-[20px] p-4 text-left text-white shadow-soft min-h-[104px] touch-manipulation ${gradient}`}
      aria-label={label}
    >
      <span className="pointer-events-none absolute -right-3 -bottom-4 h-20 w-20 rounded-full bg-white/15" />
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
        <Icon className="h-5 w-5" strokeWidth={2.2} />
      </span>
      <p className="relative mt-3 text-[13px] font-bold leading-tight">{label}</p>
      {description ? (
        <p className="relative mt-0.5 text-[11px] font-medium text-white/75 leading-snug line-clamp-1">
          {description}
        </p>
      ) : null}
    </motion.button>
  );
});
