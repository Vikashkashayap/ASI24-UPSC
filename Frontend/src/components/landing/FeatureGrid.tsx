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
      className={`py-10 transition-colors md:py-14 lg:py-18 ${
        dark ? "bg-[#030712]" : "bg-slate-50"
      }`}
    >
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="mb-6 text-center md:mb-8">
          <h2
            className={`text-base font-semibold tracking-tight md:text-lg lg:text-xl ${
              dark ? "text-slate-50" : "text-slate-900"
            }`}
          >
            Features — in simple terms
          </h2>
          <p
            className={`mt-1.5 text-xs md:mt-2 md:text-sm ${
              dark ? "text-slate-300" : "text-slate-600"
            }`}
          >
            Answer Lab, Analytics, Current Affairs, Concept Simplifier — plus dashboard, prelims, AI
            Mentor, planner & copy evaluation. Same as your logged-in portal.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 md:gap-4">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className={`h-full rounded-2xl ${
                dark
                  ? "border-slate-700/60 bg-slate-900/50 text-slate-50 shadow-xl"
                  : "border-slate-200 bg-white text-slate-900 shadow-md"
              }`}
            >
              <CardHeader className="pb-2 md:pb-3">
                <div
                  className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-xl md:mb-3 md:h-9 md:w-9 ${
                    dark ? "bg-blue-500/20 text-blue-200" : "bg-blue-100 text-[#2563eb]"
                  }`}
                >
                  <feature.icon className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </div>
                <CardTitle
                  className={`text-xs md:text-sm ${dark ? "text-slate-50" : "text-slate-900"}`}
                >
                  {feature.title}
                </CardTitle>
                <p
                  className={`mt-0.5 text-[10px] font-medium md:text-[11px] ${
                    dark ? "text-slate-300" : "text-slate-600"
                  }`}
                >
                  {feature.subtitle}
                </p>
                <CardDescription
                  className={`mt-2 text-[10px] leading-relaxed md:text-[11px] ${
                    dark ? "text-slate-300" : "text-slate-600"
                  }`}
                >
                  {feature.description}
                </CardDescription>
              </CardHeader>
              <CardContent className={`space-y-1.5 pt-0 text-[10px] md:text-[11px] ${
                dark ? "text-emerald-300/95" : "text-emerald-800"
              }`}>
                {feature.bullets.map((b) => (
                  <div key={b} className="flex items-center gap-1.5">
                    <span
                      className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                        dark ? "bg-emerald-400" : "bg-emerald-500"
                      }`}
                    />
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
