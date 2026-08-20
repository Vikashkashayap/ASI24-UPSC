import { Link } from "react-router-dom";

import {
  Target,
  Heart,
  Zap,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

import { useTheme } from "../../hooks/useTheme";

const values = [
  {
    icon: Target,
    number: "01",
    title: "Focus",
    shortTitle: "One place. Less clutter.",
    desc: "Bring answers, analytics, current affairs, tests and planning into one focused workspace built around your UPSC journey.",
  },
  {
    icon: Heart,
    number: "02",
    title: "Aspirant-first",
    shortTitle: "Built around real aspirants.",
    desc: "Whether you're a working professional, first-time aspirant or repeater, MentorsDaily is designed to fit your available time.",
  },
  {
    icon: Zap,
    number: "03",
    title: "Clarity",
    shortTitle: "Know what to do next.",
    desc: "Use PYQ trends, weak-area insights and improvement data to make smarter decisions about what deserves your attention.",
  },
];

export const AboutSection = () => {
  const { theme } = useTheme();

  const dark = theme === "dark";

  return (
    <section
      id="about"
      className={`relative overflow-hidden border-t py-16 transition-colors sm:py-20 lg:py-24 ${
        dark
          ? "border-slate-800/80 bg-[#030712]"
          : "border-slate-200 bg-[#f7faff]"
      }`}
    >
      {/* Background */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className={`absolute -left-40 top-0 h-[400px] w-[400px] rounded-full blur-[130px] ${
            dark ? "bg-blue-600/10" : "bg-blue-400/10"
          }`}
        />

        <div
          className={`absolute -right-40 bottom-0 h-[450px] w-[450px] rounded-full blur-[140px] ${
            dark ? "bg-cyan-500/10" : "bg-cyan-400/10"
          }`}
        />

        <div
          className={`absolute inset-0 ${
            dark
              ? "hero-dots-bg-dark opacity-[0.035]"
              : "hero-dots-bg-light opacity-[0.25]"
          }`}
        />
      </div>

      {/* Main Container */}

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* =====================================================
            MAIN ABOUT CONTENT
        ===================================================== */}

        <div className="mx-auto max-w-5xl text-center">
          {/* Badge */}

          <div className="mb-5 flex justify-center">
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] sm:text-xs ${
                dark
                  ? "border-blue-400/20 bg-blue-500/10 text-blue-300"
                  : "border-blue-200 bg-blue-50 text-blue-700"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />

              About MentorsDaily
            </div>
          </div>

          {/* Heading */}

          <h2
            className={`mx-auto max-w-4xl text-3xl font-black leading-[1.05] tracking-[-0.04em] sm:text-4xl md:text-5xl lg:text-6xl ${
              dark ? "text-white" : "text-[#071225]"
            }`}
          >
            UPSC preparation should feel
            <span className="block bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
              clear, not chaotic.
            </span>
          </h2>

          {/* Description */}

          <p
            className={`mx-auto mt-5 max-w-3xl text-sm leading-6 sm:text-base sm:leading-7 lg:text-lg ${
              dark ? "text-slate-400" : "text-slate-600"
            }`}
          >
            MentorsDaily brings mentors, technology and a focused
            preparation workflow together in one place. Instead of
            spending your time searching for what to study next,
            use your preparation data to understand where you are
            and where to go.
          </p>

          {/* Feature Pills */}

          <div className="mt-7 flex flex-wrap justify-center gap-2">
            {[
              "Answer Writing",
              "AI Evaluation",
              "Analytics",
              "Current Affairs",
              "PYQ Insights",
            ].map((item) => (
              <span
                key={item}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[9px] font-semibold transition-all sm:text-[10px] ${
                  dark
                    ? "border-slate-700 bg-slate-900/70 text-slate-300 hover:border-blue-500/30 hover:text-blue-300"
                    : "border-slate-200 bg-white text-slate-600 shadow-sm hover:border-blue-200 hover:text-blue-600"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" />

                {item}
              </span>
            ))}
          </div>
        </div>

        {/* =====================================================
            SMALL PRODUCT STATEMENT
        ===================================================== */}

        <div className="mx-auto mt-12 max-w-5xl">
          <div
            className={`relative overflow-hidden rounded-2xl border p-5 sm:p-6 ${
              dark
                ? "border-blue-500/15 bg-gradient-to-r from-blue-950/30 via-slate-900/60 to-cyan-950/20"
                : "border-blue-100 bg-gradient-to-r from-blue-50/80 via-white to-cyan-50/70"
            }`}
          >
            {/* Glow */}

            <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />

            <div className="relative flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/20">
                  <Sparkles className="h-4 w-4" />
                </div>

                <div>
                  <p
                    className={`text-xs font-bold ${
                      dark ? "text-white" : "text-slate-900"
                    }`}
                  >
                    One workspace for your UPSC journey.
                  </p>

                  <p
                    className={`mt-0.5 text-[10px] ${
                      dark ? "text-slate-500" : "text-slate-500"
                    }`}
                  >
                    Study smarter. Practice consistently. Improve with data.
                  </p>
                </div>
              </div>

              <div
                className={`flex items-center gap-2 text-[10px] font-semibold ${
                  dark ? "text-blue-300" : "text-blue-600"
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />

                Built for serious aspirants
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================
            VALUES
        ===================================================== */}

        <div className="mt-14 sm:mt-16 lg:mt-20">
          {/* Section heading */}

          <div className="mb-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p
                className={`text-[10px] font-bold uppercase tracking-[0.18em] ${
                  dark ? "text-blue-400" : "text-blue-600"
                }`}
              >
                What drives us
              </p>

              <h3
                className={`mt-1.5 text-xl font-black tracking-tight sm:text-2xl lg:text-3xl ${
                  dark ? "text-white" : "text-slate-900"
                }`}
              >
                Built around three simple ideas.
              </h3>
            </div>

            <p
              className={`max-w-sm text-xs leading-5 sm:text-right ${
                dark ? "text-slate-500" : "text-slate-500"
              }`}
            >
              Less noise. Better decisions. More consistent preparation.
            </p>
          </div>

          {/* Cards */}

          <div className="grid gap-4 md:grid-cols-3">
            {values.map(
              ({ icon: Icon, number, title, shortTitle, desc }) => (
                <div
                  key={title}
                  className={`group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 sm:p-6 ${
                    dark
                      ? "border-slate-800 bg-slate-900/60 hover:-translate-y-1 hover:border-blue-500/25 hover:bg-slate-900"
                      : "border-slate-200 bg-white shadow-sm hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/[0.06]"
                  }`}
                >
                  {/* Top hover line */}

                  <div className="absolute inset-x-0 top-0 h-[2px] origin-left scale-x-0 bg-gradient-to-r from-blue-600 to-cyan-400 transition-transform duration-500 group-hover:scale-x-100" />

                  {/* Background glow */}

                  <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-blue-500/5 blur-2xl transition-all duration-300 group-hover:bg-blue-500/10" />

                  {/* Card top */}

                  <div className="relative flex items-start justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/15 transition-transform duration-300 group-hover:scale-105">
                      <Icon
                        className="h-5 w-5"
                        strokeWidth={1.8}
                      />
                    </div>

                    <span
                      className={`text-[10px] font-bold tracking-widest ${
                        dark
                          ? "text-slate-700"
                          : "text-slate-300"
                      }`}
                    >
                      {number}
                    </span>
                  </div>

                  {/* Card content */}

                  <div className="relative mt-5">
                    <h4
                      className={`text-lg font-bold ${
                        dark ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {title}
                    </h4>

                    <p
                      className={`mt-1 text-[10px] font-semibold ${
                        dark
                          ? "text-blue-400"
                          : "text-blue-600"
                      }`}
                    >
                      {shortTitle}
                    </p>

                    <p
                      className={`mt-3 text-xs leading-5 ${
                        dark
                          ? "text-slate-400"
                          : "text-slate-600"
                      }`}
                    >
                      {desc}
                    </p>
                  </div>

                  {/* Bottom */}

                  <div
                    className={`mt-5 h-px ${
                      dark ? "bg-slate-800" : "bg-slate-100"
                    }`}
                  />

                  <div
                    className={`mt-3 flex items-center gap-1.5 text-[9px] font-bold ${
                      dark
                        ? "text-slate-500"
                        : "text-slate-400"
                    }`}
                  >
                    <CheckCircle2 className="h-3 w-3 text-blue-500" />

                    Aspirant-first by design
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {/* =====================================================
            CTA
        ===================================================== */}

        <div className="mt-9 flex justify-center">
          <Link
            to="/about"
            className={`group inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-[10px] font-bold transition-all sm:text-xs ${
              dark
                ? "border-blue-400/15 bg-blue-500/5 text-blue-300 hover:border-blue-400/30 hover:bg-blue-500/10"
                : "border-blue-200 bg-white text-blue-700 shadow-sm hover:border-blue-300 hover:bg-blue-50"
            }`}
          >
            Learn more about MentorsDaily

            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
};