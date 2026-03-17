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
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { useTheme } from "../../hooks/useTheme";

const features = [
  {
    icon: MessageCircleQuestion,
    title: "Answer Lab",
    subtitle: "Write daily, same-day feedback",
    description: "Timer, marks, word limit. Structure hints. AI score + line-by-line feedback.",
    bullets: ["Mains-style questions", "Instant evaluation", "Repeat daily"],
  },
  {
    icon: LineChart,
    title: "Performance Analytics",
    subtitle: "Strong vs weak — with data",
    description: "Paper / topic / difficulty. Trends over attempts. PYQ focus. Streaks.",
    bullets: ["Test-wise breakdown", "Improvement trends", "PYQ lens"],
  },
  {
    icon: Newspaper,
    title: "Current Affairs Lab",
    subtitle: "News → GS → Mains angles",
    description: "Daily briefings, syllabus-linked, mains-ready angles. Notes you understand.",
    bullets: ["Daily brief", "GS-linked", "Mains angles"],
  },
  {
    icon: BookOpen,
    title: "Concept Simplifier",
    subtitle: "Crisp, revise-friendly notes",
    description: "NCERT + standards + current. Book-backed. Quick recap before exam.",
    bullets: ["Static + dynamic", "Clear sources", "Fast revision"],
  },
  {
    icon: LayoutDashboard,
    title: "Student dashboard",
    subtitle: "One home for prep",
    description: "Home hub: Answer Lab, Prelims, Analytics, CA, Mentor, planner — one place.",
    bullets: ["All modules linked", "Due today", "Pro & profile"],
  },
  {
    icon: ClipboardList,
    title: "Prelims practice",
    subtitle: "MCQs + mocks + history",
    description: "Custom prelims tests, scheduled mocks, revisit attempts and solutions.",
    bullets: ["Topic-wise MCQ", "Prelims mock", "Test history"],
  },
  {
    icon: Bot,
    title: "AI Mentor",
    subtitle: "UPSC-style reasoning chat",
    description: "Doubt clearing and structured explanations — not generic search answers.",
    bullets: ["GS reasoning", "Follow-up chat", "24/7 from app"],
  },
  {
    icon: CalendarDays,
    title: "Study planner",
    subtitle: "Daily & weekly plans",
    description: "Plan around mocks and mains days; align with what analytics shows you need.",
    bullets: ["Sprint planning", "Timeline view", "Data-aware"],
  },
  {
    icon: FileSearch,
    title: "Copy evaluation",
    subtitle: "Mains copies + history",
    description: "Upload or track evaluations; same feedback quality as Answer Lab.",
    bullets: ["Structured feedback", "History tracked", "Mains focused"],
  },
];

export const FeatureGrid = () => {
  const { theme } = useTheme();
  const dark = theme === "dark";

  return (
    <section
      id="features"
      className={`py-12 transition-colors md:py-16 lg:py-20 ${
        dark ? "bg-[#030712]" : "bg-slate-50"
      }`}
    >
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="mb-8 text-center md:mb-10">
          <h2
            className={`text-xl font-bold tracking-tight md:text-2xl lg:text-3xl ${
              dark ? "text-slate-50" : "text-slate-900"
            }`}
          >
            Features — in simple terms
          </h2>
          <p
            className={`mt-2 max-w-2xl mx-auto text-sm md:mt-3 md:text-base ${
              dark ? "text-slate-400" : "text-slate-600"
            }`}
          >
            Answer Lab, Analytics, Current Affairs, Concept Simplifier — plus dashboard, prelims, AI
            Mentor, planner & copy evaluation. Same as your logged-in portal.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 md:gap-5 lg:gap-6">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className={`h-full rounded-2xl border-2 transition-all duration-200 hover:shadow-lg ${
                dark
                  ? "border-slate-700/60 bg-slate-800/50 text-slate-50 shadow-lg hover:border-[#2563eb]/30"
                  : "border-slate-200/80 bg-white text-slate-900 shadow-md hover:border-[#2563eb]/20 hover:shadow-xl"
              }`}
            >
              <CardHeader className="pb-2 md:pb-3 pt-5 md:pt-6 px-5 md:px-6">
                <div
                  className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl md:h-11 md:w-11 ${
                    dark ? "bg-[#2563eb]/20 text-blue-300" : "bg-[#2563eb]/10 text-[#2563eb]"
                  }`}
                >
                  <feature.icon className="h-5 w-5 md:h-5 md:w-5" strokeWidth={1.75} />
                </div>
                <CardTitle
                  className={`text-sm font-bold md:text-base ${dark ? "text-slate-50" : "text-slate-900"}`}
                >
                  {feature.title}
                </CardTitle>
                <p
                  className={`mt-1 text-[11px] font-medium md:text-xs ${
                    dark ? "text-[#2563eb]/90" : "text-[#2563eb]"
                  }`}
                >
                  {feature.subtitle}
                </p>
                <CardDescription
                  className={`mt-2 text-[11px] leading-relaxed md:text-xs ${
                    dark ? "text-slate-400" : "text-slate-600"
                  }`}
                >
                  {feature.description}
                </CardDescription>
              </CardHeader>
              <CardContent className={`space-y-2 pt-0 px-5 md:px-6 pb-5 md:pb-6 text-[11px] md:text-xs ${
                dark ? "text-slate-300" : "text-slate-700"
              }`}>
                {feature.bullets.map((b) => (
                  <div key={b} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#2563eb]" />
                    <span>{b}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
