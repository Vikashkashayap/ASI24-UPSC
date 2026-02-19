import React, { useState } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { LineChart, CalendarClock, MessageCircle, FileText, Video, Sun, Moon, Menu, X, ClipboardList, User, Users, History, Home, Settings, HelpCircle, LogOut, PanelLeftClose, PanelLeftOpen, BarChart3, Lightbulb, MoreVertical, Target, ClipboardEdit } from "lucide-react";
import { DartFormModal } from "../components/dart/DartFormModal";
import { EvaluationHistorySidebar } from "../components/EvaluationHistorySidebar";
import logoImg from "../LOGO/UPSCRH-LOGO.png";

// Mobile-first nav link: minimum 44px height for touch targets
const navLinkClass = ({ isActive, theme, collapsed }: { isActive: boolean; theme: "dark" | "light"; collapsed?: boolean }) =>
  `flex items-center ${collapsed ? "justify-center" : "gap-2 md:gap-3"} ${collapsed ? "px-2" : "px-2 md:px-3"} py-2.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 min-h-[44px] touch-manipulation relative ${theme === "dark"
    ? `hover:bg-slate-800/80 active:scale-95 ${isActive ? "bg-fuchsia-500/20 text-fuchsia-200 shadow-sm shadow-fuchsia-500/10" : "text-slate-300"
    }`
    : `hover:bg-slate-100 active:scale-95 ${isActive ? "bg-purple-100 text-purple-700 shadow-sm shadow-purple-200/50" : "text-slate-700"
    }`
  }`;


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
    // '/test-history': { title: 'Test History', icon: <History className="w-5 h-5" /> },
    '/meeting': { title: 'Live Meeting', icon: <Video className="w-5 h-5" /> },
    '/profile': { title: 'Profile', icon: <User className="w-5 h-5" /> },
    '/student-profiler': { title: 'Student Profiler', icon: <User className="w-5 h-5" /> },
    '/help-support': { title: 'Help & Support', icon: <HelpCircle className="w-5 h-5" /> },
    '/mains-evaluation': { title: 'Mains Evaluation', icon: <FileText className="w-5 h-5" /> },
  };

  const adminRouteMap: Record<string, { title: string; icon: React.ReactNode }> = {
    '/admin/dashboard': { title: 'Admin Dashboard', icon: <BarChart3 className="w-5 h-5" /> },
    '/admin/students': { title: 'Students Management', icon: <Users className="w-5 h-5" /> },
    '/admin/prelims-mock': { title: 'Prelims Mock', icon: <Target className="w-5 h-5" /> },
    '/profile': { title: 'Profile', icon: <User className="w-5 h-5" /> },
    '/help-support': { title: 'Help & Support', icon: <HelpCircle className="w-5 h-5" /> },
  };

  const routeMap = userRole === 'admin' ? adminRouteMap : studentRouteMap;

  // Handle dynamic routes
  if (pathname.startsWith('/copy-evaluation/')) {
    return { title: 'Copy Evaluation Details', icon: <FileText className="w-5 h-5" /> };
  }
  if (pathname.startsWith('/test/')) {
    return { title: 'Test', icon: <ClipboardList className="w-5 h-5" /> };
  }
  if (pathname.startsWith('/result/')) {
    return { title: 'Test Result', icon: <LineChart className="w-5 h-5" /> };
  }
  return routeMap[pathname] || { title: 'Dashboard', icon: <Home className="w-5 h-5" /> };
};

