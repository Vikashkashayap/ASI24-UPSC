import { Quote } from "lucide-react";
import { LandingLayout } from "../../layouts/LandingLayout";
import { LandingFooter } from "../../components/landing/LandingFooter";
import { SketchIllustration } from "../../components/landing/SketchIllustration";
import { useTheme } from "../../hooks/useTheme";
import { Card, CardContent } from "../../components/ui/card";

const testimonials = [
  {
    name: "Rahul Nair",
    role: "UPSC 2026 Candidate",
    quote: "Analytics showed me I was spending too much time on low-yield topics. Now my answer practice is sharply focused.",
    highlight: "Less time waste, more focus",
  },
  {
    name: "Ananya Gupta",
    role: "UPSC CSE Aspirant, Delhi",
    quote: "Same-day evaluation and feedback. I fix wrong answers right away. It feels like having a mentor by my side.",
    highlight: "Same-day mistake fix",
  },
  {
    name: "Karthik Iyer",
    role: "Working Professional",
    quote: "I only get 2–3 hours a day. UPSCRH ensures that time goes into practice, not hunting for resources.",
    highlight: "Working aspirant friendly",
  },
  {
    name: "Priya Sharma",
    role: "First attempt, 2026",
    quote: "Answer Lab gave me confidence. I used to hesitate before writing. Now I write 1–2 answers daily.",
    highlight: "Consistent practice",
  },
];

export const TestimonialsPage = () => {
  const { theme } = useTheme();

  return (
    <LandingLayout>
      {/* Hero */}
      <section className={`border-b py-12 md:py-16 transition-colors ${
        theme === "dark" ? "border-purple-900/70 bg-[#070313]" : "border-slate-200 bg-slate-50"
      }`}>
        <div className="mx-auto max-w-6xl px-4 md:px-6 text-center">
          <div className="inline-flex mb-4">
            <SketchIllustration type="quote" className="w-12 h-12" />
          </div>
          <h1 className={`text-2xl md:text-3xl font-bold tracking-tight ${
            theme === "dark" ? "text-slate-50" : "text-slate-900"
          }`}>
            What aspirants say
          </h1>
          <p className={`mt-3 max-w-2xl mx-auto text-sm md:text-base ${
            theme === "dark" ? "text-slate-300" : "text-slate-600"
          }`}>
            Real aspirants — working professionals, freshers, repeaters. Their experience in their own words.
          </p>
        </div>
      </section>

      {/* Testimonial cards */}
      <section className={`py-12 md:py-16 transition-colors ${
        theme === "dark" ? "bg-[#0b0618]" : "bg-white"
      }`}>
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            {testimonials.map((t) => (
              <Card
                key={t.name}
                className={`overflow-hidden rounded-[24px] ${
                  theme === "dark"
                    ? "border-purple-800/60 bg-gradient-to-br from-[#0d0718] via-[#080414] to-[#0a1820]"
                    : "border-slate-200 bg-white shadow-lg"
                }`}
              >
                <CardContent className="p-6 md:p-8">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
                    theme === "dark" ? "bg-fuchsia-500/10" : "bg-fuchsia-100"
                  }`}>
                    <Quote className={`w-5 h-5 ${
                      theme === "dark" ? "text-fuchsia-300" : "text-fuchsia-600"
                    }`} />
                  </div>
                  <span className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full mb-3 ${
                    theme === "dark" ? "bg-emerald-500/20 text-emerald-300" : "bg-emerald-100 text-emerald-700"
                  }`}>
                    {t.highlight}
                  </span>
                  <p className={`text-sm md:text-base leading-relaxed ${
                    theme === "dark" ? "text-slate-200" : "text-slate-700"
                  }`}>
                    {t.quote}
                  </p>
                  <div className="mt-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${
                      theme === "dark"
                        ? "bg-gradient-to-br from-fuchsia-500/30 to-emerald-500/30"
                        : "bg-gradient-to-br from-fuchsia-200 to-emerald-200"
                    }`} />
                    <div>
                      <p className={`font-semibold text-sm ${
                        theme === "dark" ? "text-slate-50" : "text-slate-900"
                      }`}>{t.name}</p>
                      <p className={`text-xs ${
                        theme === "dark" ? "text-slate-400" : "text-slate-500"
                      }`}>{t.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom note */}
      <section className={`py-10 border-t transition-colors ${
        theme === "dark" ? "border-purple-900/70 bg-[#050012]" : "border-slate-200 bg-slate-50"
      }`}>
        <div className="mx-auto max-w-3xl px-4 md:px-6 text-center">
          <p className={`text-sm ${
            theme === "dark" ? "text-slate-400" : "text-slate-600"
          }`}>
            Try it yourself — 7 days free. See how it works.
          </p>
        </div>
      </section>
      <LandingFooter />
    </LandingLayout>
  );
};
