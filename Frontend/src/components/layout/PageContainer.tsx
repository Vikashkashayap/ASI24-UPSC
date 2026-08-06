import React, { memo } from "react";

interface PageContainerProps {
  children: React.ReactNode;
  /** Skip default padding (e.g. full-bleed mentor chat) */
  flush?: boolean;
  /** Extra bottom padding for mobile bottom nav */
  withBottomNav?: boolean;
  className?: string;
}

/**
 * Scrollable main content shell with consistent 8px-based spacing.
 * Prevents horizontal overflow; safe for Capacitor Android.
 */
export const PageContainer = memo(function PageContainer({
  children,
  flush = false,
  withBottomNav = false,
  className = "",
}: PageContainerProps) {
  // Bottom nav ≈ 56px + safe-area; small buffer so content isn't hidden
  const bottomNavPad = withBottomNav
    ? "pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-0"
    : "";

  if (flush) {
    return (
      <div className={`flex min-h-0 flex-1 flex-col overflow-hidden ${bottomNavPad} ${className}`}>
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-0 w-full min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain scroll-smooth scrollbar-hide">
      <div
        className={`box-border w-full min-w-0 max-w-full px-2 pt-3 sm:px-3 md:px-4 md:pt-6 lg:px-6 page-transition-enter ${
          withBottomNav
            ? "pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-6"
            : "pb-4 md:pb-6"
        } ${className}`}
      >
        {children}
      </div>
    </div>
  );
});
