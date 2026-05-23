import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  advancedStudyPlannerAPI,
  type StudyPlanType,
  type StudyPlanProgress,
  type PlannerDashboard,
  type PlannerAnalytics,
  type StudyPlanInsight,
  type AdvancedPlannerSetup,
} from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { Dialog, DialogContent } from "../components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { CalendarView } from "../components/studyPlanner/CalendarView";
import { PlannerSkeleton } from "../components/advancedStudyPlanner/PlannerSkeleton";
import { SmartSetupForm } from "../components/advancedStudyPlanner/SmartSetupForm";
import { PlannerHero } from "../components/advancedStudyPlanner/PlannerHero";
import { ReadinessScore } from "../components/advancedStudyPlanner/ReadinessScore";
import { StudyStreakPanel } from "../components/advancedStudyPlanner/StudyStreakPanel";
import { AIInsightsPanel } from "../components/advancedStudyPlanner/AIInsightsPanel";
import { lazyNamed } from "../utils/lazyRoute";

const PerformanceAnalytics = lazyNamed(
  () => import("../components/advancedStudyPlanner/PerformanceAnalytics"),
  "PerformanceAnalytics"
);
const DailyTaskEngine = lazyNamed(
  () => import("../components/advancedStudyPlanner/DailyTaskEngine"),
  "DailyTaskEngine"
);
const AIMentorChat = lazyNamed(
  () => import("../components/advancedStudyPlanner/AIMentorChat"),
  "AIMentorChat"
);
import { PomodoroTimer } from "../components/advancedStudyPlanner/PomodoroTimer";
import { WeeklyGoalsCard } from "../components/advancedStudyPlanner/WeeklyGoalsCard";
import { PlanSyllabusTimeline } from "../components/advancedStudyPlanner/PlanSyllabusTimeline";
import { toDateString } from "../components/advancedStudyPlanner/plannerUtils";
import { cn } from "../utils/cn";
import { Bell, Target } from "lucide-react";

