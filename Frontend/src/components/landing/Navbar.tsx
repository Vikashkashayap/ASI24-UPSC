import { Link, NavLink, useLocation } from "react-router-dom";
import { Button } from "../ui/button";
import { useTheme } from "../../hooks/useTheme";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import logoImg from "../../LOGO/mentorsdaily.png";

const navItems: { label: string; to: string; external?: boolean }[] = [
  { label: "Features", to: "/features" },
  { label: "Plans", to: "/pricing" },
  { label: "UPSC Notes", to: "https://notes.mentorsdaily.com/", external: true },
  { label: "Compare", to: "/compare" },
  { label: "Current Affairs", to: "/daily-current-affairs" },
  { label: "Testimonials", to: "/testimonials" },
  { label: "Download App", to: "/download" },
  { label: "About", to: "/about" },
];

const AUTH_PATHS = new Set(["/login", "/register", "/forgot-password", "/change-password"]);

export const LandingNavbar = () => {
  const { theme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isAuthPage = AUTH_PATHS.has(location.pathname);
  const isLoginPage = location.pathname === "/login";
  const authCtaTo = isLoginPage ? "/register" : "/login";
  const authCtaLabel = isLoginPage ? "Sign up" : "Sign in";
  const authCtaVariant = isLoginPage ? "outline" : "primary";

  // Auth pages use dark chrome to match login/register shells
  const darkChrome = theme === "dark" || isAuthPage;

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <div
        className={`relative border-b backdrop-blur-xl pt-[env(safe-area-inset-top,0px)] ${
          darkChrome
            ? "border-blue-400/20 bg-[#0b1f45]/95"
            : "border-slate-200 bg-white/95"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-2.5 sm:gap-4 sm:px-6 sm:py-3">
          <Link to="/" className="flex min-w-0 shrink-0 select-none items-center" aria-label="MentorsDaily Home">
            <img
              src={logoImg}
              alt="MentorsDaily"
              className="h-8 w-auto max-w-[160px] object-contain object-left sm:h-9 md:h-10 md:max-w-none"
              decoding="async"
            />
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
            {navItems.map((item) =>
              item.external ? (
                <a
                  key={item.label}
                  href={item.to}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group relative transition duration-300 ${
                    darkChrome
                      ? "text-slate-400 hover:text-slate-200"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <span>{item.label}</span>
                  <span className="absolute left-0 -bottom-1 h-[2px] w-full origin-left scale-x-0 bg-[#2563eb] transition-transform duration-300 group-hover:scale-x-100" />
                </a>
              ) : (
                <NavLink
                  key={item.label}
                  to={item.to}
                  className={({ isActive }) =>
                    `group relative transition duration-300 ${
                      isActive
                        ? "text-[#2563eb]"
                        : darkChrome
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
              )
            )}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link to={authCtaTo} className="hidden md:block">
              <Button className="rounded-lg px-6" variant={authCtaVariant}>
                {authCtaLabel}
              </Button>
            </Link>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className={`app-chrome-btn flex h-10 w-10 items-center justify-center rounded-lg border-2 transition md:hidden ${
                darkChrome
                  ? "border-blue-400/50 text-slate-200 hover:bg-blue-900/30"
                  : "border-[#2563eb]/50 text-slate-600 hover:bg-blue-50"
              }`}
              aria-label="Open menu"
              aria-expanded={mobileMenuOpen}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className={`fixed inset-y-0 right-0 z-50 flex h-[100dvh] w-[min(18rem,85vw)] flex-col border-l shadow-2xl md:hidden ${
              darkChrome ? "border-blue-400/20 bg-[#0b1f45]" : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-center justify-between border-b px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] dark:border-slate-800">
              <img
                src={logoImg}
                alt=""
                className="h-7 w-auto max-w-[140px] object-contain object-left"
                aria-hidden
              />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className={`app-chrome-btn flex h-10 w-10 items-center justify-center rounded-lg border-2 transition ${
                  darkChrome
                    ? "border-blue-400/50 text-slate-200 hover:bg-blue-900/30"
                    : "border-[#2563eb]/50 text-slate-600 hover:bg-blue-50"
                }`}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-4">
              {navItems.map((item) =>
                item.external ? (
                  <a
                    key={item.label}
                    href={item.to}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`min-h-11 rounded-lg px-3 py-2.5 text-base font-medium transition ${
                      darkChrome
                        ? "text-slate-300 hover:bg-slate-800/80"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {item.label}
                  </a>
                ) : (
                  <NavLink
                    key={item.label}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `min-h-11 rounded-lg px-3 py-2.5 text-base font-medium transition ${
                        isActive
                          ? "bg-blue-50 font-semibold text-[#2563eb] dark:bg-blue-950/40"
                          : darkChrome
                            ? "text-slate-300 hover:bg-slate-800/80"
                            : "text-slate-700 hover:bg-slate-50"
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                )
              )}
            </nav>

            <div className="border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-slate-800">
              <Link to={authCtaTo} onClick={() => setMobileMenuOpen(false)} className="block">
                <Button className="w-full rounded-lg px-6" variant={authCtaVariant}>
                  {authCtaLabel}
                </Button>
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  );
};
