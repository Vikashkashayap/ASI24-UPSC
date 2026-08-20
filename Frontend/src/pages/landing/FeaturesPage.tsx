import {
  MessageCircleQuestion,
  LineChart,
  Newspaper,
  BookOpen,
  Check,
  LayoutDashboard,
  ClipboardList,
  Bot,
  CalendarDays,
  FileSearch,
  UserCircle,
  Video,
  ArrowRight,
  Sparkles,
  Layers3,
  Target,
} from "lucide-react";

import { LandingFooter } from "../../components/landing/LandingFooter";
import { useTheme } from "../../hooks/useTheme";
import { Card, CardContent } from "../../components/ui/card";

type FeatureColor =
  | "blue"
  | "cyan"
  | "indigo"
  | "emerald"
  | "violet"
  | "amber"
  | "sky"
  | "rose";

type Feature = {
  icon: typeof MessageCircleQuestion;
  title: string;
  tagline: string;
  simple: string[];
  color: FeatureColor;
};

const features: Feature[] = [
  {
    icon: MessageCircleQuestion,
    title: "Answer Lab",
    tagline: "Write daily, get same-day feedback",
    simple: [
      "Set for Mains — timer, marks, word limit (e.g. 7 min, 10 marks, 150 words). Just like the real exam.",
      "Get a question, write your answer. Structure hints guide you — intro, body, conclusion.",
      "Submit and AI evaluates instantly. Score plus line-by-line feedback.",
      "Fix mistakes the same day. Repeat tomorrow.",
    ],
    color: "blue",
  },
  {
    icon: LineChart,
    title: "Performance Analytics",
    tagline: "Know where you're strong, where you're weak",
    simple: [
      "View data for every test — paper-wise, topic-wise, difficulty-wise.",
      "Understand trends — how much improvement in your last 20 attempts?",
      "PYQ lens — which topics come up most? Focus there.",
      "Track your streak — build consistency.",
    ],
    color: "cyan",
  },
  {
    icon: Newspaper,
    title: "Current Affairs Lab",
    tagline: "From news to exam angles — decoded",
    simple: [
      "Daily briefings — what's important today?",
      "Linked to GS syllabus — which topic does this news fit?",
      "Mains-ready angles — how could this become a question?",
      "Notes ready — understand, don't copy-paste.",
    ],
    color: "indigo",
  },
  {
    icon: BookOpen,
    title: "Concept Simplifier",
    tagline: "Turn complex topics into simple notes",
    simple: [
      "Static + dynamic topics — NCERT, standard books + current content.",
      "Enter a topic, get crisp notes. Revise-friendly.",
      "Book-backed — sources clear, no guesswork.",
      "Fast revision — quick recap before the exam.",
    ],
    color: "emerald",
  },
  {
    icon: LayoutDashboard,
    title: "Student Portal & Dashboard",
    tagline: "One home for your entire prep",
    simple: [
      "Home hub — jump to Answer Lab, Prelims, Analytics, CA, Mentor in one click.",
      "See what's due today — mocks, planner tasks, recent evaluations.",
      "Profile & subscription — MentorsDaily Pro, help, and settings in one place.",
      "Built as an AI student portal — less tab-hopping, more studying.",
    ],
    color: "violet",
  },
  {
    icon: ClipboardList,
    title: "Prelims Practice",
    tagline: "MCQs, mocks, and instant scoring",
    simple: [
      "Prelims test — generate or take topic-wise / mixed MCQ practice.",
      "Prelims mock — scheduled tests like exam day; review with solutions.",
      "Test history — revisit attempts and weak areas.",
      "Same analytics stack as Mains — so prelims prep stays data-driven.",
    ],
    color: "amber",
  },
  {
    icon: Bot,
    title: "AI Mentor",
    tagline: "Doubt clearing, UPSC-style reasoning",
    simple: [
      "Chat trained for GS-style reasoning — not generic web answers.",
      "Ask follow-ups, get structured explanations.",
      "Use alongside Answer Lab and Concept Simplifier for depth.",
      "Available from your dashboard anytime.",
    ],
    color: "sky",
  },
  {
    icon: CalendarDays,
    title: "Study Planner",
    tagline: "Daily & weekly plans that match your prep",
    simple: [
      "Plan sprints around prelims mocks and mains writing days.",
      "See tasks in one timeline — fewer missed slots.",
      "Pairs well with Performance Analytics — plan what the data says you need.",
      "Adjust as you go; consistency beats perfect plans.",
    ],
    color: "rose",
  },
  {
    icon: FileSearch,
    title: "Copy Evaluation",
    tagline: "Upload mains copies, structured feedback",
    simple: [
      "Submit handwritten or typed answers for evaluation workflow.",
      "Track evaluation history — see progress over time.",
      "Same quality bar as Answer Lab — structure + content feedback.",
      "Ideal when you write on paper but want digital tracking.",
    ],
    color: "indigo",
  },
  {
    icon: UserCircle,
    title: "Student Profiler",
    tagline: "Your prep snapshot in one view",
    simple: [
      "Capture attempt profile, focus areas, and goals.",
      "Helps mentors and the system tailor suggestions.",
      "Quick edits when your stage changes — prelims → mains, etc.",
    ],
    color: "violet",
  },
  {
    icon: Video,
    title: "Live Meeting",
    tagline: "Book sessions when you need a human mentor",
    simple: [
      "Join scheduled mentorship / consultation from the app.",
      "Complements AI Mentor for strategy and blockers.",
      "Links from home and help — no hunting for meeting links.",
    ],
    color: "cyan",
  },
];