export const PlannerPage = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [plan, setPlan] = useState<StudyPlanType | null>(null);
  const [progress, setProgress] = useState<StudyPlanProgress | null>(null);
  const [analytics, setAnalytics] = useState<PlannerAnalytics | null>(null);
  const [insights, setInsights] = useState<StudyPlanInsight[]>([]);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupLoading, setSetupLoading] = useState(false);
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(toDateString(new Date()));
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showRegenerateForm, setShowRegenerateForm] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setError(null);
      const res = await advancedStudyPlannerAPI.getDashboard(selectedDate);
      const data = res.data as PlannerDashboard | { plan: null };
      if (!data.plan) {
        setPlan(null);
        setProgress(null);
        setAnalytics(null);
        setInsights([]);
        return;
      }
      const dash = data as PlannerDashboard;
      setPlan(dash.plan);
      setProgress(dash.progress);
      setDaysRemaining(dash.daysRemaining ?? null);
      setAnalytics(dash.analytics);
      setInsights(dash.insights || dash.plan.aiInsights || []);
    } catch (e) {
      setError("Could not load your study plan. Please try again.");
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleGenerate = async (data: AdvancedPlannerSetup) => {
    setSetupLoading(true);
    try {
      const res = await advancedStudyPlannerAPI.generateSmartPlan(data);
      setPlan(res.data.plan);
      setProgress(res.data.progress);
      setDaysRemaining(res.data.daysRemaining ?? null);
      setShowRegenerateForm(false);
      toast.success("Your AI study plan is ready — syllabus topics mapped to your timetable!");
      await fetchDashboard();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || "Failed to generate plan");
    } finally {
      setSetupLoading(false);
    }
  };

  const handleToggleComplete = async (taskId: string) => {
    setLoadingTaskId(taskId);
    try {
      const res = await advancedStudyPlannerAPI.completeTask(taskId);
      setPlan(res.data.plan);
      setProgress(res.data.progress);
      if (res.data.task?.completed) toast.success("+15 XP — task completed!");
      await fetchDashboard();
    } catch {
      toast.error("Could not update task");
    } finally {
      setLoadingTaskId(null);
    }
  };

  const handleCompleteTopic = async (taskId: string) => {
    setLoadingTaskId(taskId);
    try {
      const res = await advancedStudyPlannerAPI.completeTopic(taskId);
      setPlan(res.data.plan);
      setProgress(res.data.progress);
      await fetchDashboard();
      return {
        practiceRoute: res.data.practiceRoute,
        mcqTask: res.data.mcqTask,
      };
    } catch {
      toast.error("Could not complete topic");
      throw new Error("complete failed");
    } finally {
      setLoadingTaskId(null);
    }
  };

  const handleStartPractice = async (taskId: string) => {
    const res = await advancedStudyPlannerAPI.startPractice(taskId);
    return { routes: res.data.routes };
  };

  const handleReorder = async (taskIds: string[]) => {
    try {
      const res = await advancedStudyPlannerAPI.reorderTasks(selectedDate, taskIds);
      setPlan(res.data.plan);
    } catch {
      toast.error("Could not reorder tasks");
    }
  };

  const handleRefreshInsights = async () => {
    setInsightsLoading(true);
    try {
      const res = await advancedStudyPlannerAPI.refreshInsights();
      setInsights(res.data.insights);
    } finally {
      setInsightsLoading(false);
    }
  };

  const handleRefreshMotivation = async () => {
    try {
      const res = await advancedStudyPlannerAPI.regenerateMotivation();
      setPlan((p) => (p ? { ...p, motivationalLine: res.data.motivationalLine } : p));
    } catch {
      toast.error("Could not refresh motivation");
    }
  };

  const handleMentorChat = async (message: string) => {
    const res = await advancedStudyPlannerAPI.aiChat(message);
    return res.data.reply;
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

  if (loading) return <PlannerSkeleton />;

  if (!plan) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 px-1">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "rounded-3xl p-8 text-center border-2",
            theme === "dark"
              ? "bg-gradient-to-br from-blue-950/50 to-indigo-950/30 border-blue-500/20"
              : "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200"
          )}
        >
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            AI Study Planner
          </h1>
          <p className="mt-2 text-sm opacity-80 max-w-md mx-auto">
            Your personal UPSC/MPPSC preparation coach — analyzes weak areas, builds adaptive plans, and tracks readiness.
          </p>
        </motion.div>
        {error && <p className="text-rose-500 text-sm text-center">{error}</p>}
        <SmartSetupForm onSubmit={handleGenerate} isLoading={setupLoading} />
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="dashboard"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn(
          "max-w-7xl mx-auto space-y-6 md:space-y-8 px-1 pb-12",
          focusMode && "relative"
        )}
      >
        {focusMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 pointer-events-none"
          />
        )}

        <PlannerHero
          userName={user?.name}
          examType={plan.examType}
          daysRemaining={daysRemaining}
          motivationalLine={plan.motivationalLine || ""}
          dailyQuote={plan.dailyQuote}
          progress={progress}
          readinessScore={plan.readinessScore ?? 0}
          onRegenerate={() => setShowRegenerateForm(true)}
          onRefreshMotivation={handleRefreshMotivation}
          regenerating={setupLoading}
        />

        {/* Exam alert */}
        {daysRemaining != null && daysRemaining <= 30 && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl border",
              theme === "dark" ? "bg-amber-500/10 border-amber-500/30" : "bg-amber-50 border-amber-200"
            )}
          >
            <Bell className="text-amber-500 w-5 h-5 shrink-0" />
            <p className="text-sm">
              <strong>{daysRemaining} days</strong> until {plan.examType} exam — stay consistent with daily tasks!
            </p>
          </motion.div>
        )}

        <motion.div
          className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
        >
          {/* Left column */}
          <motion.div className="lg:col-span-3 space-y-4" variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}>
            <ReadinessScore
              score={plan.readinessScore ?? 0}
              examType={plan.examType}
              breakdown={plan.readinessBreakdown}
            />
            <StudyStreakPanel
              current={progress?.streak ?? plan.currentStreak ?? 0}
              longest={progress?.longestStreak ?? plan.longestStreak ?? 0}
              xp={plan.xpPoints ?? 0}
              badges={plan.badges || []}
              heatmap={plan.heatmap}
            />
            <PomodoroTimer focusMode={focusMode} onFocusModeChange={setFocusMode} />
            <CalendarView
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              taskCountByDate={taskCountByDate}
              currentMonth={currentMonth}
              onMonthChange={setCurrentMonth}
            />
          </motion.div>

          {/* Center */}
          <motion.div className="lg:col-span-5 space-y-4" variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}>
            <Card className={cn("border-2", theme === "dark" ? "bg-slate-900/80 border-slate-700" : "bg-white border-slate-200")}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Target className="text-blue-500 w-5 h-5" />
                  <CardTitle className="text-lg">Daily tasks</CardTitle>
                </div>
                <CardDescription>Drag to reorder · Tap to complete</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div className="h-48 animate-pulse rounded-xl bg-slate-200/40 dark:bg-slate-800/40" />}>
                  <DailyTaskEngine
                    tasks={plan.tasks || []}
                    selectedDate={selectedDate}
                    onToggleComplete={handleToggleComplete}
                    onCompleteTopic={handleCompleteTopic}
                    onStartPractice={handleStartPractice}
                    onReorder={handleReorder}
                    loadingTaskId={loadingTaskId}
                  />
                </Suspense>
              </CardContent>
            </Card>
            <WeeklyGoalsCard
              weeklyGoals={plan.weeklyGoals || []}
              monthlyTargets={plan.monthlyTargets || []}
              revisionStrategy={plan.revisionStrategy}
            />
            <PlanSyllabusTimeline
              tasks={plan.tasks || []}
              selectedDate={selectedDate}
              weakSubjects={plan.weakSubjects}
            />
          </motion.div>

          {/* Right */}
          <motion.div className="lg:col-span-4 space-y-4" variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}>
            <AIInsightsPanel insights={insights} onRefresh={handleRefreshInsights} loading={insightsLoading} />
            <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-slate-200/40 dark:bg-slate-800/40" />}>
              <AIMentorChat onSend={handleMentorChat} />
            </Suspense>
          </motion.div>
        </motion.div>

        <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-slate-200/40 dark:bg-slate-800/40" />}>
          <PerformanceAnalytics analytics={analytics} />
        </Suspense>

        <Dialog open={showRegenerateForm} onOpenChange={setShowRegenerateForm}>
          <DialogContent className="max-w-2xl p-0 max-h-[90vh] overflow-y-auto">
            <div className="p-4">
              <SmartSetupForm
                initialValues={{
                  examDate: plan.examDate,
                  examType: plan.examType,
                  targetYear: plan.targetYear,
                  dailyHours: plan.dailyHours,
                  weakSubjects: plan.weakSubjects,
                  strongSubjects: plan.strongSubjects,
                  optionalSubject: plan.optionalSubject,
                  preparationLevel: plan.preparationLevel,
                  sleepTime: plan.sleepTime,
                  wakeTime: plan.wakeTime,
                  preferredSession: plan.preferredSession,
                  mockTestAverageScore: plan.mockTestAverageScore,
                }}
                onSubmit={handleGenerate}
                isLoading={setupLoading}
                title="Regenerate Smart Plan"
                submitLabel="Regenerate Smart Plan"
              />
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>
    </AnimatePresence>
  );
};
