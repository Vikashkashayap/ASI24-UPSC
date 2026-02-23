import React, { useState } from "react";
import { Outlet, NavLink, useParams, useLocation } from "react-router-dom";
import { useASI24Auth } from "../hooks/useASI24Auth";
import {
  Home,
  BarChart3,
  FileText,
  ClipboardList,
  Target,
  CalendarClock,
  MessageCircle,
  Settings,
  HelpCircle,
  LogOut,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import { isValidExamSlug } from "../constants/exams";

const getPageTitle = (pathname: string): { title: string; icon: React.ReactNode } => {
  if (pathname.endsWith("/dashboard") || pathname.endsWith("/dashboard/"))
    return { title: "Home", icon: <Home className="w-5 h-5" /> };
  if (pathname.includes("/performance")) return { title: "Performance Dashboard", icon: <BarChart3 className="w-5 h-5" /> };
  if (pathname.includes("/mock-tests")) return { title: "Mock Tests", icon: <Target className="w-5 h-5" /> };
  if (pathname.includes("/pyq")) return { title: "Previous Year Papers", icon: <FileText className="w-5 h-5" /> };
  if (pathname.includes("/ai-tests")) return { title: "AI Test Generator", icon: <ClipboardList className="w-5 h-5" /> };
  if (pathname.includes("/profile")) return { title: "Settings", icon: <Settings className="w-5 h-5" /> };
  if (pathname.includes("/help-support")) return { title: "Help & Support", icon: <HelpCircle className="w-5 h-5" /> };
  if (pathname.includes("/planner")) return { title: "Study Planner", icon: <CalendarClock className="w-5 h-5" /> };
  if (pathname.includes("/mentor")) return { title: "AI Mentor", icon: <MessageCircle className="w-5 h-5" /> };
  if (pathname.includes("/copy-evaluation")) return { title: "Copy Evaluation", icon: <FileText className="w-5 h-5" /> };
  return { title: "Dashboard", icon: <Home className="w-5 h-5" /> };
};

const navLinkClass = ({
  isActive,
  collapsed,
  theme: t,
}: {
  isActive: boolean;
  collapsed?: boolean;
  theme?: "dark" | "light";
}) => {
  const theme = t || "dark";
  return `flex items-center ${collapsed ? "justify-center" : "gap-2 md:gap-3"} ${collapsed ? "px-2" : "px-2 md:px-3"} py-2.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 min-h-[44px] touch-manipulation relative active:scale-95 ${
    theme === "dark" ? "hover:bg-slate-800/80" : "hover:bg-slate-100"
  } ${
    isActive
      ? theme === "dark"
        ? "bg-fuchsia-500/20 text-fuchsia-200 shadow-sm shadow-fuchsia-500/10"
        : "bg-purple-100 text-purple-700 shadow-sm"
      : theme === "dark"
        ? "text-slate-300"
        : "text-slate-700"
  }`;
};

export function ASI24ExamLayout() {
  const { examSlug } = useParams<{ examSlug: string }>();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { student, logout } = useASI24Auth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pageInfo = getPageTitle(location.pathname);

  if (!examSlug || !isValidExamSlug(examSlug)) return null;

  const base = `/${examSlug}/dashboard`;

  return (
    <div className={`dashboard-scroll min-h-screen h-screen flex overflow-hidden overflow-x-hidden ${theme === "dark" ? "asi24-gradient" : "bg-slate-50 text-slate-900"}`}>
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`${sidebarCollapsed ? "w-16 md:w-20" : "w-[280px] md:w-64"} flex flex-col border-r backdrop-blur-xl fixed left-0 top-0 bottom-0 z-50 transition-all duration-300 shadow-lg ${theme === "dark" ? "border-purple-900/60 bg-gradient-to-r from-[#050016]/95 via-[#06021a]/95 to-[#020617]/95 shadow-purple-900/20" : "border-slate-200 bg-white/95 shadow-slate-200/50"} ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <div
          className={`${sidebarCollapsed ? "px-2 md:px-3" : "px-4 md:px-6"} h-14 md:h-[72px] border-b border-purple-900/60 flex items-center ${sidebarCollapsed ? "justify-center" : "justify-between"} gap-1.5 flex-shrink-0`}
        >
          {!sidebarCollapsed && (
            <span className="text-lg font-extrabold tracking-wide bg-gradient-to-r from-fuchsia-300 via-fuchsia-400 to-purple-400 bg-clip-text text-transparent">
              UPSCRH
            </span>
          )}
          {sidebarCollapsed && (
            <span className="text-sm font-bold text-fuchsia-400">U</span>
          )}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden md:flex items-center justify-center w-9 h-9 rounded-lg transition-colors hover:bg-slate-800 text-slate-200"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg hover:bg-slate-800 text-slate-200"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <nav
          className={`${sidebarCollapsed ? "px-2" : "px-2 md:px-4"} py-3 md:py-4 space-y-1 md:space-y-2 flex-1 overflow-y-auto scroll-smooth scrollbar-hide`}
          onClick={() => setMobileMenuOpen(false)}
        >
          <div className="space-y-1">
            <NavLink
              to={base}
              end
              className={(props) =>
                navLinkClass({ ...props, collapsed: sidebarCollapsed, theme })
              }
              title="Home"
            >
              <Home className="w-4 h-4 flex-shrink-0" />
              {!sidebarCollapsed && <span>Home</span>}
            </NavLink>
          </div>

          {!sidebarCollapsed && (
            <div className="pt-3 md:pt-4 pb-1 md:pb-2">
              <div className="px-2 md:px-3 text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Performance & Analytics
              </div>
            </div>
          )}
          <div className="space-y-1">
            <NavLink
              to={`${base}/performance`}
              className={(props) =>
                navLinkClass({ ...props, collapsed: sidebarCollapsed, theme })
              }
              title="Performance Dashboard"
            >
              <BarChart3 className="w-4 h-4 flex-shrink-0" />
              {!sidebarCollapsed && <span>Performance Dashboard</span>}
            </NavLink>
            <NavLink
              to={`${base}/copy-evaluation`}
              className={(props) =>
                navLinkClass({ ...props, collapsed: sidebarCollapsed, theme })
              }
              title="Copy Evaluation"
            >
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
            <NavLink
              to={`${base}/mock-tests`}
              className={(props) =>
                navLinkClass({ ...props, collapsed: sidebarCollapsed, theme })
              }
              title="Mock Tests"
            >
              <Target className="w-4 h-4 flex-shrink-0" />
              {!sidebarCollapsed && <span>Mock Tests</span>}
            </NavLink>
          </div>

          {!sidebarCollapsed && (
            <div className="pt-3 md:pt-4 pb-1 md:pb-2">
              <div className="px-2 md:px-3 text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Practice & Tests
              </div>
            </div>
          )}
          <div className="space-y-1">
            <NavLink
              to={`${base}/ai-tests`}
              className={(props) =>
                navLinkClass({ ...props, collapsed: sidebarCollapsed, theme })
              }
              title="AI Test Generator"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2 md:gap-3">
                  <ClipboardList className="w-4 h-4 flex-shrink-0" />
                  {!sidebarCollapsed && <span>AI Test Generator</span>}
                </div>
                {!sidebarCollapsed && (
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ml-2 whitespace-nowrap uppercase tracking-tighter">
                    Live
                  </span>
                )}
              </div>
            </NavLink>
            <NavLink
              to={`${base}/pyq`}
              className={(props) =>
                navLinkClass({ ...props, collapsed: sidebarCollapsed, theme })
              }
              title="Previous Year Papers"
            >
              <FileText className="w-4 h-4 flex-shrink-0" />
              {!sidebarCollapsed && <span>Previous Year Papers</span>}
            </NavLink>
          </div>

          {!sidebarCollapsed && (
            <div className="pt-3 md:pt-4 pb-1 md:pb-2">
              <div className="px-2 md:px-3 text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Study Tools
              </div>
            </div>
          )}
          <div className="space-y-1">
            <NavLink
              to={`${base}/planner`}
              className={(props) =>
                navLinkClass({ ...props, collapsed: sidebarCollapsed, theme })
              }
              title="Study Planner"
            >
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
            <NavLink
              to={`${base}/mentor`}
              className={(props) =>
                navLinkClass({ ...props, collapsed: sidebarCollapsed, theme })
              }
              title="AI Mentor"
            >
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
        </nav>

        <div
          className={`${sidebarCollapsed ? "px-2" : "px-2 md:px-4"} py-3 md:py-4 border-t flex-shrink-0 ${theme === "dark" ? "border-purple-900/80" : "border-slate-200"}`}
        >
          <div className="space-y-1">
            <NavLink
              to={`${base}/profile`}
              className={(props) =>
                navLinkClass({ ...props, collapsed: sidebarCollapsed, theme })
              }
              title="Settings"
            >
              <Settings className="w-4 h-4 flex-shrink-0" />
              {!sidebarCollapsed && <span>Settings</span>}
            </NavLink>
            <NavLink
              to={`${base}/help-support`}
              className={(props) =>
                navLinkClass({ ...props, collapsed: sidebarCollapsed, theme })
              }
              title="Help & Support"
            >
              <HelpCircle className="w-4 h-4 flex-shrink-0" />
              {!sidebarCollapsed && <span>Help & Support</span>}
            </NavLink>
            <button
              onClick={logout}
              className={`w-full flex items-center gap-2 md:gap-3 px-2 md:px-3 py-2.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-colors min-h-[44px] touch-manipulation ${theme === "dark" ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-100 text-slate-700"}`}
              title="Logout"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              {!sidebarCollapsed && <span>Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      <div
        className={`flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300 ${sidebarCollapsed ? "md:ml-16 lg:ml-20" : "md:ml-[280px] lg:ml-64"}`}
      >
        <header className={`h-14 md:h-[72px] flex items-center justify-between gap-3 px-3 md:px-4 lg:px-6 border-b backdrop-blur-xl sticky top-0 z-30 shadow-sm ${theme === "dark" ? "border-purple-900/60 bg-gradient-to-r from-[#050016]/95 via-[#06021a]/95 to-[#020617]/95 shadow-purple-900/20" : "border-slate-200 bg-white/95 shadow-slate-200/50"}`}>
          <div className="flex items-center gap-1.5 md:gap-2 min-w-0 flex-1">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden shrink-0 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-200"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className={`hidden md:flex items-center gap-2 px-3 py-2 rounded-xl min-h-[40px] ${theme === "dark" ? "bg-purple-900/40 ring-1 ring-purple-600/50 text-slate-50" : "bg-purple-100 ring-1 ring-purple-200 text-slate-900"}`}>
              <span className="flex items-center justify-center w-5 h-5 shrink-0 [&>svg]:w-5 [&>svg]:h-5">
                {pageInfo.icon}
              </span>
              <h1 className="text-sm md:text-base font-semibold tracking-tight truncate">
                {pageInfo.title}
              </h1>
            </div>
            <div className={`text-sm md:text-base font-semibold tracking-tight md:hidden truncate ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
              UPSCRH
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-purple-600/50 bg-black/30 text-slate-200 hover:bg-purple-900/40 transition"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <span className="hidden sm:inline text-xs text-slate-400 max-w-[120px] truncate">
              {student?.email}
            </span>
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs md:text-sm font-semibold bg-gradient-to-br from-purple-600 to-indigo-600 text-white ring-2 ring-purple-500/30">
              {student?.name?.charAt(0).toUpperCase() || "S"}
            </div>
          </div>
        </header>

        <main className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden scroll-smooth scrollbar-hide">
          <div className="w-full min-h-full px-3 md:px-4 lg:px-8 py-4 md:py-6 pb-20 md:pb-6">
            <Outlet />
          </div>
        </main>

        {/* Mobile bottom nav */}
        <nav className={`fixed bottom-0 left-0 right-0 z-50 md:hidden border-t py-1 pb-safe ${theme === "dark" ? "border-purple-900/40 bg-gradient-to-t from-[#050016]/98 via-[#06021a]/95 to-[#020617]/95 shadow-purple-900/30" : "border-slate-200 bg-white/98 shadow-slate-200/40"}`}>
          <div className="grid grid-cols-4 h-12 gap-0 px-1">
            <NavLink
              to={base}
              end
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 rounded-lg transition-all ${isActive ? "text-fuchsia-300" : "text-slate-400"}`
              }
            >
              <Home className="w-5 h-5" />
              <span className="text-[9px] font-medium">Home</span>
            </NavLink>
            <NavLink
              to={`${base}/performance`}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 rounded-lg transition-all ${isActive ? "text-fuchsia-300" : "text-slate-400"}`
              }
            >
              <BarChart3 className="w-5 h-5" />
              <span className="text-[9px] font-medium">Performance</span>
            </NavLink>
            <NavLink
              to={`${base}/ai-tests`}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 rounded-lg transition-all ${isActive ? "text-fuchsia-300" : "text-slate-400"}`
              }
            >
              <ClipboardList className="w-5 h-5" />
              <span className="text-[9px] font-medium">AI Tests</span>
            </NavLink>
            <NavLink
              to={`${base}/mock-tests`}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 rounded-lg transition-all ${isActive ? "text-fuchsia-300" : "text-slate-400"}`
              }
            >
              <Target className="w-5 h-5" />
              <span className="text-[9px] font-medium">Mocks</span>
            </NavLink>
          </div>
        </nav>
      </div>
    </div>
  );
}
