import React, { memo } from "react";
import { AnimatePresence, motion, PanInfo } from "framer-motion";
import { HelpCircle, LogOut } from "lucide-react";
import { RoleSidebarNav } from "./RoleSidebarNav";
import { SidebarNavItem } from "./SidebarNavItem";
import { DrawerHeader } from "./DesktopSidebar";
import { SIDEBAR_EXPANDED_WIDTH, sidebarSurfaceClass } from "./navStyles";
import type { LayoutTheme, LayoutUser } from "./types";

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  theme: LayoutTheme;
  pathname: string;
  user: LayoutUser | null;
  hasActiveSubscription: boolean;
  onLogout: () => void;
}

const SWIPE_CLOSE_OFFSET = -80;
const SWIPE_CLOSE_VELOCITY = -500;

export const MobileDrawer = memo(function MobileDrawer({
  open,
  onClose,
  theme,
  pathname,
  user,
  hasActiveSubscription,
  onLogout,
}: MobileDrawerProps) {
  const isStudent = user?.role !== "admin" && user?.role !== "mentor";
  const surface = sidebarSurfaceClass(theme);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < SWIPE_CLOSE_OFFSET || info.velocity.x < SWIPE_CLOSE_VELOCITY) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="drawer-backdrop"
            className="fixed inset-0 bg-black/45 backdrop-blur-sm z-40 md:hidden"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            aria-hidden
          />
          <motion.aside
            key="drawer-panel"
            className={`${SIDEBAR_EXPANDED_WIDTH} fixed left-0 top-0 bottom-0 z-50 flex flex-col border-r md:hidden pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] ${surface} shadow-2xl`}
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ left: 0.15, right: 0 }}
            onDragEnd={handleDragEnd}
            aria-label="Navigation drawer"
            role="dialog"
            aria-modal="true"
          >
            <DrawerHeader theme={theme} onClose={onClose} />

            <nav className="px-3 py-4 space-y-1 flex-1 overflow-y-auto scroll-smooth scrollbar-hide overscroll-contain">
              <RoleSidebarNav
                theme={theme}
                collapsed={false}
                pathname={pathname}
                user={user}
                hasActiveSubscription={hasActiveSubscription}
                onNavigate={onClose}
                onLogout={onLogout}
                showAccountLogout={isStudent}
              />
            </nav>

            <div
              className={`px-3 py-3 border-t flex-shrink-0 ${
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
                  collapsed={false}
                  pathname={pathname}
                  muted
                  onNavigate={onClose}
                />
                {!isStudent && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onLogout();
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-colors min-h-[42px] touch-manipulation group ${
                      theme === "dark"
                        ? "text-slate-400 hover:bg-red-500/10 hover:text-red-300"
                        : "text-slate-500 hover:bg-red-50 hover:text-red-600"
                    }`}
                    title="Logout"
                  >
                    <LogOut className="w-[17px] h-[17px] flex-shrink-0 stroke-[2]" />
                    <span>Logout</span>
                  </button>
                )}
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
});
