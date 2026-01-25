import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useTheme } from "../hooks/useTheme";
import { CalendarClock, Target } from "lucide-react";

export const PlannerPage = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [planner, setPlanner] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/api/planner");
        setPlanner(res.data.planner);
      } catch {
        setPlanner(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-6 md:space-y-8">
      {/* Enhanced Header */}
      <div className={`relative overflow-hidden rounded-2xl p-6 md:p-8 border-2 transition-all duration-300 ${
        theme === "dark" 
          ? "bg-gradient-to-br from-slate-800/90 via-teal-900/20 to-slate-900/90 border-teal-500/20 shadow-xl shadow-teal-500/10" 
          : "bg-gradient-to-br from-white via-teal-50/30 to-white border-teal-200/50 shadow-xl shadow-teal-100/30"
      }`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-teal-500/10 to-transparent rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6">
          <div className="flex items-center gap-3 md:gap-4">
            <div className={`p-2.5 md:p-3 rounded-xl ${
              theme === "dark" ? "bg-teal-500/20" : "bg-teal-100"
            }`}>
              <CalendarClock className={`w-6 h-6 ${theme === "dark" ? "text-teal-400" : "text-teal-600"}`} />
            </div>
            <div className="flex flex-col gap-1 md:gap-2">
              <h1 className={`text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r ${
                theme === "dark" 
                  ? "from-teal-200 via-teal-300 to-teal-400 bg-clip-text text-transparent" 
                  : "from-teal-600 via-teal-700 to-teal-800 bg-clip-text text-transparent"
              }`}>
                Study Planner
              </h1>
              <p className={`text-sm md:text-base ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                AI-shaped daily and weekly scaffolding based on your weak areas.
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate("/student-profiler")}
            className="text-sm md:text-base bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/30 w-full md:w-auto"
          >
            {planner ? "Regenerate Plan" : "Generate Study Plan"}
          </Button>
        </div>
      </div>

      <Card className={`relative overflow-hidden border-2 transition-all duration-300 hover:shadow-xl ${
        theme === "dark" 
          ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-teal-500/20 shadow-lg" 
          : "bg-gradient-to-br from-white to-teal-50/20 border-teal-200/50 shadow-lg"
      }`}>
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-teal-500/10 to-transparent rounded-full blur-3xl" />
        <CardHeader className="pb-3 md:pb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              theme === "dark" ? "bg-teal-500/20" : "bg-teal-100"
            }`}>
              <Target className={`w-5 h-5 ${theme === "dark" ? "text-teal-400" : "text-teal-600"}`} />
            </div>
            <div>
              <CardTitle className={`text-base md:text-lg font-bold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
                Weekly Intensity
              </CardTitle>
              <CardDescription className="text-xs md:text-sm mt-1">
                {loading ? "" : planner ? `This week is tagged as ${planner.intensity} focus.` : "Planner will update as you submit answers."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <Card className={`relative overflow-hidden border-2 transition-all duration-300 hover:shadow-xl ${
          theme === "dark" 
            ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-purple-500/20 shadow-lg" 
            : "bg-gradient-to-br from-white to-purple-50/20 border-purple-200/50 shadow-lg"
        }`}>
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-3xl" />
          <CardHeader className="pb-3 md:pb-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                theme === "dark" ? "bg-purple-500/20" : "bg-purple-100"
              }`}>
                <CalendarClock className={`w-5 h-5 ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`} />
              </div>
              <div>
                <CardTitle className={`text-base md:text-lg font-bold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
                  Daily Timetable
                </CardTitle>
                <CardDescription className="text-xs md:text-sm mt-1">Spread across days with weak-subject focus.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className={`space-y-2 md:space-y-3 text-[10px] md:text-xs ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>
            {(planner?.dailyPlan || []).map((day: any) => (
              <div
                key={day.day}
                className={`rounded-lg md:rounded-xl border px-2 md:px-3 py-2 md:py-3 flex flex-col gap-1 ${
                  theme === "dark"
                    ? "border-purple-900/80 bg-slate-950/80"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs md:text-sm font-semibold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>Day {day.day}</span>
                  <span className={`text-[10px] md:text-[11px] font-medium ${theme === "dark" ? "text-emerald-300" : "text-emerald-600"}`}>{day.subject}</span>
                </div>
                <ul className={`list-disc list-inside space-y-0.5 md:space-y-1 ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                  {day.tasks.map((t: string, idx: number) => (
                    <li key={idx}>{t}</li>
                  ))}
                </ul>
              </div>
            ))}
            {!loading && (!planner || planner.dailyPlan.length === 0) && (
              <p className={theme === "dark" ? "text-slate-400" : "text-slate-500"}>
                Planner will unlock once you have a few evaluated answers.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className={`relative overflow-hidden border-2 transition-all duration-300 hover:shadow-xl ${
          theme === "dark" 
            ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-cyan-500/20 shadow-lg" 
            : "bg-gradient-to-br from-white to-cyan-50/20 border-cyan-200/50 shadow-lg"
        }`}>
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-full blur-3xl" />
          <CardHeader className="pb-3 md:pb-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                theme === "dark" ? "bg-cyan-500/20" : "bg-cyan-100"
              }`}>
                <Target className={`w-5 h-5 ${theme === "dark" ? "text-cyan-400" : "text-cyan-600"}`} />
              </div>
              <div>
                <CardTitle className={`text-base md:text-lg font-bold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
                  Weekly Goals
                </CardTitle>
                <CardDescription className="text-xs md:text-sm mt-1">Targets that make your week exam-like.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className={`text-[10px] md:text-xs ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
            <ul className="list-disc list-inside space-y-0.5 md:space-y-1">
              {(planner?.weeklyGoals || []).map((g: string, idx: number) => (
                <li key={idx}>{g}</li>
              ))}
              {!loading && (!planner || planner.weeklyGoals.length === 0) && (
                <li>Once you submit answers, we will generate focused weekly goals.</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
