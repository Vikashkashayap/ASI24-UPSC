import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList,
  MessageCircle,
  Newspaper,
  CalendarClock,
  FileText,
  BarChart3,
  BookOpen,
  Library,
  AlertCircle,
  Bell,
  Target,
} from "lucide-react";
import { MentorChatDrawer } from "../components/MentorChatDrawer";
import { useAuth } from "../hooks/useAuth";
import { currentAffairsAPI, advancedStudyPlannerAPI, api } from "../services/api";
import {
  GreetingCard,
  DailyProgressCard,
  QuickActionCard,
  ContinueLearningCard,
  PerformanceCard,
  UpcomingCard,
  AIMentorCard,
  CurrentAffairCard,
  MotivationCard,
  type UpcomingItem,
  type CurrentAffairItem,
} from "../components/home";
import { DailyTargetsHub } from "../components/study";
import "./homePage.css";

function getGreetingByHour(hour: number) {
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  if (hour < 21) return "Good Evening";
  return "Good Night";
}

function parseDailyHours(value?: string) {
  if (!value) return 3;
  const normalized = value.toLowerCase();
  const numbers = normalized.match(/\d+/g)?.map(Number) ?? [];
  if (normalized.includes("<")) return 2;
  if (normalized.includes("+") && numbers.length) return numbers[0];
  if (numbers.length >= 2) return (numbers[0] + numbers[1]) / 2;
  if (numbers.length === 1) return numbers[0];
  return 3;
}

function getPreparationPhase(daysLeft: number) {
  if (daysLeft <= 120) return "revision";
  if (daysLeft <= 240) return "balanced";
  return "foundation";
}

