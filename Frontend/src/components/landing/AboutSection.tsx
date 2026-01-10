import { Card, CardContent } from "../ui/card";
import { useTheme } from "../../hooks/useTheme";

export const AboutSection = () => {
  const { theme } = useTheme();
  
  return (
    <section id="about" className={`border-b py-16 transition-colors ${
      theme === "dark"
        ? "border-purple-900/70 bg-[#050012]"
        : "border-slate-200 bg-slate-50"
    }`}>
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="text-center">
          <h2 className={`text-lg font-semibold tracking-tight md:text-xl ${
            theme === "dark" ? "text-slate-50" : "text-slate-900"
          }`}>Our Team</h2>
          <p className={`mt-2 text-xs md:text-sm ${
            theme === "dark" ? "text-slate-300" : "text-slate-600"
          }`}>
            Builders, mentors and technologists obsessed with calm, focused UPSC preparation.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Card className={`rounded-[26px] ${
            theme === "dark"
              ? "border-purple-800/60 bg-gradient-to-br from-[#020617] via-[#050018] to-[#022c22] text-slate-50 shadow-[0_18px_70px_rgba(15,23,42,0.95)]"
              : "border-slate-200 bg-white text-slate-900 shadow-lg"
          }`}>
            <CardContent className="flex flex-col items-center gap-3 p-6 text-center text-[11px] md:p-7">
              <div className={`h-20 w-20 rounded-full ${
                theme === "dark"
                  ? "bg-[radial-gradient(circle_at_center,_rgba(147,51,234,0.35),_transparent_70%)]"
                  : "bg-gradient-to-br from-purple-100 to-purple-200"
              }`} />
              <div>
                <p className={`text-sm font-semibold ${
                  theme === "dark" ? "text-slate-50" : "text-slate-900"
                }`}>Founder 1</p>
                <p className={`text-[10px] uppercase tracking-[0.16em] ${
                  theme === "dark" ? "text-slate-400" : "text-slate-500"
                }`}>Product &amp; Strategy</p>
              </div>
              <p className={`mt-2 ${
                theme === "dark" ? "text-slate-200" : "text-slate-600"
              }`}>
                Brings experience mentoring aspirants and designing learning journeys that fit busy schedules.
              </p>
            </CardContent>
          </Card>

          <Card className={`rounded-[26px] ${
            theme === "dark"
              ? "border-purple-800/60 bg-gradient-to-br from-[#020617] via-[#050018] to-[#022c22] text-slate-50 shadow-[0_18px_70px_rgba(15,23,42,0.95)]"
              : "border-slate-200 bg-white text-slate-900 shadow-lg"
          }`}>
            <CardContent className="flex flex-col items-center gap-3 p-6 text-center text-[11px] md:p-7">
              <div className={`h-20 w-20 rounded-full ${
                theme === "dark"
                  ? "bg-[radial-gradient(circle_at_center,_rgba(16,185,129,0.35),_transparent_70%)]"
                  : "bg-gradient-to-br from-emerald-100 to-emerald-200"
              }`} />
              <div>
                <p className={`text-sm font-semibold ${
                  theme === "dark" ? "text-slate-50" : "text-slate-900"
                }`}>Founder 2</p>
                <p className={`text-[10px] uppercase tracking-[0.16em] ${
                  theme === "dark" ? "text-slate-400" : "text-slate-500"
                }`}>AI &amp; Engineering</p>
              </div>
              <p className={`mt-2 ${
                theme === "dark" ? "text-slate-200" : "text-slate-600"
              }`}>
                Focused on building reliable, book-backed AI systems so that feedback stays grounded in the syllabus.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

