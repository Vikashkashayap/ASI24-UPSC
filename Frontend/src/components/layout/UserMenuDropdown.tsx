import React, { memo, useEffect, useRef } from "react";
import { User, Crown, Lightbulb, HelpCircle, LogOut } from "lucide-react";
import type { LayoutTheme, LayoutUser } from "./types";
import { formatExpiryDate } from "./navStyles";

interface UserMenuDropdownProps {
  open: boolean;
  onClose: () => void;
  user: LayoutUser | null;
  theme: LayoutTheme;
  hasActiveSubscription: boolean;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export const UserMenuDropdown = memo(function UserMenuDropdown({
  open,
  onClose,
  user,
  theme,
  hasActiveSubscription,
  onNavigate,
  onLogout,
}: UserMenuDropdownProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  if (!open) return null;

  const expiry = formatExpiryDate(user?.subscriptionEndDate);
  const menuItemClass = `w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors text-left ${
    theme === "dark" ? "text-slate-200 hover:bg-white/[0.06]" : "text-slate-700 hover:bg-slate-100"
  }`;

  return (
    <div
      ref={menuRef}
      className={`absolute right-0 top-[calc(100%+8px)] w-64 rounded-xl border shadow-xl z-50 overflow-hidden ${
        theme === "dark"
          ? "bg-[#0f172a] border-slate-700/80 shadow-black/40"
          : "bg-white border-gray-200 shadow-slate-200/80"
      }`}
    >
      <div className={`px-4 py-3 border-b ${theme === "dark" ? "border-slate-800" : "border-gray-100"}`}>
        <p className={`text-sm font-semibold truncate ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
          {user?.name || "User"}
        </p>
        {user?.email && (
          <p className={`text-xs truncate mt-0.5 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
            {user.email}
          </p>
        )}
      </div>

      {hasActiveSubscription && (
        <div
          className={`px-4 py-3 border-b ${
            theme === "dark" ? "border-slate-800 bg-blue-500/5" : "border-gray-100 bg-blue-50/50"
          }`}
        >
          <div className="flex items-center gap-2">
            <Crown className={`w-4 h-4 shrink-0 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`} />
            <div className="min-w-0">
              <p
                className={`text-xs font-semibold truncate ${
                  theme === "dark" ? "text-blue-300" : "text-blue-700"
                }`}
              >
                {user?.subscriptionPlan?.name || "Pro Plan"}
              </p>
              {expiry && (
                <p className={`text-[11px] mt-0.5 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                  Valid until {expiry}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="p-1.5">
        <button
          type="button"
          className={menuItemClass}
          onClick={() => {
            onNavigate("/profile");
            onClose();
          }}
        >
          <User className="w-4 h-4 shrink-0 opacity-70" />
          Profile & Settings
        </button>
        {hasActiveSubscription ? (
          <button
            type="button"
            className={menuItemClass}
            onClick={() => {
              onNavigate("/pricing");
              onClose();
            }}
          >
            <Crown className="w-4 h-4 shrink-0 opacity-70" />
            Upgrade Plan
          </button>
        ) : (
          <button
            type="button"
            className={`${menuItemClass} ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}
            onClick={() => {
              onNavigate("/pricing");
              onClose();
            }}
          >
            <Lightbulb className="w-4 h-4 shrink-0" />
            Subscribe to Pro
          </button>
        )}
        <button
          type="button"
          className={menuItemClass}
          onClick={() => {
            onNavigate("/help-support");
            onClose();
          }}
        >
          <HelpCircle className="w-4 h-4 shrink-0 opacity-70" />
          Help & Support
        </button>
        <div className={`my-1 border-t ${theme === "dark" ? "border-slate-800" : "border-gray-100"}`} />
        <button
          type="button"
          className={`${menuItemClass} ${
            theme === "dark" ? "text-red-400 hover:bg-red-500/10" : "text-red-600 hover:bg-red-50"
          }`}
          onClick={() => {
            onLogout();
            onClose();
          }}
        >
          <LogOut className="w-4 h-4 shrink-0 opacity-70" />
          Logout
        </button>
      </div>
    </div>
  );
});
