import { Rocket, Sparkles, Gift, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { LandingLayout } from "../../layouts/LandingLayout";
import { useTheme } from "../../hooks/useTheme";
import { LandingFooter } from "../../components/landing/LandingFooter";
import { SketchIllustration } from "../../components/landing/SketchIllustration";
import { Card, CardContent } from "../../components/ui/card";

const whatToExpect = [
  "Transparent pricing — no hidden charges",
  "Aspirant-friendly — fits working professionals' budget",
  "Pro plans — unlimited practice, analytics, mentor chat",
  "Rewards — gift for top rank (terms are clear)",
];

export const PricingPage = () => {
  const { theme } = useTheme();

  return (
    <LandingLayout>
      {/* Hero - Coming Soon + Beta */}
      <section className={`border-b py-12 md:py-20 transition-colors ${
        theme === "dark" ? "border-purple-900/70 bg-[#070313]" : "border-slate-200 bg-slate-50"
      }`}>
        <div className="mx-auto max-w-4xl px-4 md:px-6 text-center">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold mb-6 ${
            theme === "dark"
              ? "bg-fuchsia-500/20 text-fuchsia-200 border border-fuchsia-500/40"
              : "bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200"
          }`}>
            <Sparkles className="w-3.5 h-3.5" />
            Beta Version
          </span>

          <div className={`inline-flex p-6 rounded-full mb-6 relative ${
            theme === "dark" ? "bg-fuchsia-500/10" : "bg-fuchsia-100"
          }`}>
            <div className="absolute inset-0 rounded-full animate-ping opacity-25 bg-fuchsia-500" />
            <SketchIllustration type="rocket" className="w-14 h-14 relative z-10" />
          </div>

          <h1 className={`text-3xl md:text-5xl font-extrabold mb-4 tracking-tight ${
            theme === "dark" ? "text-slate-50" : "text-slate-900"
          }`}>
            Coming <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-emerald-500">Soon</span>
          </h1>

          <p className={`text-base md:text-lg max-w-md mx-auto ${
            theme === "dark" ? "text-slate-300" : "text-slate-600"
          }`}>
            We're crafting UPSCRH Pro pricing — simple, clear, aspirant-friendly.
            Stay tuned, something good is coming.
          </p>
        </div>
      </section>

      {/* What to expect - with sketch */}
      <section className={`py-12 md:py-16 transition-colors ${
        theme === "dark" ? "bg-[#0b0618]" : "bg-white"
      }`}>
        <div className="mx-auto max-w-4xl px-4 md:px-6">
          <h2 className={`text-lg font-semibold text-center mb-8 ${
            theme === "dark" ? "text-slate-50" : "text-slate-900"
          }`}>
            What to expect
          </h2>
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className={`flex-shrink-0 w-32 h-32 rounded-2xl flex items-center justify-center ${
              theme === "dark" ? "bg-black/40" : "bg-slate-100"
            }`}>
              <Gift className={`w-14 h-14 ${
                theme === "dark" ? "text-fuchsia-400" : "text-fuchsia-600"
              }`} />
            </div>
            <Card className={`flex-1 rounded-[24px] ${
              theme === "dark"
                ? "border-purple-800/60 bg-gradient-to-br from-[#0d0718] to-[#051810]"
                : "border-slate-200 bg-white shadow-lg"
            }`}>
              <CardContent className="p-6 md:p-8">
                <ul className="space-y-3">
                  {whatToExpect.map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                        theme === "dark" ? "bg-emerald-500/20" : "bg-emerald-100"
                      }`}>
                        <Check className="w-3 h-3 text-emerald-500" />
                      </span>
                      <span className={`text-sm md:text-base ${
                        theme === "dark" ? "text-slate-200" : "text-slate-700"
                      }`}>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={`py-10 border-t transition-colors ${
        theme === "dark" ? "border-purple-900/70 bg-[#050012]" : "border-slate-200 bg-slate-50"
      }`}>
        <div className="mx-auto max-w-4xl px-4 md:px-6 text-center">
          <Link
            to="/"
            className={`inline-flex items-center gap-2 px-8 py-3 rounded-full font-bold transition-all duration-300 transform hover:scale-105 ${
              theme === "dark"
                ? "bg-gradient-to-r from-fuchsia-600 to-emerald-600 text-white shadow-fuchsia-900/40"
                : "bg-gradient-to-r from-fuchsia-500 to-emerald-500 text-white shadow-fuchsia-200/50"
            }`}
          >
            Back to Home
          </Link>
          <p className={`mt-4 text-sm ${
            theme === "dark" ? "text-slate-400" : "text-slate-600"
          }`}>
            Keep checking for updates. Try the beta — 7 days free.
          </p>
        </div>
      </section>
      <LandingFooter />
    </LandingLayout>
  );
};
