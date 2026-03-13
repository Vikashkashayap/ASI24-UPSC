import { Card, CardContent } from "../ui/card";
import { useTheme } from "../../hooks/useTheme";

const traditionalPainPoints = [
  "Google search — generic results, not UPSC-specific",
  "PDFs, Telegram notes — static, they get outdated",
  "No reliable system to clear doubts",
  "Copy check — manual, delayed, inconsistent feedback",
  "Analytics — just marks, can't see trends",
];

const mentorsDailyWins = [
  "Write answers — everything in one workspace",
  "AI evaluates — instant, consistent, structure + content feedback",
  "Prelims test practice — timed MCQs, topic drills, instant scoring",
  "Student dashboard — prep, tests, analytics & plans in one screen",
  "Performance analysis — trends, weak areas, improvement over time",
  "Plan generator — daily & weekly plans from PYQ + your performance",
  "PYQ analytics — decide which topics to study next",
  "Mentor-style chat — trained on UPSC reasoning",
  "Current affairs + concepts — all linked, revise-friendly",
];

export const IntelligenceVsNoise = () => {
  const { theme } = useTheme();

  return (
    <section
      id="compare"
      className={`py-16 transition-colors ${
        theme === "dark" ? "bg-[#030712]" : "bg-slate-50"
      }`}
    >
      <div className="mx-auto max-w-6xl px-4 text-center md:px-6">
        <h2
          className={`text-lg font-semibold tracking-tight md:text-xl ${
            theme === "dark" ? "text-slate-50" : "text-slate-900"
          }`}
        >
          Intelligence{" "}
          <span className={theme === "dark" ? "text-slate-400" : "text-slate-500"}>
            vs
          </span>{" "}
          Noise
        </h2>
        <p
          className={`mt-2 text-xs md:text-sm ${
            theme === "dark" ? "text-slate-300" : "text-slate-600"
          }`}
        >
          Traditional prep vs MentorsDaily — dashboard, prelims practice, performance analysis &
          plan generator in one place.
        </p>

        <div className="mt-10">
          <Card
            className={`overflow-hidden rounded-3xl text-left ${
              theme === "dark"
                ? "border-slate-700/60 bg-slate-900/50 text-slate-50 shadow-xl"
                : "border-slate-200 bg-white text-slate-900 shadow-lg"
            }`}
          >
            <CardContent className="grid gap-0 p-0 lg:grid-cols-2">
              <div
                className={`space-y-4 border-b px-6 py-8 lg:border-b-0 lg:border-r ${
                  theme === "dark"
                    ? "border-slate-700/60 bg-slate-800/40"
                    : "border-slate-200 bg-slate-100/80"
                }`}
              >
                <p
                  className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${
                    theme === "dark" ? "text-slate-500" : "text-slate-500"
                  }`}
                >
                  Traditional method
                </p>
                <h3
                  className={`text-lg font-semibold leading-snug md:text-xl ${
                    theme === "dark" ? "text-slate-50" : "text-slate-900"
                  }`}
                >
                  Hours lost in scattered resources.
                </h3>
                <ul
                  className={`mt-3 space-y-2.5 text-xs md:text-[13px] ${
                    theme === "dark" ? "text-slate-300" : "text-slate-600"
                  }`}
                >
                  {traditionalPainPoints.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span
                        className={`mt-0.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[10px] ${
                          theme === "dark"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-red-50 text-red-500"
                        }`}
                      >
                        ✕
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div
                className={`space-y-4 px-6 py-8 ${
                  theme === "dark"
                    ? "bg-gradient-to-br from-[#1e1035] via-[#020617] to-[#064e3b]"
                    : "bg-gradient-to-br from-purple-50 via-white to-emerald-50"
                }`}
              >
                <p
                  className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${
                    theme === "dark" ? "text-purple-300" : "text-purple-600"
                  }`}
                >
                  MentorsDaily
                </p>
                <h3
                  className={`text-lg font-semibold leading-snug md:text-xl ${
                    theme === "dark" ? "text-emerald-100" : "text-emerald-700"
                  }`}
                >
                  Instant clarity, answer-first workflow.
                </h3>
                <p
                  className={`text-[11px] font-medium ${
                    theme === "dark" ? "text-emerald-200/90" : "text-emerald-800/90"
                  }`}
                >
                  Dashboard · Prelims practice · Performance analysis · Plan generator
                </p>
                <ul
                  className={`max-h-[320px] space-y-2 overflow-y-auto pr-1 text-xs md:max-h-none md:text-[13px] ${
                    theme === "dark" ? "text-emerald-50" : "text-slate-700"
                  }`}
                >
                  {mentorsDailyWins.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span
                        className={`mt-0.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[10px] ${
                          theme === "dark"
                            ? "bg-emerald-500 text-black"
                            : "bg-emerald-500 text-white"
                        }`}
                      >
                        ✓
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};
