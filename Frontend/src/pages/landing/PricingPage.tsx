import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Gift, Check, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useTheme } from "../../hooks/useTheme";
import { LandingFooter } from "../../components/landing/LandingFooter";
import { SketchIllustration } from "../../components/landing/SketchIllustration";
import { Card, CardContent } from "../../components/ui/card";
import { PricingCard } from "../../components/PricingCard";
import { pricingAPI, type PricingPlanType } from "../../services/api";
import { SubscribeButton } from "../../components/SubscribeButton";

const whatToExpect = [
  "Transparent pricing — no hidden charges",
  "Aspirant-friendly — fits working professionals' budget",
  "Pro plans — unlimited practice, analytics, mentor chat",
  "Rewards — gift for top rank (terms are clear)",
];

export const PricingPage = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [plans, setPlans] = useState<PricingPlanType[]>([]);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await pricingAPI.getActive();
        if (!cancelled && res.data.success) setPlans(res.data.data || []);
      } catch {
        if (!cancelled) setPlans([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const hasActivePlans = plans.length > 0;

  return (
    <>
      {/* Hero: dynamic pricing cards or Coming Soon */}
      <section className={`border-b py-12 md:py-20 transition-colors ${
        theme === "dark" ? "border-slate-800/50 bg-[#030712]" : "border-slate-200 bg-slate-50"
      }`}>
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          {successMessage && (
            <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
              theme === "dark"
                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-200"
                : "bg-emerald-50 border-emerald-200 text-emerald-800"
            }`}>
              {successMessage}
            </div>
          )}
          {errorMessage && (
            <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
              theme === "dark"
                ? "bg-red-500/10 border-red-500/40 text-red-200"
                : "bg-red-50 border-red-200 text-red-800"
            }`}>
              {errorMessage}
            </div>
          )}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className={`w-10 h-10 animate-spin mb-4 ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`} />
              <p className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>Loading pricing...</p>
            </div>
          ) : hasActivePlans ? (
            <>
              <div className="text-center mb-10">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold mb-4 ${
                  theme === "dark"
                    ? "bg-purple-500/20 text-purple-200 border border-purple-500/40"
                    : "bg-purple-100 text-purple-700 border border-purple-200"
                }`}>
                  <Sparkles className="w-3.5 h-3.5" />
                  MentorsDaily Pro
                </span>
                <h1 className={`text-3xl md:text-4xl font-extrabold mb-2 tracking-tight ${
                  theme === "dark" ? "text-slate-50" : "text-slate-900"
                }`}>
                  Choose your plan
                </h1>
                <p className={`text-base max-w-lg mx-auto ${
                  theme === "dark" ? "text-slate-300" : "text-slate-600"
                }`}>
                  Simple, clear, aspirant-friendly pricing.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map((plan) => (
                  <PricingCard key={plan._id} plan={plan} ctaText={undefined}>
                    <SubscribeButton
                      plan={plan}
                      onSuccess={() => {
                        setErrorMessage(null);
                        setSuccessMessage("Payment successful. Your MentorsDaily Pro subscription is now active.");
                        navigate("/dashboard", { replace: true });
                      }}
                      onError={(msg) => {
                        setSuccessMessage(null);
                        setErrorMessage(msg);
                      }}
                    />
                  </PricingCard>
                ))}
              </div>
            </>
          ) : (
            <div className="max-w-4xl mx-auto text-center">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold mb-6 ${
                theme === "dark"
? "bg-purple-500/20 text-purple-200 border border-purple-500/40"
                    : "bg-purple-100 text-purple-700 border border-purple-200"
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
                Pricing launching soon. Stay tuned 🚀
              </h1>
              <p className={`text-base md:text-lg max-w-md mx-auto ${
                theme === "dark" ? "text-slate-300" : "text-slate-600"
              }`}>
                We're crafting MentorsDaily Pro pricing — simple, clear, aspirant-friendly.
              </p>
            </div>
          )}
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
                theme === "dark" ? "text-purple-400" : "text-purple-600"
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
    </>
  );
};
