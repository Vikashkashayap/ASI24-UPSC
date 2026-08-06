import React, { memo } from "react";
import { PanelLeftClose, PanelLeftOpen, HelpCircle, LogOut, X } from "lucide-react";
import logoImg from "../../LOGO/mentorsdaily.png";
import { RoleSidebarNav } from "./RoleSidebarNav";
import { SidebarNavItem } from "./SidebarNavItem";
import {
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_EXPANDED_WIDTH,
  HEADER_HEIGHT,
  sidebarSurfaceClass,
} from "./navStyles";
import type { LayoutTheme, LayoutUser } from "./types";

interface DesktopSidebarProps {
  theme: LayoutTheme;
  collapsed: boolean;
  onToggleCollapse: () => void;
  pathname: string;
  user: LayoutUser | null;
  hasActiveSubscription: boolean;
  onLogout: () => void;
}

export const DesktopSidebar = memo(function DesktopSidebar({
  theme,
  collapsed,
  onToggleCollapse,
  pathname,
  user,
  hasActiveSubscription,
  onLogout,
}: DesktopSidebarProps) {
  const widthClass = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH;
  const isStudent = user?.role !== "admin" && user?.role !== "mentor";
  const surface = sidebarSurfaceClass(theme);

  return (
    <aside
      className={`${widthClass} hidden md:flex sticky top-0 h-[100dvh] z-40 flex-col shrink-0 border-r transition-[width] duration-300 ease-out ${surface}`}
      aria-label="Main navigation"
    >
      <div
        className={`${collapsed ? "px-1.5" : "px-4"} ${HEADER_HEIGHT} border-b flex items-center ${
          collapsed ? "justify-center" : "justify-between"
        } gap-2 flex-shrink-0 ${theme === "dark" ? "border-slate-800/80" : "border-gray-200"}`}
      >
        {collapsed ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            className={`app-chrome-btn flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
              theme === "dark"
                ? "bg-blue-500/15 text-blue-300 hover:bg-blue-500/25"
                : "bg-blue-50 text-blue-600 hover:bg-blue-100"
            }`}
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="h-5 w-5" />
          </button>
        ) : (
          <>
            <div className="flex min-w-0 shrink-0 items-center gap-1.5">
              <img
                src={logoImg}
                alt="MentorsDaily"
                className="h-10 w-auto flex-shrink-0 object-contain object-center lg:h-11"
              />
            </div>
            <button
              type="button"
              onClick={onToggleCollapse}
              className={`app-chrome-btn flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                theme === "dark"
                  ? "text-[#D1D5DB] hover:bg-white/[0.06]"
                  : "text-slate-700 hover:bg-gray-50"
              }`}
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      <nav
        className={`${collapsed ? "px-2" : "px-3"} py-4 space-y-1 flex-1 overflow-y-auto scroll-smooth scrollbar-hide overscroll-contain`}
      >
        <RoleSidebarNav
          theme={theme}
          collapsed={collapsed}
          pathname={pathname}
          user={user}
          hasActiveSubscription={hasActiveSubscription}
          onLogout={onLogout}
          showAccountLogout={isStudent}
        />
      </nav>

      <div
        className={`${collapsed ? "px-2" : "px-3"} py-3 border-t flex-shrink-0 ${
          theme === "dark" ? "border-slate-800/80 bg-[#0B1220]" : "border-gray-200 bg-white"
        }`}
      >
        <div className="space-y-0.5">
          <SidebarNavItem
            to="/help-support"
            title="Help & Support"
            icon={HelpCircle}
            label="Help"
            theme={theme}
            collapsed={collapsed}
            pathname={pathname}
            muted
          />
          {!isStudent && (
            <button
              type="button"
              onClick={onLogout}
              className={`w-full flex items-center ${collapsed ? "justify-center" : "gap-2.5"} ${
                collapsed ? "px-2" : "px-3"
              } py-2 rounded-xl text-[13px] font-medium transition-colors min-h-[42px] touch-manipulation group ${
                theme === "dark"
                  ? "text-slate-400 hover:bg-red-500/10 hover:text-red-300"
                  : "text-slate-500 hover:bg-red-50 hover:text-red-600"
              }`}
              title="Logout"
            >
              <LogOut className="w-[17px] h-[17px] flex-shrink-0 stroke-[2]" />
              {!collapsed && <span>Logout</span>}
            </button>
          )}
        </div>
      </div>
    </aside>
  );
});

export const DrawerHeader = memo(function DrawerHeader({
  theme,
  onClose,
}: {
  theme: LayoutTheme;
  onClose: () => void;
}) {
  return (
    <div
      className={`px-4 ${HEADER_HEIGHT} border-b flex items-center justify-between gap-2 flex-shrink-0 ${
        theme === "dark" ? "border-slate-800/80" : "border-gray-200"
      }`}
    >
      <img
        src={logoImg}
        alt="MentorsDaily"
        className="h-10 w-auto object-contain object-center flex-shrink-0"
      />
      <button
        type="button"
        onClick={onClose}
        className={`flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg touch-manipulation ${
          theme === "dark"
            ? "hover:bg-white/[0.06] text-[#D1D5DB]"
            : "hover:bg-slate-100 text-slate-700"
        }`}
        aria-label="Close menu"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
});
