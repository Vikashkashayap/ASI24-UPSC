import React, { Suspense, useState, useEffect, useRef } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { LineChart, CalendarClock, MessageCircle, FileText, Video, Menu, X, ClipboardList, User, Users, History, Home, Settings, HelpCircle, LogOut, PanelLeftClose, PanelLeftOpen, BarChart3, Lightbulb, Target, ClipboardEdit, IndianRupee, AlertTriangle, Tag, Newspaper, ChevronDown, Crown, BookOpen, ExternalLink } from "lucide-react";
import { lazyNamed } from "../utils/lazyRoute";
import logoImg from "../LOGO/mentorsdaily.png";
import { AnimatePresence, motion } from "framer-motion";

const DartFormModal = lazyNamed(
  () => import("../components/dart/DartFormModal"),
  "DartFormModal"
);

// Mobile-first nav link: minimum 44px height for touch targets
const navLinkClass = ({ isActive, theme, collapsed, muted }: { isActive: boolean; theme: "dark" | "light"; collapsed?: boolean; muted?: boolean }) =>
  `flex items-center ${collapsed ? "justify-center" : "gap-3"} ${collapsed ? "px-2" : "px-3"} py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 min-h-[42px] touch-manipulation relative group ${theme === "dark"
    ? `hover:bg-white/[0.06] active:scale-[0.98] ${isActive
      ? "bg-blue-600/20 text-white shadow-sm before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-[3px] before:rounded-r-full before:bg-blue-400"
      : muted
        ? "text-slate-500 hover:text-slate-300"
        : "text-slate-300"
    }`
    : `hover:bg-slate-100/90 active:scale-[0.98] ${isActive
      ? "bg-blue-50 text-blue-700 font-semibold shadow-sm shadow-blue-100/80 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-[3px] before:rounded-r-full before:bg-blue-600"
      : muted
        ? "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
        : "text-slate-600"
    }`
  }`;

const sidebarSectionLabelClass = (theme: "dark" | "light") =>
  `px-3 mb-1 text-[10px] font-bold uppercase tracking-[0.1em] ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`;
const sidebarNavIconClass = (isActive: boolean, theme: "dark" | "light") =>
  `w-[18px] h-[18px] flex-shrink-0 stroke-[2] ${isActive
    ? theme === "dark" ? "text-blue-300" : "text-blue-600"
    : theme === "dark" ? "text-slate-400 group-hover:text-slate-200" : "text-slate-500 group-hover:text-slate-700"
  }`;

const SidebarNavItem = ({
  to,
  title,
  icon: Icon,
  label,
  theme,
  collapsed,
  muted,
  onNavigate,
}: {
  to: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  theme: "dark" | "light";
  collapsed: boolean;
  muted?: boolean;
  onNavigate?: () => void;
}) => (
  <NavLink
    to={to}
    title={title}
    onClick={onNavigate}
    className={(props) => navLinkClass({ ...props, theme, collapsed, muted })}
  >
    {({ isActive }) => (
      <>
        <Icon className={sidebarNavIconClass(isActive, theme)} />
        {!collapsed && <span className="truncate flex-1 min-w-0">{label}</span>}
      </>
    )}
  </NavLink>
);


