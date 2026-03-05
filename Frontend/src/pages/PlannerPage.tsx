import { useCallback, useEffect, useMemo, useState } from "react";
import { studyPlanAPI, type StudyPlanType, type StudyPlanProgress } from "../services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useTheme } from "../hooks/useTheme";
import { CalendarClock, Target, RefreshCw, CalendarDays } from "lucide-react";
import { StudyPlanSetupForm } from "../components/studyPlanner/StudyPlanSetupForm";
import { DailyTasksList } from "../components/studyPlanner/DailyTasksList";
import { ProgressBar } from "../components/studyPlanner/ProgressBar";
import { CalendarView } from "../components/studyPlanner/CalendarView";
import { StreakIndicator } from "../components/studyPlanner/StreakIndicator";
import { UpcomingTopics } from "../components/studyPlanner/UpcomingTopics";

/** YYYY-MM-DD in local time (avoids UTC shift so calendar shows correct date in all timezones). */
function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const PlannerPage = () => {
  const { theme } = useTheme();
  const [plan, setPlan] = useState<StudyPlanType | null>(null);
  const [progress, setProgress] = useState<StudyPlanProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupLoading, setSetupLoading] = useState(false);
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(toDateString(new Date()));
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const fetchPlan = useCallback(async () => {
    try {
      const res = await studyPlanAPI.get();
      setPlan(res.data.plan);
      const prog = res.data.progress ?? null;
      if (prog && res.data.daysRemaining != null) {
        setProgress({ ...prog, daysRemaining: res.data.daysRemaining });
      } else {
        setProgress(prog);
      }
    } catch {
      setPlan(null);
      setProgress(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  const handleSetup = async (data: {
    examDate: string;
    dailyHours: number;
    preparationLevel: string;
  }) => {
    setSetupLoading(true);
    try {
      const res = await studyPlanAPI.setup(data);
      setPlan(res.data.plan);
      setProgress(res.data.progress);
    } finally {
      setSetupLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!plan) return;
    setSetupLoading(true);
    try {
      const res = await studyPlanAPI.setup({
        examDate: plan.examDate,
        dailyHours: plan.dailyHours,
        preparationLevel: plan.preparationLevel,
      });
      setPlan(res.data.plan);
      setProgress(res.data.progress);
    } finally {
      setSetupLoading(false);
    }
  };

  const handleToggleComplete = async (taskId: string) => {
    setLoadingTaskId(taskId);
    try {
      const res = await studyPlanAPI.toggleTask(taskId);
      setPlan(res.data.plan);
      setProgress(res.data.progress);
    } finally {
      setLoadingTaskId(null);
    }
  };

  const taskCountByDate = useMemo(() => {
    const map: Record<string, { total: number; completed: number }> = {};
    if (!plan?.tasks) return map;
    for (const t of plan.tasks) {
      if (!map[t.date]) map[t.date] = { total: 0, completed: 0 };
      map[t.date].total++;
      if (t.completed) map[t.date].completed++;
    }
    return map;
  }, [plan?.tasks]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto flex items-center justify-center py-16">
        <p className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>
          Loading study plan…
        </p>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div
          className={
            "rounded-2xl p-6 border-2 " +
            (theme === "dark"
              ? "bg-gradient-to-br from-slate-800/90 via-teal-900/20 to-slate-900/90 border-teal-500/20"
              : "bg-gradient-to-br from-white via-teal-50/30 to-white border-teal-200/50")
          }
        >
          <h1
            className={
              "text-2xl md:text-3xl font-bold tracking-tight " +
              (theme === "dark"
                ? "from-teal-200 via-teal-300 to-teal-400 bg-clip-text text-transparent bg-gradient-to-r"
                : "from-teal-600 via-teal-700 to-teal-800 bg-clip-text text-transparent bg-gradient-to-r")
            }
          >
            Study Planner
          </h1>
          <p className={"mt-1 text-sm md:text-base " + (theme === "dark" ? "text-slate-300" : "text-slate-600")}>
            AI-shaped daily and weekly scaffolding. Set your exam date and we’ll generate your plan.
          </p>
        </div>
        <StudyPlanSetupForm onSubmit={handleSetup} isLoading={setupLoading} />
      </div>
    );
  }

  const tasks = plan.tasks || [];
  const dailyProgress = progress?.daily ?? { total: 0, completed: 0, percent: 0 };
  const weeklyProgress = progress?.weekly ?? { total: 0, completed: 0, percent: 0 };

  return (
    <div className="max-w-5xl mx-auto space-y-6 md:space-y-8">
      {/* Header */}
      <div
        className={
          "relative overflow-hidden rounded-2xl p-6 md:p-8 border-2 transition-all duration-300 " +
          (theme === "dark"
            ? "bg-gradient-to-br from-slate-800/90 via-teal-900/20 to-slate-900/90 border-teal-500/20"
            : "bg-gradient-to-br from-white via-teal-50/30 to-white border-teal-200/50")
        }
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1
              className={
                "text-2xl md:text-3xl font-bold tracking-tight " +
                (theme === "dark"
                  ? "from-teal-200 via-teal-300 to-teal-400 bg-clip-text text-transparent bg-gradient-to-r"
                  : "from-teal-600 via-teal-700 to-teal-800 bg-clip-text text-transparent bg-gradient-to-r")
              }
            >
              Study Planner
            </h1>
            <p className={"text-sm md:text-base " + (theme === "dark" ? "text-slate-300" : "text-slate-600")}>
              AI-shaped daily and weekly scaffolding based on your weak areas.
            </p>
          </div>
          <Button
            variant="primary"
            type="button"
            onClick={handleRegenerate}
            disabled={setupLoading}
            className="!bg-emerald-600 hover:!bg-emerald-700 !text-white border-0 shrink-0"
          >
            <RefreshCw className="w-4 h-4 mr-2 shrink-0" aria-hidden />
            <span>Regenerate Plan</span>
          </Button>
        </div>
      </div>

      {/* Days remaining */}
      {progress?.daysRemaining != null && (
        <Card className={theme === "dark" ? "bg-slate-800/90 border-amber-500/20" : "bg-white border-amber-200"}>
          <CardContent className="py-4 flex items-center gap-3">
            <div className={theme === "dark" ? "bg-amber-500/20 p-2 rounded-lg" : "bg-amber-100 p-2 rounded-lg"}>
              <CalendarDays className={theme === "dark" ? "text-amber-400 w-5 h-5" : "text-amber-600 w-5 h-5"} />
            </div>
            <div>
              <p className={theme === "dark" ? "text-slate-200 font-semibold" : "text-slate-800 font-semibold"}>
                {progress.daysRemaining} days until exam
              </p>
              <p className={theme === "dark" ? "text-slate-400 text-sm" : "text-slate-500 text-sm"}>
                Use the daily timetable below to stay on track.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress & Streak */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className={theme === "dark" ? "bg-slate-800/90 border-slate-700" : "bg-white border-slate-200"}>
          <CardHeader>
            <CardTitle className={theme === "dark" ? "text-slate-50" : "text-slate-900"}>
              Today’s progress
            </CardTitle>
            <CardDescription className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>
              Daily and weekly completion
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProgressBar
              label="Daily"
              value={dailyProgress.completed}
              max={dailyProgress.total}
            />
            <ProgressBar
              label="Weekly"
              value={weeklyProgress.completed}
              max={weeklyProgress.total}
            />
          </CardContent>
        </Card>
        <Card className={theme === "dark" ? "bg-slate-800/90 border-slate-700" : "bg-white border-slate-200"}>
          <CardHeader>
            <CardTitle className={theme === "dark" ? "text-slate-50" : "text-slate-900"}>
              Study streak
            </CardTitle>
            <CardDescription className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>
              Consecutive days with completed tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StreakIndicator
              currentStreak={progress?.streak ?? 0}
              longestStreak={progress?.longestStreak ?? 0}
            />
          </CardContent>
        </Card>
      </div>

      {/* Calendar + Daily tasks + Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <CalendarView
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            taskCountByDate={taskCountByDate}
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
          />
          <Card className={theme === "dark" ? "bg-slate-800/90 border-slate-700" : "bg-white border-slate-200"}>
            <CardHeader className="pb-2">
              <CardTitle className={theme === "dark" ? "text-slate-50 text-base" : "text-slate-900 text-base"}>
                Upcoming topics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <UpcomingTopics tasks={tasks} fromDate={selectedDate} limit={5} />
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2">
          <Card className={theme === "dark" ? "bg-slate-800/90 border-slate-700" : "bg-white border-slate-200"}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className={theme === "dark" ? "bg-purple-500/20 p-2 rounded-lg" : "bg-purple-100 p-2 rounded-lg"}>
                  <Target className={theme === "dark" ? "text-purple-400 w-5 h-5" : "text-purple-600 w-5 h-5"} />
                </div>
                <div>
                  <CardTitle className={theme === "dark" ? "text-slate-50" : "text-slate-900"}>
                    Daily timetable
                  </CardTitle>
                  <CardDescription className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>
                    {selectedDate} — Mark tasks when done
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <DailyTasksList
                tasks={tasks}
                selectedDate={selectedDate}
                onToggleComplete={handleToggleComplete}
                loadingTaskId={loadingTaskId}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Weekly goals card (static summary) */}
      <Card className={theme === "dark" ? "bg-slate-800/90 border-cyan-500/20" : "bg-white border-cyan-200/50"}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={theme === "dark" ? "bg-cyan-500/20 p-2 rounded-lg" : "bg-cyan-100 p-2 rounded-lg"}>
              <Target className={theme === "dark" ? "text-cyan-400 w-5 h-5" : "text-cyan-600 w-5 h-5"} />
            </div>
            <div>
              <CardTitle className={theme === "dark" ? "text-slate-50" : "text-slate-900"}>
                Weekly goals
              </CardTitle>
              <CardDescription className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>
                Targets that make your week exam-like.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className={theme === "dark" ? "text-slate-300" : "text-slate-600"}>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Complete subject study, current affairs, MCQ practice, and revision each day</li>
            <li>Maintain your streak by finishing at least one task per day</li>
            <li>Hit weekly progress target to stay on track for exam date</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
