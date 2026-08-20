import {
  X,
  Check,
  ArrowRight,
  Search,
  FileText,
  Brain,
  BarChart3,
  Sparkles,
  Target,
  Clock3,
} from "lucide-react";

import { LandingFooter } from "../../components/landing/LandingFooter";
import { useTheme } from "../../hooks/useTheme";
import { Card, CardContent } from "../../components/ui/card";

const oldWay = [
  "Google search — generic results, not UPSC-specific",
  "PDFs, Telegram notes — static, they get outdated",
  "No reliable system to clear doubts",
  "Copy check — manual, delayed, inconsistent feedback",
  "Analytics — just marks, can't see trends",
];

const portalWay = [
  "Write answers — everything in one workspace",
  "AI evaluates — instant, consistent, structure + content feedback",
  "Prelims test practice — timed MCQs, topic drills, instant scoring",
  "Student dashboard — prep, tests, analytics & plans in one place",
  "Performance analysis — trends, weak areas, not just marks",
  "Plan generator — daily & weekly study plans from your data",
  "PYQ analytics — decide which topics to study next",
  "Mentor-style chat — trained on UPSC reasoning",
  "Current affairs + concepts — all linked, revise-friendly",
];

const comparisonStats = [
  {
    icon: Clock3,
    value: "Less",
    label: "Time wasted",
  },
  {
    icon: Brain,
    value: "AI",
    label: "Powered feedback",
  },
  {
    icon: BarChart3,
    value: "Data",
    label: "Driven decisions",
  },
];