export const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dartModalOpen, setDartModalOpen] = useState(false);
  const location = useLocation();
  const isCopyEvaluationPage = location.pathname === '/copy-evaluation';
  const pageInfo = getPageTitle(location.pathname, user?.role);
  const isStudent = user?.role !== "admin";

  return (
    <div
      className={`dashboard-scroll min-h-screen h-screen flex overflow-hidden overflow-x-hidden ${theme === "dark" ? "bg-[#020012] text-slate-50" : "bg-slate-50 text-slate-900"
        }`}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Fixed Sidebar - Mobile-first: hidden by default, shown on desktop */}
      <aside
        className={`${sidebarCollapsed ? "w-16 md:w-20" : "w-[280px] md:w-64"} flex flex-col border-r backdrop-blur-xl fixed left-0 top-0 bottom-0 z-50 transition-all duration-300 shadow-lg ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          } md:translate-x-0 ${theme === "dark"
            ? "border-purple-900/60 bg-gradient-to-r from-[#050016]/95 via-[#06021a]/95 to-[#020617]/95 shadow-purple-900/20"
            : "border-slate-200 bg-white/95 shadow-slate-200/50"
          }`}
      >
        <div className={`${sidebarCollapsed ? "px-2 md:px-3" : "px-4 md:px-6"} h-14 md:h-[72px] border-b flex items-center ${sidebarCollapsed ? "justify-center" : "justify-between"} gap-1.5 flex-shrink-0 ${theme === "dark" ? "border-purple-900/60" : "border-slate-200"}`}>
          {!sidebarCollapsed && (
            <div className="flex items-center gap-1.5 min-w-0 shrink-0">
              <img src={logoImg} alt="UPSCRH" className="h-10 md:h-11 w-auto object-contain object-center flex-shrink-0" />
            </div>
          )}
          {sidebarCollapsed && (
            <img src={logoImg} alt="UPSCRH" className="h-10 w-10 object-contain object-center flex-shrink-0" />
          )}
          <div className="flex items-center justify-center gap-1.5 shrink-0">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={`hidden md:flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${theme === "dark"
                  ? "hover:bg-slate-800 text-slate-200"
                  : "hover:bg-slate-100 text-slate-700"
                }`}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg hover:bg-slate-800 touch-manipulation text-slate-200"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <nav className={`${sidebarCollapsed ? "px-2" : "px-2 md:px-4"} py-3 md:py-4 space-y-1 md:space-y-2 flex-1 overflow-y-auto scroll-smooth scrollbar-hide`} onClick={() => setMobileMenuOpen(false)}>

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
                <NavLink to="/admin/prelims-mock" className={(props) => navLinkClass({ ...props, theme, collapsed: sidebarCollapsed })} title="Prelims Mock - Schedule tests">
                  <Target className="w-4 h-4 flex-shrink-0" />
                  {!sidebarCollapsed && <span>Prelims Mock</span>}
                </NavLink>
              </div>

              {/* Admin Tools Section */}
              {!sidebarCollapsed && (
                <div className="pt-3 md:pt-4 pb-1 md:pb-2">
                  <div className="px-2 md:px-3 text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wider">
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
          ) : (
            // Student Navigation
            <>
              {/* Main Section */}
              <div className="space-y-1">
                <NavLink to="/home" className={(props) => navLinkClass({ ...props, theme, collapsed: sidebarCollapsed })} title="Home">
                  <Home className="w-4 h-4 flex-shrink-0" />
                  {!sidebarCollapsed && <span>Home</span>}
                </NavLink>
              </div>

              {/* Performance & Analytics Section */}
              {!sidebarCollapsed && (
                <div className="pt-3 md:pt-4 pb-1 md:pb-2">
                  <div className="px-2 md:px-3 text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Performance & Analytics
                  </div>
                </div>
              )}
              <div className="space-y-1">
                <NavLink to="/performance" className={(props) => navLinkClass({ ...props, theme, collapsed: sidebarCollapsed })} title="Performance Dashboard">
                  <BarChart3 className="w-4 h-4 flex-shrink-0" />
                  {!sidebarCollapsed && <span>Performance Dashboard</span>}
                </NavLink>
                <NavLink to="/copy-evaluation" className={(props) => navLinkClass({ ...props, theme, collapsed: sidebarCollapsed })} title="Copy Evaluation">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2 md:gap-3">
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      {!sidebarCollapsed && <span>Copy Evaluation</span>}
                    </div>
                    {!sidebarCollapsed && (
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 ml-2 whitespace-nowrap uppercase tracking-tighter">
                        Soon
                      </span>
                    )}
                  </div>
                </NavLink>
                {/* <NavLink to="/evaluation-history" className={(props) => navLinkClass({ ...props, theme, collapsed: sidebarCollapsed })} title="Evaluation History">
                  <History className="w-4 h-4 flex-shrink-0" />
                  {!sidebarCollapsed && <span>Evaluation History</span>}
                </NavLink> */}
              </div>

              {/* Practice & Tests Section */}
              {!sidebarCollapsed && (
                <div className="pt-3 md:pt-4 pb-1 md:pb-2">
                  <div className="px-2 md:px-3 text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Practice & Tests
                  </div>
                </div>
              )}
              <div className="space-y-1">
                <NavLink to="/prelims-test" className={(props) => navLinkClass({ ...props, theme, collapsed: sidebarCollapsed })} title="Prelims Test">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2 md:gap-3">
                      <ClipboardList className="w-4 h-4 flex-shrink-0" />
                      {!sidebarCollapsed && <span>Prelims Test</span>}
                    </div>
                    {!sidebarCollapsed && (
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ml-2 whitespace-nowrap uppercase tracking-tighter">
                        Trial
                      </span>
                    )}
                  </div>
                </NavLink>
                <NavLink to="/prelims-mock" className={(props) => navLinkClass({ ...props, theme, collapsed: sidebarCollapsed })} title="Prelims Mock - Scheduled tests">
                  <Target className="w-4 h-4 flex-shrink-0" />
                  {!sidebarCollapsed && <span>Prelims Mock</span>}
                </NavLink>
                {/* <NavLink to="/test-history" className={(props) => navLinkClass({ ...props, theme, collapsed: sidebarCollapsed })} title="Test History">
                  <History className="w-4 h-4 flex-shrink-0" />
                  {!sidebarCollapsed && <span>Test History</span>}
                </NavLink> */}
              </div>

              {/* Study Tools Section */}
              {!sidebarCollapsed && (
                <div className="pt-3 md:pt-4 pb-1 md:pb-2">
                  <div className="px-2 md:px-3 text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Study Tools
                  </div>
                </div>
              )}
              <div className="space-y-1">
                <NavLink to="/planner" className={(props) => navLinkClass({ ...props, theme, collapsed: sidebarCollapsed })} title="Study Planner">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2 md:gap-3">
                      <CalendarClock className="w-4 h-4 flex-shrink-0" />
                      {!sidebarCollapsed && <span>Study Planner</span>}
                    </div>
                    {!sidebarCollapsed && (
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 ml-2 whitespace-nowrap uppercase tracking-tighter">
                        Soon
                      </span>
                    )}
                  </div>
                </NavLink>
                <NavLink to="/mentor" className={(props) => navLinkClass({ ...props, theme, collapsed: sidebarCollapsed })} title="AI Mentor">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2 md:gap-3">
                      <MessageCircle className="w-4 h-4 flex-shrink-0" />
                      {!sidebarCollapsed && <span>AI Mentor</span>}
                    </div>
                    {!sidebarCollapsed && (
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ml-2 whitespace-nowrap uppercase tracking-tighter">
                        Trial
                      </span>
                    )}
                  </div>
                </NavLink>
              </div>

              {/* Communication Section */}
              {/* {!sidebarCollapsed && (
                <div className="pt-3 md:pt-4 pb-1 md:pb-2">
                  <div className="px-2 md:px-3 text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wider">
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
                  <div className="px-2 md:px-3 text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wider">
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
        <div className={`${sidebarCollapsed ? "px-2" : "px-2 md:px-4"} py-3 md:py-4 border-t flex-shrink-0 ${theme === "dark" ? "border-purple-900/80" : "border-slate-200"}`}>
          <div className="space-y-1">
            <NavLink
              to="/profile"
              className={(props) => navLinkClass({ ...props, theme, collapsed: sidebarCollapsed })}
              onClick={() => setMobileMenuOpen(false)}
              title="Settings"
            >
              <Settings className="w-4 h-4 flex-shrink-0" />
              {!sidebarCollapsed && <span>Settings</span>}
            </NavLink>
            <NavLink
              to="/help-support"
              className={(props) => navLinkClass({ ...props, theme, collapsed: sidebarCollapsed })}
              onClick={() => setMobileMenuOpen(false)}
              title="Help & Support"
            >
              <HelpCircle className="w-4 h-4 flex-shrink-0" />
              {!sidebarCollapsed && <span>Help & Support</span>}
            </NavLink>
            <button
              onClick={logout}
              className={`w-full flex items-center ${sidebarCollapsed ? "justify-center" : "gap-2 md:gap-3"} ${sidebarCollapsed ? "px-2" : "px-2 md:px-3"} py-2.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-colors min-h-[44px] touch-manipulation ${theme === "dark"
                  ? "hover:bg-slate-800 text-slate-300"
                  : "hover:bg-slate-100 text-slate-700"
                }`}
              title="Logout"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              {!sidebarCollapsed && <span>Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main content area - mobile-first: full width on mobile, margin on desktop */}
      <div className={`flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300 ${sidebarCollapsed ? "md:ml-16 lg:ml-20" : "md:ml-[280px] lg:ml-64"}`}>
        {/* Fixed Header - equal alignment, better UI */}
        <header
          className={`h-14 md:h-[72px] flex items-center justify-between gap-3 px-3 md:px-4 lg:px-6 border-b backdrop-blur-xl sticky top-0 z-30 shadow-sm ${theme === "dark"
              ? "border-purple-900/60 bg-gradient-to-r from-[#050016]/95 via-[#06021a]/95 to-[#020617]/95 shadow-purple-900/20"
              : "border-slate-200 bg-white/95 shadow-slate-200/50"
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
                ? "bg-purple-900/40 ring-1 ring-purple-600/50 text-slate-50"
                : "bg-purple-100/80 ring-1 ring-purple-200/80 text-slate-900"
              }`}>
              <span className="flex items-center justify-center w-5 h-5 shrink-0 [&>svg]:w-5 [&>svg]:h-5">
                {pageInfo.icon}
              </span>
              <h1 className="text-sm md:text-base font-semibold tracking-tight truncate">{pageInfo.title}</h1>
            </div>
            <div className={`text-sm md:text-base font-semibold tracking-tight md:hidden truncate ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
              UPSCRH
            </div>
          </div>

          {/* Right: DART (student only) + theme toggle + motivation + avatar */}
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            {isStudent && (
              <button
                onClick={() => setDartModalOpen(true)}
                className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 touch-manipulation shrink-0 ${
                  theme === "dark"
                    ? "bg-purple-600/80 hover:bg-purple-600 text-white border border-purple-500/50"
                    : "bg-purple-600 hover:bg-purple-700 text-white border border-purple-500/30"
                }`}
                title="Log daily activity (DART)"
              >
                <ClipboardEdit className="w-4 h-4" />
                <span className="hidden sm:inline">DART</span>
              </button>
            )}
            <button
              onClick={toggleTheme}
              className={`inline-flex items-center justify-center w-9 h-9 md:w-9 md:h-9 rounded-full border transition-all duration-200 touch-manipulation active:scale-95 shrink-0 ${theme === "dark"
                  ? "border-purple-700/60 bg-black/30 text-slate-200 hover:bg-purple-950/60 hover:border-purple-600/80 shadow-sm shadow-purple-900/20"
                  : "border-purple-300 bg-white text-purple-700 hover:bg-purple-50 hover:border-purple-400 shadow-sm shadow-purple-200/50"
                }`}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4 md:w-5 md:h-5" /> : <Moon className="w-4 h-4 md:w-5 md:h-5" />}
            </button>
            <button
              onClick={() => navigate("/profile")}
              className={`md:hidden inline-flex items-center justify-center w-9 h-9 min-h-[44px] min-w-[44px] rounded-full transition-colors touch-manipulation active:scale-95 shrink-0 ${theme === "dark" ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}
              aria-label="More options"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            <div className={`hidden md:flex items-center gap-2 ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
              <span className="flex items-center justify-center w-9 h-9 rounded-full shrink-0 border border-purple-500/40 text-purple-400">
                <Lightbulb className="w-4 h-4" />
              </span>
              <span className={`text-xs font-medium max-w-[140px] lg:max-w-[180px] truncate ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                Daily discipline beats motivation
              </span>
            </div>
            <div className={`hidden md:flex w-9 h-9 md:w-10 md:h-10 rounded-full items-center justify-center text-xs md:text-sm font-semibold shrink-0 ring-2 transition-all duration-200 hover:scale-105 ${theme === "dark"
                ? "bg-gradient-to-br from-purple-600 to-indigo-600 text-white ring-purple-500/30 shadow-lg shadow-purple-600/20"
                : "bg-gradient-to-br from-purple-100 to-indigo-100 text-purple-700 ring-purple-200/50 shadow-md shadow-purple-200/30"
              }`}>
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
          </div>
        </header>

        {/* Scrollable Main Content - full-height wrapper for /mentor so only chat scrolls */}
        <main className={`flex-1 flex flex-col min-h-0 max-w-full overflow-hidden ${location.pathname === "/mentor" ? "px-0 py-0 pb-0" : ""}`}>
          {location.pathname === "/mentor" ? (
            <div className="flex-1 min-h-0 flex flex-col pb-20 md:pb-0">
              <Outlet />
            </div>
          ) : (
            /* Full-width scroll wrapper so scroll works even over empty side space */
            <div className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden scroll-smooth scrollbar-hide">
              <div className="w-full min-h-full px-3 md:px-4 lg:px-8 py-4 md:py-6 pb-20 md:pb-6">
                <Outlet />
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Bottom Navigation Bar - Mobile Only */}
      <nav
        className={`fixed bottom-0 left-0 right-0 z-50 md:hidden border-t backdrop-blur-xl transition-all duration-300 shadow-lg ${theme === "dark"
            ? "border-purple-900/40 bg-gradient-to-t from-[#050016]/98 via-[#06021a]/95 to-[#020617]/95 shadow-purple-900/30"
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
                    ? "text-fuchsia-300"
                    : "text-slate-400 active:bg-slate-800/50 active:scale-95"
                  : isActiveRoute
                    ? "text-purple-700"
                    : "text-slate-600 active:bg-slate-100 active:scale-95"
                }`;
            }}
          >
            {location.pathname === "/home" && (
              <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full ${theme === "dark" ? "bg-fuchsia-400" : "bg-purple-600"
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
                    ? "text-fuchsia-300"
                    : "text-slate-400 active:bg-slate-800/50 active:scale-95"
                  : isActiveRoute
                    ? "text-purple-700"
                    : "text-slate-600 active:bg-slate-100 active:scale-95"
                }`;
            }}
          >
            {location.pathname === "/performance" && (
              <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full ${theme === "dark" ? "bg-fuchsia-400" : "bg-purple-600"
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
                    ? "text-fuchsia-300"
                    : "text-slate-400 active:bg-slate-800/50 active:scale-95"
                  : isActiveRoute
                    ? "text-purple-700"
                    : "text-slate-600 active:bg-slate-100 active:scale-95"
                }`;
            }}
          >
            {(() => {
              const isActiveRoute = location.pathname === "/prelims-test" || location.pathname.startsWith("/prelims-test/") || location.pathname.startsWith("/test/");
              return isActiveRoute ? (
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full ${theme === "dark" ? "bg-fuchsia-400" : "bg-purple-600"
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
                    ? "text-fuchsia-300"
                    : "text-slate-400 active:bg-slate-800/50 active:scale-95"
                  : isActiveRoute
                    ? "text-purple-700"
                    : "text-slate-600 active:bg-slate-100 active:scale-95"
                }`;
            }}
          >
            {(() => {
              const isActiveRoute = location.pathname === "/mentor" || location.pathname.startsWith("/mentor/");
              return isActiveRoute ? (
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full ${theme === "dark" ? "bg-fuchsia-400" : "bg-purple-600"
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
                    ? "text-fuchsia-300"
                    : "text-slate-400 active:bg-slate-800/50 active:scale-95"
                  : isActive || isActiveRoute
                    ? "text-purple-700"
                    : "text-slate-600 active:bg-slate-100 active:scale-95"
                }`;
            }}
          >
            {(() => {
              const isActiveRoute = location.pathname === "/copy-evaluation" || location.pathname.startsWith("/copy-evaluation/");
              return isActiveRoute ? (
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full ${theme === "dark" ? "bg-fuchsia-400" : "bg-purple-600"
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
              Eval (Soon)
            </span>
          </NavLink>
        </div>
      </nav>

      {/* DART form modal – student daily activity entry */}
      {isStudent && (
        <DartFormModal
          open={dartModalOpen}
          onOpenChange={setDartModalOpen}
          onSuccess={() => {}}
        />
      )}
    </div>
  );

};