const getPageTitle = (pathname: string, userRole?: string): { title: string; icon: React.ReactNode } => {
  const studentRouteMap: Record<string, { title: string; icon: React.ReactNode }> = {
    '/home': { title: 'Home', icon: <Home className="w-5 h-5" /> },
    '/performance': { title: 'Performance Dashboard', icon: <BarChart3 className="w-5 h-5" /> },
    '/planner': { title: 'Study Planner', icon: <CalendarClock className="w-5 h-5" /> },
    '/mentor': { title: 'AI Mentor', icon: <MessageCircle className="w-5 h-5" /> },
    '/copy-evaluation': { title: 'Copy Evaluation', icon: <FileText className="w-5 h-5" /> },
    // '/evaluation-history': { title: 'Evaluation History', icon: <History className="w-5 h-5" /> },
    '/prelims-test': { title: 'Prelims Test', icon: <ClipboardList className="w-5 h-5" /> },
    '/practice-test': { title: 'Practice Test', icon: <Target className="w-5 h-5" /> },
    '/practice-test/history': { title: 'Practice Test History', icon: <History className="w-5 h-5" /> },
    '/prelims-mock': { title: 'Prelims Mock', icon: <Target className="w-5 h-5" /> },
    '/current-affairs': { title: 'Daily Current Affairs', icon: <Newspaper className="w-5 h-5" /> },
    // '/test-history': { title: 'Test History', icon: <History className="w-5 h-5" /> },
    '/meeting': { title: 'Live Meeting', icon: <Video className="w-5 h-5" /> },
    '/profile': { title: 'Profile', icon: <User className="w-5 h-5" /> },
    '/student-profiler': { title: 'Student Profiler', icon: <User className="w-5 h-5" /> },
    '/help-support': { title: 'Help & Support', icon: <HelpCircle className="w-5 h-5" /> },
    '/mains-evaluation': { title: 'Mains Evaluation', icon: <FileText className="w-5 h-5" /> },
  };

  const mentorRouteMap: Record<string, { title: string; icon: React.ReactNode }> = {
    '/mentor-dashboard': { title: 'Mentor Dashboard', icon: <BarChart3 className="w-5 h-5" /> },
    '/mentor-dashboard/students': { title: 'Your Students', icon: <Users className="w-5 h-5" /> },
    '/profile': { title: 'Profile', icon: <User className="w-5 h-5" /> },
    '/help-support': { title: 'Help & Support', icon: <HelpCircle className="w-5 h-5" /> },
  };

  const adminRouteMap: Record<string, { title: string; icon: React.ReactNode }> = {
    '/admin/dashboard': { title: 'Admin Dashboard', icon: <BarChart3 className="w-5 h-5" /> },
    '/admin/students': { title: 'Students Management', icon: <Users className="w-5 h-5" /> },
    '/admin/mentors': { title: 'Mentors', icon: <Users className="w-5 h-5" /> },
    '/admin/prelims-mock': { title: 'Prelims Mock', icon: <Target className="w-5 h-5" /> },
    '/admin/topic-practice': { title: 'Topic Practice', icon: <ClipboardList className="w-5 h-5" /> },
    '/admin/pricing': { title: 'Manage Pricing Plans', icon: <IndianRupee className="w-5 h-5" /> },
    '/admin/offer-manager': { title: 'Offer Manager', icon: <Tag className="w-5 h-5" /> },
    '/admin/current-affairs': { title: 'Current Affairs', icon: <Newspaper className="w-5 h-5" /> },
    '/profile': { title: 'Profile', icon: <User className="w-5 h-5" /> },
    '/help-support': { title: 'Help & Support', icon: <HelpCircle className="w-5 h-5" /> },
  };

  let routeMap = studentRouteMap;
  if (userRole === 'admin') routeMap = adminRouteMap;
  else if (userRole === 'mentor') routeMap = mentorRouteMap;

  // Handle dynamic routes
  if (userRole === 'mentor' && pathname.startsWith('/mentor-dashboard/students/') && pathname !== '/mentor-dashboard/students') {
    return { title: 'Student detail', icon: <User className="w-5 h-5" /> };
  }
  if (pathname.startsWith('/copy-evaluation/')) {
    return { title: 'Copy Evaluation Details', icon: <FileText className="w-5 h-5" /> };
  }
  if (pathname.startsWith('/current-affairs/') && pathname !== '/current-affairs') {
    return { title: 'Current Affairs', icon: <Newspaper className="w-5 h-5" /> };
  }
  if (pathname.startsWith('/test/')) {
    return { title: 'Test', icon: <ClipboardList className="w-5 h-5" /> };
  }
  if (pathname.startsWith('/admin/mock-results/')) {
    return { title: 'Mock Results', icon: <Target className="w-5 h-5" /> };
  }
  if (pathname.startsWith('/admin/student-performance/')) {
    return { title: 'Student Performance', icon: <Target className="w-5 h-5" /> };
  }
  if (pathname.startsWith('/result/')) {
    return { title: 'Test Result', icon: <LineChart className="w-5 h-5" /> };
  }
  return routeMap[pathname] || { title: 'Dashboard', icon: <Home className="w-5 h-5" /> };
};

const formatExpiryDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return null;
  }
};

const SubscriptionCard = ({
  planName,
  endDate,
  theme,
  onClick,
}: {
  planName: string;
  endDate?: string | null;
  theme: "dark" | "light";
  onClick?: () => void;
}) => {
  const expiry = formatExpiryDate(endDate);
  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      title={planName}
      className={`w-full text-left flex items-start gap-2.5 px-3 py-2.5 rounded-xl font-medium transition-all ${
        onClick ? "hover:brightness-110 active:scale-[0.98] cursor-pointer" : ""
      } ${
        theme === "dark"
          ? "bg-gradient-to-br from-blue-600/90 to-blue-700 text-white shadow-md shadow-blue-900/30 ring-1 ring-blue-500/30"
          : "bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-md shadow-blue-500/20 ring-1 ring-blue-400/30"
      }`}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 shrink-0 mt-0.5">
        <Crown className="w-4 h-4 text-white" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold leading-snug line-clamp-2">{planName}</p>
        <p className="text-[11px] font-medium text-blue-100/90 mt-0.5">
          Active{expiry ? ` · until ${expiry}` : ""}
        </p>
      </div>
    </Wrapper>
  );
};

