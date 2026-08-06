import React, { memo } from "react";
import { NavLink } from "react-router-dom";
import type { LayoutTheme } from "./types";
import { navLinkClass, sidebarNavIconClass } from "./navStyles";

interface SidebarNavItemProps {
  to: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  theme: LayoutTheme;
  collapsed: boolean;
  muted?: boolean;
  onNavigate?: () => void;
  end?: boolean;
  pathname?: string;
  isActiveMatch?: (pathname: string) => boolean;
}

export const SidebarNavItem = memo(function SidebarNavItem({
  to,
  title,
  icon: Icon,
  label,
  theme,
  collapsed,
  muted,
  onNavigate,
  end,
  pathname,
  isActiveMatch,
}: SidebarNavItemProps) {
  return (
    <NavLink
      to={to}
      title={title}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) => {
        const active = pathname && isActiveMatch ? isActiveMatch(pathname) : isActive;
        return navLinkClass({ isActive: active, theme, collapsed, muted });
      }}
    >
      {({ isActive }) => {
        const active = pathname && isActiveMatch ? isActiveMatch(pathname) : isActive;
        return (
          <>
            <Icon className={sidebarNavIconClass(active, theme)} />
            {!collapsed && <span className="truncate flex-1 min-w-0 leading-tight">{label}</span>}
          </>
        );
      }}
    </NavLink>
  );
});

interface SidebarSectionProps {
  label?: string;
  theme: LayoutTheme;
  collapsed: boolean;
  children: React.ReactNode;
}

export const SidebarSection = memo(function SidebarSection({
  label,
  theme,
  collapsed,
  children,
}: SidebarSectionProps) {
  return (
    <div className="space-y-0.5">
      {!collapsed && label ? (
        <div
          className={`px-3 mb-1.5 mt-4 first:mt-1 text-[10px] font-bold uppercase tracking-[0.1em] ${
            theme === "dark" ? "text-slate-400" : "text-slate-500"
          }`}
        >
          {label}
        </div>
      ) : null}
      {collapsed && label ? (
        <div
          className={`mx-auto my-2.5 h-px w-6 ${theme === "dark" ? "bg-slate-700/80" : "bg-slate-200"}`}
          aria-hidden
        />
      ) : null}
      <div className="space-y-1">{children}</div>
    </div>
  );
});
