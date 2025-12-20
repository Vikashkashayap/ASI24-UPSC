import { Link, NavLink } from "react-router-dom";
import { Button } from "../ui/button";
import { useTheme } from "../../hooks/useTheme";
import { Sun, Moon, Menu, X } from "lucide-react";
import { useState } from "react";

const navItems = [
  { label: "Home", to: "/" },
  { label: "Features", to: "/#features" },
  { label: "Pricing", to: "/#pricing" },
  { label: "Compare", to: "/#compare" },
  { label: "Testimonials", to: "/#testimonials" },
  { label: "About", to: "/#about" },
];

export const LandingNavbar = () => {
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  return (
    <>
    {/* Mobile Menu Overlay */}
    {mobileMenuOpen && (
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
        onClick={() => setMobileMenuOpen(false)}
      />
    )}

    {/* Mobile Menu */}
    <div
      className={`fixed top-0 right-0 h-full w-64 z-50 transition-transform duration-300 ${
        mobileMenuOpen ? "translate-x-0" : "translate-x-full"
      } md:hidden ${
        theme === "dark"
          ? "bg-gradient-to-b from-[#050015] via-[#020012] to-black border-l border-purple-900"
          : "bg-white border-l border-slate-200"
      }`}
    >
      <div className="flex flex-col h-full">
        <div className={`flex items-center justify-between p-4 border-b ${
          theme === "dark" ? "border-purple-900" : "border-slate-200"
        }`}>
          <span className={`text-sm font-semibold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
            Menu
          </span>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-1 hover:bg-slate-800 rounded"
          >
            <X className="w-5 h-5" />
          </button>

        </div>
        <nav className={`flex-1 px-4 py-4 space-y-2 ${
          theme === "dark" ? "text-slate-300" : "text-slate-600"
        }`}>
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  theme === "dark"
                    ? `hover:bg-slate-800 ${isActive ? "bg-fuchsia-500/20 text-fuchsia-200" : "text-slate-300"}`
                    : `hover:bg-slate-100 ${isActive ? "bg-purple-100 text-purple-700" : "text-slate-700"}`
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className={`p-4 border-t space-y-2 ${
          theme === "dark" ? "border-purple-900" : "border-slate-200"
        }`}>
          <Link to="/login" className="block" onClick={() => setMobileMenuOpen(false)}>
            <Button
              variant="ghost"
              className={`w-full h-10 rounded-full border text-xs font-semibold transition-colors ${
                theme === "dark"
                  ? "border-purple-700/70 bg-transparent text-slate-50 hover:bg-purple-950/60"
                  : "border-purple-300 bg-transparent text-purple-700 hover:bg-purple-50"
              }`}
            >
              Sign in
            </Button>
          </Link>
          <Link to="/register" className="block" onClick={() => setMobileMenuOpen(false)}>
            <Button className="w-full h-10 rounded-full bg-gradient-to-r from-fuchsia-500 to-emerald-400 text-xs font-semibold text-slate-950 shadow-lg hover:from-fuchsia-400 hover:to-emerald-300">
              Get started
            </Button>
          </Link>
        </div>
      </div>
    </div>

    <header className={`sticky top-0 z-30 border-b backdrop-blur-xl transition-colors ${
      theme === "dark" 
        ? "border-purple-900/60 bg-gradient-to-r from-[#050016]/95 via-[#06021a]/95 to-[#020617]/95" 
        : "border-slate-200 bg-white/95"
    }`}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-6 w-6 md:h-7 md:w-7 items-center justify-center rounded-full bg-gradient-to-tr from-fuchsia-500 to-emerald-400 shadow-[0_0_24px_rgba(168,85,247,0.7)]">
            <span className="text-xs md:text-sm font-semibold text-black">∞</span>
          </div>
          <span className={`text-xs md:text-sm font-semibold tracking-tight ${
            theme === "dark" ? "text-slate-50" : "text-slate-900"
          }`}>
            UPSC<span className={theme === "dark" ? "text-fuchsia-300" : "text-fuchsia-600"}> Mentor</span>
          </span>
        </Link>

        <nav className={`hidden items-center gap-7 text-xs font-medium md:flex ${
          theme === "dark" ? "text-slate-300" : "text-slate-600"
        }`}>
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) =>
                `relative transition-colors ${
                  theme === "dark"
                    ? `hover:text-slate-50 ${isActive ? "text-slate-50" : "text-slate-400"}`
                    : `hover:text-slate-900 ${isActive ? "text-slate-900" : "text-slate-600"}`
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="absolute inset-x-0 -bottom-1 h-0.5 rounded-full bg-gradient-to-r from-fuchsia-400 to-emerald-300" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className={`inline-flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-full border transition-colors ${
              theme === "dark"
                ? "border-purple-700/60 bg-black/30 text-slate-200 hover:bg-purple-950/60"
                : "border-purple-300 bg-white text-purple-700 hover:bg-purple-50"
            }`}
          >
            {theme === "dark" ? <Sun className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <Moon className="w-3.5 h-3.5 md:w-4 md:h-4" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className={`md:hidden inline-flex h-7 w-7 items-center justify-center rounded-full border transition-colors ${
              theme === "dark"
                ? "border-purple-700/60 bg-black/30 text-slate-200 hover:bg-purple-950/60"
                : "border-purple-300 bg-white text-purple-700 hover:bg-purple-50"
            }`}
          >
            <Menu className="w-3.5 h-3.5" />
          </button>
          <Link to="/login" className="hidden md:block">
            <Button
              variant="ghost"
              className={`h-9 rounded-full border px-4 text-xs font-semibold transition-colors ${
                theme === "dark"
                  ? "border-purple-700/70 bg-transparent text-slate-50 hover:bg-purple-950/60"
                  : "border-purple-300 bg-transparent text-purple-700 hover:bg-purple-50"
              }`}
            >
              Sign in
            </Button>
          </Link>
          <Link to="/register" className="hidden xs:block">
            <Button className="h-8 md:h-9 rounded-full bg-gradient-to-r from-fuchsia-500 to-emerald-400 px-3 md:px-4 text-[10px] md:text-xs font-semibold text-slate-950 shadow-[0_0_28px_rgba(52,211,153,0.65)] hover:from-fuchsia-400 hover:to-emerald-300">
              Get started
            </Button>
          </Link>
        </div>
      </div>
    </header>
    </>
  );
  
};


