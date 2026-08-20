import { useTheme } from "../../hooks/useTheme";
import {
  ArrowRight,
  Brain,
  Check,
  FileText,
  MessageCircle,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";

const offerItems = [
  "AI-powered answer writing & evaluation",
  "Daily study targets & progress tracking",
  "Current affairs & syllabus-linked notes",
  "Mains & Prelims practice tests",
  "Performance analytics & feedback",
  "24/7 AI mentor support",
  "Personalized learning paths",
  "PYQ analysis & revision tools",
  "One dashboard for all prep",
];

const stats = [
  { value: "2,500+", label: "Students" },
  { value: "1,200+", label: "Answers evaluated" },
  { value: "40+", label: "Topics" },
  { value: "24/7", label: "AI support" },
];

export const LandingHero = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const whatsappLink = (message: string) =>
    `https://wa.me/918178303475?text=${encodeURIComponent(message)}`;

  return (
    <section
      className={`relative isolate overflow-hidden transition-colors duration-500 ${
        isDark
          ? "bg-[#030712] text-white"
          : "bg-[#f8fbff] text-slate-900"
      }`}
    >
      {/* =========================================================
          BACKGROUND
      ========================================================= */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {/* Blue glow */}
        <div
          className={`absolute -left-40 -top-40 h-[480px] w-[480px] rounded-full blur-[130px] ${
            isDark ? "bg-blue-600/15" : "bg-blue-400/10"
          }`}
        />

        {/* Cyan glow */}
        <div
          className={`absolute -right-40 top-[5%] h-[600px] w-[600px] rounded-full blur-[140px] ${
            isDark ? "bg-cyan-500/12" : "bg-cyan-400/10"
          }`}
        />

        {/* Bottom glow */}
        <div
          className={`absolute bottom-[-350px] left-1/2 h-[500px] w-[850px] -translate-x-1/2 rounded-full blur-[140px] ${
            isDark ? "bg-blue-600/10" : "bg-blue-300/10"
          }`}
        />

        {/* Dots */}
        <div
          className={`absolute inset-0 ${
            isDark
              ? "hero-dots-bg-dark opacity-[0.06]"
              : "hero-dots-bg-light opacity-[0.38]"
          }`}
        />

        {/* Top line */}
        <div className="absolute left-0 right-0 top-0 h-[3px] bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600" />
      </div>

      {/* =========================================================
          HERO CONTAINER
      ========================================================= */}
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div
          className="
            grid
            items-center
            gap-10
            py-10
            sm:py-12
            lg:grid-cols-[0.82fr_1.18fr]
            lg:gap-8
            lg:py-14
            xl:gap-12
          "
        >
          {/* =====================================================
              LEFT SIDE
          ===================================================== */}
          <div className="relative z-20 w-full max-w-[540px] text-center lg:text-left">
            {/* Badge */}
            <div className="mb-5 flex justify-center lg:justify-start">
              <div
                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-semibold backdrop-blur-xl sm:text-xs ${
                  isDark
                    ? "border-blue-400/20 bg-blue-500/[0.08] text-blue-300"
                    : "border-blue-200 bg-white/90 text-blue-700 shadow-sm"
                }`}
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute h-full w-full animate-ping rounded-full bg-blue-500 opacity-60" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-blue-500" />
                </span>

                India&apos;s AI-Powered UPSC Student Portal

                <Sparkles className="h-3 w-3" />
              </div>
            </div>

            {/* =================================================
                MAIN HEADING
            ================================================= */}
            <h1
              className={`mx-auto max-w-[500px] text-[40px] font-black leading-[0.98] tracking-[-0.045em] sm:text-[46px] md:text-[52px] lg:mx-0 lg:text-[54px] xl:text-[56px] ${
                isDark ? "text-white" : "text-[#071225]"
              }`}
            >
              Prepare
              <br />

              <span className="bg-gradient-to-r from-[#1d4ed8] via-[#2563eb] to-[#06b6d4] bg-clip-text text-transparent">
                Smarter.
              </span>

              <br />

              <span
                className={
                  isDark ? "text-slate-200" : "text-[#18253a]"
                }
              >
                Perform Better.
              </span>
            </h1>

            {/* =================================================
                USP
            ================================================= */}
            <div className="mt-4 flex items-center justify-center gap-2 lg:justify-start">
              <div className="h-px w-7 bg-blue-500/40" />

              <p
                className={`text-[10px] font-bold uppercase tracking-[0.17em] sm:text-xs ${
                  isDark ? "text-blue-300" : "text-blue-600"
                }`}
              >
                Crack UPSC with AI
              </p>

              <div className="h-px w-7 bg-blue-500/40" />
            </div>

            {/* =================================================
                DESCRIPTION
            ================================================= */}
            <p
              className={`mx-auto mt-4 max-w-[500px] text-[13px] leading-[1.75] sm:text-sm md:text-[15px] lg:mx-0 ${
                isDark ? "text-slate-300" : "text-slate-600"
              }`}
            >
              Your complete UPSC preparation workspace for{" "}
              <strong
                className={
                  isDark ? "text-white" : "font-semibold text-slate-800"
                }
              >
                answer writing, AI evaluation, tests, current affairs
              </strong>{" "}
              and personalized learning — all from one powerful dashboard.
            </p>

            {/* =================================================
                CTA BUTTONS
            ================================================= */}
            <div className="mt-6 flex flex-col items-center gap-2.5 sm:flex-row sm:justify-center lg:justify-start">
              <a
                href={whatsappLink(
                  "Hi! I'm interested in MentorsDaily. I'd like to explore courses."
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] px-6 text-xs font-bold text-white shadow-[0_10px_25px_rgba(37,99,235,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_15px_30px_rgba(37,99,235,0.28)] sm:w-auto sm:text-sm"
              >
                <span>Enquire Now</span>

                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
              </a>

              <a
                href={whatsappLink(
                  "Hi! I'd like to book a free consultation for MentorsDaily."
                )}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border px-6 text-xs font-semibold transition-all duration-300 hover:-translate-y-0.5 sm:w-auto sm:text-sm ${
                  isDark
                    ? "border-slate-700 bg-slate-900/70 text-white hover:border-blue-500/40 hover:bg-slate-800"
                    : "border-slate-200 bg-white text-slate-800 shadow-sm hover:border-blue-300 hover:bg-blue-50"
                }`}
              >
                <MessageCircle className="h-3.5 w-3.5 text-blue-500" />

                Book a free consultation
              </a>
            </div>

            {/* =================================================
                TRUST POINTS
            ================================================= */}
            <div
              className={`mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[10px] sm:text-[11px] lg:justify-start ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-500/10">
                  <Check className="h-2.5 w-2.5 text-blue-500" />
                </span>
                AI-powered
              </span>

              <span className="flex items-center gap-1.5">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-500/10">
                  <Check className="h-2.5 w-2.5 text-blue-500" />
                </span>
                Personalized
              </span>

              <span className="flex items-center gap-1.5">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-500/10">
                  <Check className="h-2.5 w-2.5 text-blue-500" />
                </span>
                Progress tracking
              </span>
            </div>

            {/* =================================================
                STATS
            ================================================= */}
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {stats.map(({ value, label }) => (
                <div
                  key={label}
                  className={`rounded-xl border px-2.5 py-2.5 text-left transition-all duration-300 hover:-translate-y-0.5 ${
                    isDark
                      ? "border-slate-800 bg-slate-900/60"
                      : "border-slate-200 bg-white/85 shadow-sm hover:border-blue-200 hover:shadow-md"
                  }`}
                >
                  <p
                    className={`text-base font-black tracking-tight sm:text-lg ${
                      isDark ? "text-blue-300" : "text-blue-600"
                    }`}
                  >
                    {value}
                  </p>

                  <p
                    className={`mt-0.5 text-[9px] leading-4 sm:text-[10px] ${
                      isDark ? "text-slate-500" : "text-slate-500"
                    }`}
                  >
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* =====================================================
              RIGHT SIDE IMAGE
          ===================================================== */}
          <div className="relative mx-auto w-full max-w-[650px] lg:ml-auto">
            {/* Glow */}
            <div
              className={`absolute left-1/2 top-1/2 h-[88%] w-[88%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[90px] ${
                isDark
                  ? "bg-gradient-to-r from-blue-600/25 via-cyan-500/15 to-indigo-600/20"
                  : "bg-gradient-to-r from-blue-500/12 via-cyan-400/12 to-indigo-500/8"
              }`}
            />

            {/* Decorative circle */}
            <div
              className={`absolute -right-5 -top-5 h-24 w-24 rounded-full border ${
                isDark
                  ? "border-blue-500/10"
                  : "border-blue-200/60"
              }`}
            />

            {/* Main image */}
            <div
              className={`relative rounded-[27px] p-[1px] ${
                isDark
                  ? "bg-gradient-to-br from-blue-400/40 via-blue-500/10 to-cyan-400/30 shadow-[0_30px_80px_rgba(37,99,235,0.22)]"
                  : "bg-gradient-to-br from-blue-300 via-white to-cyan-300 shadow-[0_30px_80px_rgba(37,99,235,0.15)]"
              }`}
            >
              <div
                className={`relative overflow-hidden rounded-[26px] ${
                  isDark ? "bg-[#07101f]" : "bg-white"
                }`}
              >
                <img
                  src="/Student_img.jpeg"
                  alt="UPSC student preparing with MentorsDaily"
                  className="block aspect-[16/10.5] w-full object-cover object-center"
                />

                {/* Image overlay */}
                <div
                  className={`pointer-events-none absolute inset-0 ${
                    isDark
                      ? "bg-gradient-to-tr from-[#020817]/45 via-transparent to-blue-500/10"
                      : "bg-gradient-to-tr from-blue-950/5 via-transparent to-cyan-400/5"
                  }`}
                />

                {/* Bottom fade */}
                <div
                  className={`pointer-events-none absolute inset-x-0 bottom-0 h-24 ${
                    isDark
                      ? "bg-gradient-to-t from-[#020817]/60 to-transparent"
                      : "bg-gradient-to-t from-white/15 to-transparent"
                  }`}
                />
              </div>
            </div>

            {/* =================================================
                AI MENTOR CARD
            ================================================= */}
            <div
              className={`absolute -left-4 top-9 hidden rounded-xl border p-2.5 shadow-xl backdrop-blur-xl sm:block lg:-left-6 ${
                isDark
                  ? "border-white/10 bg-slate-950/90"
                  : "border-white bg-white/95"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20">
                  <Brain className="h-4 w-4" />

                  <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
                </div>

                <div>
                  <p
                    className={`text-[11px] font-bold ${
                      isDark ? "text-white" : "text-slate-900"
                    }`}
                  >
                    AI Mentor
                  </p>

                  <p
                    className={`mt-0.5 text-[9px] ${
                      isDark ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    Online & ready
                  </p>
                </div>
              </div>
            </div>

            {/* =================================================
                DAILY TARGET
            ================================================= */}
            <div
              className={`absolute -right-2 top-6 hidden rounded-xl border p-2.5 shadow-xl backdrop-blur-xl sm:block lg:-right-6 ${
                isDark
                  ? "border-white/10 bg-slate-950/90"
                  : "border-white bg-white/95"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                  <Target className="h-3.5 w-3.5" />
                </div>

                <div>
                  <p
                    className={`text-[8px] font-bold uppercase tracking-wide ${
                      isDark ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    Daily target
                  </p>

                  <p
                    className={`mt-0.5 text-[11px] font-bold ${
                      isDark ? "text-white" : "text-slate-900"
                    }`}
                  >
                    4 / 5 completed
                  </p>
                </div>
              </div>
            </div>

            {/* =================================================
                AI EVALUATION
            ================================================= */}
            <div
              className={`absolute right-[-3px] top-[34%] hidden w-[128px] rounded-xl border p-2.5 shadow-xl backdrop-blur-xl sm:block lg:right-[-14px] ${
                isDark
                  ? "border-white/10 bg-slate-950/90"
                  : "border-white bg-white/95"
              }`}
            >
              <div className="mb-1.5 flex items-center gap-1.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-100 text-violet-600">
                  <FileText className="h-3 w-3" />
                </div>

                <span
                  className={`text-[8px] font-bold ${
                    isDark ? "text-slate-300" : "text-slate-700"
                  }`}
                >
                  AI EVALUATION
                </span>
              </div>

              <div className="flex items-end justify-between">
                <span
                  className={`text-base font-black ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}
                >
                  7.8
                  <span className="text-[8px] font-medium text-slate-400">
                    /10
                  </span>
                </span>

                <span className="text-[8px] font-bold text-emerald-500">
                  +12%
                </span>
              </div>

              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" />
              </div>
            </div>

            {/* =================================================
                PERFORMANCE
            ================================================= */}
            <div
              className={`absolute -bottom-4 right-1 hidden rounded-xl border p-2.5 shadow-xl backdrop-blur-xl sm:block lg:-right-6 ${
                isDark
                  ? "border-white/10 bg-slate-950/90"
                  : "border-white bg-white/95"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                  <TrendingUp className="h-4 w-4" />
                </div>

                <div>
                  <p
                    className={`text-[8px] ${
                      isDark ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    Performance
                  </p>

                  <p
                    className={`text-sm font-black ${
                      isDark ? "text-white" : "text-slate-900"
                    }`}
                  >
                    +18.6%
                  </p>
                </div>
              </div>
            </div>

            {/* =================================================
                AI POWERED PILL
            ================================================= */}
            <div
              className={`absolute bottom-4 left-4 hidden rounded-full border px-3 py-1.5 shadow-lg backdrop-blur-xl sm:flex sm:items-center sm:gap-1.5 ${
                isDark
                  ? "border-white/10 bg-slate-950/90"
                  : "border-white bg-white/95"
              }`}
            >
              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-100">
                <Zap className="h-2.5 w-2.5 text-blue-600" />
              </div>

              <span
                className={`text-[9px] font-bold ${
                  isDark ? "text-blue-300" : "text-blue-700"
                }`}
              >
                AI-powered preparation
              </span>
            </div>
          </div>
        </div>

        {/* =========================================================
            PRODUCT STRIP
        ========================================================= */}
        <div
          className={`mx-auto mb-10 max-w-6xl rounded-xl border px-4 py-3 ${
            isDark
              ? "border-slate-800 bg-slate-900/50"
              : "border-slate-200 bg-white/80 shadow-sm"
          }`}
        >
          <div className="flex flex-col items-center justify-between gap-3 lg:flex-row">
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                  isDark
                    ? "bg-blue-500/10 text-blue-400"
                    : "bg-blue-100 text-blue-600"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
              </div>

              <div className="text-left">
                <p
                  className={`text-[10px] font-bold sm:text-xs ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}
                >
                  Everything for your UPSC journey
                </p>

                <p
                  className={`text-[9px] ${
                    isDark ? "text-slate-500" : "text-slate-500"
                  }`}
                >
                  One dashboard. One focused preparation system.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5">
              {[
                "Answer Evaluation",
                "Test Series",
                "Current Affairs",
                "Analytics",
              ].map((item) => (
                <span
                  key={item}
                  className={`flex items-center gap-1 text-[9px] font-medium sm:text-[10px] ${
                    isDark ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  <Check className="h-2.5 w-2.5 text-blue-500" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* =========================================================
            WHAT WE OFFER
        ========================================================= */}
        <div
          className={`mx-auto max-w-6xl rounded-[24px] border p-5 sm:p-6 md:p-7 ${
            isDark
              ? "border-slate-800 bg-slate-900/50"
              : "border-slate-200 bg-white/80 shadow-sm"
          }`}
        >
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div
                className={`mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${
                  isDark ? "text-blue-400" : "text-blue-600"
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                Everything you need
              </div>

              <h2
                className={`text-lg font-bold sm:text-xl ${
                  isDark ? "text-white" : "text-slate-900"
                }`}
              >
                One Portal. Complete UPSC Preparation.
              </h2>
            </div>

            <p
              className={`max-w-md text-[11px] leading-5 sm:text-xs ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Study, practice, evaluate and improve without switching between
              multiple platforms.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {offerItems.map((item) => (
              <div
                key={item}
                className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 ${
                  isDark
                    ? "border-slate-800 bg-slate-800/30"
                    : "border-slate-100 bg-slate-50/70"
                }`}
              >
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
                    isDark
                      ? "bg-blue-500/10 text-blue-400"
                      : "bg-blue-100 text-blue-600"
                  }`}
                >
                  <Check className="h-3 w-3" />
                </div>

                <span
                  className={`text-[11px] font-medium sm:text-xs ${
                    isDark ? "text-slate-300" : "text-slate-700"
                  }`}
                >
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="py-6 text-center">
          <p
            className={`text-[11px] ${
              isDark ? "text-slate-500" : "text-slate-500"
            }`}
          >
            Learn • Practice • Improve • Track your UPSC journey
          </p>
        </div>
      </div>
    </section>
  );
};