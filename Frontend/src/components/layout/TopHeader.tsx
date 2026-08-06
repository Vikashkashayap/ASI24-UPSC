import React, { memo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Menu, Bell, BookOpen, ExternalLink, ClipboardEdit, ChevronDown } from "lucide-react";
import logoImg from "../../LOGO/mentorsdaily.png";
import { GenderAvatar } from "../GenderAvatar";
import { UserMenuDropdown } from "./UserMenuDropdown";
import { NotificationCenter } from "../profileExperience";
import { NOTES_EXTERNAL_URL } from "./navConfig";
import type { LayoutTheme, LayoutUser, PageTitleInfo } from "./types";

interface TopHeaderProps {
  theme: LayoutTheme;
  user: LayoutUser | null;
  pageInfo: PageTitleInfo;
  isStudent: boolean;
  hasActiveSubscription: boolean;
  onOpenDrawer: () => void;
  onOpenDart?: () => void;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export const TopHeader = memo(function TopHeader({
  theme,
  user,
  pageInfo,
  isStudent,
  hasActiveSubscription,
  onOpenDrawer,
  onOpenDart,
  onNavigate,
  onLogout,
}: TopHeaderProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const closeMenu = useCallback(() => setUserMenuOpen(false), []);
  const openNotifications = useCallback(() => {
    setUserMenuOpen(false);
    setNotifyOpen(true);
  }, []);

  const isDark = theme === "dark";
  const iconBtn = `app-chrome-btn flex items-center justify-center rounded-full touch-manipulation active:scale-95 transition-colors ${
    isDark
      ? "text-slate-200 active:bg-white/10"
      : "text-slate-700 active:bg-slate-100"
  }`;

  return (
    <motion.header
      className={`sticky top-0 z-30 shrink-0 border-b backdrop-blur-xl pt-[env(safe-area-inset-top,0px)] ${
        isDark
          ? "border-slate-800/80 bg-[#0B1220]/92 shadow-black/20"
          : "border-slate-200/70 bg-white/90 shadow-slate-200/30"
      } shadow-sm`}
      initial={{ y: -6, opacity: 0.9 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      {/* ── Mobile App Bar: Logo left · Profile + Menu right ── */}
      <div className="md:hidden flex items-center justify-between h-14 px-3 gap-2">
        {/* Left — brand logo */}
        <div className="flex items-center min-w-0 flex-1">
          <img
            src={logoImg}
            alt="MentorsDaily"
            className="h-8 max-w-[150px] w-auto object-contain object-left select-none"
          />
        </div>

        {/* Right — bell · profile · hamburger menu */}
        <div className="flex items-center justify-end gap-0.5 shrink-0">
          <button
            type="button"
            className={`${iconBtn} h-10 w-10`}
            aria-label="Notifications"
            title="Notifications"
            onClick={openNotifications}
          >
            <Bell className="w-[20px] h-[20px]" strokeWidth={2} />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen((prev) => !prev)}
              className={`${iconBtn} h-10 w-10`}
              aria-label="Account menu"
              aria-expanded={userMenuOpen}
            >
              <GenderAvatar
                gender={user?.gender}
                name={user?.name}
                size="sm"
                className="h-8 w-8 md:h-8 md:w-8 ring-2 ring-white shadow-sm"
              />
            </button>
            <UserMenuDropdown
              open={userMenuOpen}
              onClose={closeMenu}
              user={user}
              theme={theme}
              hasActiveSubscription={hasActiveSubscription}
              onNavigate={onNavigate}
              onLogout={onLogout}
            />
          </div>

          <button
            type="button"
            onClick={onOpenDrawer}
            className={`${iconBtn} h-10 w-10`}
            aria-label="Open menu"
          >
            <Menu className="w-[22px] h-[22px]" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* ── Tablet / Desktop header ── */}
      <div className="hidden md:flex items-center justify-between w-full min-h-[72px] gap-3 px-5 lg:px-6">
        <div className={`flex items-center gap-2.5 min-w-0 ${isDark ? "text-slate-50" : "text-slate-900"}`}>
          <span
            className={`flex items-center justify-center w-9 h-9 rounded-xl shrink-0 ${
              isDark ? "bg-white/[0.06] text-blue-300" : "bg-blue-50 text-blue-600"
            }`}
          >
            {pageInfo.icon}
          </span>
          <div className="min-w-0">
            <h1 className="text-base font-semibold tracking-tight truncate leading-tight">
              {pageInfo.title}
            </h1>
            {isStudent && hasActiveSubscription && user?.subscriptionPlan?.name && (
              <p className={`text-[11px] truncate mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {user.subscriptionPlan.name}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href={NOTES_EXTERNAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 touch-manipulation shrink-0 hover:scale-[1.02] active:scale-[0.98] ${
              isDark
                ? "text-slate-200 hover:bg-white/[0.06] ring-1 ring-slate-700/80"
                : "text-slate-700 hover:bg-slate-100 ring-1 ring-gray-200"
            }`}
            title="Open UPSC Notes"
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">UPSC Notes</span>
            <ExternalLink className="w-3 h-3 shrink-0 opacity-60 hidden sm:block" />
          </a>

          {isStudent && onOpenDart && (
            <button
              type="button"
              onClick={onOpenDart}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 touch-manipulation shrink-0 hover:scale-[1.02] active:scale-[0.98] ${
                isDark
                  ? "bg-blue-600/80 hover:bg-blue-600 text-white border border-blue-500/50"
                  : "bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-sm shadow-blue-500/20"
              }`}
              title="Log daily activity (DART)"
            >
              <ClipboardEdit className="w-4 h-4" />
              <span className="hidden sm:inline">DART</span>
            </button>
          )}

          <button
            type="button"
            className={`${iconBtn} h-10 w-10`}
            aria-label="Notifications"
            title="Notifications"
            onClick={openNotifications}
          >
            <Bell className="w-5 h-5" />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full transition-all duration-200 touch-manipulation active:scale-[0.98] ${
                isDark
                  ? "hover:bg-white/[0.06] ring-1 ring-slate-700/80"
                  : "hover:bg-slate-100 ring-1 ring-gray-200"
              } ${userMenuOpen ? (isDark ? "bg-white/[0.06]" : "bg-slate-100") : ""}`}
              aria-label="Account menu"
              aria-expanded={userMenuOpen}
            >
              <GenderAvatar gender={user?.gender} name={user?.name} size="sm" />
              <ChevronDown
                className={`hidden sm:block w-4 h-4 shrink-0 transition-transform duration-200 ${
                  userMenuOpen ? "rotate-180" : ""
                } ${isDark ? "text-slate-400" : "text-slate-500"}`}
              />
            </button>
            <UserMenuDropdown
              open={userMenuOpen}
              onClose={closeMenu}
              user={user}
              theme={theme}
              hasActiveSubscription={hasActiveSubscription}
              onNavigate={onNavigate}
              onLogout={onLogout}
            />
          </div>
        </div>
      </div>

      <NotificationCenter
        open={notifyOpen}
        onClose={() => setNotifyOpen(false)}
        onOpenSettings={() => onNavigate("/profile?tab=notifications")}
      />
    </motion.header>
  );
});
