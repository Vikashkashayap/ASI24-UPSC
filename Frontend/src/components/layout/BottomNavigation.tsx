import React, { memo, useCallback } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { STUDENT_BOTTOM_NAV } from "./navConfig";
import type { LayoutTheme } from "./types";

interface BottomNavigationProps {
  theme: LayoutTheme;
}

export const BottomNavigation = memo(function BottomNavigation({ theme }: BottomNavigationProps) {
  const location = useLocation();
  const isDark = theme === "dark";

  const tone = useCallback(
    (active: boolean) =>
      active
        ? isDark
          ? "text-blue-300"
          : "text-blue-600"
        : isDark
          ? "text-slate-200"
          : "text-slate-700",
    [isDark]
  );

  return (
    <nav
      className={`fixed bottom-0 inset-x-0 z-50 md:hidden border-t pb-[env(safe-area-inset-bottom,0px)] ${
        isDark
          ? "border-slate-800 bg-[#0B1220]"
          : "border-slate-200 bg-white"
      }`}
      aria-label="Bottom navigation"
    >
      <div className="grid h-[56px] grid-cols-5 px-0.5 pt-0.5">
        {STUDENT_BOTTOM_NAV.map((item) => {
          const Icon = item.icon;

          if (item.href) {
            return (
              <a
                key={item.id}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="relative flex flex-col items-center justify-center gap-1 touch-manipulation active:scale-95"
                title={item.label}
              >
                <Icon className={`h-[18px] w-[18px] ${tone(false)}`} strokeWidth={2.25} />
                <span className={`max-w-full truncate px-0.5 text-[10px] font-semibold leading-none ${tone(false)}`}>
                  {item.label}
                </span>
              </a>
            );
          }

          const isActive = item.isActiveMatch
            ? item.isActiveMatch(location.pathname)
            : location.pathname === item.to;

          return (
            <NavLink
              key={item.id}
              to={item.to!}
              className="relative flex flex-col items-center justify-center touch-manipulation"
              title={item.label}
            >
              {({ isActive: linkActive }) => {
                const active = isActive || linkActive;
                return (
                  <motion.span
                    className="relative flex h-full w-full flex-col items-center justify-center gap-1"
                    whileTap={{ scale: 0.92 }}
                    transition={{ type: "spring", stiffness: 520, damping: 28 }}
                  >
                    {active ? (
                      <motion.span
                        layoutId="md-bottom-pill"
                        className={`absolute inset-x-1 top-0.5 bottom-0.5 rounded-xl ${
                          isDark ? "bg-blue-500/25" : "bg-blue-100"
                        }`}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    ) : null}
                    <span className="relative z-10">
                      <Icon
                        className={`h-[18px] w-[18px] ${tone(active)}`}
                        strokeWidth={active ? 2.6 : 2.25}
                      />
                    </span>
                    <span
                      className={`relative z-10 max-w-full truncate px-0.5 text-[10px] leading-none ${
                        active ? "font-bold" : "font-semibold"
                      } ${tone(active)}`}
                    >
                      {item.label}
                    </span>
                  </motion.span>
                );
              }}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
});
