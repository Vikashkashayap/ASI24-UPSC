import React, { memo, Suspense, useState, useEffect, useCallback, lazy } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { DesktopSidebar } from "./DesktopSidebar";
import { MobileDrawer } from "./MobileDrawer";
import { TopHeader } from "./TopHeader";
import { BottomNavigation } from "./BottomNavigation";
import { PageContainer } from "./PageContainer";
import { getPageTitle } from "./getPageTitle";
import type { LayoutTheme, LayoutUser } from "./types";

const DartFormModal = lazy(() =>
  import("../dart/DartFormModal").then((m) => ({ default: m.DartFormModal }))
);

interface AppLayoutProps {
  theme: LayoutTheme;
  user: LayoutUser | null;
  logout: () => void;
  refreshUser: () => Promise<unknown>;
}

const LG_QUERY = "(min-width: 1024px)";
const MD_QUERY = "(min-width: 768px)";

function useBreakpointFlags() {
  const [isLg, setIsLg] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(LG_QUERY).matches : true
  );
  const [isMd, setIsMd] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(MD_QUERY).matches : true
  );

  useEffect(() => {
    const lg = window.matchMedia(LG_QUERY);
    const md = window.matchMedia(MD_QUERY);
    const onLg = () => setIsLg(lg.matches);
    const onMd = () => setIsMd(md.matches);
    onLg();
    onMd();
    lg.addEventListener("change", onLg);
    md.addEventListener("change", onMd);
    return () => {
      lg.removeEventListener("change", onLg);
      md.removeEventListener("change", onMd);
    };
  }, []);

  return { isLg, isMd, isTablet: isMd && !isLg, isMobile: !isMd };
}

export const AppLayout = memo(function AppLayout({
  theme,
  user,
  logout,
  refreshUser,
}: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLg, isTablet, isMobile } = useBreakpointFlags();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dartModalOpen, setDartModalOpen] = useState(false);

  const isLiveTestPage = /^\/test\/[^/]+$/.test(location.pathname);
  const pageInfo = getPageTitle(location.pathname, user?.role);
  const isStudent = user?.role !== "admin" && user?.role !== "mentor";
  const hasActiveSubscription =
    user?.role === "admin" ||
    user?.role === "mentor" ||
    user?.accountType === "admin-created" ||
    user?.subscriptionStatus === "active";

  // Tablet starts collapsed for space; user can still expand via the open button.
  // Desktop starts expanded. Do not re-force while the user is mid-session on same breakpoint.
  useEffect(() => {
    if (isTablet) setSidebarCollapsed(true);
    else if (isLg) setSidebarCollapsed(false);
  }, [isTablet, isLg]);

  // Close drawer on route change / when leaving mobile
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobile) setDrawerOpen(false);
  }, [isMobile]);

  // Refresh user (subscription) on mount for non-admins — same as before
  useEffect(() => {
    if (user?.role === "admin") return;
    if (user) refreshUser().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lock body scroll when drawer open (Android / Capacitor feel)
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  // Hardware back closes drawer / dart modal first
  useEffect(() => {
    const onBack = (e: Event) => {
      if (drawerOpen) {
        e.preventDefault();
        setDrawerOpen(false);
        return;
      }
      if (dartModalOpen) {
        e.preventDefault();
        setDartModalOpen(false);
      }
    };
    window.addEventListener("md:android-back", onBack);
    return () => window.removeEventListener("md:android-back", onBack);
  }, [drawerOpen, dartModalOpen]);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const toggleSidebar = useCallback(() => setSidebarCollapsed((v) => !v), []);
  const openDart = useCallback(() => setDartModalOpen(true), []);

  if (isLiveTestPage) {
    return (
      <div className="app-shell h-[100dvh] overflow-hidden bg-[#f0f4f8] dark:bg-[#020617]">
        <Outlet />
      </div>
    );
  }

  const showBottomNav = isStudent;

  return (
    <div
      className={`app-shell dashboard-scroll min-h-[100dvh] h-[100dvh] flex flex-col overflow-hidden overflow-x-hidden ${
        theme === "dark" ? "bg-[#020617] text-slate-50" : "bg-slate-50 text-slate-900"
      }`}
    >
      <MobileDrawer
        open={drawerOpen && isMobile}
        onClose={closeDrawer}
        theme={theme}
        pathname={location.pathname}
        user={user}
        hasActiveSubscription={hasActiveSubscription}
        onLogout={logout}
      />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <DesktopSidebar
          theme={theme}
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebar}
          pathname={location.pathname}
          user={user}
          hasActiveSubscription={hasActiveSubscription}
          onLogout={logout}
        />

        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
          <TopHeader
            theme={theme}
            user={user}
            pageInfo={pageInfo}
            isStudent={isStudent}
            hasActiveSubscription={hasActiveSubscription}
            onOpenDrawer={openDrawer}
            onOpenDart={isStudent ? openDart : undefined}
            onNavigate={navigate}
            onLogout={logout}
          />

          <main className="flex-1 flex flex-col min-h-0 max-w-full overflow-hidden">
            {isStudent && !hasActiveSubscription && (
              <div
                className={`flex items-center justify-between gap-3 px-3 md:px-4 py-2.5 border-b shrink-0 ${
                  theme === "dark"
                    ? "bg-amber-500/10 border-amber-500/40 text-amber-200"
                    : "bg-amber-50 border-amber-200 text-amber-800"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-medium truncate">
                    Your plan is not active. Please subscribe to access all features.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/pricing")}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    theme === "dark"
                      ? "bg-amber-500/30 hover:bg-amber-500/50 text-amber-100"
                      : "bg-amber-200 hover:bg-amber-300 text-amber-900"
                  }`}
                >
                  Subscribe Now
                </button>
              </div>
            )}

            <PageContainer
              flush={location.pathname === "/mentor"}
              withBottomNav={showBottomNav}
            >
              <Outlet />
            </PageContainer>
          </main>
        </div>
      </div>

      {showBottomNav && <BottomNavigation theme={theme} />}

      {isStudent && (
        <Suspense fallback={null}>
          <DartFormModal
            open={dartModalOpen}
            onOpenChange={setDartModalOpen}
            onSuccess={() => {}}
          />
        </Suspense>
      )}
    </div>
  );
});
