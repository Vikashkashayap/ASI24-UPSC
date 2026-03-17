import { Link } from "react-router-dom";
import { Target, Heart, Zap } from "lucide-react";
import { SketchIllustration } from "./SketchIllustration";
import { useTheme } from "../../hooks/useTheme";
import { Card, CardContent } from "../ui/card";

const values = [
  {
    icon: Target,
    title: "Focus",
    desc: "One workspace — answers, analytics, current affairs. Less clutter.",
  },
  {
    icon: Heart,
    title: "Aspirant-first",
    desc: "Working professionals to repeaters. Even 2 hours a day can work.",
  },
  {
    icon: Zap,
    title: "Clarity",
    desc: "PYQ trends, weak areas, improvement graph. Know what to study.",
  },
];

export const AboutSection = () => {
  const { theme } = useTheme();

  return (
    <section
      id="about"
      className={`py-16 transition-colors ${
        theme === "dark" ? "border-t border-slate-800 bg-[#030712]" : "border-t border-slate-200 bg-slate-50"
      }`}
    >
      <div className="mx-auto max-w-6xl px-4 text-center md:px-6">
        <div className="mb-4 inline-flex justify-center">
          <SketchIllustration type="circle" className="h-12 w-12" />
        </div>
        <h2
          className={`text-xl font-bold tracking-tight md:text-2xl ${
            theme === "dark" ? "text-slate-50" : "text-slate-900"
          }`}
        >
          Who we are
        </h2>
        <p
          className={`mx-auto mt-3 max-w-2xl text-sm md:text-base ${
            theme === "dark" ? "text-slate-300" : "text-slate-600"
          }`}
        >
          UPSC aspirants need calm, focused preparation. We built MentorsDaily — mentors,
          builders and technologists in one place.
        </p>

        <div className="mt-10 grid gap-4 text-left sm:grid-cols-2 lg:grid-cols-3">
          {values.map(({ icon: Icon, title, desc }) => (
            <Card
              key={title}
              className={`overflow-hidden rounded-2xl ${
                theme === "dark"
                  ? "border-slate-700/60 bg-slate-900/50"
                  : "border-slate-200 bg-white shadow-md"
              }`}
            >
              <CardContent className="p-5">
                <Icon
                  className={`mb-3 h-8 w-8 ${
                    theme === "dark" ? "text-[#2563eb]" : "text-[#2563eb]"
                  }`}
                  aria-hidden
                />
                <h3
                  className={`font-semibold ${
                    theme === "dark" ? "text-slate-100" : "text-slate-900"
                  }`}
                >
                  {title}
                </h3>
                <p
                  className={`mt-2 text-xs leading-relaxed md:text-sm ${
                    theme === "dark" ? "text-slate-400" : "text-slate-600"
                  }`}
                >
                  {desc}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Link
          to="/about"
          className={`mt-8 inline-flex text-sm font-semibold underline-offset-4 hover:underline ${
            theme === "dark" ? "text-blue-400" : "text-[#2563eb]"
          }`}
        >
          Read more about us →
        </Link>
      </div>
    </section>
  );
};
