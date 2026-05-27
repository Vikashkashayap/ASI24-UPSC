import React, { Suspense, useState, useEffect } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { LineChart, CalendarClock, MessageCircle, FileText, Video, Menu, X, ClipboardList, User, Users, History, Home, Settings, HelpCircle, LogOut, PanelLeftClose, PanelLeftOpen, BarChart3, Lightbulb, MoreVertical, Target, ClipboardEdit, IndianRupee, AlertTriangle, Tag, Newspaper } from "lucide-react";
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
  `px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`;

const sidebarNavIconClass = (isActive: boolean, theme: "dark" | "light") =>
  `w-[18px] h-[18px] flex-shrink-0 stroke-[2] ${isActive
    ? theme === "dark" ? "text-blue-300" : "text-blue-600"
    : theme === "dark" ? "text-slate-400 group-hover:text-slate-200" : "text-slate-500 group-hover:text-slate-700"
  }`;

type SidebarBadgeVariant = "soon" | "trial";

const SidebarBadge = ({ variant, theme }: { variant: SidebarBadgeVariant; theme: "dark" | "light" }) => {
  const styles =
    variant === "soon"
      ? theme === "dark"
        ? "bg-blue-500/15 text-blue-300 ring-blue-500/25"
        : "bg-blue-50 text-blue-600 ring-blue-200/80"
      : theme === "dark"
        ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/25"
        : "bg-emerald-50 text-emerald-700 ring-emerald-200/80";

  return (
    <span className={`ml-auto shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ring-1 ${styles}`}>
      {variant === "soon" ? "Soon" : "Trial"}
    </span>
  );
};

