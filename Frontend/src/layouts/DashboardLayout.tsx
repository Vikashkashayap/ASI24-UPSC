import React, { useState } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { LineChart, CalendarClock, MessageCircle, FileText, Video, Sun, Moon, Menu, X, ClipboardList, User, History, Home, Settings, HelpCircle, LogOut, PanelLeftClose, PanelLeftOpen, BarChart3, Newspaper, Brain } from "lucide-react";
import { EvaluationHistorySidebar } from "../components/EvaluationHistorySidebar";

const navLinkClass = ({ isActive, theme, collapsed }: { isActive: boolean; theme: "dark" | "light"; collapsed?: boolean }) =>
  `flex items-center ${collapsed ? "justify-center" : "gap-3"} ${collapsed ? "px-2" : "px-3"} py-2 rounded-lg text-sm font-medium transition-colors ${
    theme === "dark"
      ? `hover:bg-slate-800 ${
          isActive ? "bg-fuchsia-500/20 text-fuchsia-200" : "text-slate-300"
        }`
      : `hover:bg-slate-100 ${
          isActive ? "bg-purple-100 text-purple-700" : "text-slate-700"
        }`
  }`;


const getPageTitle = (pathname: string): { title: string; icon: React.ReactNode } => {
  const routeMap: Record<string, { title: string; icon: React.ReactNode }> = {
    '/home': { title: 'Home', icon: <Home className="w-5 h-5" /> },
    '/performance': { title: 'Performance Dashboard', icon: <BarChart3 className="w-5 h-5" /> },
    '/planner': { title: 'Study Planner', icon: <CalendarClock className="w-5 h-5" /> },
    '/mentor': { title: 'AI Mentor', icon: <MessageCircle className="w-5 h-5" /> },
    '/copy-evaluation': { title: 'Copy Evaluation', icon: <FileText className="w-5 h-5" /> },
    '/evaluation-history': { title: 'Evaluation History', icon: <History className="w-5 h-5" /> },
    '/prelims-test': { title: 'Prelims Test', icon: <ClipboardList className="w-5 h-5" /> },
    '/test-history': { title: 'Test History', icon: <History className="w-5 h-5" /> },
    '/meeting': { title: 'Live Meeting', icon: <Video className="w-5 h-5" /> },
    '/profile': { title: 'Profile', icon: <User className="w-5 h-5" /> },
    '/student-profiler': { title: 'Student Profiler', icon: <User className="w-5 h-5" /> },
    '/help-support': { title: 'Help & Support', icon: <HelpCircle className="w-5 h-5" /> },
    '/mains-evaluation': { title: 'Mains Evaluation', icon: <FileText className="w-5 h-5" /> },
  };
  
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const isCopyEvaluationPage = location.pathname === '/copy-evaluation';
  const pageInfo = getPageTitle(location.pathname);

  return (
    <div
      className={`min-h-screen h-screen flex overflow-hidden ${
        theme === "dark" ? "bg-[#020012] text-slate-50" : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Fixed Sidebar - Desktop & Mobile */}
      <aside
        className={`${sidebarCollapsed ? "w-20" : "w-64"} flex flex-col border-r backdrop-blur-xl fixed left-0 top-0 bottom-0 z-50 transition-all duration-300 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 ${
          theme === "dark"
            ? "border-purple-900/60 bg-gradient-to-r from-[#050016]/95 via-[#06021a]/95 to-[#020617]/95"
            : "border-slate-200 bg-white/95"
        }`}
      >
<div className={`${sidebarCollapsed ? "px-3" : "px-6"} h-[73px] border-b flex items-center ${sidebarCollapsed ? "justify-center" : "justify-between"} flex-shrink-0 relative ${theme === "dark" ? "border-purple-900/60" : "border-slate-200"}`}>
  {!sidebarCollapsed && (
    <div className="flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-fuchsia-500 to-emerald-400 shadow-[0_0_24px_rgba(168,85,247,0.7)] flex-shrink-0">
        <span className="text-sm font-semibold text-black">∞</span>
      </div>
      <span className={`text-base font-semibold tracking-tight ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
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
      className={`hidden md:flex p-1.5 rounded-lg transition-colors ${
        theme === "dark" 
          ? "hover:bg-slate-800 text-slate-200" 
          : "hover:bg-slate-100 text-slate-700"
      }`}
      title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
    </button>
    <button
      onClick={() => setMobileMenuOpen(false)}
      className="md:hidden p-1 hover:bg-slate-800 rounded"
    >
      <X className="w-5 h-5" />
    </button>
  </div>
</div>
        <nav className={`${sidebarCollapsed ? "px-2" : "px-4"} py-4 space-y-2 flex-1 overflow-y-auto scroll-smooth scrollbar-hide`} onClick={() => setMobileMenuOpen(false)}>

          {/* Main Section */}
          <div className="space-y-1">
            <NavLink to="/home" className={(props) => navLinkClass({ ...props, theme, collapsed: sidebarCollapsed })} title="Home">
              <Home className="w-4 h-4 flex-shrink-0" />
              {!sidebarCollapsed && <span>Home</span>}
            </NavLink>
          </div>

          {/* Performance & Analytics Section */}
          {!sidebarCollapsed && (
            <div className="pt-4 pb-2">
              <div className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
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
              <FileText className="w-4 h-4 flex-shrink-0" />
              {!sidebarCollapsed && <span>Copy Evaluation</span>}
            </NavLink>
            <NavLink to="/evaluation-history" className={(props) => navLinkClass({ ...props, theme, collapsed: sidebarCollapsed })} title="Evaluation History">
              <History className="w-4 h-4 flex-shrink-0" />
              {!sidebarCollapsed && <span>Evaluation History</span>}
            </NavLink>
          </div>

          {/* Practice & Tests Section */}
          {!sidebarCollapsed && (
            <div className="pt-4 pb-2">
              <div className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Practice & Tests
              </div>
            </div>
          )}
          <div className="space-y-1">
            <NavLink to="/prelims-test" className={(props) => navLinkClass({ ...props, theme, collapsed: sidebarCollapsed })} title="Prelims Test">
              <ClipboardList className="w-4 h-4 flex-shrink-0" />
              {!sidebarCollapsed && <span>Prelims Test</span>}
            </NavLink>
            <NavLink to="/test-history" className={(props) => navLinkClass({ ...props, theme, collapsed: sidebarCollapsed })} title="Test History">
              <History className="w-4 h-4 flex-shrink-0" />
              {!sidebarCollapsed && <span>Test History</span>}
            </NavLink>
          </div>

          {/* Study Tools Section */}
          {!sidebarCollapsed && (
            <div className="pt-4 pb-2">
              <div className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Study Tools
              </div>
            </div>
          )}
          <div className="space-y-1">
            <NavLink to="/planner" className={(props) => navLinkClass({ ...props, theme, collapsed: sidebarCollapsed })} title="Study Planner">
              <CalendarClock className="w-4 h-4 flex-shrink-0" />
              {!sidebarCollapsed && <span>Study Planner</span>}
            </NavLink>
            <NavLink to="/mentor" className={(props) => navLinkClass({ ...props, theme, collapsed: sidebarCollapsed })} title="AI Mentor">
              <MessageCircle className="w-4 h-4 flex-shrink-0" />
              {!sidebarCollapsed && <span>AI Mentor</span>}
            </NavLink>
          </div>

          {/* Communication Section */}
          {!sidebarCollapsed && (
            <div className="pt-4 pb-2">
              <div className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Communication
              </div>
            </div>
          )}
          <div className="space-y-1">
            <NavLink to="/meeting" className={(props) => navLinkClass({ ...props, theme, collapsed: sidebarCollapsed })} title="Live Meeting">
              <Video className="w-4 h-4 flex-shrink-0" />
              {!sidebarCollapsed && <span>Live Meeting</span>}
            </NavLink>
          </div>
        </nav>
        
        {/* Bottom Actions Section */}
        <div className={`${sidebarCollapsed ? "px-2" : "px-4"} py-4 border-t flex-shrink-0 ${theme === "dark" ? "border-purple-900/80" : "border-slate-200"}`}>
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
              className={`w-full flex items-center ${sidebarCollapsed ? "justify-center" : "gap-3"} ${sidebarCollapsed ? "px-2" : "px-3"} py-2 rounded-lg text-sm font-medium transition-colors ${
                theme === "dark"
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
      
      {/* Main content area with margin for fixed sidebar */}
      <div className={`flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300 ${sidebarCollapsed ? "md:ml-20" : "md:ml-64"}`}>
        {/* Fixed Header */}
        <header
          className={`h-[73px] flex items-center justify-between px-4 md:px-8 border-b backdrop-blur-xl sticky top-0 z-30 ${
            theme === "dark"
              ? "border-purple-900/60 bg-gradient-to-r from-[#050016]/95 via-[#06021a]/95 to-[#020617]/95"
              : "border-slate-200 bg-white/95"
          }`}
        >
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className={`md:hidden p-2 rounded-lg transition-colors ${
                theme === "dark" 
                  ? "hover:bg-slate-800 text-slate-200" 
                  : "hover:bg-slate-100 text-slate-700"
              }`}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className={`hidden md:flex items-center gap-3 ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
              <div className={`p-2 rounded-lg ${
                theme === "dark" ? "bg-purple-900/30" : "bg-purple-100"
              }`}>
                {pageInfo.icon}
              </div>
              <h1 className="text-xl font-bold tracking-tight">{pageInfo.title}</h1>
            </div>
            <div className={`text-base font-semibold tracking-tight md:hidden ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
              UPSC Mentor
            </div>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <button
              onClick={toggleTheme}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
                theme === "dark"
                  ? "border-purple-700/60 bg-black/30 text-slate-200 hover:bg-purple-950/60"
                  : "border-purple-300 bg-white text-purple-700 hover:bg-purple-50"
              }`}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className={`hidden md:flex items-center gap-3 ${theme === "dark" ? "text-slate-300" : "text-slate-900"}`}>
              <div className="flex flex-col text-right text-xs mr-2">
                <span className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                  Daily discipline beats motivation
                </span>
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                theme === "dark"
                  ? "bg-gradient-to-br from-purple-600 to-indigo-600 text-white"
                  : "bg-gradient-to-br from-purple-100 to-indigo-100 text-purple-700"
              }`}>
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </div>
            </div>
          </div>
        </header>
        
        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto scroll-smooth scrollbar-hide px-4 md:px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
