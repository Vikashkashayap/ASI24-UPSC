import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useTheme } from "../hooks/useTheme";

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
    <div className="max-w-5xl mx-auto space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4">
        <div className="flex flex-col gap-1 md:gap-2">
          <h1 className={`text-xl md:text-2xl font-semibold tracking-tight ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>Study planner</h1>
          <p className={`text-xs md:text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
            AI-shaped daily and weekly scaffolding based on your weak areas.
          </p>
        </div>
        <Button
          onClick={() => navigate("/student-profiler")}
          className="text-xs md:text-sm bg-emerald-500 hover:bg-emerald-600 w-full md:w-auto"
        >
          {planner ? "Regenerate Plan" : "Generate Study Plan"}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2 md:pb-3">
          <CardTitle className="text-sm md:text-base">Weekly intensity</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            {loading ? "" : planner ? `This week is tagged as ${planner.intensity} focus.` : "Planner will update as you submit answers."}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        <Card>
          <CardHeader className="pb-2 md:pb-3">
            <CardTitle className="text-sm md:text-base">Daily timetable</CardTitle>
            <CardDescription className="text-xs md:text-sm">Spread across days with weak-subject focus.</CardDescription>
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

        <Card>
          <CardHeader className="pb-2 md:pb-3">
            <CardTitle className="text-sm md:text-base">Weekly goals</CardTitle>
            <CardDescription className="text-xs md:text-sm">Targets that make your week exam-like.</CardDescription>
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