export const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [countdown, setCountdown] = useState({
    days: "000",
    hours: "00",
    mins: "00",
    secs: "00",
    progress: 0,
  });
  const [showMentorDrawer, setShowMentorDrawer] = useState(false);
  const [currentHour, setCurrentHour] = useState(new Date().getHours());
  const [streak, setStreak] = useState(1);
  const [questionsSolved, setQuestionsSolved] = useState(0);
  const [perf, setPerf] = useState<{
    accuracy: number | null;
    averageScore: number | null;
    completion: number | null;
    weeklyGrowth: number | null;
    monthlyGrowth: number | null;
  }>({
    accuracy: null,
    averageScore: null,
    completion: null,
    weeklyGrowth: null,
    monthlyGrowth: null,
  });
  const [caItems, setCaItems] = useState<CurrentAffairItem[]>([]);
  const [continueMeta, setContinueMeta] = useState<{
    subject: string;
    title: string;
    progress: number;
    eta?: string;
  } | null>(null);

  const targetYear = Number(user?.targetYear) || new Date().getFullYear() + 1;
  const examDate = useMemo(() => new Date(`${targetYear}-05-25T09:00:00`), [targetYear]);
  const joinDate = useMemo(
    () => (user?.createdAt ? new Date(user.createdAt) : new Date()),
    [user?.createdAt]
  );
  const studentName = user?.name || "Student";
  const firstName = studentName.split(" ")[0];
  const daysSinceJoin = Math.max(
    1,
    Math.floor((Date.now() - joinDate.getTime()) / (1000 * 60 * 60 * 24))
  );
  const dailyHours = parseDailyHours(user?.dailyStudyHours);
  const daysLeftForPrelims = Number(countdown.days) || 0;
  const preparationPhase = getPreparationPhase(daysLeftForPrelims);
  const greeting = getGreetingByHour(currentHour);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const left = examDate.getTime() - now.getTime();
      const total = examDate.getTime() - joinDate.getTime();

      if (left <= 0) {
        setCountdown({ days: "000", hours: "00", mins: "00", secs: "00", progress: 100 });
        return;
      }

      const days = Math.floor(left / 86400000);
      const hours = Math.floor((left % 86400000) / 3600000);
      const mins = Math.floor((left % 3600000) / 60000);
      const secs = Math.floor((left % 60000) / 1000);
      const progress =
        total > 0 ? Math.min(100, Number((((total - left) / total) * 100).toFixed(1))) : 0;

      setCountdown({
        days: String(days).padStart(3, "0"),
        hours: String(hours).padStart(2, "0"),
        mins: String(mins).padStart(2, "0"),
        secs: String(secs).padStart(2, "0"),
        progress,
      });
    };

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [examDate, joinDate]);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentHour(new Date().getHours()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  // Existing APIs only — soft-fail so Home always renders
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const ca = await currentAffairsAPI.list({ page: 1, limit: 5 });
        if (cancelled) return;
        const items = ca.data?.data?.items ?? [];
        setCaItems(
          items.map((it) => ({
            id: it._id,
            title: it.title,
            category: it.gsPaper || "Current Affairs",
            date: it.date
              ? new Date(it.date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })
              : undefined,
            slug: it.slug,
          }))
        );
      } catch {
        /* ignore */
      }

      try {
        const dash = await advancedStudyPlannerAPI.getDashboard();
        if (cancelled) return;
        const d = dash.data as {
          streak?: number;
          progress?: { daily?: { completed?: number; total?: number }; streak?: number };
          dailyTasks?: Array<{
            subject?: string;
            topic?: string;
            completed?: boolean;
            duration?: number;
          }>;
          plan?: { motivationalLine?: string } | null;
        };
        const s = Number(d?.streak ?? d?.progress?.streak ?? 0);
        if (s > 0) setStreak(s);

        const tasks = Array.isArray(d?.dailyTasks) ? d.dailyTasks : [];
        const next = tasks.find((t) => !t.completed) || tasks[0];
        if (next) {
          const done = tasks.filter((t) => t.completed).length;
          const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
          setContinueMeta({
            subject: next.subject || "Study Plan",
            title: next.topic || "Today's study session",
            progress: pct,
            eta: next.duration ? `~${next.duration} mins left` : undefined,
          });
        }
      } catch {
        /* ignore */
      }

      try {
        const [copyRes, prelimsRes] = await Promise.allSettled([
          api.get("/api/performance"),
          api.get("/api/tests/prelims-performance"),
        ]);
        if (cancelled) return;

        let averageScore: number | null = null;
        let accuracy: number | null = null;
        let completion: number | null = null;
        let weeklyGrowth: number | null = null;
        let monthlyGrowth: number | null = null;
        let solved = 0;

        if (copyRes.status === "fulfilled") {
          const data = copyRes.value.data?.data ?? copyRes.value.data;
          if (data?.averageScore != null) averageScore = Number(data.averageScore);
          if (Array.isArray(data?.history)) solved += data.history.length;
          if (data?.improvementTrend != null) weeklyGrowth = Number(data.improvementTrend);
        }
        if (prelimsRes.status === "fulfilled") {
          const data = prelimsRes.value.data?.data ?? prelimsRes.value.data;
          if (data?.averageScore != null && averageScore == null) {
            averageScore = Number(data.averageScore);
          }
          if (data?.totalTests != null) solved += Number(data.totalTests) || 0;
          const hist = Array.isArray(data?.history) ? data.history : [];
          if (hist.length) {
            const last = hist[hist.length - 1];
            if (last?.accuracy != null) accuracy = Number(last.accuracy);
            else if (last?.percentage != null) accuracy = Number(last.percentage);
          }
          if (data?.preLimsReadiness != null) completion = Number(data.preLimsReadiness);
          if (data?.improvementTrend != null) monthlyGrowth = Number(data.improvementTrend);
        }

        setQuestionsSolved(solved);
        setPerf({ accuracy, averageScore, completion, weeklyGrowth, monthlyGrowth });
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const upcomingSession = useMemo(() => {
    const background = (user?.educationBackground || "General Studies").trim();
    const subjectLabel = background === "Arts" ? "History" : background;
    const isFastTrack = dailyHours >= 6;
    const duration = isFastTrack ? 120 : dailyHours >= 4 ? 90 : 60;
    const phaseTopicMap: Record<string, string> = {
      revision: `${subjectLabel} Revision + PYQ Drill`,
      balanced: `${subjectLabel} Concept + MCQ Practice`,
      foundation: `${subjectLabel} Basics Deep Dive`,
    };

    const now = new Date();
    const sessionDate = new Date(now);
    sessionDate.setDate(now.getDate() + 1);
    sessionDate.setHours(isFastTrack ? 6 : 19, 0, 0, 0);

    const dayText = new Intl.DateTimeFormat("en-IN", { weekday: "long" }).format(sessionDate);
    const timeText = new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(sessionDate);

    return {
      title: phaseTopicMap[preparationPhase],
      meta: `${dayText} · ${timeText} · ${duration} mins`,
    };
  }, [dailyHours, preparationPhase, user?.educationBackground]);

  const openDailyTargets = useCallback(() => {
    navigate("/daily-targets");
  }, [navigate]);

  const quickActions = useMemo(
    () => [
      {
        id: "targets",
        label: "Daily Targets",
        description: "Module goals",
        icon: Target,
        gradient: "bg-gradient-to-br from-blue-500 to-cyan-600",
        to: "/daily-targets",
      },
      {
        id: "practice",
        label: "Practice Test",
        description: "MCQ drills",
        icon: ClipboardList,
        gradient: "bg-gradient-to-br from-blue-600 to-indigo-600",
        to: "/prelims-test",
      },
      {
        id: "mentor",
        label: "AI Mentor",
        description: "Ask doubts",
        icon: MessageCircle,
        gradient: "bg-gradient-to-br from-violet-600 to-fuchsia-600",
        action: () => setShowMentorDrawer(true),
      },
      {
        id: "ca",
        label: "Current Affairs",
        description: "Daily briefs",
        icon: Newspaper,
        gradient: "bg-gradient-to-br from-emerald-600 to-teal-600",
        to: "/current-affairs",
      },
      {
        id: "planner",
        label: "Study Planner",
        description: "Daily plan",
        icon: CalendarClock,
        gradient: "bg-gradient-to-br from-sky-600 to-blue-600",
        to: "/planner",
      },
      {
        id: "eval",
        label: "Copy Evaluation",
        description: "Mains answers",
        icon: FileText,
        gradient: "bg-gradient-to-br from-amber-500 to-orange-600",
        to: "/copy-evaluation",
      },
      {
        id: "perf",
        label: "Performance",
        description: "Your stats",
        icon: BarChart3,
        gradient: "bg-gradient-to-br from-rose-500 to-pink-600",
        to: "/performance",
      },
      {
        id: "syllabus",
        label: "Syllabus",
        description: "Coverage map",
        icon: BookOpen,
        gradient: "bg-gradient-to-br from-slate-700 to-slate-900",
        to: "/syllabus",
      },
      {
        id: "mains",
        label: "Mains 360",
        description: "Materials",
        icon: Library,
        gradient: "bg-gradient-to-br from-indigo-500 to-blue-700",
        to: "/mains-360",
      },
    ],
    []
  );

  const upcomingItems: UpcomingItem[] = useMemo(
    () => [
      {
        id: "session",
        title: upcomingSession.title,
        meta: upcomingSession.meta,
        icon: CalendarClock,
        tone: "bg-blue-50 text-blue-600",
        onClick: () => navigate("/planner"),
      },
      {
        id: "test",
        title: "Practice Test ready",
        meta: "Resume prelims practice anytime",
        icon: ClipboardList,
        tone: "bg-indigo-50 text-indigo-600",
        onClick: () => navigate("/prelims-test"),
      },
      {
        id: "eval",
        title: "Pending Evaluation",
        meta: "Check copy evaluation status",
        icon: AlertCircle,
        tone: "bg-amber-50 text-amber-600",
        onClick: () => navigate("/copy-evaluation"),
      },
      {
        id: "reminder",
        title: "Study Reminder",
        meta: `Day ${daysSinceJoin} · Target CSE ${targetYear}`,
        icon: Bell,
        tone: "bg-emerald-50 text-emerald-600",
        onClick: openDailyTargets,
      },
    ],
    [upcomingSession, navigate, daysSinceJoin, targetYear, openDailyTargets]
  );

  const continueCard = continueMeta || {
    subject: "Module Targets",
    title: "Resume your assigned modules",
    progress: Math.min(100, Math.round(countdown.progress)),
    eta: `${Number(countdown.days)} days to Prelims`,
  };

  return (
    <div className="w-full min-w-0 max-w-full space-y-4 sm:space-y-5 pb-4 md:pb-2 animate-[sd-page-in_0.35s_ease-out]">
      <GreetingCard
        greeting={greeting}
        firstName={firstName}
        gender={user?.gender}
      />

      <DailyProgressCard
        progress={countdown.progress}
        daysLeft={daysLeftForPrelims}
        daysLabel={countdown.days}
        hoursLabel={countdown.hours}
        minsLabel={countdown.mins}
        secsLabel={countdown.secs}
        examLabel={`UPSC Prelims ${targetYear}`}
        examDateLabel={`25 May ${targetYear}`}
        studyHours={dailyHours}
        streak={Math.max(1, streak)}
        questionsSolved={questionsSolved}
      />

      <section aria-label="Quick actions">
        <h2 className="mb-3 px-0.5 text-base font-bold text-slate-900">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {quickActions.map((a) => (
            <QuickActionCard
              key={a.id}
              label={a.label}
              description={a.description}
              icon={a.icon}
              gradient={a.gradient}
              onClick={() => {
                if (a.action) a.action();
                else if (a.to) navigate(a.to);
              }}
            />
          ))}
        </div>
      </section>

      <ContinueLearningCard
        subject={continueCard.subject}
        title={continueCard.title}
        progress={continueCard.progress}
        eta={continueCard.eta}
        onContinue={() => {
          if (continueMeta) navigate("/planner");
          else openDailyTargets();
        }}
      />

      <DailyTargetsHub
        progress={countdown.progress}
        completedPct={countdown.progress}
        timeStudiedLabel={`${dailyHours}h`}
        questionsSolved={questionsSolved}
        remainingTasks={Math.max(1, 6 - Math.min(5, Math.round(countdown.progress / 20)))}
        streak={Math.max(1, streak)}
        weeklyStreak={Math.max(1, streak)}
        studyHours={dailyHours}
        accuracy={perf.accuracy}
        onResume={openDailyTargets}
        onQuickRevision={() => navigate("/syllabus")}
        onPractice={() => navigate("/prelims-test")}
        onAskAI={() => setShowMentorDrawer(true)}
        aiMessage={
          daysLeftForPrelims > 0
            ? `You have ${daysLeftForPrelims} days to Prelims ${targetYear}. Open Daily Targets and keep your ${Math.max(1, streak)}-day streak alive.`
            : "Prelims window is here — revise weakly areas and attempt a short practice set."
        }
      />

      <PerformanceCard
        accuracy={perf.accuracy}
        averageScore={perf.averageScore}
        completion={perf.completion ?? Math.round(countdown.progress)}
        weeklyGrowth={perf.weeklyGrowth}
        monthlyGrowth={perf.monthlyGrowth}
        onViewAll={() => navigate("/performance")}
      />

      <UpcomingCard items={upcomingItems} />

      <AIMentorCard onAsk={() => setShowMentorDrawer(true)} />

      <CurrentAffairCard
        items={caItems}
        onViewAll={() => navigate("/current-affairs")}
        onRead={(item) => {
          if (item.slug) navigate(`/current-affairs/${item.slug}`);
          else navigate("/current-affairs");
        }}
      />

      <MotivationCard seed={daysSinceJoin} />

      <MentorChatDrawer open={showMentorDrawer} onClose={() => setShowMentorDrawer(false)} />
    </div>
  );
};
