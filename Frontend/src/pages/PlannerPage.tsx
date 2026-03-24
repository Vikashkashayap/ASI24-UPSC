import { useCallback, useEffect, useMemo, useState } from "react";
import {
  studyPlanAPI,
  type StudyPlanType,
  type StudyPlanTask,
  type StudyPlanProgress,
  type PlannerDashboardSummary,
} from "../services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useTheme } from "../hooks/useTheme";
import { Target, RefreshCw, CalendarDays, Sparkles, X, Zap } from "lucide-react";
import { StudyPlanSetupForm, type SyllabusPlanSetupPayload } from "../components/studyPlanner/StudyPlanSetupForm";
import { RegeneratePlanModal } from "../components/studyPlanner/RegeneratePlanModal";
import { DailyReadingFocusCard } from "../components/studyPlanner/DailyReadingFocusCard";
import { DailyTasksList } from "../components/studyPlanner/DailyTasksList";
import { ProgressBar } from "../components/studyPlanner/ProgressBar";
import { CalendarView } from "../components/studyPlanner/CalendarView";
import { StreakIndicator } from "../components/studyPlanner/StreakIndicator";
import { UpcomingTopics } from "../components/studyPlanner/UpcomingTopics";

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Calendar YYYY-MM-DD from API (prefer date part of ISO string to avoid timezone shifts). */
function isoDateOnly(v: string | Date | undefined | null): string {
  if (v == null || v === "") return "";
  if (typeof v === "string") {
    const m = v.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "";
    return toDateString(d);
  }
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return toDateString(d);
}

function earliestTaskDate(tasks: StudyPlanTask[]): string | null {
  if (!tasks?.length) return null;
  return tasks.reduce((min, t) => (t.date < min ? t.date : min), tasks[0].date);
}

function computeDaysRemaining(examDate: string | Date | undefined): number | null {
  if (!examDate) return null;
  const exam = new Date(examDate);
  exam.setHours(0, 0, 0, 0);
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((exam.getTime() - t.getTime()) / 86400000));
}

