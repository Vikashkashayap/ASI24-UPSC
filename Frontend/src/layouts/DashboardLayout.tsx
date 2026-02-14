import React, { useState } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { LineChart, CalendarClock, MessageCircle, FileText, Video, Sun, Moon, Menu, X, ClipboardList, User, Users, History, Home, Settings, HelpCircle, LogOut, PanelLeftClose, PanelLeftOpen, BarChart3 } from "lucide-react";
import { EvaluationHistorySidebar } from "../components/EvaluationHistorySidebar";

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
    '/prelims-pdf-tests': { title: 'Scheduled PDF Tests', icon: <ClipboardList className="w-5 h-5" /> },
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
    '/admin/prelims-pdf-tests': { title: 'PDF Prelims Tests', icon: <FileText className="w-5 h-5" /> },
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
  if (pathname.startsWith('/prelims-pdf-test/') && !pathname.startsWith('/prelims-pdf-tests')) {
    return { title: 'PDF Test', icon: <ClipboardList className="w-5 h-5" /> };
  }
  if (pathname.startsWith('/prelims-pdf-result/')) {
    return { title: 'PDF Test Result', icon: <LineChart className="w-5 h-5" /> };
  }

  return routeMap[pathname] || { title: 'Dashboard', icon: <Home className="w-5 h-5" /> };
};

export const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const isCopyEvaluationPage = location.pathname === '/copy-evaluation';
  const pageInfo = getPageTitle(location.pathname, user?.role);

  return (
    <div
      className={`min-h-screen h-screen flex overflow-hidden ${theme === "dark" ? "bg-[#020012] text-slate-50" : "bg-slate-50 text-slate-900"
        }`}
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
        <div className={`${sidebarCollapsed ? "px-2 md:px-3" : "px-4 md:px-6"} h-[60px] md:h-[73px] border-b flex items-center ${sidebarCollapsed ? "justify-center" : "justify-between"} flex-shrink-0 relative ${theme === "dark" ? "border-purple-900/60" : "border-slate-200"}`}>
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-fuchsia-500 to-emerald-400 shadow-[0_0_24px_rgba(168,85,247,0.7)] flex-shrink-0">
                <span className="text-sm font-semibold text-black">∞</span>
              </div>
              <span className={`text-sm md:text-base font-semibold tracking-tight ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
                UPSC<span className={theme === "dark" ? "text-fuchsia-300" : "text-fuchsia-600"}> Mentor</span>
              </span>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-fuchsia-500 to-emerald-400 shadow-[0_0_24px_rgba(168,85,247,0.7)] flex-shrink-0">
              <span className="text-sm font-semibold text-black">∞</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={`hidden md:flex p-1.5 rounded-lg transition-colors ${theme === "dark"
                  ? "hover:bg-slate-800 text-slate-200"
                  : "hover:bg-slate-100 text-slate-700"
                }`}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-slate-800 rounded touch-manipulation"
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
                <NavLink to="/admin/prelims-pdf-tests" className={(props) => navLinkClass({ ...props, theme, collapsed: sidebarCollapsed })} title="PDF Prelims Tests">
                  <FileText className="w-4 h-4 flex-shrink-0" />
                  {!sidebarCollapsed && <span>PDF Prelims Tests</span>}
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
                <NavLink to="/prelims-pdf-tests" className={(props) => navLinkClass({ ...props, theme, collapsed: sidebarCollapsed })} title="Scheduled PDF Tests">
                  <ClipboardList className="w-4 h-4 flex-shrink-0" />
                  {!sidebarCollapsed && <span>Scheduled PDF Tests</span>}
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
        {/* Fixed Header - Mobile-first */}
        <header
          className={`h-[60px] md:h-[73px] flex items-center justify-between px-3 md:px-4 lg:px-8 border-b backdrop-blur-xl sticky top-0 z-30 shadow-sm ${theme === "dark"
              ? "border-purple-900/60 bg-gradient-to-r from-[#050016]/95 via-[#06021a]/95 to-[#020617]/95 shadow-purple-900/20"
              : "border-slate-200 bg-white/95 shadow-slate-200/50"
            }`}
        >
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className={`md:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-colors touch-manipulation ${theme === "dark"
                  ? "hover:bg-slate-800 text-slate-200"
                  : "hover:bg-slate-100 text-slate-700"
                }`}
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className={`hidden md:flex items-center gap-2 lg:gap-3 ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
              <div className={`p-1.5 md:p-2 rounded-lg transition-all duration-200 ${theme === "dark" ? "bg-purple-900/30 ring-1 ring-purple-700/30" : "bg-purple-100 ring-1 ring-purple-200/50"
                }`}>
                {pageInfo.icon}
              </div>
              <h1 className="text-lg md:text-xl font-bold tracking-tight">{pageInfo.title}</h1>
            </div>
            <div className={`text-sm md:text-base font-semibold tracking-tight md:hidden ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
              UPSC Mentor
            </div>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <button
              onClick={toggleTheme}
              className={`inline-flex h-[44px] w-[44px] md:h-8 md:w-8 items-center justify-center rounded-full border transition-all duration-200 touch-manipulation active:scale-95 ${theme === "dark"
                  ? "border-purple-700/60 bg-black/30 text-slate-200 hover:bg-purple-950/60 hover:border-purple-600/80 shadow-sm shadow-purple-900/20"
                  : "border-purple-300 bg-white text-purple-700 hover:bg-purple-50 hover:border-purple-400 shadow-sm shadow-purple-200/50"
                }`}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4 md:w-5 md:h-5 transition-transform hover:rotate-12" /> : <Moon className="w-4 h-4 md:w-5 md:h-5 transition-transform hover:-rotate-12" />}
            </button>
            <div className={`hidden md:flex items-center gap-2 lg:gap-3 ${theme === "dark" ? "text-slate-300" : "text-slate-900"}`}>
              <div className="flex flex-col text-right text-[10px] md:text-xs mr-1 md:mr-2">
                <span className={`${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                  Daily discipline beats motivation
                </span>
              </div>
              <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs md:text-sm font-semibold transition-all duration-200 hover:scale-105 ring-2 ${theme === "dark"
                  ? "bg-gradient-to-br from-purple-600 to-indigo-600 text-white ring-purple-500/30 shadow-lg shadow-purple-600/20"
                  : "bg-gradient-to-br from-purple-100 to-indigo-100 text-purple-700 ring-purple-200/50 shadow-md shadow-purple-200/30"
                }`}>
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Main Content - Mobile-first padding */}
        <main className="flex-1 overflow-y-auto scroll-smooth scrollbar-hide px-3 md:px-4 lg:px-8 py-4 md:py-6 pb-14 md:pb-6 max-w-full overflow-x-hidden">
          <Outlet />
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
    </div>
  );

};
