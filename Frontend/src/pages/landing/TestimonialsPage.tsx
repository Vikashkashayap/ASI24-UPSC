import {
  Quote,
  Star,
  ArrowRight,
  MessageCircle,
  Sparkles,
} from "lucide-react";

import { LandingFooter } from "../../components/landing/LandingFooter";
import { useTheme } from "../../hooks/useTheme";
import { Card, CardContent } from "../../components/ui/card";

const testimonials = [
  {
    name: "Rahul Nair",
    role: "UPSC 2026 Candidate",
    initials: "RN",
    quote:
      "Analytics showed me I was spending too much time on low-yield topics. Now my answer practice is sharply focused.",
    highlight: "Less time waste, more focus",
  },
  {
    name: "Ananya Gupta",
    role: "UPSC CSE Aspirant, Delhi",
    initials: "AG",
    quote:
      "Same-day evaluation and feedback. I fix wrong answers right away. It feels like having a mentor by my side.",
    highlight: "Same-day mistake fix",
  },
  {
    name: "Karthik Iyer",
    role: "Working Professional",
    initials: "KI",
    quote:
      "I only get 2–3 hours a day. MentorsDaily ensures that time goes into practice, not hunting for resources.",
    highlight: "Working aspirant friendly",
  },
  {
    name: "Priya Sharma",
    role: "First attempt, 2026",
    initials: "PS",
    quote:
      "Answer Lab gave me confidence. I used to hesitate before writing. Now I write 1–2 answers daily.",
    highlight: "Consistent practice",
  },
];

const stats = [
  {
    value: "4+",
    label: "Aspirant stories",
  },
  {
    value: "24/7",
    label: "AI support",
  },
  {
    value: "Daily",
    label: "Practice focused",
  },
];

