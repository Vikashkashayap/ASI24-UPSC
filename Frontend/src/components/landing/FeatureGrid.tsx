import {
  BookOpen,
  LineChart,
  MessageCircleQuestion,
  Newspaper,
  LayoutDashboard,
  ClipboardList,
  Bot,
  CalendarDays,
  FileSearch,
  ArrowUpRight,
  Sparkles,
  Check,
} from "lucide-react";

import { Card } from "../ui/card";
import { useTheme } from "../../hooks/useTheme";

const features = [
  {
    icon: MessageCircleQuestion,
    title: "Answer Lab",
    subtitle: "Write daily. Get better.",
    description:
      "Write UPSC Mains answers with timer, marks and word limits. Get AI scoring, structure guidance and line-by-line feedback.",
    bullets: ["Mains-style questions", "Instant evaluation", "Daily practice"],
  },
  {
    icon: LineChart,
    title: "Performance Analytics",
    subtitle: "Know exactly where you stand.",
    description:
      "Understand your strengths and weaknesses with paper, topic and difficulty-wise analytics, trends and PYQ insights.",
    bullets: ["Test breakdown", "Improvement trends", "PYQ insights"],
  },
  {
    icon: Newspaper,
    title: "Current Affairs Lab",
    subtitle: "News → GS → Mains",
    description:
      "Turn daily news into syllabus-linked knowledge with concise briefings and ready-to-use Mains angles.",
    bullets: ["Daily brief", "GS linked", "Mains angles"],
  },
  {
    icon: BookOpen,
    title: "Concept Simplifier",
    subtitle: "Understand. Revise. Remember.",
    description:
      "Crisp, revision-friendly notes combining static concepts and current developments for faster preparation.",
    bullets: ["Static + dynamic", "Source-backed", "Quick revision"],
  },
  {
    icon: LayoutDashboard,
    title: "Student Dashboard",
    subtitle: "Everything in one place.",
    description:
      "Your complete preparation hub connecting Answer Lab, Prelims, Analytics, Current Affairs, Mentor and Planner.",
    bullets: ["All modules", "Today's tasks", "Progress tracking"],
  },
  {
    icon: ClipboardList,
    title: "Prelims Practice",
    subtitle: "Practice like the real exam.",
    description:
      "Attempt topic-wise MCQs, full mocks and scheduled tests. Revisit your attempts and learn from detailed solutions.",
    bullets: ["Topic MCQs", "Mock tests", "Test history"],
  },
  {
    icon: Bot,
    title: "AI Mentor",
    subtitle: "Your 24/7 preparation companion.",
    description:
      "Clear doubts, understand concepts and get structured UPSC-style explanations instead of generic search answers.",
    bullets: ["GS reasoning", "Follow-up chat", "24/7 support"],
  },
  {
    icon: CalendarDays,
    title: "Study Planner",
    subtitle: "Know what to study next.",
    description:
      "Create daily and weekly study sprints aligned with your tests, Mains schedule and performance data.",
    bullets: ["Sprint planning", "Timeline view", "Data-aware"],
  },
  {
    icon: FileSearch,
    title: "Copy Evaluation",
    subtitle: "Turn feedback into improvement.",
    description:
      "Upload Mains copies, track evaluations and get structured feedback that helps you improve answer quality.",
    bullets: ["Structured feedback", "History tracking", "Mains focused"],
  },
];

