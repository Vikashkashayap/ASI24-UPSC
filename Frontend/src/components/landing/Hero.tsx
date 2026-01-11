import { Button } from "../ui/button";
import { useTheme } from "../../hooks/useTheme";

export const LandingHero = () => {
  const { theme } = useTheme();
  
  return (
    <section className={`relative overflow-hidden border-b transition-colors ${
      theme === "dark"
        ? "border-purple-900 bg-gradient-to-br from-[#050015] via-[#10002b] to-[#020617]"
        : "border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100"
    }`}>
      <div className={`pointer-events-none absolute inset-y-10 right-[-10%] hidden w-[55%] rounded-full blur-3xl md:block ${
        theme === "dark"
          ? "bg-[radial-gradient(circle_at_center,_rgba(147,51,234,0.35),_transparent_65%)]"
          : "bg-[radial-gradient(circle_at_center,_rgba(168,85,247,0.15),_transparent_65%)]"
      }`} />
      <div className="mx-auto flex max-w-6xl flex-col gap-8 md:gap-12 px-4 pb-12 pt-12 md:flex-row md:items-center md:px-6 md:pb-24 md:pt-20">
        <div className="relative z-10 max-w-xl space-y-4 md:space-y-6">
          <p className={`text-[10px] md:text-xs font-semibold uppercase tracking-[0.18em] ${
            theme === "dark" ? "text-fuchsia-300/90" : "text-fuchsia-600"
          }`}>
            UPSC Prep, Reinvented
          </p>
          <div className="space-y-3 md:space-y-4">
            <h1 className={`text-2xl font-semibold leading-tight tracking-tight sm:text-3xl md:text-4xl lg:text-5xl ${
              theme === "dark" ? "text-slate-50" : "text-slate-900"
            }`}>
              The AI mentor for{" "}
              <span className="block bg-gradient-to-r from-fuchsia-500 via-violet-500 to-emerald-500 bg-clip-text text-transparent">
                UPSC preparation.
              </span>
            </h1>
            <p className={`text-xs leading-relaxed md:text-sm lg:text-base ${
              theme === "dark" ? "text-slate-300" : "text-slate-600"
            }`}>
              Build a calm, focused preparation system around answer writing and PYQ analysis —
              instead of chasing random PDFs and Telegram notes.
            </p>
          </div>
          <div className="flex flex-col xs:flex-row flex-wrap items-stretch xs:items-center gap-2 md:gap-3">
            <Button className="h-10 w-full xs:w-auto rounded-full bg-gradient-to-r from-fuchsia-500 to-emerald-400 px-5 text-xs font-semibold tracking-tight text-white shadow-lg hover:from-fuchsia-400 hover:to-emerald-300 md:h-11 md:px-7 md:text-sm">
              Start free for 7 days
            </Button>
            <button className={`inline-flex h-10 w-full xs:w-auto items-center justify-center rounded-full border px-4 text-xs font-medium transition-colors md:h-11 md:px-5 ${
              theme === "dark"
                ? "border-purple-700/80 bg-black/40 text-slate-200 hover:bg-purple-950/50"
                : "border-purple-300 bg-white text-purple-700 hover:bg-purple-50"
            }`}>
              View demo answer
            </button>
          </div>
          <div className={`flex flex-wrap gap-3 md:gap-4 text-[10px] md:text-[11px] ${
            theme === "dark" ? "text-slate-400" : "text-slate-500"
          }`}>
            <p>No card required • Answer-first workflow • Built with UPSC toppers</p>
          </div>
        </div>

        <div className="relative z-0 flex-1 mt-6 md:mt-0">
          <div className={`mx-auto max-w-md rounded-[20px] md:rounded-[32px] border p-1 ${
            theme === "dark"
              ? "border-fuchsia-500/30 bg-gradient-to-br from-[#050017] via-[#020617] to-black shadow-[0_24px_120px_rgba(15,23,42,0.95)]"
              : "border-purple-200 bg-gradient-to-br from-white via-slate-50 to-purple-50 shadow-2xl"
          }`}>
            <div className={`rounded-[16px] md:rounded-[26px] p-3 md:p-4 ${
              theme === "dark" ? "bg-slate-950/90" : "bg-white"
            }`}>
              <div className={`flex items-center justify-between text-[10px] md:text-[11px] ${
                theme === "dark" ? "text-slate-300" : "text-slate-600"
              }`}>
                <span className={`font-medium ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>UPSC Mains Answer Lab</span>
                <span className={`rounded-full px-2 py-0.5 text-[9px] md:text-[10px] ${
                  theme === "dark"
                    ? "bg-fuchsia-500/15 text-fuchsia-200"
                    : "bg-fuchsia-100 text-fuchsia-700"
                }`}>
                  Live practice
                </span>
              </div>
              <div className="mt-3 md:mt-4 grid gap-2 md:gap-3 text-[10px] md:text-[11px] grid-cols-1 md:grid-cols-2">
                <div className={`space-y-2 rounded-xl md:rounded-2xl p-2 md:p-3 ${
                  theme === "dark" ? "bg-slate-900/90" : "bg-slate-50"
                }`}>
                  <p className={`text-[9px] md:text-[10px] font-medium uppercase tracking-[0.16em] ${
                    theme === "dark" ? "text-slate-500" : "text-slate-500"
                  }`}>
                    Today&apos;s Question
                  </p>
                  <p className={`text-[11px] md:text-xs leading-relaxed ${
                    theme === "dark" ? "text-slate-100" : "text-slate-900"
                  }`}>
                    &quot;Discuss how India can balance growth with climate commitments in the coming decade.&quot;
                  </p>
                  <div className={`mt-2 grid grid-cols-3 gap-1.5 md:gap-2 text-[9px] md:text-[10px] ${
                    theme === "dark" ? "text-slate-300" : "text-slate-700"
                  }`}>
                    <div className={`rounded-lg md:rounded-xl px-1.5 md:px-2 py-1 ${
                      theme === "dark" ? "bg-slate-800/80" : "bg-white border border-slate-200"
                    }`}>
                      <div className={`text-[8px] md:text-[9px] ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>Target</div>
                      <div className={`text-[10px] md:text-[11px] font-semibold ${theme === "dark" ? "text-emerald-300" : "text-emerald-600"}`}>10 / 10</div>
                    </div>
                    <div className={`rounded-lg md:rounded-xl px-1.5 md:px-2 py-1 ${
                      theme === "dark" ? "bg-slate-800/80" : "bg-white border border-slate-200"
                    }`}>
                      <div className={`text-[8px] md:text-[9px] ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>Time</div>
                      <div className="text-[10px] md:text-[11px] font-semibold">7 mins</div>
                    </div>
                    <div className={`rounded-lg md:rounded-xl px-1.5 md:px-2 py-1 ${
                      theme === "dark" ? "bg-slate-800/80" : "bg-white border border-slate-200"
                    }`}>
                      <div className={`text-[8px] md:text-[9px] ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>Words</div>
                      <div className="text-[10px] md:text-[11px] font-semibold">150</div>
                    </div>
                  </div>
                </div>
                <div className={`space-y-2 rounded-xl md:rounded-2xl p-2 md:p-3 ${
                  theme === "dark" ? "bg-slate-900/90" : "bg-slate-50"
                }`}>
                  <p className={`text-[9px] md:text-[10px] font-medium uppercase tracking-[0.16em] ${
                    theme === "dark" ? "text-slate-500" : "text-slate-500"
                  }`}>
                    Instant Evaluation
                  </p>
                  <div className="space-y-1 text-[10px] md:text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className={theme === "dark" ? "text-slate-300" : "text-slate-700"}>Structure &amp; flow</span>
                      <span className={`font-semibold ${theme === "dark" ? "text-emerald-300" : "text-emerald-600"}`}>9 / 10</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={theme === "dark" ? "text-slate-300" : "text-slate-700"}>Content depth</span>
                      <span className={`font-semibold ${theme === "dark" ? "text-emerald-300" : "text-emerald-600"}`}>8 / 10</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={theme === "dark" ? "text-slate-300" : "text-slate-700"}>Examples &amp; linkages</span>
                      <span className={`font-semibold ${theme === "dark" ? "text-emerald-300" : "text-emerald-600"}`}>8 / 10</span>
                    </div>
                  </div>
                  <p className={`mt-2 text-[9px] md:text-[10px] leading-relaxed ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                    &quot;Tighten your intro with one data point. Bring Paris / COP reference in the conclusion.&quot;
                  </p>
                </div>
              </div>
              <div className="mt-3 md:mt-4 grid gap-2 md:gap-3 text-[9px] md:text-[10px] grid-cols-3">
                <div className={`rounded-xl md:rounded-2xl p-2 md:p-3 ${
                  theme === "dark" ? "bg-slate-900/90" : "bg-slate-50"
                }`}>
                  <p className={`text-[9px] md:text-[10px] ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>30-day streak</p>
                  <p className={`mt-0.5 md:mt-1 text-base md:text-xl font-semibold ${theme === "dark" ? "text-emerald-300" : "text-emerald-600"}`}>21 days</p>
                </div>
                <div className={`rounded-xl md:rounded-2xl p-2 md:p-3 ${
                  theme === "dark" ? "bg-slate-900/90" : "bg-slate-50"
                }`}>
                  <p className={`text-[9px] md:text-[10px] ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>Avg. score (last 20)</p>
                  <p className={`mt-0.5 md:mt-1 text-base md:text-xl font-semibold ${theme === "dark" ? "text-emerald-300" : "text-emerald-600"}`}>63%</p>
                </div>
                <div className={`rounded-xl md:rounded-2xl p-2 md:p-3 ${
                  theme === "dark" ? "bg-slate-900/90" : "bg-slate-50"
                }`}>
                  <p className={`text-[9px] md:text-[10px] ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>Focus paper</p>
                  <p className={`mt-0.5 md:mt-1 text-[10px] md:text-xs font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>GS2 • Governance</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

