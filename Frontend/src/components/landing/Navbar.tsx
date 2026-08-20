import { Link, NavLink, useLocation } from "react-router-dom";
import { Button } from "../ui/button";
import { useTheme } from "../../hooks/useTheme";

import {
  BookOpen,
  ChevronRight,
  ExternalLink,
  Menu,
  Sparkles,
  X,
} from "lucide-react";

import { useEffect, useState } from "react";
import logoImg from "../../LOGO/mentorsdaily.png";

const navItems: {
  label: string;
  to: string;
  external?: boolean;
}[] = [
  { label: "Features", to: "/features" },
  { label: "Plans", to: "/pricing" },
  {
    label: "UPSC Notes",
    to: "https://notes.mentorsdaily.com/",
    external: true,
  },
  { label: "Compare", to: "/compare" },
  { label: "Current Affairs", to: "/daily-current-affairs" },
  { label: "Testimonials", to: "/testimonials" },
  { label: "Download App", to: "/download" },
  { label: "About", to: "/about" },
];

const AUTH_PATHS = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/change-password",
]);

export const LandingNavbar = () => {
  const { theme } = useTheme();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const location = useLocation();

  const isAuthPage = AUTH_PATHS.has(location.pathname);
  const isLoginPage = location.pathname === "/login";

  const authCtaTo = isLoginPage ? "/register" : "/login";
  const authCtaLabel = isLoginPage ? "Create Account" : "Sign In";

  const darkChrome = theme === "dark" || isAuthPage;

  /*
   * ============================================================
   * SCROLL EFFECT
   * ============================================================
   */

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  /*
   * ============================================================
   * CLOSE MOBILE MENU ON ROUTE CHANGE
   * ============================================================
   */

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  /*
   * ============================================================
   * LOCK PAGE SCROLL WHEN MOBILE MENU IS OPEN
   * ============================================================
   */

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const scrollRoot = document.querySelector(
      "[data-landing-scroll]"
    ) as HTMLElement | null;

    const previous = {
      htmlOverflow: document.documentElement.style.overflow,
      bodyOverflow: document.body.style.overflow,
      rootOverflow: scrollRoot?.style.overflow ?? "",
    };

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    if (scrollRoot) {
      scrollRoot.style.overflow = "hidden";
    }

    return () => {
      document.documentElement.style.overflow =
        previous.htmlOverflow;

      document.body.style.overflow = previous.bodyOverflow;

      if (scrollRoot) {
        scrollRoot.style.overflow = previous.rootOverflow;
      }
    };
  }, [mobileMenuOpen]);

  /*
   * ============================================================
   * THEME CLASSES
   * ============================================================
   */

  const navBackground = darkChrome
    ? scrolled
      ? "bg-[#07152f]/95 border-blue-400/20 shadow-[0_10px_40px_rgba(0,0,0,0.25)]"
      : "bg-[#07152f]/80 border-blue-400/15"
    : scrolled
      ? "bg-white/95 border-slate-200/80 shadow-[0_10px_40px_rgba(15,23,42,0.08)]"
      : "bg-white/80 border-slate-200/70";

  const navText = darkChrome
    ? "text-slate-300 hover:text-white"
    : "text-slate-600 hover:text-slate-950";

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <>
      {/* ========================================================
          NAVBAR
      ======================================================== */}

      <header
        className={`sticky top-0 z-[100] w-full border-b backdrop-blur-2xl transition-all duration-300 ${navBackground}`}
      >
        {/* Top gradient line */}

        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600" />

        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:h-[72px] lg:px-8">
          {/* ====================================================
              LOGO
          ==================================================== */}

          <Link
            to="/"
            aria-label="MentorsDaily Home"
            className="group flex shrink-0 items-center"
          >
            <img
              src={logoImg}
              alt="MentorsDaily"
              className="h-9 w-auto max-w-[155px] object-contain object-left transition-transform duration-300 group-hover:scale-[1.02] sm:h-10 sm:max-w-[175px]"
              decoding="async"
            />
          </Link>

          {/* ====================================================
              DESKTOP NAV
          ==================================================== */}

          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) =>
              item.external ? (
                <a
                  key={item.label}
                  href={item.to}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200 ${navText}`}
                >
                  <span>{item.label}</span>

                  <ExternalLink className="h-3 w-3 opacity-40 transition-opacity group-hover:opacity-80" />

                  {/* Active underline */}

                  <span className="absolute bottom-0 left-3 right-3 h-[2px] origin-left scale-x-0 rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-transform duration-300 group-hover:scale-x-100" />
                </a>
              ) : (
                <NavLink
                  key={item.label}
                  to={item.to}
                  className={({ isActive }) =>
                    `group relative flex items-center rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200 ${
                      isActive
                        ? "text-[#2563eb]"
                        : navText
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span>{item.label}</span>

                      <span
                        className={`absolute bottom-0 left-3 right-3 h-[2px] origin-center rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-300 ${
                          isActive
                            ? "scale-x-100 opacity-100"
                            : "scale-x-0 opacity-0 group-hover:scale-x-100 group-hover:opacity-100"
                        }`}
                      />
                    </>
                  )}
                </NavLink>
              )
            )}
          </nav>

          {/* ====================================================
              RIGHT SIDE
          ==================================================== */}

          <div className="flex shrink-0 items-center gap-2">
            {/* Desktop CTA */}

            <Link
              to={authCtaTo}
              className="hidden lg:block"
            >
              <Button
                variant="primary"
                className="group h-10 rounded-xl bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] px-5 text-xs font-bold text-white shadow-[0_8px_20px_rgba(37,99,235,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_25px_rgba(37,99,235,0.30)]"
              >
                {authCtaLabel}

                <ChevronRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>

            {/* Mobile menu button */}

            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-200 lg:hidden ${
                darkChrome
                  ? "border-blue-400/20 bg-blue-500/5 text-slate-200 hover:bg-blue-500/10"
                  : "border-slate-200 bg-white text-slate-700 shadow-sm hover:border-blue-200 hover:bg-blue-50"
              }`}
              aria-label="Open navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ==========================================================
          MOBILE MENU
      ========================================================== */}

      {mobileMenuOpen && (
        <>
          {/* Backdrop */}

          <div
            className="fixed inset-0 z-[110] bg-slate-950/60 backdrop-blur-md lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer */}

          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className={`fixed inset-y-0 right-0 z-[120] flex h-[100dvh] w-[min(370px,88vw)] flex-col border-l shadow-[-20px_0_60px_rgba(0,0,0,0.15)] lg:hidden ${
              darkChrome
                ? "border-blue-400/15 bg-[#07152f]"
                : "border-slate-200 bg-white"
            }`}
          >
            {/* ==================================================
                MOBILE HEADER
            ================================================== */}

            <div
              className={`flex h-[72px] shrink-0 items-center justify-between border-b px-5 ${
                darkChrome
                  ? "border-slate-800/80"
                  : "border-slate-100"
              }`}
            >
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
              >
                <img
                  src={logoImg}
                  alt="MentorsDaily"
                  className="h-9 w-auto max-w-[155px] object-contain object-left"
                />
              </Link>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex h-10 w-10 items-center justify-center rounded-xl border transition ${
                  darkChrome
                    ? "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* ==================================================
                MOBILE PORTAL CARD
            ================================================== */}

            <div className="px-4 pt-4">
              <div
                className={`relative overflow-hidden rounded-2xl border p-4 ${
                  darkChrome
                    ? "border-blue-400/10 bg-gradient-to-br from-blue-600/10 to-cyan-500/5"
                    : "border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-50"
                }`}
              >
                <div className="relative z-10 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/20">
                    <Sparkles className="h-5 w-5" />
                  </div>

                  <div>
                    <p
                      className={`text-xs font-bold ${
                        darkChrome
                          ? "text-white"
                          : "text-slate-900"
                      }`}
                    >
                      AI-Powered UPSC Portal
                    </p>

                    <p
                      className={`mt-0.5 text-[10px] ${
                        darkChrome
                          ? "text-slate-400"
                          : "text-slate-500"
                      }`}
                    >
                      Prepare smarter with MentorsDaily
                    </p>
                  </div>
                </div>

                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-blue-500/10 blur-2xl" />
              </div>
            </div>

            {/* ==================================================
                MOBILE NAV
            ================================================== */}

            <nav className="flex-1 overflow-y-auto px-4 py-4">
              <p
                className={`mb-2 px-2 text-[9px] font-bold uppercase tracking-[0.16em] ${
                  darkChrome
                    ? "text-slate-500"
                    : "text-slate-400"
                }`}
              >
                Explore
              </p>

              <div className="space-y-1">
                {navItems.map((item) =>
                  item.external ? (
                    <a
                      key={item.label}
                      href={item.to}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`group flex min-h-[46px] items-center justify-between rounded-xl px-3.5 text-sm font-medium transition ${
                        darkChrome
                          ? "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                          : "text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            darkChrome
                              ? "bg-slate-600 group-hover:bg-blue-400"
                              : "bg-slate-300 group-hover:bg-blue-500"
                          }`}
                        />

                        {item.label}
                      </span>

                      <ExternalLink className="h-3.5 w-3.5 opacity-40" />
                    </a>
                  ) : (
                    <NavLink
                      key={item.label}
                      to={item.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `group flex min-h-[46px] items-center justify-between rounded-xl px-3.5 text-sm font-medium transition ${
                          isActive
                            ? darkChrome
                              ? "bg-blue-500/10 text-blue-300"
                              : "bg-blue-50 text-blue-700"
                            : darkChrome
                              ? "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                              : "text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span className="flex items-center gap-3">
                            <span
                              className={`h-1.5 w-1.5 rounded-full transition ${
                                isActive
                                  ? "bg-blue-500"
                                  : darkChrome
                                    ? "bg-slate-600"
                                    : "bg-slate-300"
                              }`}
                            />

                            {item.label}
                          </span>

                          <ChevronRight
                            className={`h-4 w-4 transition-transform ${
                              isActive
                                ? "translate-x-0 text-blue-500"
                                : "opacity-20 group-hover:translate-x-0.5 group-hover:opacity-60"
                            }`}
                          />
                        </>
                      )}
                    </NavLink>
                  )
                )}
              </div>
            </nav>

            {/* ==================================================
                MOBILE BOTTOM CTA
            ================================================== */}

            <div
              className={`shrink-0 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))] ${
                darkChrome
                  ? "border-slate-800/80"
                  : "border-slate-100"
              }`}
            >
              <Link
                to={authCtaTo}
                onClick={() => setMobileMenuOpen(false)}
                className="block"
              >
                <Button
                  variant="primary"
                  className="group h-11 w-full rounded-xl bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-sm font-bold text-white shadow-lg shadow-blue-500/20"
                >
                  {authCtaLabel}

                  <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>

              <p
                className={`mt-2 text-center text-[9px] ${
                  darkChrome
                    ? "text-slate-600"
                    : "text-slate-400"
                }`}
              >
                AI-powered preparation • MentorsDaily
              </p>
            </div>
          </aside>
        </>
      )}
    </>
  );
};