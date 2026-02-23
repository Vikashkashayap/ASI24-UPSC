import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { Menu, X, Sun, Moon, ChevronDown } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import { EXAM_SLUGS, EXAM_LABELS, type ExamSlug } from "../../constants/exams";

const navItems = [
  { label: "Features", to: "/#features", id: "features" },
  { label: "Exams", to: "/#exams", id: "exams" },
  { label: "About", to: "/#about", id: "about" },
  { label: "Contact", to: "/#contact", id: "contact" },
];

const getLoginPath = (slug: ExamSlug) => `/${slug}/login`;
const getRegisterPath = (slug: ExamSlug) => `/${slug}/register`;

export function ASI24Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [signInDropdownOpen, setSignInDropdownOpen] = useState(false);
  const [signUpDropdownOpen, setSignUpDropdownOpen] = useState(false);
  const signInRef = useRef<HTMLDivElement>(null);
  const signUpRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (signInRef.current?.contains(e.target as Node) || signUpRef.current?.contains(e.target as Node)) return;
      setSignInDropdownOpen(false);
      setSignUpDropdownOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const handleNavClick = (e: React.MouseEvent, to: string, id: string) => {
    if (location.pathname === "/" && id) {
      e.preventDefault();
      const el = document.getElementById(id);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.replaceState(null, "", `/#${id}`);
      setMobileMenuOpen(false);
    }
  };

  const isDark = theme === "dark";
  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50">
        {isDark && <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-purple-900/30 via-fuchsia-800/20 to-purple-900/30 blur-2xl opacity-60" />}
        <div className={`relative border-b backdrop-blur-xl ${isDark ? "border-purple-900/50 bg-[#050016]/90" : "border-slate-200 bg-white/95"}`}>
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
            <Link to="/" className="flex items-center gap-2 select-none">
              <span className="text-lg font-extrabold tracking-wide md:text-xl bg-gradient-to-r from-fuchsia-300 via-fuchsia-400 to-purple-400 bg-clip-text text-transparent">
                UPSCRH
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={(e) => item.id && handleNavClick(e, item.to, item.id)}
                  className={isDark ? "text-slate-400 transition hover:text-white" : "text-slate-600 transition hover:text-slate-900"}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleTheme}
                className={`hidden md:flex h-10 w-10 items-center justify-center rounded-full border transition ${isDark ? "border-purple-700/50 bg-black/30 text-slate-200 hover:bg-purple-900/40" : "border-purple-300 bg-slate-100 text-purple-700 hover:bg-purple-100"}`}
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <div className="hidden md:block relative" ref={signInRef}>
                <button
                  type="button"
                  onClick={() => { setSignUpDropdownOpen(false); setSignInDropdownOpen((v) => !v); }}
                  className={`inline-flex h-10 items-center justify-center gap-1 rounded-full px-5 text-sm font-medium transition ${isDark ? "border border-purple-600/60 bg-black/40 text-slate-200 hover:bg-purple-950/50" : "border border-purple-300 bg-white text-purple-700 hover:bg-purple-50"}`}
                >
                  Sign in <ChevronDown className="w-4 h-4 opacity-70" />
                </button>
                {signInDropdownOpen && (
                  <div className={`absolute right-0 top-full mt-1 min-w-[180px] rounded-xl border py-1 shadow-lg ${isDark ? "border-purple-800/50 bg-[#0a0020]" : "border-slate-200 bg-white"}`}>
                    {EXAM_SLUGS.map((slug) => (
                      <button
                        key={slug}
                        type="button"
                        onClick={() => { navigate(getLoginPath(slug)); setSignInDropdownOpen(false); }}
                        className={`block w-full text-left px-4 py-2.5 text-sm transition ${isDark ? "text-slate-200 hover:bg-purple-900/50" : "text-slate-700 hover:bg-slate-100"}`}
                      >
                        {EXAM_LABELS[slug]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="hidden md:block relative" ref={signUpRef}>
                <button
                  type="button"
                  onClick={() => { setSignInDropdownOpen(false); setSignUpDropdownOpen((v) => !v); }}
                  className="inline-flex h-10 items-center justify-center gap-1 rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-600 px-5 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 transition hover:from-fuchsia-400 hover:to-violet-500"
                >
                  Start Free Trial <ChevronDown className="w-4 h-4 opacity-90" />
                </button>
                {signUpDropdownOpen && (
                  <div className={`absolute right-0 top-full mt-1 min-w-[180px] rounded-xl border py-1 shadow-lg ${isDark ? "border-purple-800/50 bg-[#0a0020]" : "border-slate-200 bg-white"}`}>
                    {EXAM_SLUGS.map((slug) => (
                      <button
                        key={slug}
                        type="button"
                        onClick={() => { navigate(getRegisterPath(slug)); setSignUpDropdownOpen(false); }}
                        className={`block w-full text-left px-4 py-2.5 text-sm transition ${isDark ? "text-slate-200 hover:bg-purple-900/50" : "text-slate-700 hover:bg-slate-100"}`}
                      >
                        {EXAM_LABELS[slug]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                className={`md:hidden h-10 w-10 flex items-center justify-center rounded-full border transition ${isDark ? "border-purple-700/50 bg-black/30 text-slate-200 hover:bg-purple-900/40" : "border-purple-300 bg-slate-100 text-purple-700"}`}
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
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

      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className={`fixed top-0 right-0 z-50 h-full w-72 max-w-[85vw] md:hidden border-l transform transition-transform duration-300 ease-out translate-x-0 ${isDark ? "bg-[#0a0020] border-purple-900/50" : "bg-white border-slate-200"}`}>
            <div className="flex flex-col h-full p-6 pt-16">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className={`absolute top-4 right-4 h-10 w-10 flex items-center justify-center rounded-full border ${isDark ? "border-purple-700/50 bg-black/30 text-slate-200" : "border-slate-200 bg-slate-100 text-slate-700"}`}
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
              <nav className="flex flex-col gap-4">
                {navItems.map((item) => (
                  <Link
                    key={item.label}
                    to={item.to}
                    onClick={(e) => item.id ? handleNavClick(e, item.to, item.id) : setMobileMenuOpen(false)}
                    className={`py-2 text-base font-medium transition ${isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"}`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <p className={`mt-4 text-xs font-semibold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-500"}`}>Sign in</p>
              <div className="flex flex-wrap gap-2">
                {EXAM_SLUGS.map((slug) => (
                  <Link
                    key={slug}
                    to={getLoginPath(slug)}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${isDark ? "border-purple-600/60 bg-black/40 text-slate-200" : "border-purple-300 bg-white text-purple-700 hover:bg-purple-50"}`}
                  >
                    {EXAM_LABELS[slug]}
                  </Link>
                ))}
              </div>
              <p className={`mt-4 text-xs font-semibold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-500"}`}>Start Free Trial</p>
              <div className="flex flex-wrap gap-2">
                {EXAM_SLUGS.map((slug) => (
                  <Link
                    key={slug}
                    to={getRegisterPath(slug)}
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    {EXAM_LABELS[slug]}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
