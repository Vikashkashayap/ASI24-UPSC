import { Link, NavLink } from "react-router-dom";
import { Button } from "../ui/button";
import { useTheme } from "../../hooks/useTheme";
import { Sun, Moon, Menu, X } from "lucide-react";
import { useState } from "react";
import logoImg from "../../LOGO/UPSCRH-LOGO.png";

const navItems = [
  { label: "Features", to: "/features" },
  { label: "Pricing", to: "/pricing" },
  { label: "Compare", to: "/compare" },
  { label: "Testimonials", to: "/testimonials" },
  { label: "About", to: "/about" },
];

export const LandingNavbar = () => {
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50">
        
        {/* Background Glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/30 via-fuchsia-800/20 to-purple-900/30 blur-2xl opacity-60 pointer-events-none" />

        <div
          className={`relative border-b backdrop-blur-xl ${
            theme === "dark"
              ? "border-purple-900/50 bg-[#050016]/80"
              : "border-slate-200 bg-white/80"
          }`}
        >
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">

            {/* 🔥 LOGO + TEXT WRAPPER */}
            <Link to="/" className="flex items-center gap-2 select-none">

              {/* Logo Image */}
              <div className="flex items-center justify-center">
                <img
                  src={logoImg}
                  alt="UPSCRH"
                  className="h-10 md:h-11 w-auto object-contain"
                />
              </div>

              {/* Brand Text - smaller on mobile */}
              <div className="flex items-center">
                <span className="text-sm md:text-xl lg:text-2xl font-extrabold tracking-wide leading-none bg-gradient-to-r from-[#f5d0fe] via-[#e879f9] to-[#9333ea] bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(217,70,239,0.9)]">
                  UPSCRH
                </span>
              </div>
            </Link>

            {/* DESKTOP NAV */}
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
              {navItems.map((item) => (
                <NavLink
                  key={item.label}
                  to={item.to}
                  className={({ isActive }) =>
                    `group relative transition duration-300 ${
                      isActive
                        ? theme === "dark"
                          ? "text-white"
                          : "text-slate-900"
                        : theme === "dark"
                          ? "text-slate-400 hover:text-white"
                          : "text-slate-500 hover:text-slate-900"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span>{item.label}</span>
                      <span
                        className={`absolute left-0 -bottom-1 h-[2px] w-full origin-left scale-x-0 bg-gradient-to-r from-fuchsia-400 to-purple-400 transition-transform duration-300 group-hover:scale-x-100 ${
                          isActive ? "scale-x-100" : ""
                        }`}
                      />
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            {/* RIGHT SIDE */}
            <div className="flex items-center gap-3">

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="h-10 w-10 flex items-center justify-center rounded-full border border-purple-700/50 bg-black/30 text-slate-200 hover:bg-purple-900/40 transition"
              >
                {theme === "dark" ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>

              {/* Sign In Button */}
              <Link to="/login" className="hidden md:block">
                <Button className="rounded-full px-6 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-lg hover:scale-105 transition duration-300">
                  Sign in
                </Button>
              </Link>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden h-10 w-10 flex items-center justify-center rounded-full border border-purple-700/50 bg-black/30 text-slate-200 hover:bg-purple-900/40 transition"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div
            className={`fixed top-0 right-0 z-50 h-full w-72 max-w-[85vw] transform transition-transform duration-300 ease-out md:hidden ${
              mobileMenuOpen ? "translate-x-0" : "translate-x-full"
            } ${theme === "dark" ? "bg-[#0a0020] border-l border-purple-900/50" : "bg-white border-l border-slate-200"}`}
          >
            <div className="flex flex-col h-full p-6 pt-16">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="absolute top-4 right-4 h-10 w-10 flex items-center justify-center rounded-full border border-purple-700/50 bg-black/30 text-slate-200 hover:bg-purple-900/40"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
              <nav className="flex flex-col gap-4">
                {navItems.map((item) => (
                  <NavLink
                    key={item.label}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `py-2 text-base font-medium transition ${
                        isActive
                          ? "text-fuchsia-400"
                          : theme === "dark"
                            ? "text-slate-400 hover:text-white"
                            : "text-slate-600 hover:text-slate-900"
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="mt-6"
              >
                <Button className="w-full rounded-full px-6 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-lg">
                  Sign in
                </Button>
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  );
};