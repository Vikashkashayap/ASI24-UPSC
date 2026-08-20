import {
  ArrowRight,
  Check,
  CircleX,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";

import { Link } from "react-router-dom";

import { useTheme } from "../../hooks/useTheme";

const traditionalPainPoints = [
  "Google search — generic results, not UPSC-specific",
  "PDFs, Telegram notes — static and quickly outdated",
  "No reliable system to clear doubts",
  "Copy checking — manual, delayed and inconsistent",
  "Analytics show marks but not meaningful trends",
];

const mentorsDailyWins = [
  "Write answers — everything in one workspace",
  "AI evaluates — instant structure + content feedback",
  "Prelims practice — timed MCQs, drills and scoring",
  "Student dashboard — prep, tests, analytics and plans",
  "Performance analysis — trends and weak areas",
  "Plan generator — daily & weekly plans from performance",
  "PYQ analytics — know what to study next",
  "Mentor-style chat — UPSC-focused reasoning",
  "Current affairs + concepts — linked and revision-friendly",
];

export const IntelligenceVsNoise = () => {
  const { theme } = useTheme();

  const dark = theme === "dark";

  return (
    <section
      id="compare"
      className={`relative overflow-hidden py-16 transition-colors sm:py-20 lg:py-24 ${
        dark ? "bg-[#030712]" : "bg-[#f7faff]"
      }`}
    >
      {/* =========================================================
          BACKGROUND
      ========================================================= */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Left red glow */}

        <div
          className={`absolute -left-48 top-[30%] h-[400px] w-[400px] rounded-full blur-[130px] ${
            dark ? "bg-red-500/[0.04]" : "bg-red-400/[0.06]"
          }`}
        />

        {/* Right blue glow */}

        <div
          className={`absolute -right-48 top-[20%] h-[500px] w-[500px] rounded-full blur-[130px] ${
            dark ? "bg-blue-600/10" : "bg-blue-400/10"
          }`}
        />

        {/* Dots */}

        <div
          className={`absolute inset-0 ${
            dark
              ? "hero-dots-bg-dark opacity-[0.04]"
              : "hero-dots-bg-light opacity-[0.25]"
          }`}
        />
      </div>

      {/* =========================================================
          CONTAINER
      ========================================================= */}

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* =======================================================
            HEADER
        ======================================================= */}

        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}

          <div className="mb-4 flex justify-center">
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] sm:text-xs ${
                dark
                  ? "border-blue-400/20 bg-blue-500/10 text-blue-300"
                  : "border-blue-200 bg-blue-50 text-blue-700"
              }`}
            >
              <Zap className="h-3.5 w-3.5" />

              A better way to prepare
            </div>
          </div>

          {/* Heading */}

          <h2
            className={`text-3xl font-black tracking-[-0.035em] sm:text-4xl lg:text-5xl ${
              dark ? "text-white" : "text-[#071225]"
            }`}
          >
            Stop searching.
            <span className="block bg-gradient-to-r from-[#1d4ed8] via-[#2563eb] to-[#06b6d4] bg-clip-text text-transparent">
              Start preparing.
            </span>
          </h2>

          {/* Description */}

          <p
            className={`mx-auto mt-4 max-w-2xl text-sm leading-6 sm:text-base sm:leading-7 ${
              dark ? "text-slate-400" : "text-slate-600"
            }`}
          >
            Traditional UPSC preparation often means jumping between
            dozens of resources. MentorsDaily brings your preparation,
            practice and progress into one intelligent workspace.
          </p>
        </div>

        {/* =======================================================
            COMPARISON
        ======================================================= */}

        <div className="relative mt-10 sm:mt-12">
          {/* VS Badge */}

          <div
            className={`absolute left-1/2 top-1/2 z-20 hidden h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 text-[10px] font-black shadow-xl lg:flex ${
              dark
                ? "border-[#030712] bg-slate-800 text-slate-300"
                : "border-[#f7faff] bg-white text-slate-400"
            }`}
          >
            VS
          </div>

          <div className="grid overflow-hidden rounded-[28px] lg:grid-cols-2">
            {/* ===================================================
                TRADITIONAL SIDE
            =================================================== */}

            <div
              className={`relative border p-6 sm:p-8 lg:p-10 ${
                dark
                  ? "border-slate-800 bg-slate-900/60"
                  : "border-slate-200 bg-white"
              }`}
            >
              {/* Header */}

              <div className="flex items-start justify-between">
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                        dark
                          ? "bg-red-500/10 text-red-400"
                          : "bg-red-50 text-red-500"
                      }`}
                    >
                      <CircleX className="h-4 w-4" />
                    </div>

                    <span
                      className={`text-[10px] font-bold uppercase tracking-[0.16em] ${
                        dark
                          ? "text-slate-500"
                          : "text-slate-400"
                      }`}
                    >
                      Traditional prep
                    </span>
                  </div>

                  <h3
                    className={`text-2xl font-black tracking-tight sm:text-3xl ${
                      dark
                        ? "text-slate-100"
                        : "text-slate-900"
                    }`}
                  >
                    Scattered.
                    <span
                      className={`block ${
                        dark
                          ? "text-slate-500"
                          : "text-slate-400"
                      }`}
                    >
                      Slow. Uncertain.
                    </span>
                  </h3>
                </div>

                <span
                  className={`hidden rounded-full px-2.5 py-1 text-[9px] font-bold sm:block ${
                    dark
                      ? "bg-red-500/10 text-red-400"
                      : "bg-red-50 text-red-500"
                  }`}
                >
                  COMMON PAIN
                </span>
              </div>

              <p
                className={`mt-4 max-w-md text-xs leading-5 sm:text-sm ${
                  dark ? "text-slate-400" : "text-slate-500"
                }`}
              >
                Too many tabs, PDFs and disconnected resources
                make it difficult to know what actually needs your
                attention.
              </p>

              {/* Divider */}

              <div
                className={`my-6 h-px ${
                  dark ? "bg-slate-800" : "bg-slate-100"
                }`}
              />

              {/* Pain points */}

              <div className="space-y-3">
                {traditionalPainPoints.map((item, index) => (
                  <div
                    key={item}
                    className={`group flex items-start gap-3 rounded-xl border p-3 transition-colors ${
                      dark
                        ? "border-slate-800 bg-slate-950/30 hover:border-red-500/20"
                        : "border-slate-100 bg-slate-50/70 hover:border-red-100"
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[9px] font-bold ${
                        dark
                          ? "bg-red-500/10 text-red-400"
                          : "bg-red-50 text-red-500"
                      }`}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </div>

                    <p
                      className={`text-[11px] leading-5 sm:text-xs ${
                        dark
                          ? "text-slate-400"
                          : "text-slate-600"
                      }`}
                    >
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* ===================================================
                MENTORS DAILY SIDE
            =================================================== */}

            <div
              className={`relative overflow-hidden border p-6 sm:p-8 lg:p-10 ${
                dark
                  ? "border-blue-500/20 bg-gradient-to-br from-blue-950/60 via-[#07152b] to-cyan-950/30"
                  : "border-blue-100 bg-gradient-to-br from-blue-50/80 via-white to-cyan-50/60"
              }`}
            >
              {/* Glow */}

              <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-blue-500/10 blur-[80px]" />

              {/* Header */}

              <div className="relative flex items-start justify-between">
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/20">
                      <Sparkles className="h-4 w-4" />

                      <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
                    </div>

                    <span
                      className={`text-[10px] font-bold uppercase tracking-[0.16em] ${
                        dark
                          ? "text-blue-400"
                          : "text-blue-600"
                      }`}
                    >
                      MentorsDaily
                    </span>
                  </div>

                  <h3
                    className={`text-2xl font-black tracking-tight sm:text-3xl ${
                      dark ? "text-white" : "text-slate-900"
                    }`}
                  >
                    Focused.
                    <span className="block bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                      Intelligent. Clear.
                    </span>
                  </h3>
                </div>

                <span
                  className={`hidden rounded-full px-2.5 py-1 text-[9px] font-bold sm:block ${
                    dark
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-emerald-50 text-emerald-600"
                  }`}
                >
                  BUILT FOR UPSC
                </span>
              </div>

              <p
                className={`relative mt-4 max-w-md text-xs leading-5 sm:text-sm ${
                  dark ? "text-slate-400" : "text-slate-600"
                }`}
              >
                One intelligent system that connects what you
                study, what you practice and how you improve.
              </p>

              {/* Feature summary */}

              <div className="relative mt-5 flex flex-wrap gap-1.5">
                {[
                  "AI Evaluation",
                  "Prelims",
                  "Analytics",
                  "Planner",
                  "PYQs",
                ].map((tag) => (
                  <span
                    key={tag}
                    className={`rounded-full border px-2.5 py-1 text-[9px] font-semibold ${
                      dark
                        ? "border-blue-400/10 bg-blue-500/10 text-blue-300"
                        : "border-blue-100 bg-blue-50 text-blue-700"
                    }`}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Divider */}

              <div
                className={`relative my-5 h-px ${
                  dark
                    ? "bg-blue-400/10"
                    : "bg-blue-100"
                }`}
              />

              {/* Wins */}

              <div className="relative max-h-[390px] space-y-2 overflow-y-auto pr-1 sm:max-h-none">
                {mentorsDailyWins.map((item, index) => (
                  <div
                    key={item}
                    className={`group flex items-start gap-3 rounded-xl border p-3 transition-all duration-200 ${
                      dark
                        ? "border-blue-400/[0.08] bg-slate-950/25 hover:border-blue-400/20 hover:bg-blue-500/[0.04]"
                        : "border-blue-100/70 bg-white/70 hover:border-blue-200 hover:bg-white"
                    }`}
                  >
                    {/* Check */}

                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-sm">
                      <Check className="h-3 w-3" />
                    </div>

                    <div className="flex-1">
                      <p
                        className={`text-[11px] font-medium leading-5 sm:text-xs ${
                          dark
                            ? "text-slate-300"
                            : "text-slate-700"
                        }`}
                      >
                        {item}
                      </p>
                    </div>

                    <span
                      className={`hidden text-[8px] font-bold sm:block ${
                        dark
                          ? "text-slate-700"
                          : "text-slate-300"
                      }`}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* =======================================================
            BOTTOM CTA / STATEMENT
        ======================================================= */}

        <div className="mt-8 flex justify-center">
          <Link
            to="/features"
            className={`group inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-[10px] font-bold transition-all sm:text-xs ${
              dark
                ? "border-blue-400/15 bg-blue-500/5 text-blue-300 hover:border-blue-400/30 hover:bg-blue-500/10"
                : "border-blue-200 bg-white text-blue-700 shadow-sm hover:border-blue-300 hover:bg-blue-50"
            }`}
          >
            See how MentorsDaily works

            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
};