const SidebarNavItem = ({
  to,
  title,
  icon: Icon,
  label,
  theme,
  collapsed,
  badge,
  muted,
  onNavigate,
}: {
  to: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  theme: "dark" | "light";
  collapsed: boolean;
  badge?: SidebarBadgeVariant;
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
        {!collapsed && (
          <>
            <span className="truncate flex-1 min-w-0">{label}</span>
            {badge && <SidebarBadge variant={badge} theme={theme} />}
          </>
        )}
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

export const DashboardLayout = () => {
  const { user, logout, refreshUser } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dartModalOpen, setDartModalOpen] = useState(false);
  const location = useLocation();
  const isCopyEvaluationPage = location.pathname === '/copy-evaluation';
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

  const sidebarSurface =
    theme === "dark"
      ? "border-slate-800/80 bg-[#0B1220] text-slate-50"
      : "border-gray-200 bg-white text-slate-900";

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
        className={`${sidebarCollapsed ? "w-[76px]" : "w-[260px]"} fixed left-0 bottom-0 z-50 flex flex-col shrink-0 border-r transition-transform duration-300 top-[env(safe-area-inset-top,0px)] ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
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
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 shadow-md shadow-blue-500/25 ring-1 ring-blue-400/30">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 shrink-0">
                        <Lightbulb className="w-3.5 h-3.5 text-white" />
                      </span>
                      <span className="text-xs truncate">
                        {user?.subscriptionPlan?.name || "Pro"} · Active
                      </span>
                    </div>
                  ) : (
                    <NavLink
                      to="/pricing"
                      className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-white transition-all bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-md shadow-blue-500/25 ring-1 ring-blue-400/30 active:scale-[0.98]"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 shrink-0">
                        <Lightbulb className="w-3.5 h-3.5 text-white" />
                      </span>
                      <span>Subscribe to Pro</span>
                    </NavLink>
                  )}
                </div>
              )}
              {/* Main Section */}
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
                <div className="pt-5 pb-2">
                  <div className={sidebarSectionLabelClass(theme)}>
                    Performance & Analytics
                  </div>
                </div>
              )}
              <div className="space-y-0.5">
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
                <div className="pt-5 pb-2">
                  <div className={sidebarSectionLabelClass(theme)}>
                    Practice & Tests
                  </div>
                </div>
              )}
              <div className="space-y-0.5">
                <SidebarNavItem
                  to="/prelims-test"
                  title="Prelims Test"
                  icon={ClipboardList}
                  label="Prelims Test"
                  theme={theme}
                  collapsed={sidebarCollapsed}
                  badge="trial"
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
                <div className="pt-5 pb-2">
                  <div className={sidebarSectionLabelClass(theme)}>
                    Study Tools
                  </div>
                </div>
              )}
              <div className="space-y-0.5">
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
                  badge="trial"
                  onNavigate={() => setMobileMenuOpen(false)}
                />
              </div>

              {!sidebarCollapsed && (
                <div className="pt-5 pb-2">
                  <div className={sidebarSectionLabelClass(theme)}>Account</div>
                </div>
              )}
              <div className="space-y-0.5">
                <SidebarNavItem
                  to="/profile"
                  title="Profile"
                  icon={User}
                  label="Profile"
                  theme={theme}
                  collapsed={sidebarCollapsed}
                  onNavigate={() => setMobileMenuOpen(false)}
                />
              </div>

              {/* Communication Section */}
              {/* {!sidebarCollapsed && (
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
          className={`h-14 md:h-[72px] flex items-center justify-between gap-3 px-3 md:px-4 lg:px-6 border-b backdrop-blur-xl shrink-0 z-30 ${theme === "dark"
              ? "border-slate-800/80 bg-[#0B1220]/95"
              : "border-gray-200 bg-white/95"
            }`}
        >
          {/* Left: mobile menu | desktop: page pill only */}
          <div className="flex items-center gap-1.5 md:gap-2 min-w-0 flex-1">
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
            {/* Page title pill - icon + text, equal height with row */}
            <div className={`hidden md:flex items-center gap-2 px-3 py-2 rounded-xl min-h-[40px] ${theme === "dark"
                ? "bg-white/[0.04] ring-1 ring-slate-800/80 text-slate-50"
                : "bg-gray-50 ring-1 ring-gray-200 text-slate-900"
              }`}>
              <span className="flex items-center justify-center w-5 h-5 shrink-0 [&>svg]:w-5 [&>svg]:h-5">
                {pageInfo.icon}
              </span>
              <h1 className="text-sm md:text-base font-semibold tracking-tight truncate">{pageInfo.title}</h1>
            </div>
            <div className={`text-sm md:text-base font-semibold tracking-tight md:hidden truncate ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
              MentorsDaily
            </div>
          </div>

          {/* Right: DART (student only) + motivation + avatar */}
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 shrink-0 min-w-0 max-w-[55%] sm:max-w-none">
            {isStudent && (
              <button
                onClick={() => setDartModalOpen(true)}
                className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 touch-manipulation shrink-0 ${
                  theme === "dark"
                    ? "bg-blue-600/80 hover:bg-blue-600 text-white border border-blue-500/50"
                    : "bg-[#2563eb] hover:bg-[#1d4ed8] text-white border border-blue-500/30"
                }`}
                title="Log daily activity (DART)"
              >
                <ClipboardEdit className="w-4 h-4" />
                <span className="hidden sm:inline">DART</span>
              </button>
            )}
            <button
              onClick={() => navigate("/profile")}
              className={`md:hidden inline-flex items-center justify-center w-9 h-9 min-h-[44px] min-w-[44px] rounded-full transition-colors touch-manipulation active:scale-95 shrink-0 ${theme === "dark" ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}
              aria-label="More options"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            <div className={`hidden lg:flex items-center gap-2 min-w-0 max-w-[min(420px,50vw)] ${theme === "dark" ? "text-slate-300" : "text-gray-600"}`}>
              {hasActiveSubscription ? (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#2563eb] text-white shadow-sm min-w-0 max-w-full">
                    <Lightbulb className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{user?.subscriptionPlan?.name || "MentorsDaily Pro"} Active</span>
                  </span>
                  {user?.subscriptionEndDate && (
                    <span className="hidden xl:inline text-[10px] text-slate-500 whitespace-nowrap shrink-0">
                      Expires {formatExpiryDate(user.subscriptionEndDate)}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => navigate("/pricing")}
                    className={`text-[10px] font-semibold px-2 py-1 rounded-lg border transition-colors shrink-0 whitespace-nowrap ${
                      theme === "dark"
                        ? "border-blue-500/50 text-blue-300 hover:bg-blue-500/10"
                        : "border-blue-300 text-blue-700 hover:bg-blue-50"
                    }`}
                  >
                    Upgrade Plan
                  </button>
                </div>
              ) : isStudent ? (
                <button
                  type="button"
                  onClick={() => navigate("/pricing")}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border border-blue-500/40 text-blue-600 bg-blue-500/5 hover:bg-blue-500/10 transition-colors"
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>Subscribe Now</span>
                </button>
              ) : null}
            </div>
            <div className={`hidden md:flex w-9 h-9 md:w-10 md:h-10 rounded-full items-center justify-center text-xs md:text-sm font-semibold shrink-0 ring-2 transition-all duration-200 hover:scale-105 ${theme === "dark"
                ? "bg-[#2563eb] text-white ring-blue-500/30 shadow-lg shadow-blue-600/20"
                : "bg-blue-100 text-blue-700 ring-blue-200/50 shadow-md shadow-blue-200/30"
              }`}>
              {user?.name?.charAt(0).toUpperCase() || "U"}
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
              Test (Trial)
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
              Mentor (Trial)
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
