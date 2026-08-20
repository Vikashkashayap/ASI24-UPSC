import { Card, CardContent } from "../ui/card";
import { useTheme } from "../../hooks/useTheme";
import { Quote, Star, ArrowUpRight } from "lucide-react";

const testimonials = [
  {
    name: "Rahul Nair",
    role: "UPSC 2026 Candidate",
    initials: "RN",
    quote:
      "UPSC Mentor's analytics made me realise how much time I was wasting on low-yield topics. Now my answer practice is sharply focused.",
  },
  {
    name: "Ananya Gupta",
    role: "UPSC CSE Aspirant, Delhi",
    initials: "AG",
    quote:
      "The answer-first approach and instant evaluation help me correct mistakes the same day. It feels like having a calm mentor on call.",
  },
  {
    name: "Karthik Iyer",
    role: "Working Professional & Aspirant",
    initials: "KI",
    quote:
      "As a working aspirant, I only get 2–3 hours a day. UPSC Mentor makes sure those hours go into actual practice, not hunting for resources.",
  },
];

export const TestimonialsSection = () => {
  const { theme } = useTheme();
  const dark = theme === "dark";

  return (
    <section
      id="testimonials"
      className={`relative overflow-hidden py-16 transition-colors md:py-20 lg:py-24 ${
        dark ? "bg-[#030712]" : "bg-slate-50"
      }`}
    >
      {/* Background decoration */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className={`absolute left-1/2 top-0 h-[350px] w-[600px] -translate-x-1/2 rounded-full blur-[120px] ${
            dark ? "bg-blue-600/[0.08]" : "bg-blue-500/[0.06]"
          }`}
        />

        <div
          className={`absolute -bottom-32 -left-32 h-[300px] w-[300px] rounded-full blur-[100px] ${
            dark ? "bg-cyan-500/[0.05]" : "bg-cyan-400/[0.04]"
          }`}
        />

        <div
          className={`absolute inset-0 opacity-[0.025] ${
            dark ? "bg-[radial-gradient(#60a5fa_1px,transparent_1px)]" : "bg-[radial-gradient(#2563eb_1px,transparent_1px)]"
          } [background-size:24px_24px]`}
        />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 md:px-6">
        {/* Section heading */}

        <div className="mx-auto max-w-2xl text-center">
          <div
            className={`mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] ${
              dark
                ? "border-blue-400/20 bg-blue-500/10 text-blue-300"
                : "border-blue-200 bg-blue-50 text-blue-600"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            Student experiences
          </div>

          <h2
            className={`text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl ${
              dark ? "text-white" : "text-slate-950"
            }`}
          >
            Built for serious aspirants.
          </h2>

          <p
            className={`mx-auto mt-3 max-w-xl text-sm leading-6 md:text-base ${
              dark ? "text-slate-400" : "text-slate-600"
            }`}
          >
            See how MentorsDaily helps aspirants spend less time searching
            and more time actually preparing.
          </p>
        </div>

        {/* Testimonials */}

        <div className="mt-10 grid gap-5 md:grid-cols-3 md:gap-6">
          {testimonials.map((testimonial, index) => (
            <Card
              key={testimonial.name}
              className={`group relative h-full overflow-hidden rounded-3xl border transition-all duration-300 hover:-translate-y-1 ${
                dark
                  ? "border-slate-700/60 bg-slate-900/70 shadow-xl shadow-black/20 hover:border-blue-500/40 hover:shadow-blue-500/10"
                  : "border-slate-200 bg-white shadow-lg shadow-slate-200/50 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-100/50"
              }`}
            >
              {/* Top accent */}

              <div
                className={`absolute left-0 right-0 top-0 h-[2px] transition-opacity ${
                  index === 1
                    ? "bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500"
                    : "bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"
                }`}
              />

              <CardContent className="flex h-full flex-col p-6 md:p-7">
                {/* Quote icon + rating */}

                <div className="flex items-center justify-between">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      dark
                        ? "bg-blue-500/10 text-blue-300"
                        : "bg-blue-50 text-blue-600"
                    }`}
                  >
                    <Quote className="h-5 w-5" strokeWidth={2} />
                  </div>

                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className="h-3.5 w-3.5 fill-current text-amber-400"
                        strokeWidth={0}
                      />
                    ))}
                  </div>
                </div>

                {/* Quote */}

                <p
                  className={`mt-6 flex-1 text-sm leading-6 ${
                    dark ? "text-slate-300" : "text-slate-600"
                  }`}
                >
                  “{testimonial.quote}”
                </p>

                {/* Divider */}

                <div
                  className={`my-6 h-px ${
                    dark ? "bg-slate-800" : "bg-slate-100"
                  }`}
                />

                {/* User */}

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}

                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        dark
                          ? "bg-gradient-to-br from-blue-500/30 to-cyan-400/20 text-blue-200 ring-1 ring-blue-400/20"
                          : "bg-gradient-to-br from-blue-100 to-cyan-50 text-blue-700 ring-1 ring-blue-200"
                      }`}
                    >
                      {testimonial.initials}
                    </div>

                    <div className="min-w-0">
                      <p
                        className={`truncate text-sm font-bold ${
                          dark ? "text-white" : "text-slate-900"
                        }`}
                      >
                        {testimonial.name}
                      </p>

                      <p
                        className={`mt-0.5 text-[10px] font-medium ${
                          dark ? "text-slate-500" : "text-slate-500"
                        }`}
                      >
                        {testimonial.role}
                      </p>
                    </div>
                  </div>

                  {/* Small arrow */}

                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full opacity-0 transition-all duration-300 group-hover:opacity-100 ${
                      dark
                        ? "bg-blue-500/10 text-blue-300"
                        : "bg-blue-50 text-blue-600"
                    }`}
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom trust line */}

        <div
          className={`mx-auto mt-8 flex max-w-xl flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[10px] font-medium ${
            dark ? "text-slate-500" : "text-slate-500"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Aspirant-focused
          </span>

          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            AI-powered preparation
          </span>

          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
            Built for UPSC
          </span>
        </div>
      </div>
    </section>
  );
};