const colorStyles: Record<
  FeatureColor,
  {
    icon: string;
    iconDark: string;
    glow: string;
    number: string;
  }
> = {
  blue: {
    icon: "bg-blue-50 text-blue-600",
    iconDark: "bg-blue-500/10 text-blue-300",
    glow: "bg-blue-500",
    number: "text-blue-500",
  },
  cyan: {
    icon: "bg-cyan-50 text-cyan-600",
    iconDark: "bg-cyan-500/10 text-cyan-300",
    glow: "bg-cyan-500",
    number: "text-cyan-500",
  },
  indigo: {
    icon: "bg-indigo-50 text-indigo-600",
    iconDark: "bg-indigo-500/10 text-indigo-300",
    glow: "bg-indigo-500",
    number: "text-indigo-500",
  },
  emerald: {
    icon: "bg-emerald-50 text-emerald-600",
    iconDark: "bg-emerald-500/10 text-emerald-300",
    glow: "bg-emerald-500",
    number: "text-emerald-500",
  },
  violet: {
    icon: "bg-violet-50 text-violet-600",
    iconDark: "bg-violet-500/10 text-violet-300",
    glow: "bg-violet-500",
    number: "text-violet-500",
  },
  amber: {
    icon: "bg-amber-50 text-amber-600",
    iconDark: "bg-amber-500/10 text-amber-300",
    glow: "bg-amber-500",
    number: "text-amber-500",
  },
  sky: {
    icon: "bg-sky-50 text-sky-600",
    iconDark: "bg-sky-500/10 text-sky-300",
    glow: "bg-sky-500",
    number: "text-sky-500",
  },
  rose: {
    icon: "bg-rose-50 text-rose-600",
    iconDark: "bg-rose-500/10 text-rose-300",
    glow: "bg-rose-500",
    number: "text-rose-500",
  },
};

