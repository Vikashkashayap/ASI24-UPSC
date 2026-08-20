import { Link } from "react-router-dom";

import {
  ArrowRight,
  CheckCircle2,
  Heart,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";

import { LandingFooter } from "../../components/landing/LandingFooter";
import { useTheme } from "../../hooks/useTheme";
import { Card, CardContent } from "../../components/ui/card";

const values = [
  {
    icon: Target,
    number: "01",
    title: "Focus",
    desc: "No scattered resources. One workspace for answer writing, analytics and current affairs — everything you need, without the clutter.",
    tag: "Less noise",
  },
  {
    icon: Heart,
    number: "02",
    title: "Aspirant-first",
    desc: "Built for freshers, working professionals and repeaters. Your schedule may be busy, but your preparation can still stay consistent.",
    tag: "Built for you",
  },
  {
    icon: Zap,
    number: "03",
    title: "Clarity",
    desc: "Use PYQ trends, weak areas and performance data to understand exactly where your preparation needs attention.",
    tag: "Data-driven",
  },
];

export const AboutPage = () => {
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
        {/* Background glow */}

        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className={`absolute -left-32 top-10 h-[400px] w-[400px] rounded-full blur-[120px] ${
              dark ? "bg-blue-600/[0.08]" : "bg-blue-500/[0.07]"
            }`}
          />

          <div
            className={`absolute -right-32 -top-20 h-[420px] w-[420px] rounded-full blur-[130px] ${
              dark ? "bg-cyan-500/[0.06]" : "bg-cyan-400/[0.06]"
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

        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:py-16 md:px-6 md:py-20">
          <div className="grid items-center gap-10 md:grid-cols-[1.05fr_0.95fr] md:gap-14">
            {/* Left */}

            <div>
              {/* Badge */}

              <div
                className={`mb-5 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] ${
                  dark
                    ? "border-blue-400/20 bg-blue-500/10 text-blue-300"
                    : "border-blue-200 bg-blue-50 text-blue-600"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                About MentorsDaily
              </div>

              {/* Heading */}

              <h1
                className={`max-w-2xl text-3xl font-extrabold leading-[1.05] tracking-tight sm:text-4xl md:text-5xl ${
                  dark ? "text-white" : "text-slate-950"
                }`}
              >
                UPSC preparation should feel{" "}
                <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
                  clear, not chaotic.
                </span>
              </h1>

              {/* Description */}

              <p
                className={`mt-5 max-w-xl text-sm leading-6 md:text-base md:leading-7 ${
                  dark ? "text-slate-400" : "text-slate-600"
                }`}
              >
                MentorsDaily brings mentors, technology and a focused
                preparation workflow together in one place. Instead of
                constantly searching for what to study next, use your
                preparation data to understand where you are and where to go.
              </p>

              {/* Feature pills */}

              <div className="mt-6 flex flex-wrap gap-2">
                {[
                  "Answer Writing",
                  "AI Evaluation",
                  "Analytics",
                  "Current Affairs",
                  "PYQ Insights",
                ].map((item) => (
                  <span
                    key={item}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-medium ${
                      dark
                        ? "border-slate-700 bg-slate-900/70 text-slate-300"
                        : "border-slate-200 bg-white text-slate-600 shadow-sm"
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    {item}
                  </span>
                ))}
              </div>

              {/* CTA */}

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  to="/features"
                  className="group inline-flex h-10 items-center gap-2 rounded-xl bg-[#2563eb] px-5 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 hover:bg-[#1d4ed8]"
                >
                  Explore MentorsDaily
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </Link>

                <Link
                  to="/pricing"
                  className={`inline-flex h-10 items-center gap-2 rounded-xl border px-5 text-xs font-semibold transition-all hover:-translate-y-0.5 ${
                    dark
                      ? "border-slate-700 bg-slate-900/70 text-slate-200 hover:border-blue-500/40"
                      : "border-slate-200 bg-white text-slate-700 shadow-sm hover:border-blue-200"
                  }`}
                >
                  View Plans
                </Link>
              </div>
            </div>

            {/* Right visual */}

            <div className="relative">
              <div
                className={`relative overflow-hidden rounded-[28px] border p-6 sm:p-8 ${
                  dark
                    ? "border-slate-700/60 bg-slate-900/70"
                    : "border-blue-100 bg-white shadow-xl shadow-blue-100/50"
                }`}
              >
                {/* Glow */}

                <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/10 blur-3xl" />

                {/* Main circle */}

                <div className="relative flex aspect-square items-center justify-center">
                  <div
                    className={`absolute h-56 w-56 rounded-full border ${
                      dark ? "border-blue-400/10" : "border-blue-100"
                    }`}
                  />

                  <div
                    className={`absolute h-40 w-40 rounded-full border ${
                      dark ? "border-blue-400/15" : "border-blue-200"
                    }`}
                  />

                  <div
                    className={`absolute h-24 w-24 rounded-full border-2 border-dashed ${
                      dark ? "border-blue-400/40" : "border-blue-300"
                    }`}
                  />

                  <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-xl shadow-blue-500/30">
                    <Sparkles className="h-7 w-7" />
                  </div>

                  {/* Floating card 1 */}

                  <div
                    className={`absolute left-0 top-8 rounded-xl border px-3 py-2 shadow-lg ${
                      dark
                        ? "border-slate-700 bg-slate-900"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <Target className="h-3.5 w-3.5" />
                      </div>

                      <div>
                        <p
                          className={`text-[9px] font-bold ${
                            dark ? "text-white" : "text-slate-900"
                          }`}
                        >
                          Focused prep
                        </p>

                        <p className="text-[8px] text-slate-500">
                          Less clutter
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Floating card 2 */}

                  <div
                    className={`absolute bottom-8 right-0 rounded-xl border px-3 py-2 shadow-lg ${
                      dark
                        ? "border-slate-700 bg-slate-900"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>

                      <div>
                        <p
                          className={`text-[9px] font-bold ${
                            dark ? "text-white" : "text-slate-900"
                          }`}
                        >
                          Clear direction
                        </p>

                        <p className="text-[8px] text-slate-500">
                          Data-driven
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom label */}

                <div
                  className={`relative mt-2 rounded-xl border px-4 py-3 ${
                    dark
                      ? "border-slate-700/60 bg-slate-800/50"
                      : "border-slate-100 bg-slate-50"
                  }`}
                >
                  <p
                    className={`text-[9px] font-bold uppercase tracking-[0.15em] ${
                      dark ? "text-blue-300" : "text-blue-600"
                    }`}
                  >
                    Our approach
                  </p>

                  <p
                    className={`mt-1 text-xs font-medium ${
                      dark ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Less noise. Better decisions. More consistent preparation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          MISSION
      ========================================================= */}

      <section
        className={`relative overflow-hidden py-14 md:py-18 ${
          dark ? "bg-[#050b18]" : "bg-white"
        }`}
      >
        <div className="mx-auto max-w-5xl px-4 md:px-6">
          <div
            className={`relative overflow-hidden rounded-[28px] border ${
              dark
                ? "border-slate-700/60 bg-slate-900/60"
                : "border-slate-200 bg-white shadow-xl shadow-slate-200/40"
            }`}
          >
            {/* Blue side accent */}

            <div className="absolute bottom-0 left-0 top-0 w-1 bg-gradient-to-b from-blue-500 via-blue-600 to-cyan-400" />

            <CardContent className="p-7 sm:p-9 md:p-12">
              <div className="mx-auto max-w-3xl text-center">
                <div
                  className={`mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${
                    dark
                      ? "bg-blue-500/10 text-blue-300"
                      : "bg-blue-50 text-blue-600"
                  }`}
                >
                  <Heart className="h-5 w-5" />
                </div>

                <p
                  className={`text-[10px] font-bold uppercase tracking-[0.18em] ${
                    dark ? "text-blue-300" : "text-blue-600"
                  }`}
                >
                  Our mission
                </p>

                <h2
                  className={`mt-2 text-2xl font-bold tracking-tight md:text-3xl ${
                    dark ? "text-white" : "text-slate-950"
                  }`}
                >
                  Make preparation simpler.
                </h2>

                <p
                  className={`mt-4 text-sm leading-6 md:text-base md:leading-7 ${
                    dark ? "text-slate-300" : "text-slate-600"
                  }`}
                >
                  Tired of PDFs, Telegram groups and random notes scattered
                  everywhere? We want you to{" "}
                  <strong
                    className={dark ? "text-white" : "text-slate-900"}
                  >
                    write answers, get feedback and understand your
                    performance
                  </strong>{" "}
                  — all in one place.
                </p>

                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {[
                    "Write",
                    "Evaluate",
                    "Analyse",
                    "Improve",
                  ].map((item, index) => (
                    <div
                      key={item}
                      className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-semibold ${
                        dark
                          ? "bg-slate-800 text-slate-300"
                          : "bg-slate-50 text-slate-700"
                      }`}
                    >
                      <span className="text-blue-500">
                        0{index + 1}
                      </span>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </div>
        </div>
      </section>

      {/* =========================================================
          VALUES
      ========================================================= */}

      <section
        className={`relative overflow-hidden py-14 md:py-20 ${
          dark ? "bg-[#030712]" : "bg-slate-50"
        }`}
      >
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          {/* Heading */}

          <div className="mx-auto max-w-2xl text-center">
            <p
              className={`text-[10px] font-bold uppercase tracking-[0.18em] ${
                dark ? "text-blue-300" : "text-blue-600"
              }`}
            >
              What drives us
            </p>

            <h2
              className={`mt-2 text-2xl font-bold tracking-tight md:text-3xl ${
                dark ? "text-white" : "text-slate-950"
              }`}
            >
              Built around three simple ideas.
            </h2>

            <p
              className={`mt-3 text-sm leading-6 ${
                dark ? "text-slate-400" : "text-slate-600"
              }`}
            >
              Everything we build comes back to helping aspirants prepare
              with more focus and less friction.
            </p>
          </div>

          {/* Cards */}

          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {values.map((value) => {
              const Icon = value.icon;

              return (
                <Card
                  key={value.title}
                  className={`group relative overflow-hidden rounded-[24px] border transition-all duration-300 hover:-translate-y-1 ${
                    dark
                      ? "border-slate-700/60 bg-slate-900/60 hover:border-blue-500/40 hover:shadow-xl hover:shadow-blue-500/[0.06]"
                      : "border-slate-200 bg-white shadow-md hover:border-blue-200 hover:shadow-xl hover:shadow-blue-100/40"
                  }`}
                >
                  {/* Number */}

                  <span
                    className={`absolute right-5 top-5 text-[10px] font-bold tracking-widest ${
                      dark ? "text-slate-700" : "text-slate-200"
                    }`}
                  >
                    {value.number}
                  </span>

                  {/* Top gradient */}

                  <div className="absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-blue-500 via-cyan-400 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

                  <CardContent className="p-6 md:p-7">
                    <div
                      className={`mb-5 flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105 ${
                        dark
                          ? "bg-blue-500/10 text-blue-300"
                          : "bg-blue-50 text-blue-600"
                      }`}
                    >
                      <Icon className="h-5 w-5" strokeWidth={1.8} />
                    </div>

                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-semibold ${
                        dark
                          ? "bg-slate-800 text-slate-400"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {value.tag}
                    </span>

                    <h3
                      className={`mt-3 text-lg font-bold ${
                        dark ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {value.title}
                    </h3>

                    <p
                      className={`mt-2 text-xs leading-5 md:text-sm md:leading-6 ${
                        dark ? "text-slate-400" : "text-slate-600"
                      }`}
                    >
                      {value.desc}
                    </p>

                    <div
                      className={`mt-5 h-px w-full ${
                        dark ? "bg-slate-800" : "bg-slate-100"
                      }`}
                    />

                    <div
                      className={`mt-4 flex items-center gap-1.5 text-[10px] font-semibold ${
                        dark ? "text-blue-300" : "text-blue-600"
                      }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Aspirant-first approach
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================
          FINAL CTA
      ========================================================= */}

      <section
        className={`px-4 py-12 md:py-16 ${
          dark ? "bg-[#030712]" : "bg-white"
        }`}
      >
        <div className="mx-auto max-w-5xl">
          <div
            className={`relative overflow-hidden rounded-[28px] border px-6 py-9 text-center md:px-12 ${
              dark
                ? "border-blue-500/20 bg-gradient-to-br from-blue-950/50 via-slate-900 to-cyan-950/30"
                : "border-blue-100 bg-gradient-to-br from-blue-50 via-white to-cyan-50 shadow-lg"
            }`}
          >
            <div className="relative">
              <p
                className={`text-[10px] font-bold uppercase tracking-[0.18em] ${
                  dark ? "text-blue-300" : "text-blue-600"
                }`}
              >
                Start with clarity
              </p>

              <h2
                className={`mt-2 text-2xl font-bold tracking-tight md:text-3xl ${
                  dark ? "text-white" : "text-slate-950"
                }`}
              >
                Prepare smarter. Perform better.
              </h2>

              <p
                className={`mx-auto mt-3 max-w-xl text-xs leading-5 md:text-sm ${
                  dark ? "text-slate-400" : "text-slate-600"
                }`}
              >
                Bring answer writing, evaluation, analytics and current
                affairs together in one focused preparation workspace.
              </p>

              <Link
                to="/features"
                className="group mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-[#2563eb] px-5 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 hover:bg-[#1d4ed8]"
              >
                Explore MentorsDaily
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </>
  );
};