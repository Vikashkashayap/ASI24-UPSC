import { Target, Heart, Zap } from "lucide-react";
import { LandingFooter } from "../../components/landing/LandingFooter";
import { SketchIllustration } from "../../components/landing/SketchIllustration";
import { useTheme } from "../../hooks/useTheme";
import { Card, CardContent } from "../../components/ui/card";

const values = [
  {
    icon: Target,
    sketch: "circle" as const,
    title: "Focus",
    desc: "No scattered resources. One workspace — answer writing, analytics, current affairs. Less clutter, right stuff.",
  },
  {
    icon: Heart,
    sketch: "circle" as const,
    title: "Aspirant-first",
    desc: "For working professionals, freshers, repeaters. Busy schedule? Even 2 hours is enough.",
  },
  {
    icon: Zap,
    sketch: "bulb" as const,
    title: "Clarity",
    desc: "No guesswork. Data-driven — PYQ trends, weak areas, improvement graph. Know what to study.",
  },
];

export const AboutPage = () => {
  const { theme } = useTheme();

  return (
    <>
      {/* Hero */}
      <section className={`border-b py-12 md:py-16 transition-colors ${
        theme === "dark" ? "border-slate-800 bg-[#030712]" : "border-slate-200 bg-slate-50"
      }`}>
        <div className="mx-auto max-w-6xl px-4 md:px-6 text-center">
          <div className="inline-flex mb-4">
            <SketchIllustration type="circle" className="w-12 h-12" />
          </div>
          <h1 className={`text-2xl md:text-3xl font-bold tracking-tight ${
            theme === "dark" ? "text-slate-50" : "text-slate-900"
          }`}>
            Who we are
          </h1>
          <p className={`mt-3 max-w-2xl mx-auto text-sm md:text-base ${
            theme === "dark" ? "text-slate-300" : "text-slate-600"
          }`}>
            UPSC aspirants need calm, focused preparation. We built MentorsDaily — a team of mentors, builders and technologists.
          </p>
        </div>
      </section>

      {/* Mission - simple */}
      <section className={`py-12 md:py-16 transition-colors ${
        theme === "dark" ? "bg-[#0b0618]" : "bg-white"
      }`}>
        <div className="mx-auto max-w-4xl px-4 md:px-6">
          <Card className={`overflow-hidden rounded-[24px] ${
            theme === "dark"
              ? "border-slate-700/60 bg-slate-900/50"
              : "border-slate-200 bg-white shadow-lg"
          }`}>
            <CardContent className="p-8 md:p-12 text-center">
              <h2 className={`text-xl md:text-2xl font-semibold mb-4 ${
                theme === "dark" ? "text-slate-50" : "text-slate-900"
              }`}>
                Our simple goal
              </h2>
              <p className={`text-base md:text-lg leading-relaxed ${
                theme === "dark" ? "text-slate-200" : "text-slate-700"
              }`}>
                Tired of PDFs, Telegram, random notes — scattered everywhere? We want you to <strong>write answers, get feedback, view analytics</strong> — all in one place. Less noise, more intelligence.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Values */}
      <section className={`py-12 md:py-16 transition-colors ${
        theme === "dark" ? "bg-[#070313]" : "bg-slate-50"
      }`}>
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <h2 className={`text-lg font-semibold text-center mb-8 ${
            theme === "dark" ? "text-slate-50" : "text-slate-900"
          }`}>
            What matters to us
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {values.map((v) => (
              <Card
                key={v.title}
                className={`overflow-hidden rounded-[20px] ${
                  theme === "dark"
                    ? "border-slate-700/50 bg-slate-900/50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
                    theme === "dark" ? "bg-black/40" : "bg-slate-100"
                  }`}>
                    <SketchIllustration type={v.sketch} className="w-7 h-7" />
                  </div>
                  <h3 className={`font-semibold mb-2 ${
                    theme === "dark" ? "text-slate-50" : "text-slate-900"
                  }`}>{v.title}</h3>
                  <p className={`text-sm ${
                    theme === "dark" ? "text-slate-300" : "text-slate-600"
                  }`}>{v.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className={`py-12 md:py-16 border-t transition-colors ${
        theme === "dark" ? "border-slate-800 bg-[#030712]" : "border-slate-200 bg-white"
      }`}>
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          {/* <h2 className={`text-lg font-semibold text-center mb-8 ${
            theme === "dark" ? "text-slate-50" : "text-slate-900"
          }`}>
            Team
          </h2> */}
          {/* <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <Card className={`overflow-hidden rounded-[24px] ${
              theme === "dark"
                ? "border-slate-700/60 bg-slate-900/50"
                : "border-slate-200 bg-white shadow-lg"
            }`}>
              <CardContent className="p-6 md:p-8 flex flex-col items-center text-center">
                <div className={`w-20 h-20 rounded-full mb-4 ${
                  theme === "dark"
                    ? "bg-[radial-gradient(circle,rgba(37,99,235,0.3),transparent)] border-2 border-[#2563eb]/40"
                    : "bg-[#2563eb]/10 border border-[#2563eb]/30"
                }`} />
                <h3 className={`font-semibold ${
                  theme === "dark" ? "text-slate-50" : "text-slate-900"
                }`}>Founder 1</h3>
                <p className={`text-xs uppercase tracking-wider mt-1 ${
                  theme === "dark" ? "text-slate-400" : "text-slate-500"
                }`}>Product & Strategy</p>
                <p className={`mt-3 text-sm ${
                  theme === "dark" ? "text-slate-300" : "text-slate-600"
                }`}>
                  Has mentored aspirants and designed learning journeys. Fits busy schedules too.
                </p>
              </CardContent>
            </Card>
            <Card className={`overflow-hidden rounded-[24px] ${
              theme === "dark"
                ? "border-slate-700/60 bg-slate-900/50"
                : "border-slate-200 bg-white shadow-lg"
            }`}>
              <CardContent className="p-6 md:p-8 flex flex-col items-center text-center">
                <div className={`w-20 h-20 rounded-full mb-4 ${
                  theme === "dark"
                    ? "bg-[radial-gradient(circle,rgba(37,99,235,0.3),transparent)] border-2 border-[#2563eb]/40"
                    : "bg-[#2563eb]/10 border border-[#2563eb]/30"
                }`} />
                <h3 className={`font-semibold ${
                  theme === "dark" ? "text-slate-50" : "text-slate-900"
                }`}>Founder 2</h3>
                <p className={`text-xs uppercase tracking-wider mt-1 ${
                  theme === "dark" ? "text-slate-400" : "text-slate-500"
                }`}>AI & Engineering</p>
                <p className={`mt-3 text-sm ${
                  theme === "dark" ? "text-slate-300" : "text-slate-600"
                }`}>
                  Builds book-backed AI — feedback grounded in syllabus, no guesswork. Reliable systems.
                </p>
              </CardContent>
            </Card>
          </div> */}
        </div>
      </section>
      <LandingFooter />
    </>
  );
};
