import { MessageCircleQuestion, LineChart, Newspaper, BookOpen, Check } from "lucide-react";
import { LandingLayout } from "../../layouts/LandingLayout";
import { LandingFooter } from "../../components/landing/LandingFooter";
import { SketchIllustration } from "../../components/landing/SketchIllustration";
import { useTheme } from "../../hooks/useTheme";
import { Card, CardContent } from "../../components/ui/card";

const features = [
  {
    icon: MessageCircleQuestion,
    sketch: "pen" as const,
    title: "Answer Lab",
    tagline: "Write daily, get same-day feedback",
    simple: [
      "Set the timer — 7 min, 10 marks, 150 words. Just like the real exam.",
      "Get a question, write your answer. Structure hints guide you — intro, body, conclusion.",
      "Submit and AI evaluates instantly. Score plus line-by-line feedback.",
      "Fix mistakes the same day. Repeat tomorrow.",
    ],
    color: "fuchsia",
  },
  {
    icon: LineChart,
    sketch: "chart" as const,
    title: "Performance Analytics",
    tagline: "Know where you're strong, where you're weak",
    simple: [
      "View data for every test — paper-wise, topic-wise, difficulty-wise.",
      "Understand trends — how much improvement in your last 20 answers?",
      "PYQ data — which topics come up most? Focus there.",
      "Track your streak — build consistency.",
    ],
    color: "cyan",
  },
  {
    icon: Newspaper,
    sketch: "doc" as const,
    title: "Current Affairs Lab",
    tagline: "From news to mains angles — direct link",
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
    sketch: "bulb" as const,
    title: "Concept Simplifier",
    tagline: "Turn complex topics into simple notes",
    simple: [
      "Static + dynamic merge — NCERT, standard books + current context.",
      "Enter a topic, get crisp notes. Revise-friendly.",
      "Book-backed — no guesswork, sources are clear.",
      "Fast revision — quick recap before exams.",
    ],
    color: "emerald",
  },
];

export const FeaturesPage = () => {
  const { theme } = useTheme();

  return (
    <LandingLayout>
      {/* Hero */}
      <section className={`border-b py-12 md:py-16 transition-colors ${
        theme === "dark" ? "border-purple-900/70 bg-[#070313]" : "border-slate-200 bg-slate-50"
      }`}>
        <div className="mx-auto max-w-6xl px-4 md:px-6 text-center">
          <div className="inline-flex mb-4">
            <SketchIllustration type="pen" className="w-12 h-12" />
          </div>
          <h1 className={`text-2xl md:text-3xl font-bold tracking-tight ${
            theme === "dark" ? "text-slate-50" : "text-slate-900"
          }`}>
            Features — in simple terms
          </h1>
          <p className={`mt-3 max-w-2xl mx-auto text-sm md:text-base ${
            theme === "dark" ? "text-slate-300" : "text-slate-600"
          }`}>
            What does UPSCRH do? These 4 things — Answer Lab, Analytics, Current Affairs, and Concept Simplifier.
            Each explained in plain language.
          </p>
        </div>
      </section>

      {/* Feature cards - detailed */}
      <section className={`py-12 md:py-16 transition-colors ${
        theme === "dark" ? "bg-[#0b0618]" : "bg-white"
      }`}>
        <div className="mx-auto max-w-6xl px-4 md:px-6 space-y-12 md:space-y-16">
          {features.map((f, i) => (
            <Card
              key={f.title}
              className={`overflow-hidden rounded-[24px] ${
                theme === "dark"
                  ? "border-purple-800/60 bg-gradient-to-br from-[#0d0718] to-[#070313]"
                  : "border-slate-200 bg-white shadow-lg"
              }`}
            >
              <CardContent className="p-6 md:p-10">
                <div className="flex flex-col md:flex-row md:items-start gap-6 md:gap-10">
                  <div className={`flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-2xl flex items-center justify-center ${
                    theme === "dark" ? "bg-black/40" : "bg-slate-100"
                  }`}>
                    <SketchIllustration type={f.sketch} className="w-12 h-12 md:w-14 md:h-14" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <f.icon className={`w-5 h-5 ${
                        f.color === "fuchsia" ? "text-fuchsia-400" :
                        f.color === "cyan" ? "text-cyan-400" :
                        f.color === "indigo" ? "text-indigo-400" : "text-emerald-400"
                      }`} />
                      <h2 className={`text-xl md:text-2xl font-semibold ${
                        theme === "dark" ? "text-slate-50" : "text-slate-900"
                      }`}>{f.title}</h2>
                    </div>
                    <p className={`mt-2 text-sm font-medium ${
                      theme === "dark" ? "text-fuchsia-300" : "text-fuchsia-600"
                    }`}>{f.tagline}</p>
                    <ul className="mt-4 space-y-2">
                      {f.simple.map((point) => (
                        <li key={point} className="flex items-start gap-3">
                          <span className={`mt-1 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                            theme === "dark" ? "bg-emerald-500/20" : "bg-emerald-100"
                          }`}>
                            <Check className="w-3 h-3 text-emerald-500" />
                          </span>
                          <span className={`text-sm ${
                            theme === "dark" ? "text-slate-200" : "text-slate-700"
                          }`}>{point}</span>
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

      {/* Bottom CTA */}
      <section className={`py-10 border-t transition-colors ${
        theme === "dark" ? "border-purple-900/70 bg-[#050012]" : "border-slate-200 bg-slate-50"
      }`}>
        <div className="mx-auto max-w-6xl px-4 md:px-6 text-center">
          <p className={`text-sm ${
            theme === "dark" ? "text-slate-400" : "text-slate-600"
          }`}>
            Everything in one place — write answers, view analytics, read current affairs, clarify concepts.
          </p>
        </div>
      </section>
      <LandingFooter />
    </LandingLayout>
  );
};
