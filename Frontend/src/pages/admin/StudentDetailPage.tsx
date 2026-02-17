import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Badge } from "../../components/ui/badge";
import { api, dartAPI } from "../../services/api";
import { useTheme } from "../../hooks/useTheme";
import {
  ArrowLeft,
  User,
  Mail,
  Calendar,
  FileText,
  ClipboardCheck,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  BookOpen,
  Award,
  AlertTriangle,
  CheckCircle,
  Clock,
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
  "#8b5cf6", // purple
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

export const StudentDetailPage = () => {
  const { theme } = useTheme();
  const { id } = useParams<{ id: string }>();
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
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [dartAnalytics, setDartAnalytics] = useState<any | null>(null);
  const [dartReportDownloading, setDartReportDownloading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchStudentData();
    }
  }, [id, timeFilter]);

  useEffect(() => {
    if (id && activeTab === "analytics") {
      dartAPI.getStudentAnalytics(id, 30).then((res) => {
        if (res.data?.success && res.data.data) setDartAnalytics(res.data.data);
      }).catch(() => setDartAnalytics(null));
    } else if (activeTab !== "analytics") {
      setDartAnalytics(null);
    }
  }, [id, activeTab]);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      const params = timeFilter !== "all" ? { period: timeFilter } : {};

      const [studentRes, prelimsRes, mainsRes, activityRes] = await Promise.all([
        api.get(`/api/admin/students/${id}`),
        api.get(`/api/admin/students/${id}/prelims`, { params }),
        api.get(`/api/admin/students/${id}/mains`, { params }),
        api.get(`/api/admin/students/${id}/activity`, { params })
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
    } catch (err: any) {
      console.error("Error fetching student data:", err);
      setError(err?.response?.data?.message || "Failed to load student data");
    } finally {
      setLoading(false);
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
        alert(res.data.message);
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
      const res = await dartAPI.getStudentReport20Day(id);
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `DART-20-Day-Report-${student?.name || id}.pdf`;
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
      const res = await api.get(`/api/copy-evaluations/${evaluationId}`);
      if (res.data.success) {
        setSelectedEvaluation(res.data.data);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">{error || "Student not found"}</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-6 transition-colors duration-300 ${
      theme === "dark" ? "bg-[#020012] text-slate-50" : "bg-slate-50 text-slate-900"
    }`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Link to="/admin/students">
            <Button variant="outline" className={`${
              theme === "dark"
                ? "border-slate-700 hover:bg-slate-800 text-slate-300"
                : "border-slate-300 hover:bg-slate-100 text-slate-700"
            }`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Students
            </Button>
          </Link>
        </div>

        {/* Student Profile Section */}
        <Card className={`mb-6 transition-colors duration-300 ${
          theme === "dark"
            ? "bg-slate-900 border-slate-700"
            : "bg-white border-slate-200 shadow-sm"
        }`}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${
                  theme === "dark" ? "bg-purple-500/10" : "bg-purple-50"
                }`}>
                  <User className={`h-6 w-6 ${
                    theme === "dark" ? "text-purple-400" : "text-purple-600"
                  }`} />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className={`text-2xl font-bold ${
                      theme === "dark" ? "text-slate-100" : "text-slate-900"
                    }`}>{student?.name}</h2>
                    <Badge variant={student?.status === 'active' ? 'default' : 'destructive'} className="px-3 py-1">
                      {student?.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className={`flex items-center gap-2 text-sm mt-1 ${
                    theme === "dark" ? "text-slate-400" : "text-slate-600"
                  }`}>
                    <Mail className="h-4 w-4" />
                    {student?.email}
                  </div>
                  <div className={`flex items-center gap-4 text-xs mt-2 ${
                    theme === "dark" ? "text-slate-500" : "text-slate-500"
                  }`}>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Joined: {student ? new Date(student.joinedAt).toLocaleDateString() : ''}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Last Active: {student ? new Date(student.lastActive).toLocaleDateString() : ''}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStudentAction(student?.status === 'active' ? 'suspend' : 'activate')}
                  disabled={actionLoading}
                  className={`${
                    theme === "dark"
                      ? "border-slate-700 hover:bg-slate-800 text-slate-300"
                      : "border-slate-300 hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  {student?.status === 'active' ? <UserX className="h-4 w-4 mr-1" /> : <UserCheck className="h-4 w-4 mr-1" />}
                  {student?.status === 'active' ? 'Suspend' : 'Activate'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStudentAction('reset-password')}
                  disabled={actionLoading}
                  className={`${
                    theme === "dark"
                      ? "border-slate-700 hover:bg-slate-800 text-slate-300"
                      : "border-slate-300 hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reset Password
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Overall Performance Summary */}
        {performanceSummary && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${
                theme === "dark" ? "text-slate-200" : "text-slate-900"
              }`}>
                Performance Summary
                {timeFilter !== "all" && (
                  <span className={`ml-2 text-sm font-normal ${
                    theme === "dark" ? "text-slate-400" : "text-slate-600"
                  }`}>
                    ({timeFilter === "today" ? "Today" :
                      timeFilter === "week" ? "This Week" :
                      timeFilter === "month" ? "This Month" : "All Time"})
                  </span>
                )}
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className={`transition-colors duration-300 ${
              theme === "dark"
                ? "bg-slate-900 border-slate-700"
                : "bg-white border-slate-200 shadow-sm"
            }`}>
              <CardContent className="pt-6">
                <div className={`text-sm ${
                  theme === "dark" ? "text-slate-400" : "text-slate-600"
                }`}>Total Evaluations</div>
                <div className={`text-2xl font-bold ${
                  theme === "dark" ? "text-slate-100" : "text-slate-900"
                }`}>{performanceSummary.totalEvaluations}</div>
              </CardContent>
            </Card>
            <Card className={`transition-colors duration-300 ${
              theme === "dark"
                ? "bg-slate-900 border-slate-700"
                : "bg-white border-slate-200 shadow-sm"
            }`}>
              <CardContent className="pt-6">
                <div className={`text-sm ${
                  theme === "dark" ? "text-slate-400" : "text-slate-600"
                }`}>Average Score</div>
                <div className={`text-2xl font-bold ${
                  theme === "dark" ? "text-slate-100" : "text-slate-900"
                }`}>{performanceSummary.averageScore.toFixed(1)}%</div>
              </CardContent>
            </Card>
            <Card className={`transition-colors duration-300 ${
              theme === "dark"
                ? "bg-slate-900 border-slate-700"
                : "bg-white border-slate-200 shadow-sm"
            }`}>
              <CardContent className="pt-6">
                <div className={`text-sm ${
                  theme === "dark" ? "text-slate-400" : "text-slate-600"
                }`}>Highest Score</div>
                <div className={`text-2xl font-bold text-green-500`}>
                  {performanceSummary.highestScore}%
                </div>
              </CardContent>
            </Card>
            <Card className={`transition-colors duration-300 ${
              theme === "dark"
                ? "bg-slate-900 border-slate-700"
                : "bg-white border-slate-200 shadow-sm"
            }`}>
              <CardContent className="pt-6">
                <div className={`text-sm ${
                  theme === "dark" ? "text-slate-400" : "text-slate-600"
                }`}>Lowest Score</div>
                <div className={`text-2xl font-bold text-orange-500`}>
                  {performanceSummary.lowestScore}%
                </div>
              </CardContent>
            </Card>
            <Card className={`transition-colors duration-300 ${
              theme === "dark"
                ? "bg-slate-900 border-slate-700"
                : "bg-white border-slate-200 shadow-sm"
            }`}>
              <CardContent className="pt-6">
                <div className={`text-sm flex items-center gap-1 ${
                  theme === "dark" ? "text-slate-400" : "text-slate-600"
                }`}>
                  {performanceSummary.improvementPercentage >= 0 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
                  Improvement
                </div>
                <div className={`text-2xl font-bold ${performanceSummary.improvementPercentage >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {performanceSummary.improvementPercentage > 0 ? '+' : ''}{performanceSummary.improvementPercentage}%
                </div>
              </CardContent>
            </Card>
            </div>
          </div>
        )}

        {/* Time Filter */}
        <div className={`flex flex-wrap items-center gap-3 mb-6 p-3 rounded-xl border ${
          theme === "dark"
            ? "bg-slate-800/30 border-slate-700"
            : "bg-slate-100/50 border-slate-200"
        }`}>
          <span className={`text-sm font-medium ${
            theme === "dark" ? "text-slate-300" : "text-slate-700"
          }`}>Time Period:</span>
          <Badge variant="outline" className={`px-3 py-1 ${
            theme === "dark"
              ? "border-purple-500/50 text-purple-300 bg-purple-500/10"
              : "border-purple-300 text-purple-700 bg-purple-50"
          }`}>
            {timeFilter === "today" && "📅 Today"}
            {timeFilter === "week" && "📊 This Week"}
            {timeFilter === "month" && "📈 This Month"}
            {timeFilter === "all" && "🔄 All Time"}
          </Badge>
          <div className="flex flex-wrap gap-1">
            <Button
              variant={timeFilter === "today" ? "default" : "ghost"}
              onClick={() => setTimeFilter("today")}
              className={`px-3 py-2 text-sm ${
                timeFilter === "today"
                  ? theme === "dark"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "bg-purple-600 text-white shadow-sm"
                  : theme === "dark"
                    ? "text-slate-300 hover:bg-slate-700"
                    : "text-slate-700 hover:bg-slate-200"
              }`}
            >
              <CalendarDays className="h-4 w-4 mr-1" />
              Today
            </Button>
            <Button
              variant={timeFilter === "week" ? "default" : "ghost"}
              onClick={() => setTimeFilter("week")}
              className={`px-3 py-2 text-sm ${
                timeFilter === "week"
                  ? theme === "dark"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "bg-purple-600 text-white shadow-sm"
                  : theme === "dark"
                    ? "text-slate-300 hover:bg-slate-700"
                    : "text-slate-700 hover:bg-slate-200"
              }`}
            >
              <Calendar className="h-4 w-4 mr-1" />
              This Week
            </Button>
            <Button
              variant={timeFilter === "month" ? "default" : "ghost"}
              onClick={() => setTimeFilter("month")}
              className={`px-3 py-2 text-sm ${
                timeFilter === "month"
                  ? theme === "dark"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "bg-purple-600 text-white shadow-sm"
                  : theme === "dark"
                    ? "text-slate-300 hover:bg-slate-700"
                    : "text-slate-700 hover:bg-slate-200"
              }`}
            >
              <CalendarRange className="h-4 w-4 mr-1" />
              This Month
            </Button>
            <Button
              variant={timeFilter === "all" ? "default" : "ghost"}
              onClick={() => setTimeFilter("all")}
              className={`px-3 py-2 text-sm ${
                timeFilter === "all"
                  ? theme === "dark"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "bg-purple-600 text-white shadow-sm"
                  : theme === "dark"
                    ? "text-slate-300 hover:bg-slate-700"
                    : "text-slate-700 hover:bg-slate-200"
              }`}
            >
              <Activity className="h-4 w-4 mr-1" />
              All Time
            </Button>
          </div>
        </div>

        {/* Quick Stats for Selected Period */}
        {(timeFilter !== "all") && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className={`p-4 rounded-xl border ${
              theme === "dark"
                ? "bg-blue-500/10 border-blue-500/20"
                : "bg-blue-50 border-blue-200"
            }`}>
              <div className={`text-2xl font-bold ${
                theme === "dark" ? "text-blue-400" : "text-blue-600"
              }`}>
                {prelimsData?.tests.length || 0}
              </div>
              <div className={`text-sm ${
                theme === "dark" ? "text-blue-300" : "text-blue-700"
              }`}>
                Prelims Tests
              </div>
            </div>
            <div className={`p-4 rounded-xl border ${
              theme === "dark"
                ? "bg-green-500/10 border-green-500/20"
                : "bg-green-50 border-green-200"
            }`}>
              <div className={`text-2xl font-bold ${
                theme === "dark" ? "text-green-400" : "text-green-600"
              }`}>
                {mainsData?.evaluations.length || 0}
              </div>
              <div className={`text-sm ${
                theme === "dark" ? "text-green-300" : "text-green-700"
              }`}>
                Mains Evaluations
              </div>
            </div>
            <div className={`p-4 rounded-xl border ${
              theme === "dark"
                ? "bg-purple-500/10 border-purple-500/20"
                : "bg-purple-50 border-purple-200"
            }`}>
              <div className={`text-2xl font-bold ${
                theme === "dark" ? "text-purple-400" : "text-purple-600"
              }`}>
                {activityData?.totalActivities || 0}
              </div>
              <div className={`text-sm ${
                theme === "dark" ? "text-purple-300" : "text-purple-700"
              }`}>
                Total Activities
              </div>
            </div>
            <div className={`p-4 rounded-xl border ${
              theme === "dark"
                ? "bg-orange-500/10 border-orange-500/20"
                : "bg-orange-50 border-orange-200"
            }`}>
              <div className={`text-2xl font-bold ${
                theme === "dark" ? "text-orange-400" : "text-orange-600"
              }`}>
                {prelimsData?.statistics.averageAccuracy?.toFixed(1) || "0.0"}%
              </div>
              <div className={`text-sm ${
                theme === "dark" ? "text-orange-300" : "text-orange-700"
              }`}>
                Avg Accuracy
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className={`flex gap-2 mb-6 flex-wrap p-1 rounded-xl ${
          theme === "dark" ? "bg-slate-800/50" : "bg-slate-100/50"
        }`}>
          <Button
            variant={activeTab === "overview" ? "default" : "ghost"}
            onClick={() => setActiveTab("overview")}
            className={`${
              activeTab === "overview"
                ? theme === "dark"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "bg-purple-600 text-white shadow-sm"
                : theme === "dark"
                  ? "text-slate-300 hover:bg-slate-700"
                  : "text-slate-700 hover:bg-slate-200"
            }`}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </Button>
          <Button
            variant={activeTab === "prelims" ? "default" : "ghost"}
            onClick={() => setActiveTab("prelims")}
            className={`${
              activeTab === "prelims"
                ? theme === "dark"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "bg-purple-600 text-white shadow-sm"
                : theme === "dark"
                  ? "text-slate-300 hover:bg-slate-700"
                  : "text-slate-700 hover:bg-slate-200"
            }`}
          >
            <FileText className="h-4 w-4 mr-2" />
            Prelims ({prelimsData?.statistics.totalTests || 0})
          </Button>
          <Button
            variant={activeTab === "mains" ? "default" : "ghost"}
            onClick={() => setActiveTab("mains")}
            className={`${
              activeTab === "mains"
                ? theme === "dark"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "bg-purple-600 text-white shadow-sm"
                : theme === "dark"
                  ? "text-slate-300 hover:bg-slate-700"
                  : "text-slate-700 hover:bg-slate-200"
            }`}
          >
            <ClipboardCheck className="h-4 w-4 mr-2" />
            Mains ({mainsData?.statistics.totalEvaluations || 0})
          </Button>
          <Button
            variant={activeTab === "activity" ? "default" : "ghost"}
            onClick={() => setActiveTab("activity")}
            className={`${
              activeTab === "activity"
                ? theme === "dark"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "bg-purple-600 text-white shadow-sm"
                : theme === "dark"
                  ? "text-slate-300 hover:bg-slate-700"
                  : "text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Activity className="h-4 w-4 mr-2" />
            Activity ({activityData?.totalActivities || 0})
          </Button>
          <Button
            variant={activeTab === "analytics" ? "default" : "ghost"}
            onClick={() => setActiveTab("analytics")}
            className={`${
              activeTab === "analytics"
                ? theme === "dark"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "bg-purple-600 text-white shadow-sm"
                : theme === "dark"
                  ? "text-slate-300 hover:bg-slate-700"
                  : "text-slate-700 hover:bg-slate-200"
            }`}
          >
            <PieChart className="h-4 w-4 mr-2" />
            Analytics (DART)
          </Button>
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
                        <Line type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={2} name="Score" />
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
                          <Bar dataKey="averageScore" fill="#8b5cf6" name="Avg Score" />
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className={`transition-colors duration-300 ${
                theme === "dark"
                  ? "bg-slate-900 border-slate-700"
                  : "bg-white border-slate-200 shadow-sm"
              }`}>
                <CardContent className="pt-6">
                  <div className={`text-sm ${
                    theme === "dark" ? "text-slate-400" : "text-slate-600"
                  }`}>Total Tests</div>
                  <div className={`text-2xl font-bold ${
                    theme === "dark" ? "text-slate-100" : "text-slate-900"
                  }`}>{prelimsData?.statistics.totalTests || 0}</div>
                </CardContent>
              </Card>
              <Card className={`transition-colors duration-300 ${
                theme === "dark"
                  ? "bg-slate-900 border-slate-700"
                  : "bg-white border-slate-200 shadow-sm"
              }`}>
                <CardContent className="pt-6">
                  <div className={`text-sm ${
                    theme === "dark" ? "text-slate-400" : "text-slate-600"
                  }`}>Average Score</div>
                  <div className={`text-2xl font-bold ${
                    theme === "dark" ? "text-slate-100" : "text-slate-900"
                  }`}>{prelimsData?.statistics.averageScore.toFixed(1) || "0.0"}</div>
                </CardContent>
              </Card>
              <Card className={`transition-colors duration-300 ${
                theme === "dark"
                  ? "bg-slate-900 border-slate-700"
                  : "bg-white border-slate-200 shadow-sm"
              }`}>
                <CardContent className="pt-6">
                  <div className={`text-sm ${
                    theme === "dark" ? "text-slate-400" : "text-slate-600"
                  }`}>Average Accuracy</div>
                  <div className={`text-2xl font-bold ${
                    theme === "dark" ? "text-slate-100" : "text-slate-900"
                  }`}>{prelimsData?.statistics.averageAccuracy.toFixed(1) || "0.0"}%</div>
                </CardContent>
              </Card>
              <Card className={`transition-colors duration-300 ${
                theme === "dark"
                  ? "bg-slate-900 border-slate-700"
                  : "bg-white border-slate-200 shadow-sm"
              }`}>
                <CardContent className="pt-6">
                  <div className={`text-sm ${
                    theme === "dark" ? "text-slate-400" : "text-slate-600"
                  }`}>Highest Score</div>
                  <div className={`text-2xl font-bold text-green-500`}>
                    {prelimsData?.statistics.highestScore || 0}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Test History */}
            <Card className={`transition-colors duration-300 ${
              theme === "dark"
                ? "bg-slate-900 border-slate-700"
                : "bg-white border-slate-200 shadow-sm"
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
                  <div className="space-y-3">
                    {prelimsData?.tests.map((test) => (
                      <div
                        key={test.id}
                        className={`p-5 rounded-xl border transition-colors duration-200 cursor-pointer ${
                          theme === "dark"
                            ? "bg-slate-800/50 border-slate-700 hover:bg-slate-800/80"
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100/80"
                        }`}
                        onClick={() => navigate(`/result/${test.id}?fromAdmin=1&studentId=${id}`)}
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <h3
                              className={`font-semibold text-lg truncate ${
                                theme === "dark" ? "text-slate-100" : "text-slate-900"
                              }`}
                            >
                              {test.subject} - {test.topic}
                            </h3>
                            <p
                              className={`text-sm mt-1 ${
                                theme === "dark" ? "text-slate-400" : "text-slate-600"
                              }`}
                            >
                              {test.difficulty} • {test.totalQuestions} questions
                            </p>
                            <p
                              className={`text-xs mt-2 ${
                                theme === "dark" ? "text-slate-500" : "text-slate-500"
                              }`}
                            >
                              {new Date(test.attemptedAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right ml-4 flex flex-col items-end gap-2">
                            <div>
                              <div
                                className={`text-xl font-bold ${
                                  theme === "dark" ? "text-slate-100" : "text-slate-900"
                                }`}
                              >
                                Score: {test.score.toFixed(2)}
                              </div>
                              <div
                                className={`text-sm ${
                                  theme === "dark" ? "text-slate-400" : "text-slate-600"
                                }`}
                              >
                                Accuracy: {test.accuracy.toFixed(1)}%
                              </div>
                              <div
                                className={`text-xs mt-1 px-2 py-1 rounded-full inline-block ${
                                  theme === "dark"
                                    ? "bg-slate-700 text-slate-300"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {test.correctAnswers} correct, {test.wrongAnswers} wrong
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className={`mt-1 flex items-center gap-1 ${
                                theme === "dark"
                                  ? "border-slate-600 text-slate-200 hover:bg-slate-800"
                                  : "border-slate-300 text-slate-700 hover:bg-slate-100"
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/result/${test.id}?fromAdmin=1&studentId=${id}`);
                              }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span className="text-xs font-semibold">View Details</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Mains Tab */}
        {activeTab === "mains" && (
          <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className={`transition-colors duration-300 ${
                theme === "dark"
                  ? "bg-slate-900 border-slate-700"
                  : "bg-white border-slate-200 shadow-sm"
              }`}>
                <CardContent className="pt-6">
                  <div className={`text-sm ${
                    theme === "dark" ? "text-slate-400" : "text-slate-600"
                  }`}>Total Evaluations</div>
                  <div className={`text-2xl font-bold ${
                    theme === "dark" ? "text-slate-100" : "text-slate-900"
                  }`}>{mainsData?.statistics.totalEvaluations || 0}</div>
                </CardContent>
              </Card>
              <Card className={`transition-colors duration-300 ${
                theme === "dark"
                  ? "bg-slate-900 border-slate-700"
                  : "bg-white border-slate-200 shadow-sm"
              }`}>
                <CardContent className="pt-6">
                  <div className={`text-sm ${
                    theme === "dark" ? "text-slate-400" : "text-slate-600"
                  }`}>Average Score</div>
                  <div className={`text-2xl font-bold ${
                    theme === "dark" ? "text-slate-100" : "text-slate-900"
                  }`}>{mainsData?.statistics.averageScore.toFixed(1) || "0.0"}%</div>
                </CardContent>
              </Card>
              <Card className={`transition-colors duration-300 ${
                theme === "dark"
                  ? "bg-slate-900 border-slate-700"
                  : "bg-white border-slate-200 shadow-sm"
              }`}>
                <CardContent className="pt-6">
                  <div className={`text-sm ${
                    theme === "dark" ? "text-slate-400" : "text-slate-600"
                  }`}>Highest Score</div>
                  <div className={`text-2xl font-bold text-green-500`}>
                    {mainsData?.statistics.highestScore.toFixed(1) || "0.0"}%
                  </div>
                </CardContent>
              </Card>
              <Card className={`transition-colors duration-300 ${
                theme === "dark"
                  ? "bg-slate-900 border-slate-700"
                  : "bg-white border-slate-200 shadow-sm"
              }`}>
                <CardContent className="pt-6">
                  <div className={`text-sm ${
                    theme === "dark" ? "text-slate-400" : "text-slate-600"
                  }`}>Lowest Score</div>
                  <div className={`text-2xl font-bold text-orange-500`}>
                    {mainsData?.statistics.lowestScore.toFixed(1) || "0.0"}%
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Evaluation History Table */}
            <Card className={`transition-colors duration-300 ${
              theme === "dark"
                ? "bg-slate-900 border-slate-700"
                : "bg-white border-slate-200 shadow-sm"
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
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className={`border-b ${
                          theme === "dark" ? "border-slate-700" : "border-slate-200"
                        }`}>
                          <th className={`text-left p-4 font-medium ${
                            theme === "dark" ? "text-slate-400" : "text-slate-600"
                          }`}>Date</th>
                          <th className={`text-left p-4 font-medium ${
                            theme === "dark" ? "text-slate-400" : "text-slate-600"
                          }`}>Subject</th>
                          <th className={`text-left p-4 font-medium ${
                            theme === "dark" ? "text-slate-400" : "text-slate-600"
                          }`}>Score</th>
                          <th className={`text-left p-4 font-medium ${
                            theme === "dark" ? "text-slate-400" : "text-slate-600"
                          }`}>Word Count</th>
                          <th className={`text-left p-4 font-medium ${
                            theme === "dark" ? "text-slate-400" : "text-slate-600"
                          }`}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mainsData?.evaluations.map((evaluation) => (
                          <tr key={evaluation.id} className={`border-b transition-colors ${
                            theme === "dark"
                              ? "border-slate-800 hover:bg-slate-800/50"
                              : "border-slate-100 hover:bg-slate-50/50"
                          }`}>
                            <td className={`p-4 ${
                              theme === "dark" ? "text-slate-300" : "text-slate-700"
                            }`}>{new Date(evaluation.evaluatedAt).toLocaleDateString()}</td>
                            <td className={`p-4 font-medium ${
                              theme === "dark" ? "text-slate-200" : "text-slate-800"
                            }`}>{evaluation.subject}</td>
                            <td className="p-4">
                              {evaluation.overallScore ? (
                                <span className={`font-semibold px-2 py-1 rounded-full ${
                                  evaluation.overallScore.percentage >= 70
                                    ? theme === "dark" ? "bg-green-500/10 text-green-400" : "bg-green-50 text-green-700"
                                    : evaluation.overallScore.percentage >= 50
                                      ? theme === "dark" ? "bg-yellow-500/10 text-yellow-400" : "bg-yellow-50 text-yellow-700"
                                      : theme === "dark" ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-700"
                                }`}>
                                  {evaluation.overallScore.percentage.toFixed(1)}%
                                </span>
                              ) : (
                                <span className={`${
                                  theme === "dark" ? "text-slate-500" : "text-slate-400"
                                }`}>No score</span>
                              )}
                            </td>
                            <td className={`p-4 ${
                              theme === "dark" ? "text-slate-300" : "text-slate-700"
                            }`}>{evaluation.wordCount || 0}</td>
                            <td className="p-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => viewEvaluationDetails(evaluation.id)}
                                className={`${
                                  theme === "dark"
                                    ? "border-slate-700 hover:bg-slate-800 text-slate-300"
                                    : "border-slate-300 hover:bg-slate-100 text-slate-700"
                                }`}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View Answer
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
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
                        className={`text-sm font-medium px-3 py-2 rounded-lg ${theme === "dark" ? "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30" : "bg-purple-100 text-purple-700 hover:bg-purple-200"}`}
                      >
                        {dartReportDownloading ? "Generating..." : "Download 20-Day Report"}
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
                              stroke="#8b5cf6"
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
                            <Bar dataKey="actual" fill="#8b5cf6" name="Actual (hrs)" radius={[4, 4, 0, 0]} />
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
                          theme === "dark" ? "text-fuchsia-400" : "text-fuchsia-600"
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
                  {activityData?.activities.map((activity, index) => (
                    <div key={activity.id} className="flex gap-6">
                      <div className="flex flex-col items-center">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                          activity.type === 'mains_evaluation'
                            ? theme === "dark" ? 'bg-green-500' : 'bg-green-600'
                            : theme === "dark" ? 'bg-purple-500' : 'bg-purple-600'
                        }`}>
                          <div className={`w-2 h-2 rounded-full bg-white`} />
                        </div>
                        {index < (activityData?.activities.length || 0) - 1 && (
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
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Evaluation Details Modal */}
        <Dialog open={showEvaluationModal} onOpenChange={setShowEvaluationModal}>
          <DialogContent className={`max-w-4xl max-h-[80vh] overflow-y-auto transition-colors duration-300 ${
            theme === "dark"
              ? "bg-slate-900 border-slate-700"
              : "bg-white border-slate-300"
          }`}>
            <DialogHeader>
              <DialogTitle className={`${
                theme === "dark" ? "text-slate-100" : "text-slate-900"
              }`}>Evaluation Details</DialogTitle>
            </DialogHeader>
            {selectedEvaluation && (
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
                      {selectedEvaluation.evaluations.map((question, index) => (
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
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
