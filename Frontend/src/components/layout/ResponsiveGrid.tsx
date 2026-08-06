import React, { memo } from "react";

type GridCols = 1 | 2 | 3 | 4;

interface ResponsiveGridProps {
  children: React.ReactNode;
  /** Max columns at xl+; scales down automatically */
  cols?: GridCols;
  gap?: 2 | 3 | 4 | 5 | 6 | 8;
  className?: string;
}

const COLS_MAP: Record<GridCols, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
};

const GAP_MAP: Record<NonNullable<ResponsiveGridProps["gap"]>, string> = {
  2: "gap-2",
  3: "gap-3",
  4: "gap-4",
  5: "gap-5",
  6: "gap-6",
  8: "gap-8",
};

/**
 * Fluid responsive grid — no fixed widths, no horizontal scroll.
 * Uses Tailwind breakpoints: sm → md → lg → xl → 2xl.
 */
export const ResponsiveGrid = memo(function ResponsiveGrid({
  children,
  cols = 3,
  gap = 4,
  className = "",
}: ResponsiveGridProps) {
  return (
    <div className={`grid w-full min-w-0 ${COLS_MAP[cols]} ${GAP_MAP[gap]} ${className}`}>
      {children}
    </div>
  );
});
