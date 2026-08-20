import { Link } from "react-router-dom";

import {
  Gift,
  Check,
  ArrowRight,
  Sparkles,
  Trophy,
  ShieldCheck,
} from "lucide-react";

import { Button } from "../ui/button";
import { useTheme } from "../../hooks/useTheme";

export const RewardsBanner = () => {
  const { theme } = useTheme();
  const dark = theme === "dark";

  return (
    <section
      className={`relative overflow-hidden py-14 transition-colors sm:py-16 lg:py-20 ${
        dark ? "bg-[#030712]" : "bg-[#f7faff]"
      }`}
    >
      {/* =========================================================
          BACKGROUND EFFECTS
      ========================================================= */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className={`absolute -left-32 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full blur-[120px] ${
            dark ? "bg-blue-600/10" : "bg-blue-400/10"
          }`}
        />

        <div
          className={`absolute -right-32 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full blur-[130px] ${
            dark ? "bg-cyan-500/10" : "bg-cyan-400/10"
          }`}
        />

        <div
          className={`absolute inset-0 ${
            dark
              ? "hero-dots-bg-dark opacity-[0.04]"
              : "hero-dots-bg-light opacity-[0.28]"
          }`}
        />
      </div>

      {/* =========================================================
          CONTAINER
      ========================================================= */}

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        {/* =======================================================
            MAIN REWARD CARD
        ======================================================= */}

        <div
          className={`group relative overflow-hidden rounded-[28px] border ${
            dark
              ? "border-blue-500/15 bg-gradient-to-br from-[#0b1833] via-[#07152b] to-[#061b2b]"
              : "border-blue-100 bg-gradient-to-br from-white via-[#f8fbff] to-[#effaff]"
          }`}
        >
          {/* Top gradient line */}

          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600" />

          {/* Decorative circles */}

          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full border border-blue-500/10" />

          <div className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full border border-cyan-400/10" />

          {/* Main glow */}

          <div className="pointer-events-none absolute right-[20%] top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-blue-500/10 blur-[100px]" />

          <div className="relative grid lg:grid-cols-[1.1fr_0.9fr]">
            {/* ===================================================
                LEFT CONTENT
            =================================================== */}

            <div className="p-6 sm:p-8 lg:p-10 xl:p-12">
              {/* Badge */}

              <div
                className={`mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] ${
                  dark
                    ? "border-blue-400/20 bg-blue-500/10 text-blue-300"
                    : "border-blue-200 bg-blue-50 text-blue-700"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />

                Limited reward program
              </div>

              {/* Heading */}

              <h2
                className={`max-w-xl text-3xl font-black leading-[1.08] tracking-[-0.035em] sm:text-4xl lg:text-[44px] ${
                  dark ? "text-white" : "text-[#071225]"
                }`}
              >
                Achieve greatness.
                <span className="block bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
                  Get rewarded.
                </span>
              </h2>

              {/* Description */}

              <p
                className={`mt-4 max-w-xl text-sm leading-6 sm:text-base sm:leading-7 ${
                  dark ? "text-slate-400" : "text-slate-600"
                }`}
              >
                Stay consistent with your UPSC preparation and let your
                hard work speak for itself. Reach the UPSC CSE rank list
                while maintaining an active MentorsDaily Pro subscription,
                and we&apos;ll celebrate your achievement with a special
                reward.
              </p>

              {/* =================================================
                  REQUIREMENTS
              ================================================= */}

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {/* Requirement 1 */}

                <div
                  className={`flex items-start gap-3 rounded-xl border p-3.5 ${
                    dark
                      ? "border-slate-800 bg-slate-900/50"
                      : "border-slate-200 bg-white/70"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      dark
                        ? "bg-blue-500/15 text-blue-400"
                        : "bg-blue-50 text-blue-600"
                    }`}
                  >
                    <Trophy className="h-4 w-4" />
                  </div>

                  <div>
                    <p
                      className={`text-xs font-bold ${
                        dark ? "text-white" : "text-slate-900"
                      }`}
                    >
                      UPSC CSE Rank List
                    </p>

                    <p
                      className={`mt-0.5 text-[10px] leading-4 ${
                        dark
                          ? "text-slate-500"
                          : "text-slate-500"
                      }`}
                    >
                      Achieve a rank in the official final list.
                    </p>
                  </div>
                </div>

                {/* Requirement 2 */}

                <div
                  className={`flex items-start gap-3 rounded-xl border p-3.5 ${
                    dark
                      ? "border-slate-800 bg-slate-900/50"
                      : "border-slate-200 bg-white/70"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      dark
                        ? "bg-cyan-500/15 text-cyan-400"
                        : "bg-cyan-50 text-cyan-600"
                    }`}
                  >
                    <ShieldCheck className="h-4 w-4" />
                  </div>

                  <div>
                    <p
                      className={`text-xs font-bold ${
                        dark ? "text-white" : "text-slate-900"
                      }`}
                    >
                      4+ Months Pro
                    </p>

                    <p
                      className={`mt-0.5 text-[10px] leading-4 ${
                        dark
                          ? "text-slate-500"
                          : "text-slate-500"
                      }`}
                    >
                      Maintain an active Pro subscription.
                    </p>
                  </div>
                </div>
              </div>

              {/* =================================================
                  CTA
              ================================================= */}

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link to="/pricing">
                  <Button
                    className="group h-11 w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/25 sm:w-auto"
                  >
                    View Pro Plans

                    <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>

                <span
                  className={`flex items-center justify-center gap-1.5 text-[10px] ${
                    dark
                      ? "text-slate-500"
                      : "text-slate-500"
                  }`}
                >
                  <Check className="h-3 w-3 text-blue-500" />

                  Transparent terms
                </span>
              </div>
            </div>

            {/* ===================================================
                RIGHT REWARD VISUAL
            =================================================== */}

            <div
              className={`relative flex min-h-[340px] items-center justify-center overflow-hidden border-t px-6 py-10 lg:min-h-[420px] lg:border-l lg:border-t-0 ${
                dark
                  ? "border-slate-800/80"
                  : "border-blue-100/80"
              }`}
            >
              {/* Large glow */}

              <div className="absolute h-56 w-56 rounded-full bg-blue-500/15 blur-[70px]" />

              {/* Decorative ring */}

              <div className="absolute h-64 w-64 rounded-full border border-blue-500/10" />

              <div className="absolute h-48 w-48 rounded-full border border-cyan-400/10" />

              {/* =================================================
                  REWARD CARD
              ================================================= */}

              <div
                className={`relative w-full max-w-[310px] rotate-[-2deg] rounded-[24px] border p-5 shadow-2xl transition-transform duration-500 group-hover:rotate-0 ${
                  dark
                    ? "border-blue-400/20 bg-[#0b1933]/95 shadow-blue-950/40"
                    : "border-blue-100 bg-white/95 shadow-blue-100"
                }`}
              >
                {/* Card shine */}

                <div className="pointer-events-none absolute inset-x-0 top-0 h-24 rounded-t-[24px] bg-gradient-to-b from-blue-500/10 to-transparent" />

                {/* Header */}

                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/20">
                      <Gift className="h-5 w-5" />
                    </div>

                    <div>
                      <p
                        className={`text-[9px] font-bold uppercase tracking-wider ${
                          dark
                            ? "text-blue-400"
                            : "text-blue-600"
                        }`}
                      >
                        MentorsDaily
                      </p>

                      <p
                        className={`mt-0.5 text-sm font-bold ${
                          dark
                            ? "text-white"
                            : "text-slate-900"
                        }`}
                      >
                        Pro Reward
                      </p>
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-2 py-1 text-[8px] font-bold ${
                      dark
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-emerald-50 text-emerald-600"
                    }`}
                  >
                    ACTIVE
                  </span>
                </div>

                {/* Reward visual */}

                <div className="relative my-7 flex justify-center">
                  <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-400 shadow-[0_15px_50px_rgba(37,99,235,0.30)]">
                    <div
                      className={`flex h-20 w-20 items-center justify-center rounded-full ${
                        dark
                          ? "bg-[#0b1933]"
                          : "bg-white"
                      }`}
                    >
                      <Gift className="h-9 w-9 text-blue-500" />
                    </div>

                    {/* sparkle dots */}

                    <span className="absolute -right-1 top-2 h-2 w-2 rounded-full bg-cyan-300" />

                    <span className="absolute -left-2 bottom-5 h-1.5 w-1.5 rounded-full bg-blue-300" />

                    <span className="absolute right-3 bottom-0 h-1.5 w-1.5 rounded-full bg-white" />
                  </div>
                </div>

                {/* Text */}

                <div className="relative text-center">
                  <h3
                    className={`text-lg font-black ${
                      dark
                        ? "text-white"
                        : "text-slate-900"
                    }`}
                  >
                    Your hard work.
                  </h3>

                  <p
                    className={`mt-1 text-lg font-black ${
                      dark
                        ? "text-blue-400"
                        : "text-blue-600"
                    }`}
                  >
                    Your reward.
                  </p>

                  <p
                    className={`mx-auto mt-3 max-w-[230px] text-[10px] leading-4 ${
                      dark
                        ? "text-slate-500"
                        : "text-slate-500"
                    }`}
                  >
                    Reach the UPSC final rank list while
                    meeting the eligibility requirements.
                  </p>
                </div>

                {/* Bottom tags */}

                <div className="relative mt-5 flex justify-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[8px] font-semibold ${
                      dark
                        ? "bg-slate-800 text-slate-400"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    Rank-linked
                  </span>

                  <span
                    className={`rounded-full px-2.5 py-1 text-[8px] font-semibold ${
                      dark
                        ? "bg-slate-800 text-slate-400"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    Transparent
                  </span>
                </div>
              </div>

              {/* =================================================
                  FLOATING BADGE
              ================================================= */}

              <div
                className={`absolute bottom-8 left-5 flex items-center gap-2 rounded-xl border px-3 py-2 shadow-xl sm:left-8 ${
                  dark
                    ? "border-slate-700 bg-slate-900/90"
                    : "border-slate-200 bg-white/95"
                }`}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                  <Check className="h-3.5 w-3.5" />
                </div>

                <div>
                  <p
                    className={`text-[8px] ${
                      dark
                        ? "text-slate-500"
                        : "text-slate-400"
                    }`}
                  >
                    Reward status
                  </p>

                  <p
                    className={`text-[10px] font-bold ${
                      dark
                        ? "text-white"
                        : "text-slate-800"
                    }`}
                  >
                    Eligibility based
                  </p>
                </div>
              </div>

              {/* Floating trophy */}

              <div
                className={`absolute right-5 top-8 flex h-12 w-12 rotate-6 items-center justify-center rounded-2xl border shadow-lg sm:right-8 ${
                  dark
                    ? "border-blue-400/20 bg-slate-900 text-blue-400"
                    : "border-blue-100 bg-white text-blue-600"
                }`}
              >
                <Trophy className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>

        {/* =======================================================
            TRUST NOTE
        ======================================================= */}

        <div className="mt-5 flex justify-center">
          <p
            className={`text-center text-[9px] leading-4 ${
              dark ? "text-slate-600" : "text-slate-400"
            }`}
          >
            Reward eligibility is subject to the applicable
            MentorsDaily terms and verification of the UPSC final result.
          </p>
        </div>
      </div>
    </section>
  );
};