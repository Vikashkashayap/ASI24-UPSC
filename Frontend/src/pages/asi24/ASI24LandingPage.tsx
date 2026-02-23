import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { LandingLayout } from "../../layouts/LandingLayout";
import { ASI24Navbar } from "../../components/asi24/ASI24Navbar";
import { useTheme } from "../../hooks/useTheme";
import { EXAM_SLUGS, EXAM_LABELS, type ExamSlug } from "../../constants/exams";
import {
  Sparkles,
  FileQuestion,
  BarChart3,
  Target,
  Calendar,
  Trophy,
  Shield,
  Zap,
  LayoutGrid,
  Users,
} from "lucide-react";

const CORE_FEATURES = [
  { icon: Sparkles, title: "AI Mock Test Generator", desc: "Generate custom tests with AI based on syllabus and difficulty." },
  { icon: FileQuestion, title: "Previous Year Papers", desc: "Access curated PYQs with solutions and topic tagging." },
  { icon: BarChart3, title: "Performance Analytics", desc: "Track scores, accuracy, and time per topic over time." },
  { icon: Target, title: "Weak Area Detection", desc: "AI identifies weak topics and suggests focused practice." },
  { icon: Calendar, title: "Daily Practice Mode", desc: "Structured daily targets to build consistency." },
  { icon: Trophy, title: "Rank & Leaderboard", desc: "Compete with peers and track your rank by exam." },
];

const WHY_CHOOSE = [
  { icon: Zap, title: "AI Powered", desc: "Smart question generation and personalized feedback." },
  { icon: Target, title: "Exam Focused", desc: "Content aligned to latest syllabus and pattern." },
  { icon: BarChart3, title: "Smart Analytics", desc: "Deep insights to improve faster." },
  { icon: LayoutGrid, title: "One Platform Multiple Exams", desc: "UPSC, SSC, Banking, Railway & more under one roof." },
];

