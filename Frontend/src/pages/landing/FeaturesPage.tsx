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
} from "lucide-react";
import { LandingFooter } from "../../components/landing/LandingFooter";
import { SketchIllustration } from "../../components/landing/SketchIllustration";
import { useTheme } from "../../hooks/useTheme";
import { Card, CardContent } from "../../components/ui/card";

type Sketch = "pen" | "chart" | "doc" | "bulb" | "circle" | "rocket" | "quote" | "arrow";

const features: {
  icon: typeof MessageCircleQuestion;
  sketch: Sketch;
  title: string;
  tagline: string;
  simple: string[];
  color: "fuchsia" | "cyan" | "indigo" | "emerald" | "violet" | "amber" | "sky" | "rose";
}[] = [
  {
    icon: MessageCircleQuestion,
    sketch: "pen",
    title: "Answer Lab",
    tagline: "Write daily, get same-day feedback",
    simple: [
      "Set for Mains — timer, marks, word limit (e.g. 7 min, 10 marks, 150 words). Just like the real exam.",
      "Get a question, write your answer. Structure hints guide you — intro, body, conclusion.",
      "Submit and AI evaluates instantly. Score plus line-by-line feedback.",
      "Fix mistakes the same day. Repeat tomorrow.",
    ],
    color: "fuchsia",
  },
  {
    icon: LineChart,
    sketch: "chart",
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
    sketch: "doc",
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
    sketch: "bulb",
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
    sketch: "circle",
    title: "Student portal & dashboard",
    tagline: "One home for your entire prep",
    simple: [
      "Home hub — jump to Answer Lab, Prelims, Analytics, CA, Mentor in one click.",
      "See what's due today — mocks, planner tasks, recent evaluations.",
      "Profile & subscription — MentorsDaily Pro, help, and settings in one place.",
      "Built as India's AI student portal — less tab-hopping, more studying.",
    ],
    color: "violet",
  },
  {
    icon: ClipboardList,
    sketch: "rocket",
    title: "Prelims practice",
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
    sketch: "quote",
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
    sketch: "arrow",
    title: "Study planner",
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
    sketch: "doc",
    title: "Copy evaluation",
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
    sketch: "circle",
    title: "Student profiler",
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
    sketch: "quote",
    title: "Live meeting",
    tagline: "Book sessions when you need a human mentor",
    simple: [
      "Join scheduled mentorship / consultation from the app.",
      "Complements AI Mentor for strategy and blockers.",
      "Links from home and help — no hunting for meeting links.",
    ],
    color: "cyan",
  },
];

const colorIcon = (c: (typeof features)[0]["color"], dark: boolean) => {
  const map = {
    fuchsia: dark ? "text-blue-400" : "text-[#2563eb]",
    cyan: dark ? "text-cyan-400" : "text-cyan-600",
    indigo: dark ? "text-indigo-400" : "text-indigo-600",
    emerald: dark ? "text-blue-400" : "text-[#2563eb]",
    violet: dark ? "text-violet-400" : "text-violet-600",
    amber: dark ? "text-amber-400" : "text-amber-600",
    sky: dark ? "text-sky-400" : "text-sky-600",
    rose: dark ? "text-rose-400" : "text-rose-600",
  };
  return map[c];
};

export const FeaturesPage = () => {
  const { theme } = useTheme();
  const dark = theme === "dark";

  return (
    <>
      <section
        className={`border-b py-12 md:py-16 transition-colors ${
          dark ? "border-slate-800 bg-[#030712]" : "border-slate-200 bg-slate-50"
        }`}
      >
        <div className="mx-auto max-w-6xl px-4 md:px-6 text-center">
          <div className="mb-4 inline-flex">
            <SketchIllustration type="pen" className="h-12 w-12" />
          </div>
          <h1
            className={`text-2xl font-bold tracking-tight md:text-3xl ${
              dark ? "text-slate-50" : "text-slate-900"
            }`}
          >
            Features — in simple terms
          </h1>
          <p
            className={`mx-auto mt-3 max-w-3xl text-sm md:text-base ${
              dark ? "text-slate-300" : "text-slate-600"
            }`}
          >
            What does MentorsDaily do? Answer Lab, Analytics, Current Affairs, Concept Simplifier — plus{" "}
            <strong className={dark ? "text-slate-200" : "text-slate-800"}>
              prelims practice, student dashboard, AI Mentor, study planner, copy evaluation
            </strong>
            , profiler, and live meetings. Each block below is on your portal today.
          </p>
        </div>
      </section>

      <section
        className={`py-12 md:py-16 transition-colors ${dark ? "bg-[#0b0618]" : "bg-white"}`}
      >
        <div className="mx-auto max-w-6xl space-y-12 px-4 md:space-y-16 md:px-6">
          {features.map((f) => (
            <Card
              key={f.title}
              className={`overflow-hidden rounded-[24px] ${
                dark
                  ? "border-slate-700/60 bg-slate-900/50"
                  : "border-slate-200 bg-white shadow-lg"
              }`}
            >
              <CardContent className="p-6 md:p-10">
                <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-10">
                  <div
                    className={`flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl md:h-24 md:w-24 ${
                      dark ? "bg-black/40" : "bg-slate-100"
                    }`}
                  >
                    <SketchIllustration type={f.sketch} className="h-12 w-12 md:h-14 md:w-14" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <f.icon className={`h-5 w-5 ${colorIcon(f.color, dark)}`} />
                      <h2
                        className={`text-xl font-semibold md:text-2xl ${
                          dark ? "text-slate-50" : "text-slate-900"
                        }`}
                      >
                        {f.title}
                      </h2>
                    </div>
                    <p
                      className={`mt-2 text-sm font-medium ${
                        dark ? "text-blue-400" : "text-[#2563eb]"
                      }`}
                    >
                      {f.tagline}
                    </p>
                    <ul className="mt-4 space-y-2">
                      {f.simple.map((point) => (
                        <li key={point} className="flex items-start gap-3">
                          <span
                            className={`mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${
                              dark ? "bg-[#2563eb]/20" : "bg-[#2563eb]/10"
                            }`}
                          >
                            <Check className="h-3 w-3 text-[#2563eb]" />
                          </span>
                          <span
                            className={`text-sm ${dark ? "text-slate-200" : "text-slate-700"}`}
                          >
                            {point}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section
        className={`border-t py-10 transition-colors ${
          dark ? "border-slate-800 bg-[#030712]" : "border-slate-200 bg-slate-50"
        }`}
      >
        <div className="mx-auto max-w-6xl px-4 text-center md:px-6">
          <p className={`text-sm ${dark ? "text-slate-400" : "text-slate-600"}`}>
            Everything in one student portal — write answers, run prelims, view analytics, read current
            affairs, plan your week, chat with AI Mentor, evaluate copies, and join live sessions.
          </p>
        </div>
      </section>
      <LandingFooter />
    </>
  );
};