export const ComparePage = () => {
  const { theme } = useTheme();
  const dark = theme === "dark";

  return (
    <>
      {/* =========================================================
          HERO
      ========================================================= */}

      <section
        className={`relative overflow-hidden border-b transition-colors ${
          dark
            ? "border-slate-800 bg-[#030712]"
            : "border-slate-200 bg-[#f7fbff]"
        }`}
      >
        {/* Background */}

        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className={`absolute -left-40 -top-40 h-[450px] w-[450px] rounded-full blur-[130px] ${
              dark ? "bg-blue-600/10" : "bg-blue-500/10"
            }`}
          />

          <div
            className={`absolute -right-40 top-0 h-[420px] w-[420px] rounded-full blur-[130px] ${
              dark ? "bg-cyan-500/10" : "bg-cyan-400/10"
            }`}
          />

          <div
            className={`absolute inset-0 opacity-[0.035] ${
              dark
                ? "bg-[radial-gradient(#60a5fa_1px,transparent_1px)]"
                : "bg-[radial-gradient(#2563eb_1px,transparent_1px)]"
            } [background-size:24px_24px]`}
          />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-14 text-center sm:py-16 md:px-6 md:py-20">
          {/* Badge */}

          <div
            className={`mb-5 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] ${
              dark
                ? "border-blue-400/20 bg-blue-500/10 text-blue-300"
                : "border-blue-200 bg-blue-50 text-blue-600"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Why MentorsDaily?
          </div>

          {/* Heading */}

          <h1
            className={`mx-auto max-w-4xl text-3xl font-black leading-[1.05] tracking-tight sm:text-4xl md:text-5xl ${
              dark ? "text-white" : "text-slate-950"
            }`}
          >
            Stop preparing through
            <span className="block bg-gradient-to-r from-slate-500 via-blue-600 to-cyan-500 bg-clip-text text-transparent">
              scattered resources.
            </span>
          </h1>

          <p
            className={`mx-auto mt-5 max-w-2xl text-sm leading-6 md:text-base md:leading-7 ${
              dark ? "text-slate-400" : "text-slate-600"
            }`}
          >
            See how the traditional UPSC preparation workflow compares with a
            focused, AI-powered workspace built around practice, feedback and
            performance.
          </p>

          {/* Stats */}

          <div className="mx-auto mt-8 grid max-w-2xl grid-cols-3 gap-2 sm:gap-4">
            {comparisonStats.map(
              ({ icon: Icon, value, label }) => (
                <div
                  key={label}
                  className={`rounded-2xl border px-3 py-4 ${
                    dark
                      ? "border-slate-800 bg-slate-900/60"
                      : "border-slate-200 bg-white shadow-sm"
                  }`}
                >
                  <Icon
                    className={`mx-auto mb-2 h-4 w-4 ${
                      dark ? "text-blue-400" : "text-blue-600"
                    }`}
                  />

                  <p
                    className={`text-lg font-black sm:text-xl ${
                      dark ? "text-white" : "text-slate-900"
                    }`}
                  >
                    {value}
                  </p>

                  <p
                    className={`mt-0.5 text-[9px] sm:text-[10px] ${
                      dark ? "text-slate-500" : "text-slate-500"
                    }`}
                  >
                    {label}
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* =========================================================
          TRANSFORMATION STRIP
      ========================================================= */}

      <section
        className={`border-b py-7 ${
          dark
            ? "border-slate-800 bg-[#050b18]"
            : "border-slate-200 bg-white"
        }`}
      >
        <div className="mx-auto max-w-5xl px-4 md:px-6">
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-5">
            {/* Old */}

            <div
              className={`flex items-center gap-2 rounded-full border px-4 py-2 ${
                dark
                  ? "border-slate-800 bg-slate-900 text-slate-500"
                  : "border-slate-200 bg-slate-50 text-slate-500"
              }`}
            >
              <Search className="h-3.5 w-3.5" />

              <span className="text-[10px] font-bold uppercase tracking-wider">
                Search
              </span>

              <span className="text-slate-400">→</span>

              <span className="text-[10px]">
                scattered resources
              </span>
            </div>

            {/* Arrow */}

            <div
              className={`hidden h-px w-8 sm:block ${
                dark ? "bg-slate-700" : "bg-slate-200"
              }`}
            />

            {/* New */}

            <div className="flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-blue-500">
              <Brain className="h-3.5 w-3.5" />

              <span className="text-[10px] font-bold uppercase tracking-wider">
                MentorsDaily
              </span>

              <span className="text-blue-400">→</span>

              <span className="text-[10px]">
                focused preparation
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          COMPARISON
      ========================================================= */}

      <section
        className={`relative overflow-hidden py-14 md:py-20 ${
          dark ? "bg-[#050b18]" : "bg-slate-50"
        }`}
      >
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          {/* Heading */}

          <div className="mx-auto max-w-2xl text-center">
            <p
              className={`text-[10px] font-bold uppercase tracking-[0.18em] ${
                dark ? "text-blue-400" : "text-blue-600"
              }`}
            >
              Side by side
            </p>

            <h2
              className={`mt-2 text-2xl font-black tracking-tight md:text-3xl ${
                dark ? "text-white" : "text-slate-950"
              }`}
            >
              The difference is the workflow.
            </h2>

            <p
              className={`mt-3 text-xs leading-5 md:text-sm ${
                dark ? "text-slate-500" : "text-slate-500"
              }`}
            >
              Same goal. A completely different way of getting there.
            </p>
          </div>

          {/* Cards */}

          <div className="mt-10 grid gap-5 lg:grid-cols-2 lg:gap-6">
            {/* =====================================================
                OLD WAY
            ===================================================== */}

            <Card
              className={`relative overflow-hidden rounded-[28px] border ${
                dark
                  ? "border-slate-800 bg-slate-900/60"
                  : "border-slate-200 bg-white shadow-sm"
              }`}
            >
              <CardContent className="p-6 md:p-8">
                {/* Header */}

                <div className="flex items-start justify-between">
                  <div>
                    <div
                      className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${
                        dark
                          ? "bg-slate-800 text-slate-500"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <FileText className="h-5 w-5" />
                    </div>

                    <p
                      className={`text-[10px] font-bold uppercase tracking-[0.18em] ${
                        dark
                          ? "text-slate-500"
                          : "text-slate-400"
                      }`}
                    >
                      Traditional method
                    </p>

                    <h3
                      className={`mt-2 text-xl font-bold tracking-tight md:text-2xl ${
                        dark ? "text-slate-200" : "text-slate-900"
                      }`}
                    >
                      Hours lost in scattered resources.
                    </h3>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${
                      dark
                        ? "bg-slate-800 text-slate-500"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    OLD WAY
                  </span>
                </div>

                {/* Divider */}

                <div
                  className={`my-6 h-px ${
                    dark ? "bg-slate-800" : "bg-slate-100"
                  }`}
                />

                {/* List */}

                <ul className="space-y-3">
                  {oldWay.map((item) => (
                    <li
                      key={item}
                      className={`flex items-start gap-3 rounded-xl p-2 ${
                        dark
                          ? "text-slate-400"
                          : "text-slate-600"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                          dark
                            ? "bg-slate-800 text-slate-500"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        <X className="h-3 w-3" />
                      </span>

                      <span className="text-xs leading-5 md:text-sm">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Bottom */}

                <div
                  className={`mt-7 rounded-xl border px-4 py-3 ${
                    dark
                      ? "border-slate-800 bg-slate-950/50"
                      : "border-slate-100 bg-slate-50"
                  }`}
                >
                  <p
                    className={`text-[10px] font-semibold ${
                      dark ? "text-slate-500" : "text-slate-500"
                    }`}
                  >
                    The problem
                  </p>

                  <p
                    className={`mt-1 text-xs ${
                      dark ? "text-slate-400" : "text-slate-600"
                    }`}
                  >
                    More time finding resources, less time actually
                    practising.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* =====================================================
                MENTOR DAILY
            ===================================================== */}

            <Card
              className={`relative overflow-hidden rounded-[28px] border ${
                dark
                  ? "border-blue-500/30 bg-slate-900/80"
                  : "border-blue-100 bg-white shadow-xl shadow-blue-500/[0.06]"
              }`}
            >
              {/* Gradient top */}

              <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600" />

              {/* Glow */}

              <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />

              <CardContent className="relative p-6 md:p-8">
                {/* Header */}

                <div className="flex items-start justify-between">
                  <div>
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                      <Brain className="h-5 w-5" />
                    </div>

                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-500">
                      MentorsDaily
                    </p>

                    <h3
                      className={`mt-2 text-xl font-bold tracking-tight md:text-2xl ${
                        dark ? "text-white" : "text-slate-900"
                      }`}
                    >
                      Instant clarity, answer-first workflow.
                    </h3>
                  </div>

                  <span className="rounded-full bg-blue-500 px-2.5 py-1 text-[9px] font-bold text-white shadow-sm">
                    BETTER WAY
                  </span>
                </div>

                <p
                  className={`mt-3 text-[11px] leading-5 ${
                    dark ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  Dashboard · Prelims practice · Performance insights ·
                  Smart plans
                </p>

                {/* Divider */}

                <div
                  className={`my-6 h-px ${
                    dark ? "bg-slate-800" : "bg-slate-100"
                  }`}
                />

                {/* List */}

                <ul className="space-y-3">
                  {portalWay.map((item, index) => (
                    <li
                      key={item}
                      className={`group flex items-start gap-3 rounded-xl p-2 transition-colors ${
                        dark
                          ? "hover:bg-slate-800/60"
                          : "hover:bg-blue-50/50"
                      }`}
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm shadow-blue-500/20">
                        <Check
                          className="h-3 w-3"
                          strokeWidth={3}
                        />
                      </span>

                      <div className="flex-1">
                        <span
                          className={`text-xs leading-5 md:text-sm ${
                            dark
                              ? "text-slate-300"
                              : "text-slate-700"
                          }`}
                        >
                          {item}
                        </span>
                      </div>

                      <span className="hidden text-[9px] font-bold text-blue-500 opacity-0 transition-opacity group-hover:opacity-100 sm:block">
                        0{index + 1}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Bottom */}

                <div className="mt-7 rounded-xl border border-blue-500/10 bg-blue-500/5 px-4 py-3">
                  <p className="text-[10px] font-semibold text-blue-500">
                    The difference
                  </p>

                  <p
                    className={`mt-1 text-xs ${
                      dark ? "text-slate-300" : "text-slate-600"
                    }`}
                  >
                    Your preparation becomes a system — write, evaluate,
                    analyse, plan and improve.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* =========================================================
          SUMMARY
      ========================================================= */}

      <section
        className={`relative overflow-hidden border-t py-14 md:py-18 ${
          dark
            ? "border-slate-800 bg-[#030712]"
            : "border-slate-200 bg-white"
        }`}
      >
        <div className="mx-auto max-w-5xl px-4 md:px-6">
          <div
            className={`relative overflow-hidden rounded-[28px] border px-6 py-9 text-center md:px-12 ${
              dark
                ? "border-blue-500/20 bg-gradient-to-br from-blue-950/50 via-slate-900 to-cyan-950/30"
                : "border-blue-100 bg-gradient-to-br from-blue-50 via-white to-cyan-50 shadow-lg"
            }`}
          >
            {/* Glow */}

            <div className="pointer-events-none absolute -left-20 -top-20 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />

            <div className="pointer-events-none absolute -bottom-20 -right-20 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl" />

            <div className="relative">
              <div
                className={`mx-auto flex h-11 w-11 items-center justify-center rounded-xl ${
                  dark
                    ? "bg-blue-500/10 text-blue-300"
                    : "bg-blue-100 text-blue-600"
                }`}
              >
                <Target className="h-5 w-5" />
              </div>

              <p
                className={`mt-5 text-[10px] font-bold uppercase tracking-[0.18em] ${
                  dark ? "text-blue-300" : "text-blue-600"
                }`}
              >
                The simple difference
              </p>

              <h2
                className={`mt-2 text-2xl font-black tracking-tight md:text-3xl ${
                  dark ? "text-white" : "text-slate-950"
                }`}
              >
                Less searching. More preparation.
              </h2>

              <p
                className={`mx-auto mt-3 max-w-2xl text-xs leading-5 md:text-sm md:leading-6 ${
                  dark ? "text-slate-400" : "text-slate-600"
                }`}
              >
                Instead of jumping between PDFs, searches and disconnected
                tools, bring your answer writing, tests, analytics, current
                affairs and planning into one focused workspace.
              </p>

              {/* Mini transformation */}

              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                {[
                  "Write",
                  "Evaluate",
                  "Analyse",
                  "Plan",
                  "Improve",
                ].map((item, index) => (
                  <div
                    key={item}
                    className="flex items-center gap-2"
                  >
                    <span
                      className={`rounded-full border px-3 py-1.5 text-[9px] font-bold ${
                        dark
                          ? "border-slate-700 bg-slate-900 text-slate-300"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      {item}
                    </span>

                    {index < 4 && (
                      <ArrowRight
                        className={`hidden h-3 w-3 sm:block ${
                          dark
                            ? "text-slate-600"
                            : "text-slate-300"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* CTA */}

              <a
                href="https://wa.me/918766233193?text=Hi!%20I%27d%20like%20to%20know%20more%20about%20MentorsDaily."
                target="_blank"
                rel="noopener noreferrer"
                className="group mt-7 inline-flex h-11 items-center gap-2 rounded-xl bg-[#2563eb] px-6 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 hover:bg-[#1d4ed8]"
              >
                Get Started with MentorsDaily
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </>
  );
};