export const PlannerPage = () => {
  const { theme } = useTheme();
  const [plan, setPlan] = useState<StudyPlanType | null>(null);
  const [progress, setProgress] = useState<StudyPlanProgress | null>(null);
  const [dashboard, setDashboard] = useState<PlannerDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupLoading, setSetupLoading] = useState(false);
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);
  const [testActionLoadingId, setTestActionLoadingId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(toDateString(new Date()));
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [explainOpen, setExplainOpen] = useState(false);
  const [explainText, setExplainText] = useState("");
  const [explainLoading, setExplainLoading] = useState(false);
  const [regenerateModalOpen, setRegenerateModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");

  const todayStr = useMemo(() => toDateString(new Date()), []);

  const fetchPlan = useCallback(async () => {
    const clientToday = toDateString(new Date());
    try {
      const res = await studyPlanAPI.get(clientToday);
      setPlan(res.data.plan);
      setDashboard(res.data.dashboard ?? null);
      const prog = res.data.progress ?? null;
      if (prog && res.data.daysRemaining != null) {
        setProgress({ ...prog, daysRemaining: res.data.daysRemaining });
      } else {
        setProgress(prog);
      }
    } catch {
      setPlan(null);
      setProgress(null);
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  const applyProgressFromResponse = (payload: {
    plan: StudyPlanType;
    progress: StudyPlanProgress;
    daysRemaining?: number | null;
    dashboard?: PlannerDashboardSummary | null;
  }) => {
    const dr =
      payload.daysRemaining != null
        ? payload.daysRemaining
        : computeDaysRemaining(payload.plan.examDate);
    if (payload.progress) setProgress({ ...payload.progress, daysRemaining: dr ?? undefined });
    if (payload.dashboard) setDashboard(payload.dashboard);
  };

  const handleSetup = async (data: SyllabusPlanSetupPayload) => {
    setSetupLoading(true);
    try {
      const res = await studyPlanAPI.setup({
        startDate: data.startDate,
        endDate: data.endDate,
        dailyHours: data.dailyHours,
        preparationLevel: data.preparationLevel,
        syllabusJson: data.syllabusJson,
      });
      setPlan(res.data.plan);
      applyProgressFromResponse({
        plan: res.data.plan,
        progress: res.data.progress,
        daysRemaining: res.data.daysRemaining,
        dashboard: res.data.dashboard,
      });
    } finally {
      setSetupLoading(false);
    }
  };

  const handleRegenerateConfirm = async (data: SyllabusPlanSetupPayload) => {
    if (!plan) return;
    setSetupLoading(true);
    try {
      const res = await studyPlanAPI.setup({
        startDate: data.startDate,
        endDate: data.endDate,
        dailyHours: data.dailyHours,
        preparationLevel: data.preparationLevel,
        ...(plan.syllabusId ? { syllabusId: plan.syllabusId } : {}),
      });
      setPlan(res.data.plan);
      applyProgressFromResponse({
        plan: res.data.plan,
        progress: res.data.progress,
        daysRemaining: res.data.daysRemaining,
        dashboard: res.data.dashboard,
      });
      setRegenerateModalOpen(false);
    } finally {
      setSetupLoading(false);
    }
  };

  const handleToggleComplete = async (taskId: string) => {
    setLoadingTaskId(taskId);
    try {
      const res = await studyPlanAPI.toggleTask(taskId);
      setPlan(res.data.plan);
      applyProgressFromResponse({
        plan: res.data.plan,
        progress: res.data.progress,
        dashboard: res.data.dashboard,
      });
    } finally {
      setLoadingTaskId(null);
    }
  };

  const handleTestResult = async (taskId: string, accuracy: number) => {
    setTestActionLoadingId(taskId);
    try {
      const res = await studyPlanAPI.submitTestResult(taskId, accuracy);
      setPlan(res.data.plan);
      applyProgressFromResponse({
        plan: res.data.plan,
        progress: res.data.progress,
        dashboard: res.data.dashboard,
      });
    } finally {
      setTestActionLoadingId(null);
    }
  };

  const handleSkipTest = async (taskId: string) => {
    setTestActionLoadingId(taskId);
    try {
      const res = await studyPlanAPI.skipPlannerTest(taskId);
      setPlan(res.data.plan);
      applyProgressFromResponse({
        plan: res.data.plan,
        progress: res.data.progress,
        dashboard: res.data.dashboard,
      });
    } finally {
      setTestActionLoadingId(null);
    }
  };

  const handleExplain = async () => {
    setExplainLoading(true);
    setExplainText("");
    setExplainOpen(true);
    try {
      const res = await studyPlanAPI.explain();
      setExplainText(res.data.explanation || "No explanation returned.");
    } catch {
      setExplainText("Could not load explanation. Try again later.");
    } finally {
      setExplainLoading(false);
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

  const groupedByDate = useMemo(() => {
    const map = new Map<string, StudyPlanTask[]>();
    const source = plan?.tasks || [];
    for (const t of source) {
      if (!map.has(t.date)) map.set(t.date, []);
      map.get(t.date)!.push(t);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
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
            Syllabus-driven timetable: topics from admin Excel, daily revision, and MCQ blocks — with carry-over and
            smart repeats when scores dip.
          </p>
        </div>
        <StudyPlanSetupForm onSubmit={handleSetup} isLoading={setupLoading} />
      </div>
    );
  }

  const tasks = plan.tasks || [];
  const dailyProgress = progress?.daily ?? { total: 0, completed: 0, percent: 0 };
  const weeklyProgress = progress?.weekly ?? { total: 0, completed: 0, percent: 0 };
  const isSyllabus = plan.plannerVersion === "syllabus";

  const regenInitialStart =
    isoDateOnly(plan.planStartDate ?? undefined) ||
    earliestTaskDate(plan.tasks || []) ||
    toDateString(new Date());
  const regenInitialEnd = isoDateOnly(plan.planEndDate ?? plan.examDate) || isoDateOnly(plan.examDate);

  return (
    <div className="max-w-5xl mx-auto space-y-6 md:space-y-8">
      <RegeneratePlanModal
        open={regenerateModalOpen}
        onClose={() => !setupLoading && setRegenerateModalOpen(false)}
        initialStart={regenInitialStart}
        initialEnd={regenInitialEnd}
        initialDailyHours={plan.dailyHours}
        initialPreparationLevel={plan.preparationLevel}
        isLoading={setupLoading}
        onConfirm={handleRegenerateConfirm}
      />

      {explainOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="explain-plan-title"
        >
          <div
            className={
              "max-w-lg w-full rounded-2xl border shadow-xl p-5 max-h-[80vh] overflow-y-auto " +
              (theme === "dark" ? "bg-slate-900 border-slate-600 text-slate-100" : "bg-white border-slate-200 text-slate-800")
            }
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <h2 id="explain-plan-title" className="text-lg font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-500" />
                Why this plan?
              </h2>
              <button
                type="button"
                onClick={() => setExplainOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {explainLoading ? (
              <p className="text-sm text-slate-500">Thinking…</p>
            ) : (
              <div className="text-sm whitespace-pre-wrap leading-relaxed text-slate-600 dark:text-slate-300">
                {explainText}
              </div>
            )}
          </div>
        </div>
      )}

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
            <div className="flex flex-wrap items-center gap-2">
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
              {isSyllabus && plan.intensiveMode && (
                <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40">
                  Intensive mode
                </span>
              )}
            </div>
            <p className={"text-sm md:text-base " + (theme === "dark" ? "text-slate-300" : "text-slate-600")}>
              {isSyllabus
                ? "Topic coverage from the syllabus upload, mixed by subject, plus revision and daily MCQs."
                : "Classic rotation plan with current affairs, MCQs, and revision."}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <Button
              variant="outline"
              type="button"
              onClick={handleExplain}
              disabled={explainLoading}
              className="!min-h-[44px] border-teal-500/50 text-teal-700 dark:text-teal-300"
            >
              <Sparkles className="w-4 h-4 mr-2 shrink-0" aria-hidden />
              Explain my plan
            </Button>
            <Button
              variant="primary"
              type="button"
              onClick={() => setRegenerateModalOpen(true)}
              disabled={setupLoading}
              className="!bg-emerald-600 hover:!bg-emerald-700 !text-white border-0"
            >
              <RefreshCw className="w-4 h-4 mr-2 shrink-0" aria-hidden />
              <span>Regenerate Plan</span>
            </Button>
          </div>
        </div>
      </div>

      {dashboard?.smartMessage && (
        <Card className={theme === "dark" ? "bg-slate-800/90 border-teal-500/20" : "bg-white border-teal-200"}>
          <CardContent className="py-3 flex items-start gap-3">
            <div className={theme === "dark" ? "bg-teal-500/20 p-2 rounded-lg" : "bg-teal-100 p-2 rounded-lg"}>
              <Zap className={theme === "dark" ? "text-teal-400 w-5 h-5" : "text-teal-600 w-5 h-5"} />
            </div>
            <p className={theme === "dark" ? "text-slate-200 text-sm" : "text-slate-700 text-sm"}>
              {dashboard.smartMessage}
            </p>
          </CardContent>
        </Card>
      )}

      {progress?.daysRemaining != null && (
        <Card className={theme === "dark" ? "bg-slate-800/90 border-amber-500/20" : "bg-white border-amber-200"}>
          <CardContent className="py-4 flex items-center gap-3">
            <div className={theme === "dark" ? "bg-amber-500/20 p-2 rounded-lg" : "bg-amber-100 p-2 rounded-lg"}>
              <CalendarDays className={theme === "dark" ? "text-amber-400 w-5 h-5" : "text-amber-600 w-5 h-5"} />
            </div>
            <div>
              <p className={theme === "dark" ? "text-slate-200 font-semibold" : "text-slate-800 font-semibold"}>
                {progress.daysRemaining} days until end date
              </p>
              <p className={theme === "dark" ? "text-slate-400 text-sm" : "text-slate-500 text-sm"}>
                Use the daily timetable below to stay on track.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className={theme === "dark" ? "bg-slate-800/90 border-slate-700" : "bg-white border-slate-200"}>
          <CardHeader>
            <CardTitle className={theme === "dark" ? "text-slate-50" : "text-slate-900"}>
              Today’s progress ({todayStr})
            </CardTitle>
            <CardDescription className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>
              Daily and weekly completion
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProgressBar label="Daily" value={dailyProgress.completed} max={dailyProgress.total} />
            <ProgressBar label="Weekly" value={weeklyProgress.completed} max={weeklyProgress.total} />
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

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={viewMode === "calendar" ? "primary" : "outline"}
          type="button"
          className="!min-h-[36px] text-xs"
          onClick={() => setViewMode("calendar")}
        >
          Calendar view
        </Button>
        <Button
          variant={viewMode === "list" ? "primary" : "outline"}
          type="button"
          className="!min-h-[36px] text-xs"
          onClick={() => setViewMode("list")}
        >
          List view
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          {viewMode === "calendar" ? (
            <>
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
            </>
          ) : (
            <Card className={theme === "dark" ? "bg-slate-800/90 border-slate-700" : "bg-white border-slate-200"}>
              <CardHeader>
                <CardTitle className={theme === "dark" ? "text-slate-50" : "text-slate-900"}>
                  Plan list (by date)
                </CardTitle>
                <CardDescription className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>
                  Click any date to open detail panel.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[460px] overflow-auto">
                {groupedByDate.map(([date, dateTasks]) => (
                  <button
                    key={date}
                    type="button"
                    onClick={() => setSelectedDate(date)}
                    className={
                      "w-full text-left rounded-lg border px-3 py-2 " +
                      (selectedDate === date
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : theme === "dark"
                          ? "border-slate-700 hover:border-slate-500"
                          : "border-slate-200 hover:border-slate-300")
                    }
                  >
                    <p className={theme === "dark" ? "text-slate-200 text-sm font-semibold" : "text-slate-800 text-sm font-semibold"}>
                      {date}
                    </p>
                    <p className={theme === "dark" ? "text-slate-400 text-xs" : "text-slate-600 text-xs"}>
                      {dateTasks.length} task(s)
                    </p>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
        <div className="lg:col-span-2 space-y-4">
          <DailyReadingFocusCard tasks={tasks} selectedDate={selectedDate} />
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
                onSubmitTestResult={isSyllabus ? handleTestResult : undefined}
                onSkipTest={isSyllabus ? handleSkipTest : undefined}
                testActionLoadingId={testActionLoadingId}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className={theme === "dark" ? "bg-slate-800/90 border-cyan-500/20" : "bg-white border-cyan-200/50"}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={theme === "dark" ? "bg-cyan-500/20 p-2 rounded-lg" : "bg-cyan-100 p-2 rounded-lg"}>
              <Target className={theme === "dark" ? "text-cyan-400 w-5 h-5" : "text-cyan-600 w-5 h-5"} />
            </div>
            <div>
              <CardTitle className={theme === "dark" ? "text-slate-50" : "text-slate-900"}>
                How this planner behaves
              </CardTitle>
              <CardDescription className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>
                {isSyllabus ? "Syllabus track" : "Classic track"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className={theme === "dark" ? "text-slate-300" : "text-slate-600"}>
          <ul className="list-disc list-inside space-y-1 text-sm">
            {isSyllabus ? (
              <>
                <li>Each day: multiple study topics, one revision block, one MCQ test (20 questions).</li>
                <li>Intensive mode packs more topics per day when the calendar is tight.</li>
                <li>Missed tasks from yesterday clone onto today; log MCQ % or skip to reschedule.</li>
                <li>Below 50% on a test queues a repeat study slot a few days ahead.</li>
              </>
            ) : (
              <>
                <li>Seven-day rotation with subject study, current affairs, MCQs, and revision.</li>
                <li>Maintain your streak by finishing at least one task per day.</li>
              </>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