export const FeaturesPage = () => {
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
            className={`absolute inset-0 opacity-[0.03] ${
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
            MentorsDaily Platform
          </div>

          {/* Heading */}

          <h1
            className={`mx-auto max-w-4xl text-3xl font-black leading-[1.05] tracking-tight sm:text-4xl md:text-5xl lg:text-6xl ${
              dark ? "text-white" : "text-slate-950"
            }`}
          >
            Everything you need to
            <span className="block bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
              prepare for UPSC smarter.
            </span>
          </h1>

          {/* Description */}

          <p
            className={`mx-auto mt-5 max-w-3xl text-sm leading-6 md:text-base md:leading-7 ${
              dark ? "text-slate-400" : "text-slate-600"
            }`}
          >
            From daily answer writing and AI evaluation to current affairs,
            prelims practice, analytics and planning — MentorsDaily brings
            your preparation into one focused workspace.
          </p>

          {/* Stats */}

          <div className="mx-auto mt-8 grid max-w-2xl grid-cols-3 gap-2 sm:gap-4">
            {[
              {
                value: "11+",
                label: "Core features",
                icon: Layers3,
              },
              {
                value: "24/7",
                label: "AI support",
                icon: Bot,
              },
              {
                value: "1",
                label: "Unified workspace",
                icon: Target,
              },
            ].map(({ value, label, icon: Icon }) => (
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
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          FEATURE GRID
      ========================================================= */}

      <section
        className={`relative overflow-hidden py-14 transition-colors md:py-20 ${
          dark ? "bg-[#050b18]" : "bg-slate-50"
        }`}
      >
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          {/* Section header */}

          <div className="mb-9 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p
                className={`text-[10px] font-bold uppercase tracking-[0.18em] ${
                  dark ? "text-blue-400" : "text-blue-600"
                }`}
              >
                Explore the platform
              </p>

              <h2
                className={`mt-1.5 text-2xl font-black tracking-tight sm:text-3xl ${
                  dark ? "text-white" : "text-slate-950"
                }`}
              >
                One workspace. Every part of your prep.
              </h2>
            </div>

            <p
              className={`max-w-md text-xs leading-5 sm:text-right ${
                dark ? "text-slate-500" : "text-slate-500"
              }`}
            >
              Designed to help you write, practice, analyse and improve
              without constantly switching between resources.
            </p>
          </div>

          {/* Cards */}

          <div className="grid gap-5 md:grid-cols-2">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              const styles = colorStyles[feature.color];

              const featured = index === 0;

              return (
                <Card
                  key={feature.title}
                  className={`group relative overflow-hidden rounded-[26px] border transition-all duration-300 hover:-translate-y-1 ${
                    featured ? "md:col-span-2" : ""
                  } ${
                    dark
                      ? "border-slate-800 bg-slate-900/70 hover:border-blue-500/30 hover:bg-slate-900"
                      : "border-slate-200 bg-white shadow-sm hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/[0.06]"
                  }`}
                >
                  {/* Top gradient */}

                  <div
                    className={`absolute left-0 right-0 top-0 h-[2px] opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${styles.glow}`}
                  />

                  {/* Glow */}

                  <div
                    className={`pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full opacity-[0.04] blur-3xl transition-opacity duration-300 group-hover:opacity-[0.1] ${styles.glow}`}
                  />

                  <CardContent
                    className={`relative ${
                      featured ? "p-6 md:p-8" : "p-5 md:p-6"
                    }`}
                  >
                    <div
                      className={`flex flex-col ${
                        featured
                          ? "md:flex-row md:items-start md:gap-8"
                          : ""
                      }`}
                    >
                      {/* Icon */}

                      <div
                        className={`relative mb-5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-105 ${
                          dark ? styles.iconDark : styles.icon
                        }`}
                      >
                        <Icon
                          className="h-5 w-5"
                          strokeWidth={1.8}
                        />

                        <span
                          className={`absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[8px] font-black shadow ${
                            styles.number
                          }`}
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        {/* Title */}

                        <div className="flex flex-wrap items-center gap-2">
                          <h3
                            className={`text-lg font-bold tracking-tight md:text-xl ${
                              dark ? "text-white" : "text-slate-900"
                            }`}
                          >
                            {feature.title}
                          </h3>

                          {featured && (
                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[8px] font-bold uppercase tracking-wider text-blue-600">
                              Core feature
                            </span>
                          )}
                        </div>

                        {/* Tagline */}

                        <p
                          className={`mt-1.5 text-[11px] font-semibold md:text-xs ${
                            dark ? "text-blue-400" : "text-blue-600"
                          }`}
                        >
                          {feature.tagline}
                        </p>

                        {/* Points */}

                        <div
                          className={`mt-5 grid gap-x-6 gap-y-3 ${
                            featured
                              ? "md:grid-cols-2"
                              : "grid-cols-1"
                          }`}
                        >
                          {feature.simple.map((point) => (
                            <div
                              key={point}
                              className={`flex items-start gap-2.5 text-xs leading-5 ${
                                dark
                                  ? "text-slate-400"
                                  : "text-slate-600"
                              }`}
                            >
                              <span
                                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                                  dark
                                    ? "bg-blue-500/10"
                                    : "bg-blue-50"
                                }`}
                              >
                                <Check
                                  className="h-3 w-3 text-blue-500"
                                  strokeWidth={3}
                                />
                              </span>

                              <span>{point}</span>
                            </div>
                          ))}
                        </div>

                        {/* Bottom */}

                        <div
                          className={`mt-5 flex items-center justify-between border-t pt-4 ${
                            dark
                              ? "border-slate-800"
                              : "border-slate-100"
                          }`}
                        >
                          <span
                            className={`text-[9px] font-semibold uppercase tracking-[0.15em] ${
                              dark
                                ? "text-slate-600"
                                : "text-slate-400"
                            }`}
                          >
                            MentorsDaily feature
                          </span>

                          <ArrowRight
                            className={`h-3.5 w-3.5 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100 ${
                              dark
                                ? "text-blue-400"
                                : "text-blue-600"
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================
          BOTTOM CTA
      ========================================================= */}

      <section
        className={`relative overflow-hidden border-t py-12 md:py-16 ${
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
            <div className="pointer-events-none absolute -left-20 -top-20 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />

            <div className="pointer-events-none absolute -bottom-20 -right-20 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl" />

            <div className="relative">
              <div
                className={`mx-auto flex h-10 w-10 items-center justify-center rounded-xl ${
                  dark
                    ? "bg-blue-500/10 text-blue-300"
                    : "bg-blue-100 text-blue-600"
                }`}
              >
                <Sparkles className="h-5 w-5" />
              </div>

              <p
                className={`mt-4 text-[10px] font-bold uppercase tracking-[0.18em] ${
                  dark ? "text-blue-300" : "text-blue-600"
                }`}
              >
                Your preparation, organised
              </p>

              <h2
                className={`mt-2 text-2xl font-black tracking-tight md:text-3xl ${
                  dark ? "text-white" : "text-slate-950"
                }`}
              >
                Stop searching. Start preparing.
              </h2>

              <p
                className={`mx-auto mt-3 max-w-xl text-xs leading-5 md:text-sm ${
                  dark ? "text-slate-400" : "text-slate-600"
                }`}
              >
                Write answers, practise MCQs, understand your performance,
                plan your study and get AI-powered support — all from one
                dashboard.
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <a
                  href="https://wa.me/918766233193?text=Hi!%20I%27m%20interested%20in%20MentorsDaily."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex h-10 items-center gap-2 rounded-xl bg-[#2563eb] px-5 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 hover:bg-[#1d4ed8]"
                >
                  Get Started
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </a>

                <a
                  href="#features"
                  className={`inline-flex h-10 items-center rounded-xl border px-5 text-xs font-semibold ${
                    dark
                      ? "border-slate-700 bg-slate-900 text-slate-300 hover:border-blue-500/30"
                      : "border-slate-200 bg-white text-slate-700 hover:border-blue-200"
                  }`}
                >
                  Explore Features
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </>
  );
};