import { Card, CardContent } from "../ui/card";
import { useTheme } from "../../hooks/useTheme";

export const IntelligenceVsNoise = () => {
  const { theme } = useTheme();
  
  return (
    <section id="compare" className={`py-16 transition-colors ${
      theme === "dark" ? "bg-[#030712]" : "bg-slate-50"
    }`}>
      <div className="mx-auto max-w-6xl px-4 text-center md:px-6">
        <h2 className={`text-lg font-semibold tracking-tight md:text-xl ${
          theme === "dark" ? "text-slate-50" : "text-slate-900"
        }`}>
          Intelligence <span className={theme === "dark" ? "text-slate-400" : "text-slate-500"}>vs</span> Noise
        </h2>
        <p className={`mt-2 text-xs md:text-sm ${
          theme === "dark" ? "text-slate-300" : "text-slate-600"
        }`}>
          Move from scattered PDFs and guesswork to a calm, book-backed system.
        </p>

        <div className="mt-10">
          <Card className={`overflow-hidden rounded-3xl text-left ${
            theme === "dark"
              ? "border-slate-700/60 bg-slate-900/50 text-slate-50 shadow-xl"
              : "border-slate-200 bg-white text-slate-900 shadow-lg"
          }`}>
            <CardContent className="grid gap-0 p-0 md:grid-cols-2">
              <div className={`space-y-4 border-b px-6 py-8 md:border-b-0 md:border-r ${
                theme === "dark"
                  ? "border-slate-700/60 bg-slate-800/40"
                  : "border-slate-200 bg-slate-100/80"
              }`}>
                <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${
                  theme === "dark" ? "text-slate-500" : "text-slate-500"
                }`}>
                  Traditional methods
                </p>
                <h3 className={`text-lg font-semibold leading-snug md:text-xl ${
                  theme === "dark" ? "text-slate-50" : "text-slate-900"
                }`}>
                  Hours lost in scattered resources.
                </h3>
                <ul className={`mt-3 space-y-2 text-xs ${
                  theme === "dark" ? "text-slate-300" : "text-slate-600"
                }`}>
                  <li className="flex items-center gap-2">
                    <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                      theme === "dark"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-red-50 text-red-500"
                    }`}>
                      ✕
                    </span>
                    <span>Generic search results not tuned for UPSC.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                      theme === "dark"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-red-50 text-red-500"
                    }`}>
                      ✕
                    </span>
                    <span>Static PDFs and notes that age quickly.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                      theme === "dark"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-red-50 text-red-500"
                    }`}>
                      ✕
                    </span>
                    <span>Unreliable doubt resolution and copy checking.</span>
                  </li>
                </ul>
              </div>

              <div className={`space-y-4 px-6 py-8 ${
                theme === "dark"
                  ? "bg-gradient-to-br from-[#1e1035] via-[#020617] to-[#064e3b]"
                  : "bg-gradient-to-br from-purple-50 via-white to-emerald-50"
              }`}>
                <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${
                  theme === "dark" ? "text-purple-300" : "text-purple-600"
                }`}>
                  MentorsDaily
                </p>
                <h3 className={`text-lg font-semibold leading-snug md:text-xl ${
                  theme === "dark" ? "text-emerald-100" : "text-emerald-700"
                }`}>
                  Instant clarity, answer-first workflow.
                </h3>
                <ul className={`mt-3 space-y-2 text-xs ${
                  theme === "dark" ? "text-emerald-50" : "text-slate-700"
                }`}>
                  <li className="flex items-center gap-2">
                    <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                      theme === "dark"
                        ? "bg-emerald-500 text-black"
                        : "bg-emerald-500 text-white"
                    }`}>
                      ✓
                    </span>
                    <span>Answer writing, evaluation and feedback in one focused workspace.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                      theme === "dark"
                        ? "bg-emerald-500 text-black"
                        : "bg-emerald-500 text-white"
                    }`}>
                      ✓
                    </span>
                    <span>PYQ analytics to decide what to study, not just how.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                      theme === "dark"
                        ? "bg-emerald-500 text-black"
                        : "bg-emerald-500 text-white"
                    }`}>
                      ✓
                    </span>
                    <span>Mentor-style AI chat trained on UPSC-style reasoning.</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

