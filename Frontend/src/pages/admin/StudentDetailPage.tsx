import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Badge } from "../../components/ui/badge";
import { api } from "../../services/api";
import { useTheme } from "../../hooks/useTheme";
import { CopyEvaluationResultView } from "../../components/copy-evaluation/CopyEvaluationResultView";
import {
  ArrowLeft,
  Mail,
  Calendar,
  FileText,
  ClipboardCheck,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Award,
  AlertTriangle,
  CheckCircle,
  Clock,
  Copy,
  Eye,
  UserCheck,
  UserX,
  RotateCcw,
  BarChart3,
  PieChart,
  Zap,
  CalendarDays,
  CalendarRange,
  Sunrise,
  Smile
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell
} from "recharts";

// Shared color palette for charts (same as student dashboard)
const COLORS = [
  "#2563eb", // purple
  "#06b6d4", // cyan
  "#14b8a6", // teal
  "#f59e0b", // amber
  "#ef4444", // red
  "#10b981", // green
  "#3b82f6", // blue
  "#ec4899"  // pink
];

interface Student {
  id: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
  lastActive: string;
  status: 'active' | 'inactive' | 'suspended';
}

interface PerformanceSummary {
  totalEvaluations: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  improvementPercentage: number;
}

interface PrelimsTest {
  id: string;
  subject: string;
  topic: string;
  difficulty: string;
  score: number;
  accuracy: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  attemptedAt: string;
  isPrelimsMock?: boolean;
}

interface MainsEvaluation {
  id: string;
  subject: string;
  paper: string;
  year: number;
  pdfFileName: string;
  overallScore: {
    obtained: number;
    maximum: number;
    percentage: number;
  } | null;
  totalQuestions: number;
  wordCount: number;
  evaluatedAt: string;
}

interface PrelimsStats {
  totalTests: number;
  averageScore: number;
  averageAccuracy: number;
  highestScore: number;
  subjectWise: Record<string, { count: number; totalScore: number; averageScore: number; totalAccuracy: number; averageAccuracy: number }>;
  difficultyWise: Record<string, { count: number; totalScore: number; averageScore: number; totalAccuracy: number; averageAccuracy: number }>;
}

interface MainsStats {
  totalEvaluations: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  subjectWise: Record<string, { count: number; totalScore: number; averageScore: number }>;
}

interface ActivityItem {
  id: string;
  type: 'mains_evaluation' | 'prelims_test';
  title: string;
  description: string;
  date: string;
  metadata: any;
}

interface EvaluationDetails {
  id: string;
  subject: string;
  paper: string;
  year: number;
  pdfFileName: string;
  evaluations: Array<{
    questionNumber: string;
    answerText: string;
    annotatedText: string;
    totalMarks: number;
    maxMarks: number;
    wordCount: number;
    strengths: string[];
    weaknesses: string[];
    examinerComment: string;
    modelAnswer: string;
    upscRange: string;
  }>;
  finalSummary: {
    overallScore: {
      obtained: number;
      maximum: number;
      percentage: number;
    };
    strengths: string[];
    weaknesses: string[];
    improvementPlan: string[];
    upscRange: string;
  };
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "")).filter(Boolean);
}

function normalizeEvaluationDetails(raw: any): EvaluationDetails {
  const vision = raw?.visionResult || {};
  const obtained =
    raw?.finalSummary?.overallScore?.obtained ??
    vision.marks ??
    vision.overallMarks ??
    vision.overall_score ??
    0;
  const maximum =
    raw?.finalSummary?.overallScore?.maximum ?? vision.maxMarks ?? 15;
  const percentage =
    raw?.finalSummary?.overallScore?.percentage ??
    (maximum ? (Number(obtained) / Number(maximum)) * 100 : 0);

  let evaluations = Array.isArray(raw?.evaluations) ? raw.evaluations : [];
  if (!evaluations.length && (vision.questionText || vision.extractedAnswerText || vision.marks != null)) {
    evaluations = [
      {
        questionNumber: "1",
        answerText: vision.extractedAnswerText || "",
        annotatedText: vision.questionText || "",
        totalMarks: obtained,
        maxMarks: maximum,
        wordCount: vision.wordCount || 0,
        strengths: asStringArray(vision.strengths),
        weaknesses: asStringArray(vision.weaknesses),
        examinerComment:
          vision.examinerRemark ||
          vision.overallFeedback ||
          vision.examinerFeedback ||
          vision.summary ||
          "",
        modelAnswer: "",
        upscRange: raw?.finalSummary?.upscRange || vision.grade || "",
      },
    ];
  }

  return {
    id: String(raw?._id || raw?.id || ""),
    subject: raw?.subject || "General Studies",
    paper: raw?.paper && String(raw.paper).toLowerCase() !== "unknown" ? raw.paper : "",
    year: raw?.year,
    pdfFileName: raw?.pdfFileName || raw?.fileName || "",
    evaluations: evaluations.map((q: any, i: number) => ({
      questionNumber: String(q.questionNumber || i + 1),
      answerText: q.answerText || "",
      annotatedText: q.annotatedText || "",
      totalMarks: q.totalMarks ?? obtained,
      maxMarks: q.maxMarks ?? maximum,
      wordCount: q.wordCount || 0,
      strengths: asStringArray(q.strengths),
      weaknesses: asStringArray(q.weaknesses),
      examinerComment: q.examinerComment || "",
      modelAnswer: q.modelAnswer || "",
      upscRange: q.upscRange || "",
    })),
    finalSummary: {
      overallScore: {
        obtained: Number(obtained) || 0,
        maximum: Number(maximum) || 15,
        percentage: Number(percentage) || 0,
      },
      strengths: asStringArray(raw?.finalSummary?.strengths || vision.strengths),
      weaknesses: asStringArray(raw?.finalSummary?.weaknesses || vision.weaknesses),
      improvementPlan: asStringArray(
        raw?.finalSummary?.improvementPlan || vision.improvementPriority || vision.suggestions
      ),
      upscRange: raw?.finalSummary?.upscRange || vision.grade || "",
    },
  };
}

