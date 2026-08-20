import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Sparkles,
  Gift,
  Check,
  Loader2,
  ShieldCheck,
  Zap,
  ArrowRight,
  Crown,
  MessageCircle,
} from "lucide-react";

import { useTheme } from "../../hooks/useTheme";
import { LandingFooter } from "../../components/landing/LandingFooter";
import { Card, CardContent } from "../../components/ui/card";
import { PricingCard } from "../../components/PricingCard";
import { pricingAPI, type PricingPlanType } from "../../services/api";
import { SubscribeButton } from "../../components/SubscribeButton";

const whatToExpect = [
  "Transparent plans — no hidden charges",
  "Aspirant-friendly — fits working professionals' budget",
  "Pro plans — unlimited practice, analytics, mentor chat",
  "Rewards — gift for top rank (terms are clear)",
];

const trustItems = [
  {
    icon: ShieldCheck,
    title: "Transparent pricing",
    description: "No hidden charges",
  },
  {
    icon: Zap,
    title: "Instant access",
    description: "Start your preparation quickly",
  },
  {
    icon: MessageCircle,
    title: "AI Mentor support",
    description: "Help whenever you need it",
  },
];

export const PricingPage = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const dark = theme === "dark";

  const [plans, setPlans] = useState<PricingPlanType[]>([]);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await pricingAPI.getActive();

        if (!cancelled && res.data.success) {
          setPlans(res.data.data || []);
        }
      } catch {
        if (!cancelled) {
          setPlans([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const hasActivePlans = plans.length > 0;

  return (
    <>
      {/* =========================================================
          PRICING HERO
      ========================================================= */}

      <section
        className={`relative overflow-hidden border-b transition-colors ${
          dark
            ? "border-slate-800 bg-[#030712]"
            : "border-slate-200 bg-[#f7fbff]"
        }`}
      >
        {/* Background glow */}

        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className={`absolute -left-40 -top-40 h-[450px] w-[450px] rounded-full blur-[130px] ${
              dark ? "bg-blue-600/10" : "bg-blue-500/10"
            }`}
          />

          <div
            className={`absolute -right-40 top-0 h-[420px] w-[420px] rounded-full blur-[130px] ${
              dark ? "bg-cyan-500/10" : "bg-cyan-400/10"
            }`}
          />

          <div
            className={`absolute inset-0 opacity-[0.035] ${
              dark
                ? "bg-[radial-gradient(#60a5fa_1px,transparent_1px)]"
                : "bg-[radial-gradient(#2563eb_1px,transparent_1px)]"
            } [background-size:24px_24px]`}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:py-14 md:px-6 md:py-20">
          {/* Messages */}

          {successMessage && (
            <div
              className={`mx-auto mb-6 max-w-3xl rounded-2xl border px-4 py-3 text-sm ${
                dark
                  ? "border-blue-500/30 bg-blue-500/10 text-blue-200"
                  : "border-blue-200 bg-blue-50 text-blue-700"
              }`}
            >
              {successMessage}
            </div>
          )}

          {errorMessage && (
            <div
              className={`mx-auto mb-6 max-w-3xl rounded-2xl border px-4 py-3 text-sm ${
                dark
                  ? "border-red-500/30 bg-red-500/10 text-red-200"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {errorMessage}
            </div>
          )}

          {loading ? (
            /* =====================================================
               LOADING
            ===================================================== */

            <div className="flex min-h-[360px] flex-col items-center justify-center">
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-2xl ${
                  dark
                    ? "border border-blue-500/20 bg-blue-500/10"
                    : "border border-blue-100 bg-blue-50"
                }`}
              >
                <Loader2
                  className={`h-7 w-7 animate-spin ${
                    dark ? "text-blue-400" : "text-blue-600"
                  }`}
                />
              </div>

              <p
                className={`mt-5 text-sm font-medium ${
                  dark ? "text-slate-300" : "text-slate-600"
                }`}
              >
                Loading MentorsDaily plans...
              </p>

              <p
                className={`mt-1 text-xs ${
                  dark ? "text-slate-600" : "text-slate-400"
                }`}
              >
                Finding the right plan for your preparation
              </p>
            </div>
          ) : hasActivePlans ? (
            <>
              {/* =================================================
                  ACTIVE PRICING
              ================================================= */}

              <div className="mx-auto max-w-3xl text-center">
                {/* Badge */}

                <div
                  className={`mb-5 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] ${
                    dark
                      ? "border-blue-400/20 bg-blue-500/10 text-blue-300"
                      : "border-blue-200 bg-blue-50 text-blue-600"
                  }`}
                >
                  <Crown className="h-3.5 w-3.5" />
                  MentorsDaily Pro
                </div>

                {/* Heading */}

                <h1
                  className={`text-3xl font-black tracking-tight sm:text-4xl md:text-5xl ${
                    dark ? "text-white" : "text-slate-950"
                  }`}
                >
                  Choose a plan that fits
                  <span className="block bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
                    your UPSC journey.
                  </span>
                </h1>

                <p
                  className={`mx-auto mt-4 max-w-2xl text-sm leading-6 md:text-base ${
                    dark ? "text-slate-400" : "text-slate-600"
                  }`}
                >
                  Simple, transparent and aspirant-friendly plans designed to
                  help you practise consistently and improve faster.
                </p>
              </div>

              {/* Pricing cards */}

              <div
                className={`mx-auto mt-10 grid max-w-6xl gap-5 ${
                  plans.length === 1
                    ? "max-w-md grid-cols-1"
                    : plans.length === 2
                    ? "max-w-4xl grid-cols-1 md:grid-cols-2"
                    : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                }`}
              >
                {plans.map((plan, index) => (
                  <div
                    key={plan._id}
                    className={`relative ${
                      index === 1 && plans.length >= 3
                        ? "lg:-translate-y-2"
                        : ""
                    }`}
                  >
                    {/* Popular badge */}

                    {index === 1 && plans.length >= 3 && (
                      <div className="absolute -top-3 left-1/2 z-20 -translate-x-1/2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-1.5 text-[9px] font-black uppercase tracking-wider text-white shadow-lg shadow-blue-500/20">
                          <Sparkles className="h-3 w-3" />
                          Most Popular
                        </span>
                      </div>
                    )}

                    <div
                      className={`h-full rounded-[28px] p-[1px] ${
                        index === 1 && plans.length >= 3
                          ? "bg-gradient-to-b from-blue-500 via-cyan-400 to-blue-500"
                          : dark
                          ? "bg-slate-800"
                          : "bg-slate-200"
                      }`}
                    >
                      <div
                        className={`h-full rounded-[27px] ${
                          dark ? "bg-slate-950" : "bg-white"
                        }`}
                      >
                        <PricingCard
                          plan={plan}
                          ctaText={undefined}
                        >
                          <SubscribeButton
                            plan={plan}
                            onSuccess={() => {
                              setErrorMessage(null);
                              setSuccessMessage(
                                "Payment successful. Your MentorsDaily Pro subscription is now active."
                              );

                              navigate("/dashboard", {
                                replace: true,
                              });
                            }}
                            onError={(msg) => {
                              setSuccessMessage(null);
                              setErrorMessage(msg);
                            }}
                          />
                        </PricingCard>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Trust strip */}

              <div className="mx-auto mt-10 grid max-w-4xl gap-3 sm:grid-cols-3">
                {trustItems.map(
                  ({ icon: Icon, title, description }) => (
                    <div
                      key={title}
                      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
                        dark
                          ? "border-slate-800 bg-slate-900/60"
                          : "border-slate-200 bg-white/80"
                      }`}
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                          dark
                            ? "bg-blue-500/10 text-blue-300"
                            : "bg-blue-50 text-blue-600"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>

                      <div>
                        <p
                          className={`text-xs font-bold ${
                            dark ? "text-slate-200" : "text-slate-800"
                          }`}
                        >
                          {title}
                        </p>

                        <p
                          className={`mt-0.5 text-[10px] ${
                            dark
                              ? "text-slate-500"
                              : "text-slate-500"
                          }`}
                        >
                          {description}
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>
            </>
          ) : (
            /* =====================================================
               COMING SOON
            ===================================================== */

            <div className="mx-auto max-w-3xl py-8 text-center md:py-10">
              {/* Badge */}

              <div
                className={`mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] ${
                  dark
                    ? "border-blue-400/20 bg-blue-500/10 text-blue-300"
                    : "border-blue-200 bg-blue-50 text-blue-600"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Beta Version
              </div>

              {/* Icon */}

              <div
                className={`relative mx-auto flex h-24 w-24 items-center justify-center rounded-[28px] border ${
                  dark
                    ? "border-blue-500/20 bg-blue-500/10"
                    : "border-blue-100 bg-blue-50"
                }`}
              >
                <div className="absolute inset-3 rounded-2xl bg-blue-500/10 blur-xl" />

                <Gift
                  className={`relative z-10 h-10 w-10 ${
                    dark ? "text-blue-300" : "text-blue-600"
                  }`}
                />
              </div>

              {/* Heading */}

              <h1
                className={`mt-7 text-3xl font-black tracking-tight sm:text-4xl md:text-5xl ${
                  dark ? "text-white" : "text-slate-950"
                }`}
              >
                Plans are coming
                <span className="block bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                  very soon.
                </span>
              </h1>

              <p
                className={`mx-auto mt-4 max-w-xl text-sm leading-6 md:text-base ${
                  dark ? "text-slate-400" : "text-slate-600"
                }`}
              >
                We're crafting MentorsDaily Pro plans that are simple,
                transparent and genuinely useful for UPSC aspirants.
              </p>

              {/* Coming soon card */}

              <div
                className={`mx-auto mt-8 max-w-lg rounded-[24px] border p-5 text-left ${
                  dark
                    ? "border-slate-800 bg-slate-900/70"
                    : "border-slate-200 bg-white shadow-sm"
                }`}
              >
                <p
                  className={`text-[10px] font-bold uppercase tracking-[0.18em] ${
                    dark ? "text-blue-400" : "text-blue-600"
                  }`}
                >
                  What we're building
                </p>

                <div className="mt-4 space-y-3">
                  {whatToExpect.map((item) => (
                    <div
                      key={item}
                      className="flex items-start gap-3"
                    >
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                          dark
                            ? "bg-blue-500/10"
                            : "bg-blue-50"
                        }`}
                      >
                        <Check className="h-3 w-3 text-blue-500" />
                      </span>

                      <span
                        className={`text-xs leading-5 ${
                          dark
                            ? "text-slate-300"
                            : "text-slate-600"
                        }`}
                      >
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* =========================================================
          WHAT TO EXPECT
      ========================================================= */}

      {hasActivePlans && (
        <section
          className={`relative overflow-hidden py-14 transition-colors md:py-20 ${
            dark ? "bg-[#050b18]" : "bg-slate-50"
          }`}
        >
          <div className="mx-auto max-w-5xl px-4 md:px-6">
            <div className="grid items-center gap-8 md:grid-cols-[0.7fr_1.3fr]">
              {/* Left */}

              <div className="text-center md:text-left">
                <div
                  className={`mx-auto flex h-20 w-20 items-center justify-center rounded-[24px] md:mx-0 ${
                    dark
                      ? "border border-blue-500/20 bg-blue-500/10"
                      : "border border-blue-100 bg-blue-50"
                  }`}
                >
                  <Gift
                    className={`h-9 w-9 ${
                      dark ? "text-blue-300" : "text-blue-600"
                    }`}
                  />
                </div>

                <p
                  className={`mt-5 text-[10px] font-bold uppercase tracking-[0.18em] ${
                    dark ? "text-blue-400" : "text-blue-600"
                  }`}
                >
                  Simple & transparent
                </p>

                <h2
                  className={`mt-2 text-2xl font-black tracking-tight md:text-3xl ${
                    dark ? "text-white" : "text-slate-950"
                  }`}
                >
                  What to expect
                </h2>

                <p
                  className={`mt-3 text-xs leading-5 ${
                    dark ? "text-slate-500" : "text-slate-500"
                  }`}
                >
                  Everything is designed around one goal — helping you
                  prepare consistently.
                </p>
              </div>

              {/* Right */}

              <Card
                className={`overflow-hidden rounded-[28px] ${
                  dark
                    ? "border-slate-800 bg-slate-900/70"
                    : "border-slate-200 bg-white shadow-lg"
                }`}
              >
                <CardContent className="p-6 md:p-8">
                  <div className="space-y-4">
                    {whatToExpect.map((item, index) => (
                      <div
                        key={item}
                        className={`group flex items-center gap-4 rounded-2xl border p-4 transition-colors ${
                          dark
                            ? "border-slate-800 bg-slate-950/50 hover:border-blue-500/20"
                            : "border-slate-100 bg-slate-50/70 hover:border-blue-100 hover:bg-blue-50/30"
                        }`}
                      >
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                            dark
                              ? "bg-blue-500/10 text-blue-300"
                              : "bg-blue-50 text-blue-600"
                          }`}
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>

                        <span
                          className={`flex-1 text-xs font-medium leading-5 md:text-sm ${
                            dark
                              ? "text-slate-300"
                              : "text-slate-700"
                          }`}
                        >
                          {item}
                        </span>

                        <Check
                          className={`h-4 w-4 shrink-0 ${
                            dark
                              ? "text-blue-400"
                              : "text-blue-600"
                          }`}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================
          BOTTOM CTA
      ========================================================= */}

      <section
        className={`relative overflow-hidden border-t py-12 md:py-16 ${
          dark
            ? "border-slate-800 bg-[#030712]"
            : "border-slate-200 bg-white"
        }`}
      >
        <div className="mx-auto max-w-5xl px-4 md:px-6">
          <div
            className={`relative overflow-hidden rounded-[30px] border px-6 py-10 text-center md:px-12 ${
              dark
                ? "border-blue-500/20 bg-gradient-to-br from-blue-950/50 via-slate-900 to-cyan-950/30"
                : "border-blue-100 bg-gradient-to-br from-blue-50 via-white to-cyan-50 shadow-lg"
            }`}
          >
            <div className="pointer-events-none absolute -left-20 -top-20 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />

            <div className="pointer-events-none absolute -bottom-20 -right-20 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl" />

            <div className="relative">
              <Sparkles
                className={`mx-auto h-6 w-6 ${
                  dark ? "text-blue-300" : "text-blue-600"
                }`}
              />

              <h2
                className={`mt-4 text-2xl font-black tracking-tight md:text-3xl ${
                  dark ? "text-white" : "text-slate-950"
                }`}
              >
                Ready to prepare smarter?
              </h2>

              <p
                className={`mx-auto mt-3 max-w-xl text-xs leading-5 md:text-sm ${
                  dark ? "text-slate-400" : "text-slate-600"
                }`}
              >
                Start building a focused UPSC preparation system with
                MentorsDaily.
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <a
                  href="https://wa.me/918766233193?text=Hi!%20I%27m%20interested%20in%20MentorsDaily%20plans."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex h-11 items-center gap-2 rounded-xl bg-[#2563eb] px-6 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 hover:bg-[#1d4ed8]"
                >
                  Talk to us
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </a>

                <Link
                  to="/features"
                  className={`inline-flex h-11 items-center rounded-xl border px-6 text-xs font-semibold ${
                    dark
                      ? "border-slate-700 bg-slate-900 text-slate-300 hover:border-blue-500/30"
                      : "border-slate-200 bg-white text-slate-700 hover:border-blue-200"
                  }`}
                >
                  Explore features
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </>
  );
};