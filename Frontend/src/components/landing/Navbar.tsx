import { Link, NavLink, useLocation } from "react-router-dom";
import { Button } from "../ui/button";
import { useTheme } from "../../hooks/useTheme";
import { Sun, Moon, Menu, X } from "lucide-react";
import { useState } from "react";
import logoImg from "../../LOGO/mentorsdaily.png";

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
  const location = useLocation();
  const isLoginPage = location.pathname === "/login";

  return (
    <>
      <div
          className={`relative border-b backdrop-blur-xl ${
            theme === "dark"
              ? "border-slate-800/50 bg-[#020617]/95"
              : "border-slate-200 bg-white/95"
          }`}
        >
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3 gap-4">

            {/* Logo - left-aligned, same as footer */}
            <Link to="/" className="flex items-center shrink-0 select-none" aria-label="Home">
              <img
                src={logoImg}
                alt="MentorsDaily"
                className="h-9 md:h-10 w-auto object-contain object-left"
              />
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
                        ? "text-[#2563eb]"
                        : theme === "dark"
                          ? "text-slate-400 hover:text-slate-200"
                          : "text-slate-500 hover:text-slate-700"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span>{item.label}</span>
                      <span
                        className={`absolute left-0 -bottom-1 h-[2px] w-full origin-left scale-x-0 bg-[#2563eb] transition-transform duration-300 group-hover:scale-x-100 ${
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
                className={`h-10 w-10 flex items-center justify-center rounded-lg border-2 transition ${
                theme === "dark"
                  ? "border-blue-400/50 text-slate-200 hover:bg-blue-900/30"
                  : "border-[#2563eb]/50 text-slate-600 hover:bg-blue-50"
              }`}
              >
                {theme === "dark" ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>

              {/* Auth CTA: Sign up on login page, Sign in elsewhere */}
              <Link to={isLoginPage ? "/register" : "/login"} className="hidden md:block">
                <Button className="rounded-lg px-6" variant={isLoginPage ? "outline" : "primary"}>
                  {isLoginPage ? "Sign up" : "Sign in"}
                </Button>
              </Link>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className={`md:hidden h-10 w-10 flex items-center justify-center rounded-lg border-2 transition ${
                theme === "dark"
                  ? "border-blue-400/50 text-slate-200 hover:bg-blue-900/30"
                  : "border-[#2563eb]/50 text-slate-600 hover:bg-blue-50"
              }`}
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>

          </div>
        </div>

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
            } ${theme === "dark" ? "bg-[#020617] border-l border-slate-700" : "bg-white border-l border-slate-200"}`}
          >
            <div className="flex flex-col h-full p-6 pt-16">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className={`absolute top-4 right-4 h-10 w-10 flex items-center justify-center rounded-lg border-2 transition ${
                theme === "dark"
                  ? "border-blue-400/50 text-slate-200 hover:bg-blue-900/30"
                  : "border-[#2563eb]/50 text-slate-600 hover:bg-blue-50"
              }`}
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
                          ? "text-[#2563eb] font-semibold"
                          : theme === "dark"
                            ? "text-slate-400 hover:text-slate-200"
                            : "text-slate-600 hover:text-slate-700"
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
              <Link
                to={isLoginPage ? "/register" : "/login"}
                onClick={() => setMobileMenuOpen(false)}
                className="mt-6"
              >
                <Button className="w-full rounded-lg px-6" variant={isLoginPage ? "outline" : "primary"}>
                  {isLoginPage ? "Sign up" : "Sign in"}
                </Button>
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  );
};