export const StudentDetailPage = () => {
  const { theme } = useTheme();
  const location = useLocation();
  const isMentorView = location.pathname.startsWith("/mentor-dashboard/students");
  const routeParams = useParams<{ id?: string; studentId?: string }>();
  const id = routeParams.id ?? routeParams.studentId;
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [performanceSummary, setPerformanceSummary] = useState<PerformanceSummary | null>(null);
  const [prelimsData, setPrelimsData] = useState<{
    tests: PrelimsTest[];
    statistics: PrelimsStats;
  } | null>(null);
  const [mainsData, setMainsData] = useState<{
    evaluations: MainsEvaluation[];
    statistics: MainsStats;
  } | null>(null);
  const [activityData, setActivityData] = useState<{
    activities: ActivityItem[];
    totalActivities: number;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "prelims" | "mains" | "activity" | "analytics">("overview");
  const [timeFilter, setTimeFilter] = useState<"today" | "week" | "month" | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedEvaluation, setSelectedEvaluation] = useState<EvaluationDetails | null>(null);
  const [rawCopyEval, setRawCopyEval] = useState<any>(null);
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [dartAnalytics, setDartAnalytics] = useState<any | null>(null);
  const [dartReportDownloading, setDartReportDownloading] = useState(false);
  const [resetPasswordResult, setResetPasswordResult] = useState<{ tempPassword: string } | null>(null);
  const [mentorFeedbackMessage, setMentorFeedbackMessage] = useState("");
  const [mentorFeedbackSending, setMentorFeedbackSending] = useState(false);
  const [mentorFeedbackList, setMentorFeedbackList] = useState<Array<{ message: string; createdAt: string }>>([]);
  const [prelimsPage, setPrelimsPage] = useState(1);
  const [mainsPage, setMainsPage] = useState(1);
  const [activityPage, setActivityPage] = useState(1);

  const HISTORY_PAGE_SIZE = 9;

  useEffect(() => {
    if (id) {
      fetchStudentData();
    }
  }, [id, timeFilter, isMentorView]);

  // Reset list pages when student / time filter changes
  useEffect(() => {
    setPrelimsPage(1);
    setMainsPage(1);
    setActivityPage(1);
  }, [id, timeFilter]);

  useEffect(() => {
    if (id && activeTab === "analytics") {
      const base = isMentorView ? `/api/mentor/students/${id}` : `/api/admin/students/${id}`;
      api
        .get(`${base}/dart-analytics`, { params: { days: 30 } })
        .then((res) => {
          if (res.data?.success && res.data.data) setDartAnalytics(res.data.data);
        })
        .catch(() => setDartAnalytics(null));
    } else if (activeTab !== "analytics") {
      setDartAnalytics(null);
    }
  }, [id, activeTab, isMentorView]);

  const fetchStudentData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const params = timeFilter !== "all" ? { period: timeFilter } : {};
      const base = isMentorView ? `/api/mentor/students/${id}` : `/api/admin/students/${id}`;

      const [studentRes, prelimsRes, mainsRes, activityRes] = await Promise.all([
        api.get(isMentorView ? `${base}/profile` : `${base}`),
        api.get(`${base}/prelims`, { params }),
        api.get(`${base}/mains`, { params }),
        api.get(`${base}/activity`, { params }),
      ]);

      if (studentRes.data.success) {
        setStudent(studentRes.data.data.student);
        setPerformanceSummary(studentRes.data.data.performanceSummary);
      }

      if (prelimsRes.data.success) {
        setPrelimsData(prelimsRes.data.data);
      }

      if (mainsRes.data.success) {
        setMainsData(mainsRes.data.data);
      }

      if (activityRes.data.success) {
        setActivityData(activityRes.data.data);
      }

      if (isMentorView) {
        const sum = await api.get(`/api/mentor/students/${id}`);
        if (sum.data?.success && Array.isArray(sum.data.data?.feedback)) {
          setMentorFeedbackList(sum.data.data.feedback);
        }
      }
    } catch (err: any) {
      console.error("Error fetching student data:", err);
      setError(err?.response?.data?.message || "Failed to load student data");
    } finally {
      setLoading(false);
    }
  };

  const submitMentorFeedback = async () => {
    if (!id || !mentorFeedbackMessage.trim()) return;
    setMentorFeedbackSending(true);
    try {
      await api.post("/api/mentor/feedback", { studentId: id, message: mentorFeedbackMessage.trim() });
      setMentorFeedbackMessage("");
      const sum = await api.get(`/api/mentor/students/${id}`);
      if (sum.data?.success && Array.isArray(sum.data.data?.feedback)) {
        setMentorFeedbackList(sum.data.data.feedback);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setMentorFeedbackSending(false);
    }
  };

  const handleStudentAction = async (action: 'suspend' | 'activate' | 'reset-password') => {
    try {
      setActionLoading(true);
      let endpoint = '';
      let method = 'patch';
      let data = {};

      if (action === 'suspend') {
        endpoint = `/api/admin/students/${id}/status`;
        data = { status: 'suspended' };
      } else if (action === 'activate') {
        endpoint = `/api/admin/students/${id}/status`;
        data = { status: 'active' };
      } else if (action === 'reset-password') {
        endpoint = `/api/admin/students/${id}/reset-password`;
        method = 'post';
      }

      const res = await api[method](endpoint, data);
      if (res.data.success) {
        if (action === 'reset-password') {
          if (res.data.data?.tempPassword) {
            setResetPasswordResult({ tempPassword: res.data.data.tempPassword });
          } else {
            alert(res.data.message || "Password reset successfully.");
          }
        } else {
          alert(res.data.message);
        }
        fetchStudentData(); // Refresh data
      }
    } catch (err: any) {
      console.error("Error performing student action:", err);
      alert(err?.response?.data?.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadStudentDartReport = async () => {
    if (!id) return;
    setDartReportDownloading(true);
    try {
      const dartBase = isMentorView ? `/api/mentor/students/${id}` : `/api/admin/students/${id}`;
      const res = await api.get(`${dartBase}/dart-report-15day`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `DART-15-Day-Report-${student?.name || id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    } finally {
      setDartReportDownloading(false);
    }
  };

  const viewEvaluationDetails = async (evaluationId: string) => {
    try {
      const res = await api.get(`/api/copy-evaluation/${evaluationId}`);
      if (res.data.success) {
        const data = res.data.data;
        if (data?.visionResult) {
          const vr = data.visionResult;
          if (vr.marks == null && vr.overallMarks != null) vr.marks = vr.overallMarks;
        }
        setRawCopyEval(data);
        setSelectedEvaluation(normalizeEvaluationDetails(data));
        setShowEvaluationModal(true);
      }
    } catch (err: any) {
      console.error("Error fetching evaluation details:", err);
      alert("Failed to load evaluation details");
    }
  };

  // AI Insights calculation - MUST be called before any conditional returns
  const aiInsights = useMemo(() => {
    if (!mainsData?.statistics || !prelimsData?.statistics) return null;

    const mainsWeakAreas = [];
    const consistencyScore = Math.min(100, Math.max(0,
      100 - (mainsData.statistics.highestScore - mainsData.statistics.lowestScore)
    ));

    // Identify weak subjects (below average performance)
    Object.entries(mainsData.statistics.subjectWise).forEach(([subject, data]) => {
      if (data.averageScore < mainsData.statistics.averageScore * 0.8) {
        mainsWeakAreas.push(subject);
      }
    });

    return {
      weakAreas: mainsWeakAreas,
      consistencyScore,
      improvementAreas: [
        consistencyScore < 70 ? "Consistency in scoring" : null,
        mainsData.statistics.totalEvaluations < 5 ? "More practice needed" : null,
        prelimsData.statistics.averageAccuracy < 60 ? "Accuracy improvement required" : null,
      ].filter(Boolean),
      recommendations: [
        "Focus on time management during exams",
        "Practice answer writing regularly",
        "Review model answers for better structure",
        mainsWeakAreas.length > 0 ? `Strengthen knowledge in: ${mainsWeakAreas.join(", ")}` : null,
      ].filter(Boolean)
    };
  }, [mainsData, prelimsData, timeFilter]);

  // Prepare chart data
  const prelimsChartData = prelimsData?.tests
    .slice(0, 10)
    .reverse()
    .map((test, index) => ({
      name: `Test ${index + 1}`,
      score: test.score,
      accuracy: test.accuracy,
    })) || [];

  const mainsChartData = mainsData?.evaluations
    .slice(0, 10)
    .reverse()
    .map((evaluation, index) => ({
      name: `Eval ${index + 1}`,
      score: evaluation.overallScore?.percentage || 0,
    })) || [];

  const prelimsSubjectData = prelimsData?.statistics.subjectWise
    ? Object.entries(prelimsData.statistics.subjectWise).map(([subject, data]) => ({
        subject,
        averageScore: data.averageScore,
        averageAccuracy: data.averageAccuracy,
        count: data.count,
      }))
    : [];

  const mainsSubjectData = mainsData?.statistics.subjectWise
    ? Object.entries(mainsData.statistics.subjectWise).map(([subject, data]) => ({
        subject,
        averageScore: data.averageScore,
        count: data.count,
      }))
    : [];

  const paginateList = <T,>(items: T[] | undefined, page: number) => {
    const list = items || [];
    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE));
    const currentPage = Math.min(Math.max(1, page), totalPages);
    const start = (currentPage - 1) * HISTORY_PAGE_SIZE;
    return {
      items: list.slice(start, start + HISTORY_PAGE_SIZE),
      total,
      totalPages,
      currentPage,
      hasPrev: currentPage > 1,
      hasNext: currentPage < totalPages,
      start: total === 0 ? 0 : start + 1,
      end: Math.min(start + HISTORY_PAGE_SIZE, total),
    };
  };

  const paginatedPrelims = paginateList(prelimsData?.tests, prelimsPage);
  const paginatedMains = paginateList(mainsData?.evaluations, mainsPage);
  const paginatedActivity = paginateList(activityData?.activities, activityPage);

  const visiblePageNumbers = (currentPage: number, totalPages: number) => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = new Set<number>([1, totalPages, currentPage]);
    for (let i = currentPage - 1; i <= currentPage + 1; i++) {
      if (i >= 1 && i <= totalPages) pages.add(i);
    }
    return Array.from(pages).sort((a, b) => a - b);
  };

  const renderListPagination = (
    meta: {
      total: number;
      totalPages: number;
      currentPage: number;
      hasPrev: boolean;
      hasNext: boolean;
      start: number;
      end: number;
    },
    setPage: (page: number) => void
  ) => {
    if (meta.total <= HISTORY_PAGE_SIZE) return null;
    const pages = visiblePageNumbers(meta.currentPage, meta.totalPages);
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 mt-2">
        <p
          className={`text-xs sm:text-sm ${
            theme === "dark" ? "text-slate-400" : "text-slate-500"
          }`}
        >
          Showing{" "}
          <span className={theme === "dark" ? "text-slate-200" : "text-slate-800"}>
            {meta.start}–{meta.end}
          </span>{" "}
          of {meta.total}
        </p>
        <div
          className={`flex items-center gap-1 rounded-2xl border p-1 ${
            theme === "dark"
              ? "bg-slate-900/60 border-slate-800"
              : "bg-white border-slate-200 shadow-sm"
          }`}
        >
          <Button
            type="button"
            variant="ghost"
            onClick={() => setPage(Math.max(1, meta.currentPage - 1))}
            disabled={!meta.hasPrev}
            className="h-9 px-3 rounded-xl text-sm"
          >
            Prev
          </Button>
          <div className="flex items-center gap-0.5">
            {pages.map((page, idx) => {
              const prev = pages[idx - 1];
              const showEllipsis = prev != null && page - prev > 1;
              return (
                <span key={page} className="flex items-center">
                  {showEllipsis && (
                    <span
                      className={`px-1 text-xs ${
                        theme === "dark" ? "text-slate-500" : "text-slate-400"
                      }`}
                    >
                      …
                    </span>
                  )}
                  <Button
                    type="button"
                    variant={meta.currentPage === page ? "default" : "ghost"}
                    onClick={() => setPage(page)}
                    className={`h-9 w-9 p-0 rounded-xl text-sm font-semibold ${
                      meta.currentPage === page
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : ""
                    }`}
                  >
                    {page}
                  </Button>
                </span>
              );
            })}
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setPage(Math.min(meta.totalPages, meta.currentPage + 1))}
            disabled={!meta.hasNext}
            className="h-9 px-3 rounded-xl text-sm"
          >
            Next
          </Button>
        </div>
      </div>
    );
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const timeFilterLabel =
    timeFilter === "today"
      ? "Today"
      : timeFilter === "week"
        ? "This Week"
        : timeFilter === "month"
          ? "This Month"
          : "All Time";

  const periodFilters: Array<{
    key: "all" | "today" | "week" | "month";
    label: string;
    icon: typeof Activity;
  }> = [
    { key: "all", label: "All Time", icon: Activity },
    { key: "today", label: "Today", icon: Sunrise },
    { key: "week", label: "This Week", icon: CalendarDays },
    { key: "month", label: "This Month", icon: CalendarRange },
  ];

  const summaryStats = performanceSummary
    ? [
        {
          label: "Total Evaluations",
          value: String(performanceSummary.totalEvaluations),
          icon: ClipboardCheck,
          iconBg: "bg-blue-500/10 text-blue-500",
          valueClass: "",
        },
        {
          label: "Average Score",
          value: `${Number(performanceSummary.averageScore || 0).toFixed(1)}%`,
          icon: Target,
          iconBg: "bg-sky-500/10 text-sky-500",
          valueClass: "",
        },
        {
          label: "Highest Score",
          value: `${performanceSummary.highestScore}%`,
          icon: Award,
          iconBg: "bg-emerald-500/10 text-emerald-500",
          valueClass: "text-emerald-500",
        },
        {
          label: "Lowest Score",
          value: `${performanceSummary.lowestScore}%`,
          icon: AlertTriangle,
          iconBg: "bg-amber-500/10 text-amber-500",
          valueClass: "text-amber-500",
        },
        {
          label: "Improvement",
          value: `${performanceSummary.improvementPercentage > 0 ? "+" : ""}${performanceSummary.improvementPercentage}%`,
          icon: performanceSummary.improvementPercentage >= 0 ? TrendingUp : TrendingDown,
          iconBg:
            performanceSummary.improvementPercentage >= 0
              ? "bg-emerald-500/10 text-emerald-500"
              : "bg-red-500/10 text-red-500",
          valueClass:
            performanceSummary.improvementPercentage >= 0
              ? "text-emerald-500"
              : "text-red-500",
        },
      ]
    : [];

  const tabs: Array<{
    key: "overview" | "prelims" | "mains" | "activity" | "analytics";
    label: string;
    icon: typeof BarChart3;
    count?: number;
  }> = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    {
      key: "prelims",
      label: "Prelims",
      icon: FileText,
      count: prelimsData?.statistics.totalTests || 0,
    },
    {
      key: "mains",
      label: "Mains",
      icon: ClipboardCheck,
      count: mainsData?.statistics.totalEvaluations || 0,
    },
    {
      key: "activity",
      label: "Activity",
      icon: Activity,
      count: activityData?.totalActivities || 0,
    },
    { key: "analytics", label: "Analytics (DART)", icon: PieChart },
  ];

  if (loading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          theme === "dark" ? "bg-[#020012]" : "bg-slate-50"
        }`}
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center p-6 ${
          theme === "dark" ? "bg-[#020012] text-slate-50" : "bg-slate-50 text-slate-900"
        }`}
      >
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 ${
            theme === "dark"
              ? "bg-red-500/10 border-red-500/20 text-red-400"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span className="text-sm font-medium">{error || "Student not found"}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen p-4 sm:p-6 transition-colors duration-500 ${
        theme === "dark" ? "bg-[#020012] text-slate-50" : "bg-slate-50 text-slate-900"
      } font-sans`}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <Link to={isMentorView ? "/mentor-dashboard/students" : "/admin/students"}>
            <Button
              variant="outline"
              className={`h-10 px-4 rounded-xl border ${
                theme === "dark"
                  ? "border-slate-700 hover:bg-slate-800 text-slate-200"
                  : "border-slate-200 hover:bg-white text-slate-700"
              }`}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Students
            </Button>
          </Link>
        </div>

        {/* Student Profile */}
        <Card
          className={`rounded-2xl border shadow-sm ${
            theme === "dark"
              ? "bg-slate-900/50 border-slate-800"
              : "bg-white border-slate-100"
          }`}
        >
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div className="flex items-start sm:items-center gap-4 min-w-0">
                <div
                  className={`h-14 w-14 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ring-4 ${
                    theme === "dark"
                      ? "bg-blue-500/20 text-blue-300 ring-blue-500/10"
                      : "bg-blue-50 text-blue-600 ring-blue-50"
                  }`}
                >
                  {getInitials(student.name)}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="text-2xl sm:text-[1.75rem] font-bold tracking-tight truncate">
                      {student.name}
                    </h1>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        student.status === "active"
                          ? theme === "dark"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-emerald-50 text-emerald-700"
                          : theme === "dark"
                            ? "bg-red-500/15 text-red-300"
                            : "bg-red-50 text-red-700"
                      }`}
                    >
                      {student.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div
                    className={`flex items-center gap-2 text-sm mt-1 truncate ${
                      theme === "dark" ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{student.email}</span>
                  </div>
                  <div
                    className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs mt-2 ${
                      theme === "dark" ? "text-slate-500" : "text-slate-500"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Joined {new Date(student.joinedAt).toLocaleDateString()}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Last active {new Date(student.lastActive).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {!isMentorView && (
                <div className="flex items-center gap-2.5 w-full lg:w-auto">
                  <Button
                    variant="outline"
                    onClick={() =>
                      handleStudentAction(
                        student.status === "active" ? "suspend" : "activate"
                      )
                    }
                    disabled={actionLoading}
                    className={`flex-1 lg:flex-none h-10 px-4 rounded-xl border ${
                      theme === "dark"
                        ? "border-slate-700 hover:bg-slate-800 text-slate-200"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    {student.status === "active" ? (
                      <UserX className="h-4 w-4 mr-1.5" />
                    ) : (
                      <UserCheck className="h-4 w-4 mr-1.5" />
                    )}
                    {student.status === "active" ? "Suspend" : "Activate"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleStudentAction("reset-password")}
                    disabled={actionLoading}
                    className={`flex-1 lg:flex-none h-10 px-4 rounded-xl border ${
                      theme === "dark"
                        ? "border-slate-700 hover:bg-slate-800 text-slate-200"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <RotateCcw className="h-4 w-4 mr-1.5" />
                    Reset Password
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Performance Summary */}
        {performanceSummary && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2
                className={`text-lg font-semibold tracking-tight ${
                  theme === "dark" ? "text-slate-100" : "text-slate-900"
                }`}
              >
                Performance Summary
                {timeFilter !== "all" && (
                  <span
                    className={`ml-2 text-sm font-normal ${
                      theme === "dark" ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    ({timeFilterLabel})
                  </span>
                )}
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {summaryStats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card
                    key={stat.label}
                    className={`rounded-2xl border shadow-sm transition-shadow hover:shadow-md ${
                      theme === "dark"
                        ? "bg-slate-900/50 border-slate-800"
                        : "bg-white border-slate-100"
                    }`}
                  >
                    <CardContent className="p-4 sm:p-5 flex items-center gap-3.5">
                      <div
                        className={`h-11 w-11 rounded-full flex items-center justify-center shrink-0 ${stat.iconBg}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-500 truncate">
                          {stat.label}
                        </p>
                        <p
                          className={`text-xl sm:text-2xl font-bold tracking-tight mt-0.5 ${stat.valueClass}`}
                        >
                          {stat.value}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Time Filter — single control, no duplicate badge */}
        <div
          className={`flex flex-col sm:flex-row sm:items-center gap-3 p-2 sm:p-1.5 rounded-2xl border ${
            theme === "dark"
              ? "bg-slate-900/50 border-slate-800"
              : "bg-white border-slate-200 shadow-sm"
          }`}
        >
          <span
            className={`text-xs font-semibold uppercase tracking-wider px-3 ${
              theme === "dark" ? "text-slate-400" : "text-slate-500"
            }`}
          >
            Time Period
          </span>
          <div className="flex flex-wrap gap-1 p-0.5">
            {periodFilters.map(({ key, label, icon: Icon }) => {
              const active = timeFilter === key;
              return (
                <Button
                  key={key}
                  type="button"
                  variant={active ? "default" : "ghost"}
                  onClick={() => setTimeFilter(key)}
                  className={`h-9 px-3 rounded-xl text-sm font-medium ${
                    active
                      ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                      : theme === "dark"
                        ? "text-slate-300 hover:bg-slate-800"
                        : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 mr-1.5" />
                  {label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Quick Stats for Selected Period */}
        {timeFilter !== "all" && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                label: "Prelims Tests",
                value: String(prelimsData?.tests.length || 0),
                className:
                  theme === "dark"
                    ? "bg-blue-500/10 border-blue-500/20 text-blue-300"
                    : "bg-blue-50 border-blue-100 text-blue-700",
                valueClass: theme === "dark" ? "text-blue-400" : "text-blue-600",
              },
              {
                label: "Mains Evaluations",
                value: String(mainsData?.evaluations.length || 0),
                className:
                  theme === "dark"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                    : "bg-emerald-50 border-emerald-100 text-emerald-700",
                valueClass: theme === "dark" ? "text-emerald-400" : "text-emerald-600",
              },
              {
                label: "Total Activities",
                value: String(activityData?.totalActivities || 0),
                className:
                  theme === "dark"
                    ? "bg-sky-500/10 border-sky-500/20 text-sky-300"
                    : "bg-sky-50 border-sky-100 text-sky-700",
                valueClass: theme === "dark" ? "text-sky-400" : "text-sky-600",
              },
              {
                label: "Avg Accuracy",
                value: `${prelimsData?.statistics.averageAccuracy?.toFixed(1) || "0.0"}%`,
                className:
                  theme === "dark"
                    ? "bg-amber-500/10 border-amber-500/20 text-amber-300"
                    : "bg-amber-50 border-amber-100 text-amber-700",
                valueClass: theme === "dark" ? "text-amber-400" : "text-amber-600",
              },
            ].map((item) => (
              <div
                key={item.label}
                className={`p-4 rounded-2xl border ${item.className}`}
              >
                <div className={`text-2xl font-bold tracking-tight ${item.valueClass}`}>
                  {item.value}
                </div>
                <div className="text-xs font-semibold uppercase tracking-wider mt-1 opacity-80">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div
          className={`flex gap-1 flex-wrap p-1.5 rounded-2xl border ${
            theme === "dark"
              ? "bg-slate-900/50 border-slate-800"
              : "bg-white border-slate-200 shadow-sm"
          }`}
        >
          {tabs.map(({ key, label, icon: Icon, count }) => {
            const active = activeTab === key;
            return (
              <Button
                key={key}
                type="button"
                variant={active ? "default" : "ghost"}
                onClick={() => setActiveTab(key)}
                className={`h-10 px-3.5 rounded-xl text-sm font-medium ${
                  active
                    ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                    : theme === "dark"
                      ? "text-slate-300 hover:bg-slate-800"
                      : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon className="h-4 w-4 mr-1.5" />
                {label}
                {count !== undefined && (
                  <span
                    className={`ml-1.5 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-[11px] font-semibold ${
                      active
                        ? "bg-white/20 text-white"
                        : theme === "dark"
                          ? "bg-slate-800 text-slate-400"
                          : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </Button>
            );
          })}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* AI Insights Section */}
            {aiInsights && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className={`transition-colors duration-300 ${
                  theme === "dark"
                    ? "bg-slate-900 border-slate-700"
                    : "bg-white border-slate-200 shadow-sm"
                }`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className={`h-5 w-5 ${
                        theme === "dark" ? "text-yellow-500" : "text-yellow-600"
                      }`} />
                      AI Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${
                          theme === "dark" ? "text-slate-400" : "text-slate-600"
                        }`}>Consistency Score</span>
                        <Badge variant={aiInsights.consistencyScore > 70 ? 'default' : 'destructive'} className="px-3 py-1">
                          {aiInsights.consistencyScore}%
                        </Badge>
                      </div>
                      {aiInsights.weakAreas.length > 0 && (
                        <div>
                          <span className={`text-sm ${
                            theme === "dark" ? "text-slate-400" : "text-slate-600"
                          }`}>Weak Areas:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {aiInsights.weakAreas.map(area => (
                              <Badge key={area} variant="outline" className={`text-xs ${
                                theme === "dark"
                                  ? "border-slate-600 text-slate-300"
                                  : "border-slate-300 text-slate-700"
                              }`}>
                                {area}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className={`transition-colors duration-300 ${
                  theme === "dark"
                    ? "bg-slate-900 border-slate-700"
                    : "bg-white border-slate-200 shadow-sm"
                }`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className={`h-5 w-5 ${
                        theme === "dark" ? "text-blue-500" : "text-blue-600"
                      }`} />
                      Focus Areas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {aiInsights.improvementAreas.map((area, index) => (
                        <li key={index} className={`flex items-center gap-2 text-sm ${
                          theme === "dark" ? "text-slate-300" : "text-slate-700"
                        }`}>
                          <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                          {area}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className={`transition-colors duration-300 ${
                  theme === "dark"
                    ? "bg-slate-900 border-slate-700"
                    : "bg-white border-slate-200 shadow-sm"
                }`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className={`h-5 w-5 ${
                        theme === "dark" ? "text-green-500" : "text-green-600"
                      }`} />
                      Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {aiInsights.recommendations.map((rec, index) => (
                        <li key={index} className={`flex items-start gap-2 text-sm ${
                          theme === "dark" ? "text-slate-300" : "text-slate-700"
                        }`}>
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Performance Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {prelimsChartData.length > 0 && (
                <Card className={`transition-colors duration-300 ${
                  theme === "dark"
                    ? "bg-slate-900 border-slate-700"
                    : "bg-white border-slate-200 shadow-sm"
                }`}>
                  <CardHeader>
                    <CardTitle className={`${
                      theme === "dark" ? "text-slate-100" : "text-slate-900"
                    }`}>Prelims Score Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={prelimsChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#374151" : "#e2e8f0"} />
                        <XAxis dataKey="name" stroke={theme === "dark" ? "#9ca3af" : "#64748b"} />
                        <YAxis stroke={theme === "dark" ? "#9ca3af" : "#64748b"} />
                        <Tooltip contentStyle={{
                          backgroundColor: theme === "dark" ? "#1e293b" : "#ffffff",
                          border: `1px solid ${theme === "dark" ? "#475569" : "#e2e8f0"}`,
                          color: theme === "dark" ? "#e2e8f0" : "#1e293b"
                        }} />
                        <Line type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={2} name="Score" />
                        <Line type="monotone" dataKey="accuracy" stroke="#10b981" strokeWidth={2} name="Accuracy %" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {mainsChartData.length > 0 && (
                <Card className={`transition-colors duration-300 ${
                  theme === "dark"
                    ? "bg-slate-900 border-slate-700"
                    : "bg-white border-slate-200 shadow-sm"
                }`}>
                  <CardHeader>
                    <CardTitle className={`${
                      theme === "dark" ? "text-slate-100" : "text-slate-900"
                    }`}>Mains Score Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={mainsChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#374151" : "#e2e8f0"} />
                        <XAxis dataKey="name" stroke={theme === "dark" ? "#9ca3af" : "#64748b"} />
                        <YAxis stroke={theme === "dark" ? "#9ca3af" : "#64748b"} />
                        <Tooltip contentStyle={{
                          backgroundColor: theme === "dark" ? "#1e293b" : "#ffffff",
                          border: `1px solid ${theme === "dark" ? "#475569" : "#e2e8f0"}`,
                          color: theme === "dark" ? "#e2e8f0" : "#1e293b"
                        }} />
                        <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Subject-wise Performance */}
            {(prelimsSubjectData.length > 0 || mainsSubjectData.length > 0) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {prelimsSubjectData.length > 0 && (
                  <Card className={`transition-colors duration-300 ${
                    theme === "dark"
                      ? "bg-slate-900 border-slate-700"
                      : "bg-white border-slate-200 shadow-sm"
                  }`}>
                    <CardHeader>
                      <CardTitle className={`${
                        theme === "dark" ? "text-slate-100" : "text-slate-900"
                      }`}>Prelims Subject Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={prelimsSubjectData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#374151" : "#e2e8f0"} />
                          <XAxis dataKey="subject" stroke={theme === "dark" ? "#9ca3af" : "#64748b"} />
                          <YAxis stroke={theme === "dark" ? "#9ca3af" : "#64748b"} />
                          <Tooltip contentStyle={{
                            backgroundColor: theme === "dark" ? "#1e293b" : "#ffffff",
                            border: `1px solid ${theme === "dark" ? "#475569" : "#e2e8f0"}`,
                            color: theme === "dark" ? "#e2e8f0" : "#1e293b"
                          }} />
                          <Bar dataKey="averageScore" fill="#2563eb" name="Avg Score" />
                          <Bar dataKey="averageAccuracy" fill="#10b981" name="Avg Accuracy %" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {mainsSubjectData.length > 0 && (
                  <Card className={`transition-colors duration-300 ${
                    theme === "dark"
                      ? "bg-slate-900 border-slate-700"
                      : "bg-white border-slate-200 shadow-sm"
                  }`}>
                    <CardHeader>
                      <CardTitle className={`${
                        theme === "dark" ? "text-slate-100" : "text-slate-900"
                      }`}>Mains Subject Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={mainsSubjectData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#374151" : "#e2e8f0"} />
                          <XAxis dataKey="subject" stroke={theme === "dark" ? "#9ca3af" : "#64748b"} />
                          <YAxis stroke={theme === "dark" ? "#9ca3af" : "#64748b"} />
                          <Tooltip contentStyle={{
                            backgroundColor: theme === "dark" ? "#1e293b" : "#ffffff",
                            border: `1px solid ${theme === "dark" ? "#475569" : "#e2e8f0"}`,
                            color: theme === "dark" ? "#e2e8f0" : "#1e293b"
                          }} />
                          <Bar dataKey="averageScore" fill="#10b981" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}

        {/* Prelims Tab */}
        {activeTab === "prelims" && (
          <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className={`rounded-2xl border shadow-sm ${
                theme === "dark"
                  ? "bg-slate-900/50 border-slate-800"
                  : "bg-white border-slate-100"
              }`}>
                <CardContent className="p-4 sm:p-5">
                  <div className={`text-[11px] font-semibold uppercase tracking-wider ${
                    theme === "dark" ? "text-slate-500" : "text-slate-500"
                  }`}>Total Tests</div>
                  <div className={`text-2xl font-bold tracking-tight mt-0.5 ${
                    theme === "dark" ? "text-slate-100" : "text-slate-900"
                  }`}>{prelimsData?.statistics?.totalTests || 0}</div>
                </CardContent>
              </Card>
              <Card className={`rounded-2xl border shadow-sm ${
                theme === "dark"
                  ? "bg-slate-900/50 border-slate-800"
                  : "bg-white border-slate-100"
              }`}>
                <CardContent className="p-4 sm:p-5">
                  <div className={`text-[11px] font-semibold uppercase tracking-wider ${
                    theme === "dark" ? "text-slate-500" : "text-slate-500"
                  }`}>Average Score</div>
                  <div className={`text-2xl font-bold tracking-tight mt-0.5 ${
                    theme === "dark" ? "text-slate-100" : "text-slate-900"
                  }`}>{prelimsData?.statistics?.averageScore?.toFixed(1) ?? "0.0"}</div>
                </CardContent>
              </Card>
              <Card className={`rounded-2xl border shadow-sm ${
                theme === "dark"
                  ? "bg-slate-900/50 border-slate-800"
                  : "bg-white border-slate-100"
              }`}>
                <CardContent className="p-4 sm:p-5">
                  <div className={`text-[11px] font-semibold uppercase tracking-wider ${
                    theme === "dark" ? "text-slate-500" : "text-slate-500"
                  }`}>Average Accuracy</div>
                  <div className={`text-2xl font-bold tracking-tight mt-0.5 ${
                    theme === "dark" ? "text-slate-100" : "text-slate-900"
                  }`}>{prelimsData?.statistics?.averageAccuracy?.toFixed(1) ?? "0.0"}%</div>
                </CardContent>
              </Card>
              <Card className={`rounded-2xl border shadow-sm ${
                theme === "dark"
                  ? "bg-slate-900/50 border-slate-800"
                  : "bg-white border-slate-100"
              }`}>
                <CardContent className="p-4 sm:p-5">
                  <div className={`text-[11px] font-semibold uppercase tracking-wider ${
                    theme === "dark" ? "text-slate-500" : "text-slate-500"
                  }`}>Highest Score</div>
                  <div className="text-2xl font-bold tracking-tight mt-0.5 text-emerald-500">
                    {prelimsData?.statistics?.highestScore || 0}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Test History */}
            <Card className={`rounded-2xl border shadow-sm ${
              theme === "dark"
                ? "bg-slate-900/50 border-slate-800"
                : "bg-white border-slate-100"
            }`}>
              <CardHeader>
                <CardTitle className={`${
                  theme === "dark" ? "text-slate-100" : "text-slate-900"
                }`}>Test History</CardTitle>
              </CardHeader>
              <CardContent>
                {prelimsData?.tests.length === 0 ? (
                  <div className={`text-center py-16 ${
                    theme === "dark" ? "text-slate-400" : "text-slate-500"
                  }`}>
                    <FileText className={`h-16 w-16 mx-auto mb-4 opacity-50 ${
                      theme === "dark" ? "text-slate-500" : "text-slate-400"
                    }`} />
                    <p className="text-lg font-medium">No prelims tests attempted yet</p>
                    <p className="text-sm mt-1">Tests will appear here once the student starts taking them</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {paginatedPrelims.items.map((test) => (
                        <div
                          key={test.id}
                          className={`group flex flex-col rounded-2xl border p-4 transition-all duration-200 cursor-pointer hover:shadow-md hover:border-blue-400/50 ${
                            theme === "dark"
                              ? "bg-slate-800/50 border-slate-700 hover:bg-slate-800/80"
                              : "bg-white border-slate-200 shadow-sm hover:bg-slate-50/80"
                          }`}
                          onClick={() =>
                            navigate(
                              isMentorView
                                ? `/result/${test.id}?fromMentor=1&studentId=${id}`
                                : `/result/${test.id}?fromAdmin=1&studentId=${id}`
                            )
                          }
                        >
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div
                              className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                                theme === "dark"
                                  ? "bg-blue-500/15 text-blue-300"
                                  : "bg-blue-50 text-blue-600"
                              }`}
                            >
                              <FileText className="h-5 w-5" />
                            </div>
                            {test.isPrelimsMock && (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                                  theme === "dark"
                                    ? "bg-amber-500/20 text-amber-400"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                Mock
                              </span>
                            )}
                          </div>

                          <h3
                            className={`font-semibold text-[15px] leading-snug line-clamp-2 min-h-[2.5rem] ${
                              theme === "dark" ? "text-slate-100" : "text-slate-900"
                            }`}
                            title={`${test.subject} - ${test.topic}`}
                          >
                            {test.subject} - {test.topic}
                          </h3>

                          <p
                            className={`text-xs mt-1.5 ${
                              theme === "dark" ? "text-slate-400" : "text-slate-500"
                            }`}
                          >
                            {test.difficulty} • {test.totalQuestions} questions
                          </p>
                          <p
                            className={`text-[11px] mt-1 ${
                              theme === "dark" ? "text-slate-500" : "text-slate-400"
                            }`}
                          >
                            {new Date(test.attemptedAt).toLocaleString()}
                          </p>

                          <div
                            className={`grid grid-cols-2 gap-2 mt-4 rounded-xl overflow-hidden ${
                              theme === "dark"
                                ? "bg-slate-900/60"
                                : "bg-slate-50"
                            }`}
                          >
                            <div className="px-3 py-2.5 text-center">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                Score
                              </p>
                              <p
                                className={`text-lg font-bold leading-none mt-1 ${
                                  theme === "dark" ? "text-slate-100" : "text-slate-900"
                                }`}
                              >
                                {Number(test.score || 0).toFixed(1)}
                              </p>
                            </div>
                            <div
                              className={`px-3 py-2.5 text-center border-l ${
                                theme === "dark" ? "border-slate-700" : "border-slate-200"
                              }`}
                            >
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                Accuracy
                              </p>
                              <p className="text-lg font-bold leading-none mt-1 text-emerald-500">
                                {Number(test.accuracy || 0).toFixed(1)}%
                              </p>
                            </div>
                          </div>

                          <p
                            className={`text-[11px] mt-2.5 text-center ${
                              theme === "dark" ? "text-slate-500" : "text-slate-500"
                            }`}
                          >
                            {test.correctAnswers} correct · {test.wrongAnswers} wrong
                          </p>

                          <Button
                            variant="outline"
                            size="sm"
                            className={`mt-3 w-full h-9 rounded-xl flex items-center justify-center gap-1.5 ${
                              theme === "dark"
                                ? "border-slate-600 text-slate-200 hover:bg-slate-700"
                                : "border-slate-200 text-slate-700 hover:bg-white"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(
                                isMentorView
                                  ? `/result/${test.id}?fromMentor=1&studentId=${id}`
                                  : `/result/${test.id}?fromAdmin=1&studentId=${id}`
                              );
                            }}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span className="text-xs font-semibold">View Details</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                    {renderListPagination(paginatedPrelims, setPrelimsPage)}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Mains Tab */}
        {activeTab === "mains" && (
          <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className={`rounded-2xl border shadow-sm ${
                theme === "dark"
                  ? "bg-slate-900/50 border-slate-800"
                  : "bg-white border-slate-100"
              }`}>
                <CardContent className="p-4 sm:p-5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Evaluations</div>
                  <div className={`text-2xl font-bold tracking-tight mt-0.5 ${
                    theme === "dark" ? "text-slate-100" : "text-slate-900"
                  }`}>{mainsData?.statistics?.totalEvaluations || 0}</div>
                </CardContent>
              </Card>
              <Card className={`rounded-2xl border shadow-sm ${
                theme === "dark"
                  ? "bg-slate-900/50 border-slate-800"
                  : "bg-white border-slate-100"
              }`}>
                <CardContent className="p-4 sm:p-5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Average Score</div>
                  <div className={`text-2xl font-bold tracking-tight mt-0.5 ${
                    theme === "dark" ? "text-slate-100" : "text-slate-900"
                  }`}>{mainsData?.statistics?.averageScore?.toFixed(1) ?? "0.0"}%</div>
                </CardContent>
              </Card>
              <Card className={`rounded-2xl border shadow-sm ${
                theme === "dark"
                  ? "bg-slate-900/50 border-slate-800"
                  : "bg-white border-slate-100"
              }`}>
                <CardContent className="p-4 sm:p-5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Highest Score</div>
                  <div className="text-2xl font-bold tracking-tight mt-0.5 text-emerald-500">
                    {mainsData?.statistics?.highestScore?.toFixed(1) ?? "0.0"}%
                  </div>
                </CardContent>
              </Card>
              <Card className={`rounded-2xl border shadow-sm ${
                theme === "dark"
                  ? "bg-slate-900/50 border-slate-800"
                  : "bg-white border-slate-100"
              }`}>
                <CardContent className="p-4 sm:p-5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Lowest Score</div>
                  <div className="text-2xl font-bold tracking-tight mt-0.5 text-amber-500">
                    {mainsData?.statistics?.lowestScore?.toFixed(1) ?? "0.0"}%
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Evaluation History */}
            <Card className={`rounded-2xl border shadow-sm ${
              theme === "dark"
                ? "bg-slate-900/50 border-slate-800"
                : "bg-white border-slate-100"
            }`}>
              <CardHeader>
                <CardTitle className={`${
                  theme === "dark" ? "text-slate-100" : "text-slate-900"
                }`}>Mains Answer Evaluation History</CardTitle>
              </CardHeader>
              <CardContent>
                {mainsData?.evaluations.length === 0 ? (
                  <div className={`text-center py-16 ${
                    theme === "dark" ? "text-slate-400" : "text-slate-500"
                  }`}>
                    <ClipboardCheck className={`h-16 w-16 mx-auto mb-4 opacity-50 ${
                      theme === "dark" ? "text-slate-500" : "text-slate-400"
                    }`} />
                    <p className="text-lg font-medium">No mains evaluations yet</p>
                    <p className="text-sm mt-1">Evaluations will appear here once the student submits answers</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {paginatedMains.items.map((evaluation) => {
                        const scorePct = evaluation.overallScore?.percentage;
                        const scoreColor =
                          scorePct == null
                            ? theme === "dark"
                              ? "text-slate-400"
                              : "text-slate-500"
                            : scorePct >= 70
                              ? "text-emerald-500"
                              : scorePct >= 50
                                ? "text-amber-500"
                                : "text-red-500";

                        return (
                          <div
                            key={evaluation.id}
                            className={`group flex flex-col rounded-2xl border p-4 transition-all duration-200 cursor-pointer hover:shadow-md hover:border-blue-400/50 ${
                              theme === "dark"
                                ? "bg-slate-800/50 border-slate-700 hover:bg-slate-800/80"
                                : "bg-white border-slate-200 shadow-sm hover:bg-slate-50/80"
                            }`}
                            onClick={() => viewEvaluationDetails(evaluation.id)}
                          >
                            <div className="flex items-start justify-between gap-2 mb-3">
                              <div
                                className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                                  theme === "dark"
                                    ? "bg-emerald-500/15 text-emerald-300"
                                    : "bg-emerald-50 text-emerald-600"
                                }`}
                              >
                                <ClipboardCheck className="h-5 w-5" />
                              </div>
                              {evaluation.paper && evaluation.paper.toLowerCase() !== "unknown" && (
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                                    theme === "dark"
                                      ? "bg-slate-700 text-slate-300"
                                      : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {evaluation.paper}
                                </span>
                              )}
                            </div>

                            <h3
                              className={`font-semibold text-[15px] leading-snug line-clamp-2 min-h-[2.5rem] ${
                                theme === "dark" ? "text-slate-100" : "text-slate-900"
                              }`}
                              title={evaluation.subject}
                            >
                              {evaluation.subject}
                            </h3>

                            <p
                              className={`text-xs mt-1.5 ${
                                theme === "dark" ? "text-slate-400" : "text-slate-500"
                              }`}
                            >
                              {evaluation.year ? `${evaluation.year} · ` : ""}
                              {evaluation.totalQuestions || 0} questions
                            </p>
                            <p
                              className={`text-[11px] mt-1 ${
                                theme === "dark" ? "text-slate-500" : "text-slate-400"
                              }`}
                            >
                              {new Date(evaluation.evaluatedAt).toLocaleString()}
                            </p>

                            <div
                              className={`grid grid-cols-2 gap-2 mt-4 rounded-xl overflow-hidden ${
                                theme === "dark" ? "bg-slate-900/60" : "bg-slate-50"
                              }`}
                            >
                              <div className="px-3 py-2.5 text-center">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                  Score
                                </p>
                                <p className={`text-lg font-bold leading-none mt-1 ${scoreColor}`}>
                                  {scorePct != null ? `${scorePct.toFixed(1)}%` : "N/A"}
                                </p>
                              </div>
                              <div
                                className={`px-3 py-2.5 text-center border-l ${
                                  theme === "dark" ? "border-slate-700" : "border-slate-200"
                                }`}
                              >
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                  Words
                                </p>
                                <p
                                  className={`text-lg font-bold leading-none mt-1 ${
                                    theme === "dark" ? "text-slate-100" : "text-slate-900"
                                  }`}
                                >
                                  {evaluation.wordCount || 0}
                                </p>
                              </div>
                            </div>

                            {evaluation.overallScore && (
                              <p
                                className={`text-[11px] mt-2.5 text-center ${
                                  theme === "dark" ? "text-slate-500" : "text-slate-500"
                                }`}
                              >
                                {evaluation.overallScore.obtained}/{evaluation.overallScore.maximum} marks
                              </p>
                            )}

                            <Button
                              variant="outline"
                              size="sm"
                              className={`mt-3 w-full h-9 rounded-xl flex items-center justify-center gap-1.5 ${
                                theme === "dark"
                                  ? "border-slate-600 text-slate-200 hover:bg-slate-700"
                                  : "border-slate-200 text-slate-700 hover:bg-white"
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                viewEvaluationDetails(evaluation.id);
                              }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span className="text-xs font-semibold">View Answer</span>
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                    {renderListPagination(paginatedMains, setMainsPage)}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Analytics (DART) Tab – Student's DART dashboard view */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            {!dartAnalytics ? (
              <div className={`flex items-center justify-center py-16 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className={theme === "dark" ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}>
                    <CardContent className="pt-6">
                      <div className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>Performance Score</div>
                      <div className={`text-2xl font-bold ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>
                        {dartAnalytics.performanceScore ?? 0}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">{dartAnalytics.performanceScoreLevel ?? "—"}</div>
                    </CardContent>
                  </Card>
                  <Card className={theme === "dark" ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}>
                    <CardContent className="pt-6">
                      <div className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>Consistency Index</div>
                      <div className={`text-2xl font-bold ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>
                        {dartAnalytics.consistencyIndex ?? 0}%
                      </div>
                      <div className="text-xs text-slate-500 mt-1">Days 6+ hrs study</div>
                    </CardContent>
                  </Card>
                  <Card className={theme === "dark" ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}>
                    <CardContent className="pt-6">
                      <div className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>DART Entries</div>
                      <div className={`text-2xl font-bold ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>
                        {dartAnalytics.entriesCount ?? 0}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className={theme === "dark" ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}>
                    <CardContent className="pt-6">
                      <button
                        onClick={handleDownloadStudentDartReport}
                        disabled={dartReportDownloading}
                        className={`text-sm font-medium px-3 py-2 rounded-lg ${theme === "dark" ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30" : "bg-blue-100 text-blue-700 hover:bg-blue-200"}`}
                      >
                        {dartReportDownloading ? "Generating..." : "Download 15-Day Report"}
                      </button>
                    </CardContent>
                  </Card>
                </div>
                {/* Main DART charts – arranged in 2-column grids */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {dartAnalytics.dailyTimeDistribution?.length &&
                    dartAnalytics.dailyTimeDistribution[0]?.name !== "No data" && (
                      <Card
                        className={
                          theme === "dark" ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
                        }
                      >
                        <CardHeader>
                          <CardTitle className={theme === "dark" ? "text-slate-100" : "text-slate-900"}>
                            Daily Time Distribution
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={250}>
                            <RechartsPieChart>
                              <Pie
                                data={dartAnalytics.dailyTimeDistribution}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={90}
                                label={({ name, value }) => `${name}: ${value}h`}
                              >
                                {dartAnalytics.dailyTimeDistribution.map((entry: any, i: number) => (
                                  <Cell key={i} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: theme === "dark" ? "#1e293b" : "#ffffff",
                                  border: `1px solid ${theme === "dark" ? "#475569" : "#e2e8f0"}`
                                }}
                              />
                            </RechartsPieChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    )}
                  {dartAnalytics.sevenDayStudyTrend?.length > 0 && (
                    <Card
                      className={
                        theme === "dark" ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
                      }
                    >
                      <CardHeader>
                        <CardTitle className={theme === "dark" ? "text-slate-100" : "text-slate-900"}>
                          7 Day Study Trend
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={280}>
                          <LineChart data={dartAnalytics.sevenDayStudyTrend}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke={theme === "dark" ? "#374151" : "#e2e8f0"}
                            />
                            <XAxis dataKey="day" stroke={theme === "dark" ? "#9ca3af" : "#64748b"} />
                            <YAxis stroke={theme === "dark" ? "#9ca3af" : "#64748b"} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: theme === "dark" ? "#1e293b" : "#ffffff",
                                border: `1px solid ${theme === "dark" ? "#475569" : "#e2e8f0"}`
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey="studyHours"
                              stroke="#2563eb"
                              strokeWidth={2}
                              name="Study (hrs)"
                            />
                            <Line
                              type="monotone"
                              dataKey="targetHours"
                              stroke="#06b6d4"
                              strokeWidth={2}
                              name="Target (hrs)"
                              strokeDasharray="4 4"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {dartAnalytics.targetVsActual?.length > 0 && (
                    <Card
                      className={
                        theme === "dark" ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
                      }
                    >
                      <CardHeader>
                        <CardTitle className={theme === "dark" ? "text-slate-100" : "text-slate-900"}>
                          Target vs Actual Study (Last 7 days)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart
                            data={dartAnalytics.targetVsActual}
                            margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke={theme === "dark" ? "#374151" : "#e2e8f0"}
                            />
                            <XAxis dataKey="date" stroke={theme === "dark" ? "#9ca3af" : "#64748b"} />
                            <YAxis stroke={theme === "dark" ? "#9ca3af" : "#64748b"} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: theme === "dark" ? "#1e293b" : "#ffffff",
                                border: `1px solid ${theme === "dark" ? "#475569" : "#e2e8f0"}`
                              }}
                            />
                            <Bar dataKey="target" fill="#94a3b8" name="Target (hrs)" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="actual" fill="#2563eb" name="Actual (hrs)" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}

                  {dartAnalytics.subjectFrequency?.length > 0 && (
                    <Card
                      className={
                        theme === "dark" ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
                      }
                    >
                      <CardHeader>
                        <CardTitle className={theme === "dark" ? "text-slate-100" : "text-slate-900"}>
                          Subject Frequency
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart
                            data={dartAnalytics.subjectFrequency.slice(0, 10)}
                            layout="vertical"
                            margin={{ top: 5, right: 20, left: 60, bottom: 5 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke={theme === "dark" ? "#374151" : "#e2e8f0"}
                            />
                            <XAxis type="number" stroke={theme === "dark" ? "#9ca3af" : "#64748b"} />
                            <YAxis
                              type="category"
                              dataKey="name"
                              width={55}
                              tick={{ fontSize: 10, fill: theme === "dark" ? "#9ca3af" : "#64748b" }}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: theme === "dark" ? "#1e293b" : "#ffffff",
                                border: `1px solid ${theme === "dark" ? "#475569" : "#e2e8f0"}`
                              }}
                            />
                            <Bar dataKey="count" fill="#14b8a6" name="Days" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {dartAnalytics.wakeUpConsistency?.length > 0 && (
                    <Card
                      className={
                        theme === "dark" ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
                      }
                    >
                      <CardHeader>
                        <CardTitle className={theme === "dark" ? "text-slate-100" : "text-slate-900"}>
                          <span className="inline-flex items-center gap-2">
                            <Sunrise className="w-4 h-4" />
                            Wake-up Consistency (Last 7 days)
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {dartAnalytics.wakeUpConsistency.map((row: any, i: number) => (
                            <div
                              key={i}
                              className={`flex justify-between items-center py-1.5 px-3 rounded-lg ${
                                theme === "dark" ? "bg-slate-800/70" : "bg-slate-100"
                              }`}
                            >
                              <span className="text-sm font-medium">{row.date}</span>
                              <span className={`text-sm ${row.before6 ? "text-green-500" : "text-slate-500"}`}>
                                {row.wakeUpTime} {row.before6 && "✓ Before 6 AM"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Card
                    className={
                      theme === "dark" ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
                    }
                  >
                    <CardHeader>
                      <CardTitle className={theme === "dark" ? "text-slate-100" : "text-slate-900"}>
                        Answer Writing (Last 7 days)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div
                        className={`text-3xl font-bold ${
                          theme === "dark" ? "text-blue-400" : "text-blue-600"
                        }`}
                      >
                        {dartAnalytics.answerWritingWeeklyCount ?? 0} days
                      </div>
                      <p className="text-sm text-slate-500 mt-1">Days with answer writing done</p>
                    </CardContent>
                  </Card>
                </div>

                <Card className={theme === "dark" ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}>
                  <CardHeader>
                    <CardTitle className={theme === "dark" ? "text-slate-100" : "text-slate-900"}>
                      <span className="inline-flex items-center gap-2">
                        <Smile className="w-4 h-4" />
                        Emotional Status (Mental Health Insights)
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dartAnalytics.emotionalStatusPie?.length &&
                    dartAnalytics.emotionalStatusPie.some((d: any) => d.value > 0) ? (
                      <ResponsiveContainer width="100%" height={220}>
                        <RechartsPieChart>
                          <Pie
                            data={dartAnalytics.emotionalStatusPie}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {dartAnalytics.emotionalStatusPie.map((_: any, i: number) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: theme === "dark" ? "#1e293b" : "#ffffff",
                              border: `1px solid ${theme === "dark" ? "#475569" : "#e2e8f0"}`
                            }}
                          />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div
                        className={`h-[220px] flex items-center justify-center ${
                          theme === "dark" ? "text-slate-400" : "text-slate-500"
                        }`}
                      >
                        No emotional status data yet
                      </div>
                    )}
                  </CardContent>
                </Card>
                {/* <Card className={theme === "dark" ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}>
                  <CardHeader>
                    <CardTitle className={theme === "dark" ? "text-slate-100" : "text-slate-900"}>
                      <span className="inline-flex items-center gap-2">
                        <Smile className="w-4 h-4" />
                        Emotional Status (Mental Health Insights)
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dartAnalytics.emotionalStatusPie?.length &&
                    dartAnalytics.emotionalStatusPie.some((d: any) => d.value > 0) ? (
                      <ResponsiveContainer width="100%" height={220}>
                        <RechartsPieChart>
                          <Pie
                            data={dartAnalytics.emotionalStatusPie}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {dartAnalytics.emotionalStatusPie.map((_: any, i: number) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: theme === "dark" ? "#1e293b" : "#ffffff",
                              border: `1px solid ${theme === "dark" ? "#475569" : "#e2e8f0"}`
                            }}
                          />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div
                        className={`h-[220px] flex items-center justify-center ${
                          theme === "dark" ? "text-slate-400" : "text-slate-500"
                        }`}
                      >
                        No emotional status data yet
                      </div>
                    )}
                  </CardContent>
                </Card> */}
                {(!dartAnalytics.entriesCount || dartAnalytics.entriesCount === 0) && (
                  <div className={`text-center py-12 rounded-xl border ${theme === "dark" ? "bg-slate-800/50 border-slate-700 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"}`}>
                    <PieChart className={`h-12 w-12 mx-auto mb-3 opacity-50 ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`} />
                    <p className="font-medium">No DART entries yet</p>
                    <p className="text-sm mt-1">This student has not logged any daily activity in DART.</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === "activity" && (
          <Card className={`transition-colors duration-300 ${
            theme === "dark"
              ? "bg-slate-900 border-slate-700"
              : "bg-white border-slate-200 shadow-sm"
          }`}>
            <CardHeader>
              <CardTitle className={`${
                theme === "dark" ? "text-slate-100" : "text-slate-900"
              }`}>Student Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {activityData?.activities.length === 0 ? (
                <div className={`text-center py-16 ${
                  theme === "dark" ? "text-slate-400" : "text-slate-500"
                }`}>
                  <Activity className={`h-16 w-16 mx-auto mb-4 opacity-50 ${
                    theme === "dark" ? "text-slate-500" : "text-slate-400"
                  }`} />
                  <p className="text-lg font-medium">No activity recorded yet</p>
                  <p className="text-sm mt-1">Activity timeline will appear here as the student engages</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {paginatedActivity.items.map((activity, index) => (
                    <div key={activity.id} className="flex gap-6">
                      <div className="flex flex-col items-center">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                          activity.type === 'mains_evaluation'
                            ? theme === "dark" ? 'bg-green-500' : 'bg-green-600'
                            : theme === "dark" ? 'bg-blue-500' : 'bg-blue-600'
                        }`}>
                          <div className={`w-2 h-2 rounded-full bg-white`} />
                        </div>
                        {index < paginatedActivity.items.length - 1 && (
                          <div className={`w-px h-20 mt-4 ${
                            theme === "dark" ? "bg-slate-700" : "bg-slate-300"
                          }`} />
                        )}
                      </div>
                      <div className="flex-1 pb-8">
                        <div className={`rounded-xl p-5 border transition-all duration-200 ${
                          theme === "dark"
                            ? "bg-slate-800/50 border-slate-700 hover:bg-slate-800/80"
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100/80"
                        }`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className={`font-semibold text-lg ${
                                  theme === "dark" ? "text-slate-100" : "text-slate-900"
                                }`}>{activity.title}</h3>
                                <Badge variant={activity.type === 'mains_evaluation' ? 'default' : 'secondary'} className="px-3 py-1">
                                  {activity.type === 'mains_evaluation' ? 'Mains' : 'Prelims'}
                                </Badge>
                              </div>
                              <p className={`text-sm mb-3 ${
                                theme === "dark" ? "text-slate-400" : "text-slate-600"
                              }`}>{activity.description}</p>
                              <p className={`text-xs font-medium ${
                                theme === "dark" ? "text-slate-500" : "text-slate-500"
                              }`}>
                                {new Date(activity.date).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {renderListPagination(paginatedActivity, setActivityPage)}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Reset Password – show new password so admin can share with user */}
        <Dialog open={!!resetPasswordResult} onOpenChange={(open) => !open && setResetPasswordResult(null)}>
          <DialogContent className={`max-w-md transition-colors duration-300 ${
            theme === "dark"
              ? "bg-slate-900 border-slate-700"
              : "bg-white border-slate-300"
          }`}>
            <DialogHeader>
              <DialogTitle className={`${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>
                Password reset successfully
              </DialogTitle>
            </DialogHeader>
            <div className={`p-6 pt-2 space-y-4 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
              <p className="text-sm">
                Share this temporary password with the student. They can use it to sign in; they will be prompted to change it after login.
              </p>
              <div className="flex items-center gap-2">
                <code className={`flex-1 px-3 py-2 rounded-lg text-sm font-mono ${
                  theme === "dark" ? "bg-slate-800 text-slate-100" : "bg-slate-100 text-slate-900"
                }`}>
                  {resetPasswordResult?.tempPassword ?? ""}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const p = resetPasswordResult?.tempPassword ?? "";
                    if (p) {
                      navigator.clipboard.writeText(p);
                      alert("Copied to clipboard");
                    }
                  }}
                  className="shrink-0"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={() => setResetPasswordResult(null)}>OK</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Evaluation Details Modal */}
        <Dialog
          open={showEvaluationModal}
          onOpenChange={(open) => {
            setShowEvaluationModal(open);
            if (!open) {
              setRawCopyEval(null);
              setSelectedEvaluation(null);
            }
          }}
        >
          <DialogContent className={`max-w-6xl max-h-[90vh] overflow-y-auto transition-colors duration-300 ${
            theme === "dark"
              ? "bg-slate-900 border-slate-700"
              : "bg-white border-slate-300"
          }`}>
            <DialogHeader>
              <DialogTitle className={`${
                theme === "dark" ? "text-slate-100" : "text-slate-900"
              }`}>
                {rawCopyEval?.subject
                  ? `${rawCopyEval.subject} — student copy evaluation`
                  : "Evaluation Details"}
              </DialogTitle>
              <Button
                variant="outline"
                onClick={() => {
                  setShowEvaluationModal(false);
                  setRawCopyEval(null);
                  setSelectedEvaluation(null);
                }}
                className="shrink-0"
              >
                Cancel
              </Button>
            </DialogHeader>
            {rawCopyEval?.visionResult ? (
              <CopyEvaluationResultView
                result={rawCopyEval.visionResult}
                evaluationId={String(rawCopyEval._id)}
                storedPages={rawCopyEval.storedPages}
                subject={rawCopyEval.subject}
                paper={
                  rawCopyEval.paper && String(rawCopyEval.paper).toLowerCase() !== "unknown"
                    ? rawCopyEval.paper
                    : undefined
                }
                fileName={rawCopyEval.fileName || rawCopyEval.pdfFileName}
                createdAt={rawCopyEval.createdAt}
              />
            ) : selectedEvaluation ? (
              <div className="space-y-6">
                {/* Evaluation Summary */}
                <Card className={`transition-colors duration-300 ${
                  theme === "dark"
                    ? "bg-slate-800 border-slate-700"
                    : "bg-slate-50 border-slate-200"
                }`}>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className={`text-sm ${
                          theme === "dark" ? "text-slate-400" : "text-slate-600"
                        }`}>Overall Score</div>
                        <div className="text-2xl font-bold text-green-500">
                          {selectedEvaluation.finalSummary.overallScore.percentage.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className={`text-sm ${
                          theme === "dark" ? "text-slate-400" : "text-slate-600"
                        }`}>Marks Obtained</div>
                        <div className={`text-xl font-semibold ${
                          theme === "dark" ? "text-slate-200" : "text-slate-800"
                        }`}>
                          {selectedEvaluation.finalSummary.overallScore.obtained}/
                          {selectedEvaluation.finalSummary.overallScore.maximum}
                        </div>
                      </div>
                      <div>
                        <div className={`text-sm ${
                          theme === "dark" ? "text-slate-400" : "text-slate-600"
                        }`}>UPSC Range</div>
                        <Badge variant="outline" className={`${
                          theme === "dark"
                            ? "border-slate-600 text-slate-300"
                            : "border-slate-300 text-slate-700"
                        }`}>{selectedEvaluation.finalSummary.upscRange}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Strengths and Weaknesses */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className={`transition-colors duration-300 ${
                    theme === "dark"
                      ? "bg-slate-800 border-slate-700"
                      : "bg-green-50 border-green-200"
                  }`}>
                    <CardHeader>
                      <CardTitle className="text-green-600">Strengths</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {selectedEvaluation.finalSummary.strengths.map((strength, index) => (
                          <li key={index} className={`flex items-start gap-2 text-sm ${
                            theme === "dark" ? "text-slate-300" : "text-slate-700"
                          }`}>
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            {strength}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className={`transition-colors duration-300 ${
                    theme === "dark"
                      ? "bg-slate-800 border-slate-700"
                      : "bg-red-50 border-red-200"
                  }`}>
                    <CardHeader>
                      <CardTitle className="text-red-600">Areas for Improvement</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {selectedEvaluation.finalSummary.weaknesses.map((weakness, index) => (
                          <li key={index} className={`flex items-start gap-2 text-sm ${
                            theme === "dark" ? "text-slate-300" : "text-slate-700"
                          }`}>
                            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                            {weakness}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                {/* Individual Question Evaluations */}
                <Card className={`transition-colors duration-300 ${
                  theme === "dark"
                    ? "bg-slate-800 border-slate-700"
                    : "bg-slate-50 border-slate-200"
                }`}>
                  <CardHeader>
                    <CardTitle className={`${
                      theme === "dark" ? "text-slate-100" : "text-slate-900"
                    }`}>Question-wise Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {(selectedEvaluation.evaluations || []).map((question, index) => (
                        <div key={index} className={`border rounded-lg p-4 transition-colors duration-200 ${
                          theme === "dark"
                            ? "border-slate-700 bg-slate-900/50"
                            : "border-slate-200 bg-white"
                        }`}>
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className={`font-semibold ${
                                theme === "dark" ? "text-slate-100" : "text-slate-900"
                              }`}>Question {question.questionNumber}</h4>
                              <p className={`text-sm ${
                                theme === "dark" ? "text-slate-400" : "text-slate-600"
                              }`}>Word Count: {question.wordCount}</p>
                            </div>
                            <div className="text-right">
                              <div className={`text-lg font-bold ${
                                theme === "dark" ? "text-slate-200" : "text-slate-800"
                              }`}>{question.totalMarks}/{question.maxMarks}</div>
                              <Badge variant="outline" className={`mt-2 ${
                                theme === "dark"
                                  ? "border-slate-600 text-slate-300"
                                  : "border-slate-300 text-slate-700"
                              }`}>{question.upscRange}</Badge>
                            </div>
                          </div>

                          {question.strengths.length > 0 && (
                            <div className="mb-3">
                              <div className="text-sm font-medium text-green-600 mb-1">Strengths:</div>
                              <ul className={`text-sm ${
                                theme === "dark" ? "text-slate-300" : "text-slate-700"
                              }`}>
                                {question.strengths.map((strength, i) => (
                                  <li key={i}>• {strength}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {question.weaknesses.length > 0 && (
                            <div className="mb-3">
                              <div className="text-sm font-medium text-red-600 mb-1">Weaknesses:</div>
                              <ul className={`text-sm ${
                                theme === "dark" ? "text-slate-300" : "text-slate-700"
                              }`}>
                                {question.weaknesses.map((weakness, i) => (
                                  <li key={i}>• {weakness}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {question.examinerComment && (
                            <div>
                              <div className="text-sm font-medium text-blue-600 mb-1">Examiner Comment:</div>
                              <p className={`text-sm ${
                                theme === "dark" ? "text-slate-300" : "text-slate-700"
                              }`}>{question.examinerComment}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : null}
            <div
              className={`sticky bottom-0 flex justify-end gap-2 px-6 py-3 border-t ${
                theme === "dark" ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
              }`}
            >
              <Button
                variant="outline"
                onClick={() => {
                  setShowEvaluationModal(false);
                  setRawCopyEval(null);
                  setSelectedEvaluation(null);
                }}
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {isMentorView && id && (
          <Card
            className={`mt-8 mb-6 transition-colors duration-300 ${
              theme === "dark" ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200 shadow-sm"
            }`}
          >
            <CardHeader>
              <CardTitle className="text-lg">Mentor feedback</CardTitle>
              <p className={`text-sm font-normal ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                Notes for this student (visible to you on this profile).
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <textarea
                value={mentorFeedbackMessage}
                onChange={(e) => setMentorFeedbackMessage(e.target.value)}
                placeholder="Encouragement, focus areas, or next steps…"
                rows={4}
                className={`w-full rounded-lg border px-3 py-2 text-sm ${
                  theme === "dark"
                    ? "bg-slate-950 border-slate-700 text-white placeholder:text-slate-500"
                    : "bg-white border-slate-200 text-slate-900"
                }`}
              />
              <Button
                type="button"
                onClick={submitMentorFeedback}
                disabled={mentorFeedbackSending || !mentorFeedbackMessage.trim()}
              >
                {mentorFeedbackSending ? "Sending…" : "Send feedback"}
              </Button>
              {mentorFeedbackList.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-700/40">
                  <p className={`text-xs font-semibold uppercase tracking-wide ${theme === "dark" ? "text-slate-500" : "text-slate-500"}`}>
                    Earlier notes
                  </p>
                  <ul className="space-y-3">
                    {mentorFeedbackList.map((f, i) => (
                      <li
                        key={i}
                        className={`rounded-lg p-3 text-sm ${theme === "dark" ? "bg-slate-800/60 text-slate-200" : "bg-slate-50 text-slate-800"}`}
                      >
                        <p>{f.message}</p>
                        {f.createdAt && (
                          <p className={`text-xs mt-1 ${theme === "dark" ? "text-slate-500" : "text-slate-500"}`}>
                            {new Date(f.createdAt).toLocaleString()}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
