import { X, Check, ArrowRight } from "lucide-react";
import { LandingLayout } from "../../layouts/LandingLayout";
import { LandingFooter } from "../../components/landing/LandingFooter";
import { SketchIllustration } from "../../components/landing/SketchIllustration";
import { useTheme } from "../../hooks/useTheme";
import { Card, CardContent } from "../../components/ui/card";

const oldWay = [
  "Google search — generic results, not UPSC-specific",
  "PDFs, Telegram notes — static, they get outdated",
  "No reliable system to clear doubts",
  "Copy check — manual, delayed, inconsistent feedback",
  "Analytics — just marks, can't see trends",
];

const upscrhWay = [
  "Write answers — everything in one workspace",
  "AI evaluates — instant, consistent, structure + content feedback",
  "PYQ analytics — decide which topics to study",
  "Mentor-style chat — trained on UPSC reasoning",
  "Current affairs + concepts — all linked, revise-friendly",
];

export const ComparePage = () => {
  const { theme } = useTheme();

  return (
    <LandingLayout>
      {/* Hero */}
      <section className={`border-b py-12 md:py-16 transition-colors ${
        theme === "dark" ? "border-purple-900/70 bg-[#070313]" : "border-slate-200 bg-slate-50"
      }`}>
        <div className="mx-auto max-w-6xl px-4 md:px-6 text-center">
          <div className="inline-flex mb-4">
            <SketchIllustration type="arrow" className="w-12 h-12" />
          </div>
          <h1 className={`text-2xl md:text-3xl font-bold tracking-tight ${
            theme === "dark" ? "text-slate-50" : "text-slate-900"
          }`}>
            Old way vs UPSCRH
          </h1>
          <p className={`mt-3 max-w-2xl mx-auto text-sm md:text-base ${
            theme === "dark" ? "text-slate-300" : "text-slate-600"
          }`}>
            Before: PDFs, guesswork, scattered resources. Now: one calm, focused system.
            See the difference side by side.
          </p>
        </div>
      </section>

      {/* Sketch flow - Old way to New way */}
      <section className={`py-8 md:py-12 transition-colors ${
        theme === "dark" ? "bg-[#0b0618]" : "bg-white"
      }`}>
        <div className="mx-auto max-w-4xl px-4 md:px-6">
          <div className={`flex items-center justify-center gap-4 md:gap-8 py-6 rounded-2xl ${
            theme === "dark" ? "bg-black/30" : "bg-slate-100"
          }`}>
            <span className={`text-sm font-medium ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
              Noise
            </span>
            <SketchIllustration type="arrow" className="w-10 h-10 opacity-60" />
            <span className={`text-sm font-medium ${theme === "dark" ? "text-emerald-300" : "text-emerald-600"}`}>
              Intelligence
            </span>
          </div>
        </div>
      </section>

      {/* Comparison cards */}
      <section className={`py-8 md:py-12 transition-colors ${
        theme === "dark" ? "bg-[#0b0618]" : "bg-white"
      }`}>
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            {/* Old way */}
            <Card className={`overflow-hidden rounded-[24px] ${
              theme === "dark"
                ? "border-slate-700/60 bg-[#0a0512]"
                : "border-slate-200 bg-slate-50"
            }`}>
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center gap-2 mb-4">
                  <SketchIllustration type="circle" className="w-8 h-8" />
                  <h2 className={`text-lg font-semibold ${
                    theme === "dark" ? "text-slate-400" : "text-slate-600"
                  }`}>Traditional method</h2>
                </div>
                <h3 className={`text-xl font-semibold mb-4 ${
                  theme === "dark" ? "text-slate-200" : "text-slate-800"
                }`}>
                  Hours lost in scattered resources
                </h3>
                <ul className="space-y-3">
                  {oldWay.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className={`mt-1 flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center ${
                        theme === "dark" ? "border-slate-600" : "border-slate-400"
                      }`}>
                        <X className="w-3 h-3 text-slate-500" />
                      </span>
                      <span className={`text-sm ${
                        theme === "dark" ? "text-slate-300" : "text-slate-600"
                      }`}>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* UPSCRH way */}
            <Card className={`overflow-hidden rounded-[24px] ${
              theme === "dark"
                ? "border-emerald-500/40 bg-gradient-to-br from-[#0d1f1a] to-[#051810]"
                : "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white"
            }`}>
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center gap-2 mb-4">
                  <SketchIllustration type="chart" className="w-8 h-8" />
                  <h2 className={`text-lg font-semibold ${
                    theme === "dark" ? "text-fuchsia-300" : "text-fuchsia-600"
                  }`}>UPSCRH</h2>
                </div>
                <h3 className={`text-xl font-semibold mb-4 ${
                  theme === "dark" ? "text-emerald-100" : "text-emerald-800"
                }`}>
                  Instant clarity, answer-first workflow
                </h3>
                <ul className="space-y-3">
                  {upscrhWay.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className={`mt-1 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                        theme === "dark" ? "bg-emerald-500 text-black" : "bg-emerald-500 text-white"
                      }`}>
                        <Check className="w-3 h-3" />
                      </span>
                      <span className={`text-sm ${
                        theme === "dark" ? "text-slate-100" : "text-slate-700"
                      }`}>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Summary */}
      <section className={`py-10 border-t transition-colors ${
        theme === "dark" ? "border-purple-900/70 bg-[#050012]" : "border-slate-200 bg-slate-50"
      }`}>
        <div className="mx-auto max-w-3xl px-4 md:px-6 text-center">
          <p className={`text-sm md:text-base ${
            theme === "dark" ? "text-slate-300" : "text-slate-600"
          }`}>
            <span className="font-semibold">In short:</span> Before, time was wasted. Now, time is saved.
            Instead of PDFs — one workspace. Instead of guesswork — data-driven decisions.
          </p>
        </div>
      </section>
      <LandingFooter />
    </LandingLayout>
  );
};
