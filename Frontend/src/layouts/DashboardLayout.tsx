import { Outlet, NavLink } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { LayoutDashboard, PenLine, LineChart, CalendarClock, MessageCircle, MessageSquare, FileText, Video, Sun, Moon, Menu, X } from "lucide-react";
import { useState } from "react";

const navLinkClass = ({ isActive, theme }: { isActive: boolean; theme: "dark" | "light" }) =>
  `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
    theme === "dark"
      ? `hover:bg-slate-800 hover:text-slate-100 ${
          isActive ? "bg-fuchsia-500/20 text-fuchsia-200" : "text-slate-300"
        }`
      : `hover:bg-slate-100 hover:text-slate-900 ${
          isActive ? "bg-purple-100 text-purple-700" : "text-slate-700"
        }`
  }`;

export const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        className={`w-64 flex-col border-r backdrop-blur-xl fixed left-0 top-0 bottom-0 z-50 transition-transform duration-300 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 md:flex ${
          theme === "dark"
            ? "border-purple-900 bg-gradient-to-b from-[#050015] via-[#020012] to-black"
            : "border-slate-200 bg-white/80"
        }`}
      >
        <div className={`px-6 py-6 border-b flex items-center justify-between ${theme === "dark" ? "border-purple-900/80" : "border-slate-200"}`}>
          <div>
            <div className={`text-lg font-semibold tracking-tight ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>UPSC Mentor</div>
            <div className={`mt-1 text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>AI-powered mains answer lab</div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-1 hover:bg-slate-800 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto" onClick={() => setMobileMenuOpen(false)}>
          <NavLink to="/dashboard" className={(props) => navLinkClass({ ...props, theme })}>
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/write" className={(props) => navLinkClass({ ...props, theme })}>
            <PenLine className="w-4 h-4" />
            <span>Write Answer</span>
          </NavLink>
          <NavLink to="/performance" className={(props) => navLinkClass({ ...props, theme })}>
            <LineChart className="w-4 h-4" />
            <span>Performance</span>
          </NavLink>
          <NavLink to="/planner" className={(props) => navLinkClass({ ...props, theme })}>
            <CalendarClock className="w-4 h-4" />
            <span>Study Planner</span>
          </NavLink>
          <NavLink to="/mentor" className={(props) => navLinkClass({ ...props, theme })}>
            <MessageCircle className="w-4 h-4" />
            <span>AI Mentor</span>
          </NavLink>
          <NavLink to="/chatbot" className={(props) => navLinkClass({ ...props, theme })}>
            <MessageSquare className="w-4 h-4" />
            <span>AI Chatbot</span>
          </NavLink>
          <NavLink to="/copy-evaluation" className={(props) => navLinkClass({ ...props, theme })}>
            <FileText className="w-4 h-4" />
            <span>Copy Evaluation</span>
          </NavLink>
          <NavLink to="/meeting" className={(props) => navLinkClass({ ...props, theme })}>
            <Video className="w-4 h-4" />
            <span>Live Meeting</span>
          </NavLink>
        </nav>
        <div className={`px-4 py-4 border-t text-xs space-y-1 ${theme === "dark" ? "border-purple-900/80 text-slate-400" : "border-slate-200 text-slate-600"}`}>
          <div className={`font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-900"}`}>{user?.name}</div>
          <div className={`truncate ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>{user?.email}</div>
          <button
            onClick={logout}
            className={`mt-2 inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              theme === "dark"
                ? "border-purple-700/80 text-slate-200 hover:bg-purple-950/50"
                : "border-purple-300 text-purple-700 hover:bg-purple-50"
            }`}
          >
            Logout
          </button>
        </div>
      </aside>
      
      {/* Main content area with margin for fixed sidebar */}
      <div className="flex-1 flex flex-col md:ml-64 h-screen overflow-hidden">
        {/* Fixed Header */}
        <header
          className={`flex items-center justify-between px-4 md:px-8 py-4 border-b backdrop-blur-xl sticky top-0 z-30 ${
            theme === "dark"
              ? "border-purple-900 bg-[#050015]/80"
              : "border-slate-200 bg-white/80"
          }`}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className={`md:hidden p-2 rounded-lg ${
                theme === "dark" ? "hover:bg-slate-800" : "hover:bg-slate-100"
              }`}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className={`text-base font-semibold tracking-tight md:hidden ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>UPSC Mentor</div>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={toggleTheme}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs transition-colors md:mr-4 ${
                theme === "dark"
                  ? "border-purple-700/60 bg-black/30 text-slate-200 hover:bg-purple-950/60"
                  : "border-purple-300 bg-white text-purple-700 hover:bg-purple-50"
              }`}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className={`hidden md:flex flex-col text-right text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
              <span className={`font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-900"}`}>{user?.name}</span>
              <span>Daily discipline beats motivation</span>
            </div>
          </div>
        </header>
        
        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
