import { BookOpen, LineChart, MessageCircleQuestion, Newspaper } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { useTheme } from "../../hooks/useTheme";

const features = [
  {
    icon: MessageCircleQuestion,
    title: "Answer Lab",
    subtitle: "Daily mains practice",
    description: "Timed, word-limited answer writing with structure nudges for GS and Essay.",
    variant:
      "bg-[radial-gradient(circle_at_top_left,_rgba(251,113,133,0.25),_transparent_55%)] from-slate-900 to-slate-950",
  },
  {
    icon: LineChart,
    title: "Performance Analytics",
    subtitle: "PYQ-driven insights",
    description: "See trends across papers, topics and difficulty — not just isolated marks.",
    variant:
      "bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.25),_transparent_55%)] from-slate-950 to-slate-950",
  },
  {
    icon: Newspaper,
    title: "Current Affairs Lab",
    subtitle: "Smart news to notes",
    description: "Daily briefings linked to GS syllabus with ready-to-use mains angles.",
    variant:
      "bg-[radial-gradient(circle_at_top_right,_rgba(129,140,248,0.25),_transparent_55%)] from-slate-900 to-slate-950",
  },
  {
    icon: BookOpen,
    title: "Concept Simplifier",
    subtitle: "Static + dynamic merge",
    description: "Turn complex topics into crisp, book-backed notes you can revise fast.",
    variant:
      "bg-[radial-gradient(circle_at_top_left,_rgba(52,211,153,0.3),_transparent_55%)] from-emerald-950 to-slate-950",
  },
];

export const FeatureGrid = () => {
  const { theme } = useTheme();
  
  return (
    <section id="features" className={`py-10 md:py-14 lg:py-18 transition-colors ${
      theme === "dark" ? "bg-[#030712]" : "bg-slate-50"
    }`}>
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="mb-6 md:mb-8 text-center">
          <h2 className={`text-base md:text-lg font-semibold tracking-tight lg:text-xl ${
            theme === "dark" ? "text-slate-50" : "text-slate-900"
          }`}>Our Features</h2>
          <p className={`mt-1.5 md:mt-2 text-xs md:text-sm ${
            theme === "dark" ? "text-slate-300" : "text-slate-600"
          }`}>
            A complete UPSC companion — from answer writing to analytics and current affairs.
          </p>
        </div>
        <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className={`h-full rounded-2xl ${
                theme === "dark"
                  ? "border-slate-700/60 bg-slate-900/50 text-slate-50 shadow-xl"
                  : "border-slate-200 bg-white text-slate-900 shadow-md"
              }`}
            >
              <CardHeader className="pb-3 md:pb-4">
                <div className={`mb-3 md:mb-4 inline-flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-xl ${
                  theme === "dark"
                    ? "bg-blue-500/20 text-blue-200"
                    : "bg-blue-100 text-[#2563eb]"
                }`}>
                  <feature.icon className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </div>
                <CardTitle className={`text-xs md:text-sm ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>{feature.title}</CardTitle>
                <p className={`mt-0.5 text-[10px] md:text-[11px] font-medium ${
                  theme === "dark" ? "text-slate-300" : "text-slate-600"
                }`}>{feature.subtitle}</p>
                <CardDescription className={`mt-2 md:mt-3 text-[10px] md:text-[11px] leading-relaxed ${
                  theme === "dark" ? "text-slate-300" : "text-slate-600"
                }`}>
                  {feature.description}
                </CardDescription>
              </CardHeader>
              <CardContent className={`pt-0 text-[10px] md:text-[11px] ${
                theme === "dark" ? "text-emerald-300" : "text-emerald-700"
              }`}>
                <span className="inline-flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full flex-shrink-0 ${
                    theme === "dark" ? "bg-emerald-400" : "bg-emerald-500"
                  }`} />
                  <span>Built for serious aspirants.</span>
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