export function ASI24LandingPage() {
  const { hash } = useLocation();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    if (hash) {
      const id = hash.replace("#", "");
      const el = document.getElementById(id);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      }
    }
  }, [hash]);

  return (
    <LandingLayout>
      <ASI24Navbar />
      <main className="pt-12 md:pt-14">
        {/* Hero */}
        <section className={`relative overflow-hidden border-b ${isDark ? "asi24-gradient border-purple-900/50" : "bg-gradient-to-br from-slate-50 via-white to-purple-50/30 border-slate-200"}`}>
          {isDark && <div className="pointer-events-none absolute inset-y-10 right-[-10%] hidden w-[55%] rounded-full blur-3xl md:block bg-[radial-gradient(circle_at_center,_rgba(147,51,234,0.35),_transparent_65%)]" />}
          <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-12 pt-12 md:flex-row md:items-center md:gap-12 md:px-6 md:pb-24 md:pt-20">
            <div className="max-w-xl space-y-4 md:space-y-6">
              <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] md:text-xs ${isDark ? "text-fuchsia-300/90" : "text-fuchsia-600"}`}>
                UPSCRH — AI Mentor for Government Exams
              </p>
              <h1 className={`text-2xl font-semibold leading-tight tracking-tight sm:text-3xl md:text-4xl lg:text-5xl ${isDark ? "text-slate-50" : "text-slate-900"}`}>
                One AI Platform for{" "}
                <span className="block bg-gradient-to-r from-fuchsia-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                  All Government Exams
                </span>
              </h1>
              <p className={`text-sm leading-relaxed md:text-base ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                Prepare for UPSC, SSC, Banking, Railway, State PSC & more with AI-powered mock tests and smart analytics.
              </p>
              <div className="flex flex-col gap-3 xs:flex-row xs:flex-wrap">
                <Link
                  to="/ssc"
                  className="inline-flex h-11 min-h-[44px] items-center justify-center rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500 px-6 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 transition hover:from-fuchsia-400 hover:to-violet-400"
                >
                  Explore Exams
                </Link>
                <Link
                  to="/ssc/register"
                  className={`inline-flex h-11 min-h-[44px] items-center justify-center rounded-full border px-6 text-sm font-medium transition ${isDark ? "border-purple-500/60 bg-black/40 text-slate-200 hover:bg-purple-950/50" : "border-purple-300 bg-white text-purple-700 hover:bg-purple-50"}`}
                >
                  Start Free Trial
                </Link>
              </div>
            </div>
            <div className="relative z-0 mt-6 flex-1 md:mt-0">
              <div className={`mx-auto max-w-md rounded-[20px] border p-1 md:rounded-[28px] ${isDark ? "border-fuchsia-500/30 bg-gradient-to-br from-[#050017] via-[#0f0a1e] to-black shadow-[0_24px_80px_rgba(88,28,135,0.4)]" : "border-purple-200 bg-white shadow-xl shadow-purple-100"}`}>
                <div className={`rounded-[16px] p-4 md:rounded-[24px] md:p-5 ${isDark ? "bg-slate-950/90" : "bg-slate-50"}`}>
                  <div className={`mb-4 flex items-center justify-between text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                    <span className={`font-medium ${isDark ? "text-slate-100" : "text-slate-900"}`}>My Dashboard</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${isDark ? "bg-fuchsia-500/20 text-fuchsia-200" : "bg-fuchsia-100 text-fuchsia-700"}`}>Preview</span>
                  </div>
                  <div className="grid gap-2 text-[11px] md:grid-cols-2 md:gap-3">
                    {["SSC Mock Test", "UPSC Mock", "Banking Quiz"].map((label, i) => (
                      <div key={i} className={`rounded-xl p-3 ${isDark ? "bg-slate-900/80 text-slate-200" : "bg-white border border-slate-200 text-slate-800"}`}>
                        {label}
                      </div>
                    ))}
                  </div>
                  <div className={`mt-4 flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${isDark ? "bg-violet-500/10 text-slate-200" : "bg-violet-50 text-slate-800"}`}>
                    <BarChart3 className="h-4 w-4 text-violet-400" />
                    <span>Performance score: 78%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="exams" className={`border-b py-16 md:py-24 scroll-mt-20 ${isDark ? "asi24-section border-purple-900/30" : "bg-slate-50/50 border-slate-200"}`}>
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <h2 className={`mb-10 text-center text-2xl font-semibold md:text-3xl ${isDark ? "text-slate-50" : "text-slate-900"}`}>
              Choose Your Exam
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 md:gap-6">
              {EXAM_SLUGS.map((slug) => (
                <Link
                  key={slug}
                  to={`/${slug}`}
                  className={`group relative overflow-hidden rounded-2xl p-5 text-center transition duration-300 md:p-6 ${isDark ? "border border-purple-700/40 bg-slate-900/50 hover:border-fuchsia-500/50 hover:bg-slate-800/60 hover:shadow-[0_0_30px_rgba(147,51,234,0.2)]" : "border border-slate-200 bg-white hover:border-purple-400 hover:shadow-lg hover:shadow-purple-100"}`}
                >
                  <span className={`text-lg font-semibold md:text-xl ${isDark ? "text-slate-100 group-hover:text-fuchsia-200" : "text-slate-800 group-hover:text-purple-600"}`}>
                    {EXAM_LABELS[slug as ExamSlug]}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className={`border-b py-16 md:py-24 scroll-mt-20 ${isDark ? "asi24-section border-purple-900/30" : "bg-white border-slate-200"}`}>
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <h2 className={`mb-12 text-center text-2xl font-semibold md:text-3xl ${isDark ? "text-slate-50" : "text-slate-900"}`}>
              Core Features
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {CORE_FEATURES.map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className={`rounded-2xl border p-6 backdrop-blur-sm transition ${isDark ? "border-purple-800/30 bg-slate-900/40 hover:border-fuchsia-500/30 hover:shadow-lg hover:shadow-purple-900/20" : "border-slate-200 bg-white shadow-sm hover:border-purple-300 hover:shadow-md"}`}
                >
                  <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${isDark ? "bg-fuchsia-500/20 text-fuchsia-400" : "bg-purple-100 text-purple-600"}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className={`mb-2 font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{title}</h3>
                  <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="about" className={`border-b py-16 md:py-24 scroll-mt-20 ${isDark ? "asi24-section border-purple-900/30" : "bg-slate-50/50 border-slate-200"}`}>
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <h2 className={`mb-12 text-center text-2xl font-semibold md:text-3xl ${isDark ? "text-slate-50" : "text-slate-900"}`}>
              Why Choose Us
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {WHY_CHOOSE.map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className={`rounded-2xl border p-6 text-center backdrop-blur-sm ${isDark ? "border-purple-800/30 bg-slate-900/30" : "border-slate-200 bg-white shadow-sm"}`}
                >
                  <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full ${isDark ? "bg-violet-500/20 text-violet-400" : "bg-violet-100 text-violet-600"}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className={`mb-2 font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{title}</h3>
                  <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer id="contact" className={`relative border-t py-12 text-sm scroll-mt-20 ${isDark ? "border-purple-900/50 bg-[#020012] text-slate-400" : "border-slate-200 bg-white text-slate-600"}`}>
          {isDark && <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-purple-900/20 via-fuchsia-800/10 to-purple-900/20 blur-3xl opacity-50" />}
          <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-4 md:flex-row md:justify-between md:px-6">
            <div className="space-y-4 md:max-w-xs">
              <Link to="/" className="text-xl font-bold tracking-wide bg-gradient-to-r from-fuchsia-300 via-fuchsia-400 to-purple-400 bg-clip-text text-transparent">
                UPSCRH
              </Link>
              <p className={`text-sm leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                AI Mentor for UPSC & government exams — one place for preparation, mocks and analytics.
              </p>
              <div className={`flex gap-3 text-xs ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                <span>© {new Date().getFullYear()} UPSCRH</span>
                <span>Made with ♥ in India</span>
              </div>
            </div>
            <div className="grid flex-1 gap-8 text-sm md:grid-cols-4">
              <div>
                <h4 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? "text-slate-300" : "text-slate-700"}`}>Product</h4>
                <ul className="mt-4 space-y-2">
                  <li><Link to="/#features" className="transition hover:text-fuchsia-400">Features</Link></li>
                  <li><Link to="/" className="transition hover:text-fuchsia-400">Exams</Link></li>
                </ul>
              </div>
              <div>
                <h4 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? "text-slate-300" : "text-slate-700"}`}>Company</h4>
                <ul className="mt-4 space-y-2">
                  <li><Link to="/#about" className="transition hover:text-fuchsia-400">About</Link></li>
                  <li><a href="#contact" className="transition hover:text-fuchsia-400">Contact</a></li>
                </ul>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </LandingLayout>
  );
}