const UserMenuDropdown = ({
  open,
  onClose,
  user,
  theme,
  hasActiveSubscription,
  onNavigate,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  user: { name?: string; email?: string; subscriptionPlan?: { name?: string } | null; subscriptionEndDate?: string | null } | null;
  theme: "dark" | "light";
  hasActiveSubscription: boolean;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}) => {
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
        theme === "dark" ? "bg-[#0f172a] border-slate-700/80 shadow-black/40" : "bg-white border-gray-200 shadow-slate-200/80"
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
        <div className={`px-4 py-3 border-b ${theme === "dark" ? "border-slate-800 bg-blue-500/5" : "border-gray-100 bg-blue-50/50"}`}>
          <div className="flex items-center gap-2">
            <Crown className={`w-4 h-4 shrink-0 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`} />
            <div className="min-w-0">
              <p className={`text-xs font-semibold truncate ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>
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
        <button type="button" className={menuItemClass} onClick={() => { onNavigate("/profile"); onClose(); }}>
          <User className="w-4 h-4 shrink-0 opacity-70" />
          Profile & Settings
        </button>
        {hasActiveSubscription ? (
          <button type="button" className={menuItemClass} onClick={() => { onNavigate("/pricing"); onClose(); }}>
            <Crown className="w-4 h-4 shrink-0 opacity-70" />
            Upgrade Plan
          </button>
        ) : (
          <button
            type="button"
            className={`${menuItemClass} ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}
            onClick={() => { onNavigate("/pricing"); onClose(); }}
          >
            <Lightbulb className="w-4 h-4 shrink-0" />
            Subscribe to Pro
          </button>
        )}
        <button type="button" className={menuItemClass} onClick={() => { onNavigate("/help-support"); onClose(); }}>
          <HelpCircle className="w-4 h-4 shrink-0 opacity-70" />
          Help & Support
        </button>
        <div className={`my-1 border-t ${theme === "dark" ? "border-slate-800" : "border-gray-100"}`} />
        <button
          type="button"
          className={`${menuItemClass} ${theme === "dark" ? "text-red-400 hover:bg-red-500/10" : "text-red-600 hover:bg-red-50"}`}
          onClick={() => { onLogout(); onClose(); }}
        >
          <LogOut className="w-4 h-4 shrink-0 opacity-70" />
          Logout
        </button>
      </div>
    </div>
  );
};
export const DashboardLayout = () => {
  const { user, logout, refreshUser } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dartModalOpen, setDartModalOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);  const location = useLocation();
  const isCopyEvaluationPage = location.pathname === '/copy-evaluation';
  const isLiveTestPage = /^\/test\/[^/]+$/.test(location.pathname);
  const pageInfo = getPageTitle(location.pathname, user?.role);
  const isStudent = user?.role !== "admin" && user?.role !== "mentor";
  const hasActiveSubscription =
    user?.role === "admin" ||
    user?.role === "mentor" ||
    user?.accountType === "admin-created" ||
    user?.subscriptionStatus === "active";

  // Refresh user (e.g. subscription plan name) when dashboard loads for students
  useEffect(() => {
    if (user?.role === "admin") return;
    if (user) refreshUser().catch(() => {});
  }, []);

  useEffect(() => {
    setUserMenuOpen(false);
  }, [location.pathname]);

  const sidebarSurface =
    theme === "dark"
      ? "border-slate-800/80 bg-[#0B1220] text-slate-50"
      : "border-gray-200 bg-white text-slate-900";

  if (isLiveTestPage) {
    return (
      <div className="h-[100dvh] overflow-hidden bg-[#f0f4f8]">
        <Outlet />
      </div>
    );
  }

  return (
    <div
      className={`dashboard-scroll min-h-[100dvh] h-[100dvh] flex flex-col overflow-hidden overflow-x-hidden ${theme === "dark" ? "bg-[#020617] text-slate-50" : "bg-slate-50 text-slate-900"
        }`}
    >
      {/* Mobile Menu Overlay (animated) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="fixed inset-0 bg-black/45 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>

      <div className="flex flex-1 min-h-0 overflow-hidden pt-[env(safe-area-inset-top,0px)]">
      {/* Sidebar — flush with header (no floating card gap) */}
      <aside
        className={`${sidebarCollapsed ? "w-[76px]" : "w-[280px]"} fixed left-0 bottom-0 z-50 flex flex-col shrink-0 border-r transition-[width,transform] duration-300 top-[env(safe-area-inset-top,0px)] ${          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } md:static md:top-auto md:bottom-auto md:translate-x-0 ${sidebarSurface}`}
      >
        <div
          className={`${sidebarCollapsed ? "px-2" : "px-4"} h-14 md:h-[72px] border-b flex items-center ${
            sidebarCollapsed ? "justify-center" : "justify-between"
          } gap-2 flex-shrink-0 ${theme === "dark" ? "border-slate-800/80" : "border-gray-200"}`}
        >
          {!sidebarCollapsed && (
            <div className="flex items-center gap-1.5 min-w-0 shrink-0">
              <img src={logoImg} alt="MentorsDaily" className="h-10 md:h-11 w-auto object-contain object-center flex-shrink-0" />
            </div>
          )}
          {sidebarCollapsed && (
            <img src={logoImg} alt="MentorsDaily" className="h-10 w-10 object-contain object-center flex-shrink-0" />
          )}
          <div className="flex items-center justify-center gap-1.5 shrink-0">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={`hidden md:flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${theme === "dark"
                  ? "hover:bg-white/[0.06] text-[#D1D5DB]"
                  : "hover:bg-gray-50 text-slate-700"
                }`}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg hover:bg-white/[0.06] touch-manipulation text-[#D1D5DB]"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <nav className={`${sidebarCollapsed ? "px-2" : "px-3"} py-4 space-y-0.5 flex-1 overflow-y-auto scroll-smooth scrollbar-hide`} onClick={() => setMobileMenuOpen(false)}>

          {user?.role === 'admin' ? (
            // Admin Navigation
            <>
              <div className="space-y-1">
                <NavLink to="/admin/dashboard" className={(props) => navLinkClass({ ...props, theme, collapsed: sidebarCollapsed })} title="Admin Dashboard">
                  <BarChart3 className="w-4 h-4 flex-shrink-0" />
                  {!sidebarCollapsed && <span>Admin Dashboard</span>}
                </NavLink>
                <NavLink to="/admin/students" className={(props) => navLinkClass({ ...props, theme, collapsed: sidebarCollapsed })} title="Students Management">
                  <Users className="w-4 h-4 flex-shrink-0" />
                  {!sidebarCollapsed && <span>Students</span>}
                </NavLink>
                <NavLink to="/admin/mentors" className={(props) => navLinkClass({ ...props, theme, collapsed: sidebarCollapsed })} title="Mentors">
                  <Users className="w-4 h-4 flex-shrink-0" />
                  {!sidebarCollapsed && <span>Mentors</span>}
                </NavLink>
                <NavLink to="/admin/pro-students" className={(props) => navLinkClass({ ...props, theme, collapsed: sidebarCollapsed })} title="Pro Plan Students">
                  <Users className="w-4 h-4 flex-shrink-0" />
                  {!sidebarCollapsed && <span>Pro Students</span>}
                </NavLink>
                <NavLink to="/admin/prelims-mock" className={(props) => navLinkClass({ ...props, theme, collapsed: sidebarCollapsed })} title="Prelims Mock - Schedule tests">
                  <Target className="w-4 h-4 flex-shrink-0" />
                  {!sidebarCollapsed && <span>Prelims Mock</span>}
                </NavLink>
                <NavLink to="/admin/topic-practice" className={(props) => navLinkClass({ ...props, theme, collapsed: sidebarCollapsed })} title="Topic Practice - Assign tests to students">
                  <ClipboardList className="w-4 h-4 flex-shrink-0" />
                  {!sidebarCollapsed && <span>Topic Practice</span>}
                </NavLink>
                <NavLink to="/admin/pricing" className={(props) => navLinkClass({ ...props, theme, collapsed: sidebarCollapsed })} title="Pricing Plans">
                  <IndianRupee className="w-4 h-4 flex-shrink-0" />
                  {!sidebarCollapsed && <span>Pricing Plans</span>}
                </NavLink>
                <NavLink to="/admin/offer-manager" className={(props) => navLinkClass({ ...props, theme, collapsed: sidebarCollapsed })} title="Offer Manager">
                  <Tag className="w-4 h-4 flex-shrink-0" />
                  {!sidebarCollapsed && <span>Offer Manager</span>}
                </NavLink>
                <NavLink to="/admin/current-affairs" className={(props) => navLinkClass({ ...props, theme, collapsed: sidebarCollapsed })} title="Current Affairs">
                  <Newspaper className="w-4 h-4 flex-shrink-0" />
                  {!sidebarCollapsed && <span>Current Affairs</span>}
                </NavLink>
              </div>

              {/* Admin Tools Section */}
              {!sidebarCollapsed && (
                <div className="pt-3 md:pt-4 pb-1 md:pb-2">
                  <div className={sidebarSectionLabelClass(theme)}>
                    Admin Tools
                  </div>
                </div>
              )}
              <div className="space-y-1">
                <NavLink to="/profile" className={(props) => navLinkClass({ ...props, theme, collapsed: sidebarCollapsed })} title="Profile">
                  <User className="w-4 h-4 flex-shrink-0" />
                  {!sidebarCollapsed && <span>Profile</span>}
                </NavLink>
                <NavLink to="/help-support" className={(props) => navLinkClass({ ...props, theme, collapsed: sidebarCollapsed })} title="Help & Support">
                  <HelpCircle className="w-4 h-4 flex-shrink-0" />
                  {!sidebarCollapsed && <span>Help & Support</span>}
                </NavLink>
              </div>
            </>
          ) : user?.role === "mentor" ? (
            <>
              <div className="space-y-1">
                <NavLink to="/mentor-dashboard" className={(props) => navLinkClass({ ...props, theme, collapsed: sidebarCollapsed })} title="Mentor Dashboard" end>
                  <BarChart3 className="w-4 h-4 flex-shrink-0" />
                  {!sidebarCollapsed && <span>Dashboard</span>}
                </NavLink>
                <NavLink to="/mentor-dashboard/students" className={(props) => navLinkClass({ ...props, theme, collapsed: sidebarCollapsed })} title="Your Students">
                  <Users className="w-4 h-4 flex-shrink-0" />
                  {!sidebarCollapsed && <span>Students</span>}
                </NavLink>
              </div>
              {!sidebarCollapsed && (
                <div className="pt-3 md:pt-4 pb-1 md:pb-2">
                  <div className={sidebarSectionLabelClass(theme)}>
                    Account
                  </div>
                </div>
              )}
              <div className="space-y-1">
                <NavLink to="/profile" className={(props) => navLinkClass({ ...props, theme, collapsed: sidebarCollapsed })} title="Profile">
                  <User className="w-4 h-4 flex-shrink-0" />
                  {!sidebarCollapsed && <span>Profile</span>}
                </NavLink>
                <NavLink to="/help-support" className={(props) => navLinkClass({ ...props, theme, collapsed: sidebarCollapsed })} title="Help & Support">
                  <HelpCircle className="w-4 h-4 flex-shrink-0" />
                  {!sidebarCollapsed && <span>Help & Support</span>}
                </NavLink>
              </div>
            </>
          ) : (
            // Student Navigation
            <>
              {/* Subscription badge in sidebar */}
              {!sidebarCollapsed && (
                <div className="mb-3 px-0.5">
                  {hasActiveSubscription ? (
                    <SubscriptionCard
                      planName={user?.subscriptionPlan?.name || "Pro Plan"}
                      endDate={user?.subscriptionEndDate}
                      theme={theme}
                      onClick={() => {
                        setMobileMenuOpen(false);
                        navigate("/profile");
                      }}
                    />
                  ) : (
                    <NavLink
                      to="/pricing"
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all bg-gradient-to-br from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-md shadow-blue-500/20 ring-1 ring-blue-400/30 active:scale-[0.98]"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 shrink-0">
                        <Lightbulb className="w-4 h-4 text-white" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold">Subscribe to Pro</p>
                        <p className="text-[11px] font-medium text-blue-100/90 mt-0.5">Unlock all features</p>
                      </div>
                    </NavLink>
                  )}
                </div>
              )}
              {sidebarCollapsed && hasActiveSubscription && (
                <button
                  type="button"
                  title={user?.subscriptionPlan?.name || "Pro Plan"}
                  onClick={() => navigate("/profile")}
                  className={`mb-3 mx-auto flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                    theme === "dark"
                      ? "bg-blue-600/20 text-blue-300 hover:bg-blue-600/30"
                      : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                  }`}
                >
                  <Crown className="w-4 h-4" />
                </button>
              )}              {/* Main Section */}
              <div className="space-y-0.5">
                <SidebarNavItem
                  to="/home"
                  title="Home"
                  icon={Home}
                  label="Home"
                  theme={theme}
                  collapsed={sidebarCollapsed}
                  onNavigate={() => setMobileMenuOpen(false)}
                />
              </div>

              {/* Performance & Analytics Section */}
              {!sidebarCollapsed && (
                <div className="pt-3 pb-1.5">
                  <div className={sidebarSectionLabelClass(theme)}>
                    Performance & Analytics
                  </div>
                </div>
              )}              <div className="space-y-0.5">
                <SidebarNavItem
                  to="/performance"
                  title="Performance Dashboard"
                  icon={BarChart3}
                  label="Performance Dashboard"
                  theme={theme}
                  collapsed={sidebarCollapsed}
                  onNavigate={() => setMobileMenuOpen(false)}
                />
                <SidebarNavItem
                  to="/copy-evaluation"
                  title="Copy Evaluation"
                  icon={FileText}
                  label="Copy Evaluation"
                  theme={theme}
                  collapsed={sidebarCollapsed}
                  onNavigate={() => setMobileMenuOpen(false)}
                />
                {/* <NavLink to="/evaluation-history" className={(props) => navLinkClass({ ...props, theme, collapsed: sidebarCollapsed })} title="Evaluation History">
                  <History className="w-4 h-4 flex-shrink-0" />
                  {!sidebarCollapsed && <span>Evaluation History</span>}
                </NavLink> */}
              </div>

              {/* Practice & Tests Section */}
              {!sidebarCollapsed && (
                <div className="pt-3 pb-1.5">
                  <div className={sidebarSectionLabelClass(theme)}>
                    Practice & Tests
                  </div>
                </div>
              )}              <div className="space-y-0.5">
                <SidebarNavItem
                  to="/prelims-test"
                  title="Prelims Test"
                  icon={ClipboardList}
                  label="Prelims Test"
                  theme={theme}
                  collapsed={sidebarCollapsed}
                  onNavigate={() => setMobileMenuOpen(false)}
                />
                <SidebarNavItem
                  to="/practice-test"
                  title="Practice Test - Admin assigned tests"
                  icon={Target}
                  label="Practice Test"
                  theme={theme}
                  collapsed={sidebarCollapsed}
                  onNavigate={() => setMobileMenuOpen(false)}
                />
                <SidebarNavItem
                  to="/prelims-mock"
                  title="Prelims Mock - Scheduled tests"
                  icon={Target}
                  label="Prelims Mock"
                  theme={theme}
                  collapsed={sidebarCollapsed}
                  onNavigate={() => setMobileMenuOpen(false)}
                />
                <SidebarNavItem
                  to="/current-affairs"
                  title="Daily Current Affairs"
                  icon={Newspaper}
                  label="Daily Current Affairs"
                  theme={theme}
                  collapsed={sidebarCollapsed}
                  onNavigate={() => setMobileMenuOpen(false)}
                />
                {/* <NavLink to="/test-history" className={(props) => navLinkClass({ ...props, theme, collapsed: sidebarCollapsed })} title="Test History">
                  <History className="w-4 h-4 flex-shrink-0" />
                  {!sidebarCollapsed && <span>Test History</span>}
                </NavLink> */}
              </div>

              {/* Study Tools Section */}
              {!sidebarCollapsed && (
                <div className="pt-3 pb-1.5">
                  <div className={sidebarSectionLabelClass(theme)}>
                    Study Tools
                  </div>
                </div>
              )}              <div className="space-y-0.5">
                <SidebarNavItem
                  to="/planner"
                  title="Study Planner"
                  icon={CalendarClock}
                  label="Study Planner"
                  theme={theme}
                  collapsed={sidebarCollapsed}
                  onNavigate={() => setMobileMenuOpen(false)}
                />
                <SidebarNavItem
                  to="/mentor"
                  title="AI Mentor"
                  icon={MessageCircle}
                  label="AI Mentor"
                  theme={theme}
                  collapsed={sidebarCollapsed}
                  onNavigate={() => setMobileMenuOpen(false)}
                />
              </div>

              {/* Communication Section */}              {/* {!sidebarCollapsed && (
                <div className="pt-3 md:pt-4 pb-1 md:pb-2">
                  <div className={sidebarSectionLabelClass(theme)}>
                    Communication
                  </div>
                </div>
              )}
              <div className="space-y-1">
                <NavLink to="/meeting" className={(props) => navLinkClass({ ...props, theme, collapsed: sidebarCollapsed })} title="Live Meeting">
                  <Video className="w-4 h-4 flex-shrink-0" />
                  {!sidebarCollapsed && <span>Live Meeting</span>}
                </NavLink>
              </div> */}

              {/* Profile & Settings Section */}
              {/* {!sidebarCollapsed && (
                <div className="pt-3 md:pt-4 pb-1 md:pb-2">
                  <div className={sidebarSectionLabelClass(theme)}>
                    Account
                  </div>
                </div>
              )} */}
              {/* <div className="space-y-1">
                <NavLink to="/profile" className={(props) => navLinkClass({ ...props, theme, collapsed: sidebarCollapsed })} title="Profile">
                  <User className="w-4 h-4 flex-shrink-0" />
                  {!sidebarCollapsed && <span>Profile</span>}
                </NavLink>
                <NavLink to="/student-profiler" className={(props) => navLinkClass({ ...props, theme, collapsed: sidebarCollapsed })} title="Student Profiler">
                  <User className="w-4 h-4 flex-shrink-0" />
                  {!sidebarCollapsed && <span>Student Profiler</span>}
                </NavLink>
                <NavLink to="/help-support" className={(props) => navLinkClass({ ...props, theme, collapsed: sidebarCollapsed })} title="Help & Support">
                  <HelpCircle className="w-4 h-4 flex-shrink-0" />
                  {!sidebarCollapsed && <span>Help & Support</span>}
                </NavLink>
              </div> */}
            </>
          )}
          {/* <div className="space-y-1">
            <NavLink to="/meeting" className={(props) => navLinkClass({ ...props, theme, collapsed: sidebarCollapsed })} title="Live Meeting">
              <Video className="w-4 h-4 flex-shrink-0" />
              {!sidebarCollapsed && <span>Live Meeting</span>}
            </NavLink>
          </div> */}
        </nav>

        {/* Bottom Actions Section */}
        <div className={`${sidebarCollapsed ? "px-2" : "px-3"} py-3 border-t flex-shrink-0 ${theme === "dark" ? "border-slate-800/80 bg-slate-900/30" : "border-gray-200 bg-gray-50/50"}`}>
          <div className="space-y-0.5">
            <SidebarNavItem
              to="/profile"
              title="Settings"
              icon={Settings}
              label="Settings"
              theme={theme}
              collapsed={sidebarCollapsed}
              onNavigate={() => setMobileMenuOpen(false)}
            />
            <SidebarNavItem
              to="/help-support"
              title="Help & Support"
              icon={HelpCircle}
              label="Help & Support"
              theme={theme}
              collapsed={sidebarCollapsed}
              onNavigate={() => setMobileMenuOpen(false)}
            />
            <button
              onClick={logout}
              className={`w-full flex items-center ${sidebarCollapsed ? "justify-center" : "gap-3"} ${sidebarCollapsed ? "px-2" : "px-3"} py-2.5 rounded-xl text-[13px] font-medium transition-all min-h-[42px] touch-manipulation group ${theme === "dark"
                  ? "hover:bg-white/[0.06] text-slate-300"
                  : "hover:bg-slate-100 text-slate-600"
                }`}
              title="Logout"
            >
              <LogOut className={`${sidebarNavIconClass(false, theme)}`} />
              {!sidebarCollapsed && <span>Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main content — flex column; no left margin on desktop (sidebar is in-flow) */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <header
          className={`h-14 md:h-[72px] flex items-center justify-between gap-3 px-3 md:px-5 lg:px-6 border-b backdrop-blur-xl shrink-0 z-30 ${theme === "dark"
              ? "border-slate-800/80 bg-[#0B1220]/95"
              : "border-gray-200 bg-white/95"
            }`}
        >
          {/* Left: mobile menu + page context */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className={`md:hidden shrink-0 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-colors touch-manipulation ${theme === "dark"
                  ? "hover:bg-slate-800 text-slate-200"
                  : "hover:bg-slate-100 text-slate-700"
                }`}
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className={`hidden md:flex items-center gap-2.5 min-w-0 ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
              <span className={`flex items-center justify-center w-9 h-9 rounded-xl shrink-0 ${
                theme === "dark" ? "bg-white/[0.06] text-blue-300" : "bg-blue-50 text-blue-600"
              }`}>
                {pageInfo.icon}
              </span>
              <div className="min-w-0">
                <h1 className="text-base font-semibold tracking-tight truncate leading-tight">{pageInfo.title}</h1>
                {isStudent && hasActiveSubscription && user?.subscriptionPlan?.name && (
                  <p className={`text-[11px] truncate mt-0.5 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                    {user.subscriptionPlan.name}
                  </p>
                )}
              </div>
            </div>
            <div className={`text-sm font-semibold tracking-tight md:hidden truncate ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
              {pageInfo.title}
            </div>
          </div>

          {/* Right: UPSC Notes + DART + user menu */}
          <div className="flex items-center gap-2 shrink-0">
            <a
              href="https://notes.mentorsdaily.com/"
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 touch-manipulation shrink-0 ${
                theme === "dark"
                  ? "text-slate-200 hover:bg-white/[0.06] ring-1 ring-slate-700/80"
                  : "text-slate-700 hover:bg-slate-100 ring-1 ring-gray-200"
              }`}
              title="Open UPSC Notes"
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">UPSC Notes</span>
              <ExternalLink className="w-3 h-3 shrink-0 opacity-60 hidden sm:block" />
            </a>
            {isStudent && (
              <button
                onClick={() => setDartModalOpen(true)}
                className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 touch-manipulation shrink-0 ${
                  theme === "dark"
                    ? "bg-blue-600/80 hover:bg-blue-600 text-white border border-blue-500/50"
                    : "bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-sm shadow-blue-500/20"
                }`}
                title="Log daily activity (DART)"
              >
                <ClipboardEdit className="w-4 h-4" />
                <span className="hidden sm:inline">DART</span>
              </button>
            )}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((prev) => !prev)}
                className={`flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full transition-all duration-200 touch-manipulation active:scale-[0.98] ${
                  theme === "dark"
                    ? "hover:bg-white/[0.06] ring-1 ring-slate-700/80"
                    : "hover:bg-slate-100 ring-1 ring-gray-200"
                } ${userMenuOpen ? (theme === "dark" ? "bg-white/[0.06]" : "bg-slate-100") : ""}`}
                aria-label="Account menu"
                aria-expanded={userMenuOpen}
              >
                <div className={`w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center text-xs md:text-sm font-semibold shrink-0 ${
                  theme === "dark"
                    ? "bg-[#2563eb] text-white"
                    : "bg-blue-100 text-blue-700"
                }`}>
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </div>
                <ChevronDown className={`hidden sm:block w-4 h-4 shrink-0 transition-transform duration-200 ${
                  userMenuOpen ? "rotate-180" : ""
                } ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`} />
              </button>
              <UserMenuDropdown
                open={userMenuOpen}
                onClose={() => setUserMenuOpen(false)}
                user={user}
                theme={theme}
                hasActiveSubscription={hasActiveSubscription}
                onNavigate={navigate}
                onLogout={logout}
              />
            </div>
          </div>
        </header>
        {/* Scrollable Main Content - full-height wrapper for /mentor so only chat scrolls */}
        <main className={`flex-1 flex flex-col min-h-0 max-w-full overflow-hidden ${location.pathname === "/mentor" ? "px-0 py-0 pb-0" : ""}`}>
          {/* Inactive subscription warning banner for students */}
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
          {location.pathname === "/mentor" ? (
            <div className="flex-1 min-h-0 flex flex-col pb-20 md:pb-0">
              <Outlet />
            </div>
          ) : (
            /* Full-width scroll wrapper so scroll works even over empty side space */
            <div className="flex-1 min-h-0 w-full min-w-0 overflow-y-auto overflow-x-hidden scroll-smooth scrollbar-hide">
              <div className="w-full max-w-full min-w-0 min-h-full px-2 sm:px-3 md:px-4 lg:px-6 py-4 md:py-6 pb-20 md:pb-6 box-border">
                <Outlet />
              </div>
            </div>
          )}
        </main>
      </div>
      </div>

      {/* Bottom Navigation Bar - Mobile Only (students only; mentors use sidebar) */}
      {user?.role !== "mentor" && user?.role !== "admin" && (
      <nav
        className={`fixed bottom-0 left-0 right-0 z-50 md:hidden border-t backdrop-blur-xl transition-all duration-300 shadow-lg ${theme === "dark"
            ? "border-blue-900/40 bg-[#020617]/98 shadow-blue-900/20"
            : "border-slate-200 bg-white/98 shadow-slate-300/40"
          }`}
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 4px)" }}
      >
        <div className="grid grid-cols-5 h-12 gap-0 px-0.5 py-1">
          <NavLink
            to="/home"
            className={({ isActive }) => {
              const isActiveRoute = location.pathname === "/home";
              return `flex flex-col items-center justify-center gap-0.5 h-12 rounded-lg transition-all duration-200 touch-manipulation relative ${theme === "dark"
                  ? isActiveRoute
                    ? "text-blue-300"
                    : "text-slate-400 active:bg-slate-800/50 active:scale-95"
                  : isActiveRoute
                    ? "text-blue-700"
                    : "text-slate-600 active:bg-slate-100 active:scale-95"
                }`;
            }}
          >
            {location.pathname === "/home" && (
              <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full ${theme === "dark" ? "bg-blue-400" : "bg-[#2563eb]"
                }`} />
            )}
            <Home className={`w-4 h-4 transition-all duration-200 ${location.pathname === "/home"
                ? "scale-105"
                : "scale-100"
              }`} />
            <span className={`text-[9px] font-medium leading-tight ${location.pathname === "/home" ? "font-semibold" : "font-normal"
              }`}>
              Home
            </span>
          </NavLink>

          <NavLink
            to="/performance"
            className={({ isActive }) => {
              const isActiveRoute = location.pathname === "/performance";
              return `flex flex-col items-center justify-center gap-0.5 h-12 rounded-lg transition-all duration-200 touch-manipulation relative ${theme === "dark"
                  ? isActiveRoute
                    ? "text-blue-300"
                    : "text-slate-400 active:bg-slate-800/50 active:scale-95"
                  : isActiveRoute
                    ? "text-blue-700"
                    : "text-slate-600 active:bg-slate-100 active:scale-95"
                }`;
            }}
          >
            {location.pathname === "/performance" && (
              <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full ${theme === "dark" ? "bg-blue-400" : "bg-[#2563eb]"
                }`} />
            )}
            <BarChart3 className={`w-4 h-4 transition-all duration-200 ${location.pathname === "/performance"
                ? "scale-105"
                : "scale-100"
              }`} />
            <span className={`text-[9px] font-medium leading-tight ${location.pathname === "/performance" ? "font-semibold" : "font-normal"
              }`}>
              Performance
            </span>
          </NavLink>

          <NavLink
            to="/prelims-test"
            className={({ isActive }) => {
              const isActiveRoute = location.pathname === "/prelims-test" || location.pathname.startsWith("/prelims-test/") || location.pathname.startsWith("/test/");
              return `flex flex-col items-center justify-center gap-0.5 h-12 rounded-lg transition-all duration-200 touch-manipulation relative ${theme === "dark"
                  ? isActiveRoute
                    ? "text-blue-300"
                    : "text-slate-400 active:bg-slate-800/50 active:scale-95"
                  : isActiveRoute
                    ? "text-blue-700"
                    : "text-slate-600 active:bg-slate-100 active:scale-95"
                }`;
            }}
          >
            {(() => {
              const isActiveRoute = location.pathname === "/prelims-test" || location.pathname.startsWith("/prelims-test/") || location.pathname.startsWith("/test/");
              return isActiveRoute ? (
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full ${theme === "dark" ? "bg-blue-400" : "bg-[#2563eb]"
                  }`} />
              ) : null;
            })()}
            <ClipboardList className={`w-4 h-4 transition-all duration-200 ${location.pathname === "/prelims-test" || location.pathname.startsWith("/prelims-test/") || location.pathname.startsWith("/test/")
                ? "scale-105"
                : "scale-100"
              }`} />
            <span className={`text-[9px] font-medium leading-tight ${location.pathname === "/prelims-test" || location.pathname.startsWith("/prelims-test/") || location.pathname.startsWith("/test/")
                ? "font-semibold"
                : "font-normal"
              }`}>
              Test
            </span>
          </NavLink>

          <NavLink
            to="/mentor"
            className={({ isActive }) => {
              const isActiveRoute = location.pathname === "/mentor" || location.pathname.startsWith("/mentor/");
              return `flex flex-col items-center justify-center gap-0.5 h-12 rounded-lg transition-all duration-200 touch-manipulation relative ${theme === "dark"
                  ? isActiveRoute
                    ? "text-blue-300"
                    : "text-slate-400 active:bg-slate-800/50 active:scale-95"
                  : isActiveRoute
                    ? "text-blue-700"
                    : "text-slate-600 active:bg-slate-100 active:scale-95"
                }`;
            }}
          >
            {(() => {
              const isActiveRoute = location.pathname === "/mentor" || location.pathname.startsWith("/mentor/");
              return isActiveRoute ? (
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full ${theme === "dark" ? "bg-blue-400" : "bg-[#2563eb]"
                  }`} />
              ) : null;
            })()}
            <MessageCircle className={`w-4 h-4 transition-all duration-200 ${location.pathname === "/mentor" || location.pathname.startsWith("/mentor/")
                ? "scale-105"
                : "scale-100"
              }`} />
            <span className={`text-[9px] font-medium leading-tight ${location.pathname === "/mentor" || location.pathname.startsWith("/mentor/")
                ? "font-semibold"
                : "font-normal"
              }`}>
              Mentor
            </span>
          </NavLink>

          <NavLink
            to="/copy-evaluation"
            className={({ isActive }) => {
              const isActiveRoute = location.pathname === "/copy-evaluation" || location.pathname.startsWith("/copy-evaluation/");
              return `flex flex-col items-center justify-center gap-0.5 h-12 rounded-lg transition-all duration-200 touch-manipulation relative ${theme === "dark"
                  ? isActive || isActiveRoute
                    ? "text-blue-300"
                    : "text-slate-400 active:bg-slate-800/50 active:scale-95"
                  : isActive || isActiveRoute
                    ? "text-blue-700"
                    : "text-slate-600 active:bg-slate-100 active:scale-95"
                }`;
            }}
          >
            {(() => {
              const isActiveRoute = location.pathname === "/copy-evaluation" || location.pathname.startsWith("/copy-evaluation/");
              return isActiveRoute ? (
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full ${theme === "dark" ? "bg-blue-400" : "bg-[#2563eb]"
                  }`} />
              ) : null;
            })()}
            <FileText className={`w-4 h-4 transition-all duration-200 ${location.pathname === "/copy-evaluation" || location.pathname.startsWith("/copy-evaluation/")
                ? "scale-105"
                : "scale-100"
              }`} />
            <span className={`text-[9px] font-medium leading-tight ${location.pathname === "/copy-evaluation" || location.pathname.startsWith("/copy-evaluation/")
                ? "font-semibold"
                : "font-normal"
              }`}>
              Eval
            </span>
          </NavLink>
        </div>
      </nav>
      )}

      {/* DART form modal – student daily activity entry */}
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

};