export const FeatureGrid = () => {
  const { theme } = useTheme();
  const dark = theme === "dark";

  return (
    <section
      id="features"
      className={`relative overflow-hidden py-16 transition-colors sm:py-20 lg:py-24 ${
        dark ? "bg-[#030712]" : "bg-[#f7faff]"
      }`}
    >
      {/* =========================================================
          BACKGROUND
      ========================================================= */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Blue glow */}

        <div
          className={`absolute -left-40 top-20 h-[400px] w-[400px] rounded-full blur-[120px] ${
            dark ? "bg-blue-600/10" : "bg-blue-400/10"
          }`}
        />

        <div
          className={`absolute -right-40 top-[35%] h-[450px] w-[450px] rounded-full blur-[130px] ${
            dark ? "bg-cyan-500/10" : "bg-cyan-400/10"
          }`}
        />

        {/* Dots */}

        <div
          className={`absolute inset-0 ${
            dark
              ? "hero-dots-bg-dark opacity-[0.05]"
              : "hero-dots-bg-light opacity-[0.3]"
          }`}
        />
      </div>

      {/* =========================================================
          MAIN CONTAINER
      ========================================================= */}

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* =======================================================
            SECTION HEADER
        ======================================================= */}

        <div className="mx-auto mb-10 max-w-3xl text-center sm:mb-12 lg:mb-14">
          {/* Small badge */}

          <div className="mb-4 flex justify-center">
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider sm:text-xs ${
                dark
                  ? "border-blue-400/20 bg-blue-500/10 text-blue-300"
                  : "border-blue-200 bg-blue-50 text-blue-700"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />

              Built for UPSC preparation
            </div>
          </div>

          {/* Heading */}

          <h2
            className={`text-3xl font-black tracking-[-0.035em] sm:text-4xl lg:text-5xl ${
              dark ? "text-white" : "text-[#071225]"
            }`}
          >
            Everything you need to
            <span className="block bg-gradient-to-r from-[#1d4ed8] via-[#2563eb] to-[#06b6d4] bg-clip-text text-transparent">
              prepare better.
            </span>
          </h2>

          {/* Description */}

          <p
            className={`mx-auto mt-4 max-w-2xl text-sm leading-7 sm:text-base ${
              dark ? "text-slate-400" : "text-slate-600"
            }`}
          >
            From answer writing and AI evaluation to current affairs,
            mock tests, analytics and personalized planning — your
            complete UPSC preparation system in one place.
          </p>
        </div>

        {/* =======================================================
            FEATURE GRID
        ======================================================= */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {features.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <Card
                key={feature.title}
                className={`group relative h-full overflow-hidden rounded-2xl border p-0 transition-all duration-300 ${
                  dark
                    ? "border-slate-800/80 bg-slate-900/70 hover:-translate-y-1 hover:border-blue-500/30 hover:bg-slate-900 hover:shadow-[0_20px_50px_rgba(37,99,235,0.10)]"
                    : "border-slate-200/80 bg-white/90 shadow-sm hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_20px_50px_rgba(37,99,235,0.10)]"
                }`}
              >
                {/* Top gradient line */}

                <div
                  className={`absolute inset-x-0 top-0 h-[2px] origin-left scale-x-0 bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600 transition-transform duration-500 group-hover:scale-x-100`}
                />

                {/* Background glow */}

                <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-blue-500/5 blur-2xl transition-all duration-500 group-hover:bg-blue-500/10" />

                {/* =================================================
                    CARD CONTENT
                ================================================= */}

                <div className="relative p-5 sm:p-6">
                  {/* Number + Icon */}

                  <div className="mb-5 flex items-start justify-between">
                    <div
                      className={`relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/15 transition-transform duration-300 group-hover:scale-105`}
                    >
                      <Icon
                        className="h-5.5 w-5.5"
                        strokeWidth={1.8}
                      />

                      {/* Small glow */}

                      <span className="absolute -inset-1 -z-10 rounded-xl bg-blue-500/20 opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-100" />
                    </div>

                    <span
                      className={`text-[10px] font-bold tracking-widest ${
                        dark
                          ? "text-slate-700"
                          : "text-slate-300"
                      }`}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>

                  {/* Title */}

                  <h3
                    className={`text-lg font-bold tracking-tight ${
                      dark ? "text-white" : "text-slate-900"
                    }`}
                  >
                    {feature.title}
                  </h3>

                  {/* Subtitle */}

                  <p
                    className={`mt-1.5 text-xs font-semibold ${
                      dark
                        ? "text-blue-400"
                        : "text-blue-600"
                    }`}
                  >
                    {feature.subtitle}
                  </p>

                  {/* Description */}

                  <p
                    className={`mt-3 min-h-[68px] text-xs leading-5 ${
                      dark
                        ? "text-slate-400"
                        : "text-slate-600"
                    }`}
                  >
                    {feature.description}
                  </p>

                  {/* Divider */}

                  <div
                    className={`my-4 h-px ${
                      dark
                        ? "bg-slate-800"
                        : "bg-slate-100"
                    }`}
                  />

                  {/* Feature bullets */}

                  <div className="flex flex-wrap gap-1.5">
                    {feature.bullets.map((bullet) => (
                      <span
                        key={bullet}
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[9px] font-medium ${
                          dark
                            ? "border-slate-700 bg-slate-800/70 text-slate-300"
                            : "border-slate-200 bg-slate-50 text-slate-600"
                        }`}
                      >
                        <Check className="h-2.5 w-2.5 text-blue-500" />

                        {bullet}
                      </span>
                    ))}
                  </div>

                  {/* Bottom arrow */}

                  <div
                    className={`mt-5 flex items-center gap-1 text-[10px] font-bold ${
                      dark
                        ? "text-blue-400"
                        : "text-blue-600"
                    }`}
                  >
                    Explore feature

                    <ArrowUpRight className="h-3 w-3 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* =======================================================
            BOTTOM CTA
        ======================================================= */}

        <div className="mt-10 flex justify-center sm:mt-12">
          <div
            className={`relative flex w-full max-w-3xl flex-col items-center justify-between gap-4 overflow-hidden rounded-2xl border px-5 py-5 sm:flex-row sm:px-7 ${
              dark
                ? "border-blue-500/15 bg-gradient-to-r from-blue-950/40 via-slate-900/80 to-cyan-950/30"
                : "border-blue-100 bg-gradient-to-r from-blue-50 via-white to-cyan-50"
            }`}
          >
            {/* Glow */}

            <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-blue-500/10 blur-2xl" />

            <div className="relative text-center sm:text-left">
              <p
                className={`text-sm font-bold ${
                  dark ? "text-white" : "text-slate-900"
                }`}
              >
                One portal. Complete preparation.
              </p>

              <p
                className={`mt-1 text-[10px] ${
                  dark
                    ? "text-slate-400"
                    : "text-slate-500"
                }`}
              >
                Study, practice, evaluate and improve every day.
              </p>
            </div>

            <a
              href="#top"
              className="relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-4 text-[10px] font-bold text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5"
            >
              Explore MentorsDaily

              <ArrowUpRight className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};