export const TestimonialsPage = () => {
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
            className={`absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full blur-[130px] ${
              dark ? "bg-blue-600/10" : "bg-blue-500/10"
            }`}
          />

          <div
            className={`absolute -right-40 top-10 h-[420px] w-[420px] rounded-full blur-[130px] ${
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
            <MessageCircle className="h-3.5 w-3.5" />
            Aspirant experiences
          </div>

          {/* Heading */}

          <h1
            className={`mx-auto max-w-3xl text-3xl font-black leading-tight tracking-tight sm:text-4xl md:text-5xl ${
              dark ? "text-white" : "text-slate-950"
            }`}
          >
            Built for preparation.
            <span className="block bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 bg-clip-text text-transparent">
              Loved for the clarity.
            </span>
          </h1>

          <p
            className={`mx-auto mt-5 max-w-2xl text-sm leading-6 md:text-base md:leading-7 ${
              dark ? "text-slate-400" : "text-slate-600"
            }`}
          >
            See how MentorsDaily fits into the daily preparation routines of
            aspirants — from first attempts to working professionals.
          </p>

          {/* Rating */}

          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <div
              className={`flex items-center gap-1 rounded-full border px-3 py-2 ${
                dark
                  ? "border-slate-800 bg-slate-900/70"
                  : "border-slate-200 bg-white shadow-sm"
              }`}
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className="h-3.5 w-3.5 fill-current text-amber-400"
                />
              ))}

              <span
                className={`ml-1 text-[10px] font-semibold ${
                  dark ? "text-slate-300" : "text-slate-600"
                }`}
              >
                Built around real preparation needs
              </span>
            </div>
          </div>

          {/* Stats */}

          <div className="mx-auto mt-8 grid max-w-2xl grid-cols-3 gap-2 sm:gap-4">
            {stats.map(({ value, label }) => (
              <div
                key={label}
                className={`rounded-2xl border px-3 py-4 ${
                  dark
                    ? "border-slate-800 bg-slate-900/60"
                    : "border-slate-200 bg-white shadow-sm"
                }`}
              >
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
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          TESTIMONIALS
      ========================================================= */}

      <section
        className={`relative overflow-hidden py-14 md:py-20 ${
          dark ? "bg-[#050b18]" : "bg-slate-50"
        }`}
      >
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          {/* Section heading */}

          <div className="mx-auto max-w-2xl text-center">
            <p
              className={`text-[10px] font-bold uppercase tracking-[0.18em] ${
                dark ? "text-blue-400" : "text-blue-600"
              }`}
            >
              From the community
            </p>

            <h2
              className={`mt-2 text-2xl font-black tracking-tight md:text-3xl ${
                dark ? "text-white" : "text-slate-950"
              }`}
            >
              What aspirants are saying
            </h2>

            <p
              className={`mt-3 text-xs leading-5 md:text-sm ${
                dark ? "text-slate-500" : "text-slate-500"
              }`}
            >
              Different schedules. Different journeys. One common goal —
              smarter UPSC preparation.
            </p>
          </div>

          {/* Cards */}

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {testimonials.map((testimonial, index) => (
              <Card
                key={testimonial.name}
                className={`group relative overflow-hidden rounded-[28px] border transition-all duration-300 hover:-translate-y-1 ${
                  dark
                    ? "border-slate-800 bg-slate-900/70 hover:border-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/[0.06]"
                    : "border-slate-200 bg-white shadow-sm hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/[0.07]"
                }`}
              >
                {/* Top blue line */}

                <div
                  className={`absolute left-0 right-0 top-0 h-1 ${
                    index === 1 || index === 3
                      ? "bg-gradient-to-r from-cyan-500 to-blue-600"
                      : "bg-gradient-to-r from-blue-600 to-cyan-400"
                  }`}
                />

                {/* Glow */}

                <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-blue-500/5 blur-3xl transition-opacity group-hover:bg-blue-500/10" />

                <CardContent className="relative p-6 md:p-7">
                  {/* Quote icon + highlight */}

                  <div className="flex items-center justify-between">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        dark
                          ? "bg-blue-500/10 text-blue-400"
                          : "bg-blue-50 text-blue-600"
                      }`}
                    >
                      <Quote className="h-5 w-5" />
                    </div>

                    <span
                      className={`rounded-full border px-2.5 py-1 text-[9px] font-bold ${
                        dark
                          ? "border-blue-500/20 bg-blue-500/10 text-blue-300"
                          : "border-blue-100 bg-blue-50 text-blue-600"
                      }`}
                    >
                      {testimonial.highlight}
                    </span>
                  </div>

                  {/* Quote */}

                  <blockquote
                    className={`mt-6 text-sm leading-6 md:text-[15px] md:leading-7 ${
                      dark ? "text-slate-200" : "text-slate-700"
                    }`}
                  >
                    <span
                      className={`mr-1 text-2xl font-black leading-none ${
                        dark ? "text-blue-400" : "text-blue-500"
                      }`}
                    >
                      “
                    </span>

                    {testimonial.quote}

                    <span
                      className={`ml-1 text-2xl font-black leading-none ${
                        dark ? "text-blue-400" : "text-blue-500"
                      }`}
                    >
                      ”
                    </span>
                  </blockquote>

                  {/* Divider */}

                  <div
                    className={`my-6 h-px ${
                      dark ? "bg-slate-800" : "bg-slate-100"
                    }`}
                  />

                  {/* User */}

                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                        dark
                          ? "border border-blue-400/20 bg-blue-500/10 text-blue-300"
                          : "border border-blue-100 bg-blue-50 text-blue-600"
                      }`}
                    >
                      {testimonial.initials}
                    </div>

                    <div className="min-w-0">
                      <p
                        className={`text-sm font-bold ${
                          dark ? "text-white" : "text-slate-900"
                        }`}
                      >
                        {testimonial.name}
                      </p>

                      <p
                        className={`mt-0.5 text-[10px] ${
                          dark ? "text-slate-500" : "text-slate-500"
                        }`}
                      >
                        {testimonial.role}
                      </p>
                    </div>

                    <div className="ml-auto flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className="h-3 w-3 fill-current text-amber-400"
                        />
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          CTA
      ========================================================= */}

      <section
        className={`border-t py-14 md:py-18 ${
          dark
            ? "border-slate-800 bg-[#030712]"
            : "border-slate-200 bg-white"
        }`}
      >
        <div className="mx-auto max-w-5xl px-4 md:px-6">
          <div
            className={`relative overflow-hidden rounded-[28px] border px-6 py-10 text-center md:px-12 ${
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
                <Sparkles className="h-5 w-5" />
              </div>

              <p
                className={`mt-5 text-[10px] font-bold uppercase tracking-[0.18em] ${
                  dark ? "text-blue-300" : "text-blue-600"
                }`}
              >
                Your turn
              </p>

              <h2
                className={`mt-2 text-2xl font-black tracking-tight md:text-3xl ${
                  dark ? "text-white" : "text-slate-950"
                }`}
              >
                Your preparation can be more focused.
              </h2>

              <p
                className={`mx-auto mt-3 max-w-xl text-xs leading-5 md:text-sm md:leading-6 ${
                  dark ? "text-slate-400" : "text-slate-600"
                }`}
              >
                Stop spending your valuable study hours searching for what to
                study next. Practice, evaluate and improve from one workspace.
              </p>

              <a
                href="https://wa.me/918766233193?text=Hi!%20I%27d%20like%20to%20know%20more%20about%20MentorsDaily."
                target="_blank"
                rel="noopener noreferrer"
                className="group mt-7 inline-flex h-11 items-center gap-2 rounded-xl bg-[#2563eb] px-6 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 hover:bg-[#1d4ed8]"
              >
                Try MentorsDaily
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </a>

              <p
                className={`mt-3 text-[10px] ${
                  dark ? "text-slate-600" : "text-slate-400"
                }`}
              >
                Start your focused preparation journey.
              </p>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </>
  );
};