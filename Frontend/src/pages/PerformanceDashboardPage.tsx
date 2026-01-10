import { useEffect, useState } from "react";
import { api } from "../services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Area,
  AreaChart,
  CartesianGrid,
  Legend
} from "recharts";
import { useTheme } from "../hooks/useTheme";
import {
  TrendingUp,
  TrendingDown,
  Award,
  Target,
  Activity,
  BookOpen,
  Clock,
  Zap,
  Users,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  FileText,
  ClipboardList,
  Lightbulb,
  CheckCircle,
  AlertTriangle
} from "lucide-react";

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

const GRADIENT_COLORS = {
  dark: {
    primary: "rgba(139, 92, 246, 0.3)",
    secondary: "rgba(6, 182, 212, 0.3)",
    success: "rgba(20, 184, 166, 0.3)"
  },
  light: {
    primary: "rgba(139, 92, 246, 0.1)",
    secondary: "rgba(6, 182, 212, 0.1)",
    success: "rgba(20, 184, 166, 0.1)"
  }
};

export const PerformanceDashboardPage = () => {
  const { theme } = useTheme();
  const [copyPerformanceData, setCopyPerformanceData] = useState<any | null>(null);
  const [prelimsPerformanceData, setPrelimsPerformanceData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'all' | 'month' | 'week'>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'copy-evaluation' | 'prelims'>('overview');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [copyRes, prelimsRes] = await Promise.all([
          api.get("/api/performance"),
          api.get("/api/tests/prelims-performance")
        ]);
        setCopyPerformanceData(copyRes.data);
        setPrelimsPerformanceData(prelimsRes.data.data);
      } catch {
        // Handle errors gracefully
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Filter data based on timeframe
  const getFilteredHistory = (data: any) => {
    if (!data?.history) return [];
    const now = new Date();
    const filterDate = selectedTimeframe === 'week'
      ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      : selectedTimeframe === 'month'
      ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      : null;

    return filterDate
      ? data.history.filter((item: any) => new Date(item.createdAt) >= filterDate)
      : data.history;
  };

  const copyFilteredHistory = getFilteredHistory(copyPerformanceData);
  const prelimsFilteredHistory = getFilteredHistory(prelimsPerformanceData);

  const getReadinessColor = (readiness: number) => {
    if (readiness >= 80) return "text-green-600";
    if (readiness >= 60) return "text-blue-600";
    if (readiness >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getReadinessBg = (readiness: number) => {
    if (readiness >= 80) return theme === "dark" ? "bg-green-900/20" : "bg-green-50";
    if (readiness >= 60) return theme === "dark" ? "bg-blue-900/20" : "bg-blue-50";
    if (readiness >= 40) return theme === "dark" ? "bg-orange-900/20" : "bg-orange-50";
    return theme === "dark" ? "bg-red-900/20" : "bg-red-50";
  };

  // Combine performance data for overview
  const getCombinedMetrics = () => {
    const copyAvg = copyPerformanceData?.averageScore || 0;
    const prelimsAvg = prelimsPerformanceData?.averageScore || 0;
    const copyCount = copyPerformanceData?.totalEvaluations || 0;
    const prelimsCount = prelimsPerformanceData?.totalTests || 0;

    return {
      overallAverage: copyCount + prelimsCount > 0
        ? Math.round(((copyAvg * copyCount) + (prelimsAvg * prelimsCount)) / (copyCount + prelimsCount))
        : 0,
      totalActivities: copyCount + prelimsCount,
      copyEvaluations: copyCount,
      prelimsTests: prelimsCount,
      combinedTrend: (copyPerformanceData?.improvementTrend || 0) + (prelimsPerformanceData?.improvementTrend || 0)
    };
  };

  const combinedMetrics = getCombinedMetrics();

  const renderOverviewTab = () => (
    <>
      {/* Combined Performance Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <Card className="relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-500/20 to-transparent rounded-full blur-2xl group-hover:blur-3xl transition-all" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs md:text-sm font-medium">Overall Average</CardTitle>
              <Target className={`w-4 h-4 ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl md:text-3xl font-bold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
              {loading ? "..." : combinedMetrics.overallAverage}%
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-cyan-500/20 to-transparent rounded-full blur-2xl group-hover:blur-3xl transition-all" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs md:text-sm font-medium">Total Activities</CardTitle>
              <Activity className={`w-4 h-4 ${theme === "dark" ? "text-cyan-400" : "text-cyan-600"}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl md:text-3xl font-bold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
              {loading ? "..." : combinedMetrics.totalActivities}
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-teal-500/20 to-transparent rounded-full blur-2xl group-hover:blur-3xl transition-all" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs md:text-sm font-medium">Copy Evaluations</CardTitle>
              <FileText className={`w-4 h-4 ${theme === "dark" ? "text-teal-400" : "text-teal-600"}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl md:text-3xl font-bold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
              {loading ? "..." : combinedMetrics.copyEvaluations}
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-500/20 to-transparent rounded-full blur-2xl group-hover:blur-3xl transition-all" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs md:text-sm font-medium">Prelims Tests</CardTitle>
              <ClipboardList className={`w-4 h-4 ${theme === "dark" ? "text-amber-400" : "text-amber-600"}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl md:text-3xl font-bold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
              {loading ? "..." : combinedMetrics.prelimsTests}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Type Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg font-semibold">Activity Distribution</CardTitle>
            <CardDescription>Copy evaluations vs Prelims tests</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Copy Evaluations', value: combinedMetrics.copyEvaluations, color: '#8b5cf6' },
                    { name: 'Prelims Tests', value: combinedMetrics.prelimsTests, color: '#06b6d4' }
                  ]}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  <Cell fill="#8b5cf6" />
                  <Cell fill="#06b6d4" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg font-semibold">Performance Overview</CardTitle>
            <CardDescription>Average scores across activities</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={[
                  { name: 'Copy Evaluations', score: copyPerformanceData?.averageScore || 0 },
                  { name: 'Prelims Tests', score: prelimsPerformanceData?.averageScore || 0 }
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value) => [`${value}%`, "Average Score"]} />
                <Bar dataKey="score" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg font-semibold">Quick Actions</CardTitle>
          <CardDescription>Access detailed performance analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setActiveTab('copy-evaluation')}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                theme === "dark"
                  ? "border-purple-700/50 bg-purple-900/20 hover:border-purple-600"
                  : "border-purple-200 bg-purple-50 hover:border-purple-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <FileText className={`w-6 h-6 ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`} />
                <div>
                  <h3 className="font-semibold">Copy Evaluation Performance</h3>
                  <p className="text-sm opacity-75">Detailed mains-style answer analysis</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('prelims')}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                theme === "dark"
                  ? "border-cyan-700/50 bg-cyan-900/20 hover:border-cyan-600"
                  : "border-cyan-200 bg-cyan-50 hover:border-cyan-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <ClipboardList className={`w-6 h-6 ${theme === "dark" ? "text-cyan-400" : "text-cyan-600"}`} />
                <div>
                  <h3 className="font-semibold">Prelims Test Performance</h3>
                  <p className="text-sm opacity-75">MCQ-based test analysis & readiness</p>
                </div>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>
    </>
  );

  const renderCopyEvaluationTab = () => (
    <>
      {/* Copy Evaluation Performance Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <Card className="relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-500/20 to-transparent rounded-full blur-2xl group-hover:blur-3xl transition-all" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs md:text-sm font-medium">Average Score</CardTitle>
              <Target className={`w-4 h-4 ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl md:text-3xl font-bold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
              {loading ? "..." : (copyPerformanceData?.averageScore || 0)}%
            </div>
            <div className="flex items-center gap-1 mt-1">
              {copyPerformanceData?.improvementTrend && copyPerformanceData.improvementTrend !== 0 && (
                <>
                  {copyPerformanceData.improvementTrend > 0 ? (
                    <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 text-red-400" />
                  )}
                  <span className={`text-xs ${copyPerformanceData.improvementTrend > 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {Math.abs(copyPerformanceData.improvementTrend)}%
                  </span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-cyan-500/20 to-transparent rounded-full blur-2xl group-hover:blur-3xl transition-all" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs md:text-sm font-medium">Highest Score</CardTitle>
              <Award className={`w-4 h-4 ${theme === "dark" ? "text-cyan-400" : "text-cyan-600"}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl md:text-3xl font-bold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
              {loading ? "..." : (copyPerformanceData?.highestScore || 0)}%
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-teal-500/20 to-transparent rounded-full blur-2xl group-hover:blur-3xl transition-all" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs md:text-sm font-medium">Total Evaluations</CardTitle>
              <BookOpen className={`w-4 h-4 ${theme === "dark" ? "text-teal-400" : "text-teal-600"}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl md:text-3xl font-bold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
              {loading ? "..." : (copyPerformanceData?.totalEvaluations || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-500/20 to-transparent rounded-full blur-2xl group-hover:blur-3xl transition-all" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs md:text-sm font-medium">Consistency</CardTitle>
              <Activity className={`w-4 h-4 ${theme === "dark" ? "text-amber-400" : "text-amber-600"}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl md:text-3xl font-bold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
              {loading ? "..." : (copyPerformanceData?.consistency || 0)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Copy Evaluation Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-3xl" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base md:text-lg font-semibold">Copy Evaluation Trend</CardTitle>
                <CardDescription className="text-xs md:text-sm">Your mains answer performance over time</CardDescription>
              </div>
              <TrendingUp className={`w-5 h-5 ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`} />
            </div>
          </CardHeader>
          <CardContent className="h-64 md:h-80">
            {loading ? (
              <div className={`h-full flex items-center justify-center ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                Loading...
              </div>
            ) : copyFilteredHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={copyFilteredHistory} margin={{ left: -10, right: 10, top: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorCopyScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#334155" : "#e2e8f0"} />
                  <XAxis
                    dataKey="createdAt"
                    tickFormatter={(value) => new Date(value).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                    tick={{ fontSize: 10, fill: theme === "dark" ? "#94a3b8" : "#64748b" }}
                    stroke={theme === "dark" ? "#475569" : "#cbd5e1"}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: theme === "dark" ? "#94a3b8" : "#64748b" }}
                    domain={[0, 100]}
                    stroke={theme === "dark" ? "#475569" : "#cbd5e1"}
                    width={35}
                  />
                  <Tooltip
                    formatter={(value: any) => [`${value}%`, "Score"]}
                    labelFormatter={(value) => new Date(value).toLocaleString("en-IN")}
                    contentStyle={{
                      backgroundColor: theme === "dark" ? "#0f172a" : "#ffffff",
                      border: theme === "dark" ? "1px solid #334155" : "1px solid #e2e8f0",
                      borderRadius: "8px",
                      color: theme === "dark" ? "#f1f5f9" : "#0f172a"
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fill="url(#colorCopyScore)"
                    dot={{ fill: "#8b5cf6", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className={`h-full flex flex-col items-center justify-center ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                <BarChart3 className="w-12 h-12 mb-2 opacity-50" />
                <p className="text-sm">No copy evaluation data available yet</p>
                <p className="text-xs mt-1">Submit copy evaluations to see your progress</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-full blur-3xl" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base md:text-lg font-semibold">Subject Performance</CardTitle>
                <CardDescription className="text-xs md:text-sm">Performance across different subjects</CardDescription>
              </div>
              <BookOpen className={`w-5 h-5 ${theme === "dark" ? "text-cyan-400" : "text-cyan-600"}`} />
            </div>
          </CardHeader>
          <CardContent className="h-64 md:h-80">
            {loading ? (
              <div className={`h-full flex items-center justify-center ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                Loading...
              </div>
            ) : copyPerformanceData?.subjectBreakdown && copyPerformanceData.subjectBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={copyPerformanceData.subjectBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="subject" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value: any) => [`${value}%`, "Average Score"]} />
                  <Bar dataKey="average" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className={`h-full flex flex-col items-center justify-center ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                <BookOpen className="w-12 h-12 mb-2 opacity-50" />
                <p className="text-sm">No subject data available</p>
                <p className="text-xs mt-1">Submit evaluations to see subject breakdown</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );

  const renderPrelimsTab = () => (
    <>
      {/* Pre-lims Readiness Overview */}
      {prelimsPerformanceData?.preLimsReadiness && (
        <Card className={`relative overflow-hidden border-2 mb-6 ${getReadinessBg(prelimsPerformanceData.preLimsReadiness.overallReadiness)}`}>
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-3xl" />
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                  <Target className={`w-6 h-6 ${getReadinessColor(prelimsPerformanceData.preLimsReadiness.overallReadiness)}`} />
                  Prelims Readiness Assessment
                </CardTitle>
                <CardDescription>AI-powered analysis of your pre-lims preparation</CardDescription>
              </div>
              <div className={`text-4xl font-bold ${getReadinessColor(prelimsPerformanceData.preLimsReadiness.overallReadiness)}`}>
                {prelimsPerformanceData.preLimsReadiness.overallReadiness}%
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-semibold text-green-600 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Strengths
                </h4>
                <div className="space-y-2">
                  {prelimsPerformanceData.preLimsReadiness.strengths.length > 0 ? (
                    prelimsPerformanceData.preLimsReadiness.strengths.map((strength: string, idx: number) => (
                      <div key={idx} className={`p-2 rounded-lg ${theme === "dark" ? "bg-green-900/20" : "bg-green-50"}`}>
                        <span className="text-sm text-green-700 dark:text-green-300">{strength}</span>
                      </div>
                    ))
                  ) : (
                    <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                      Build more strengths through practice
                    </p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-orange-600 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Areas for Improvement
                </h4>
                <div className="space-y-2">
                  {prelimsPerformanceData.preLimsReadiness.areasForImprovement.map((area: string, idx: number) => (
                    <div key={idx} className={`p-2 rounded-lg ${theme === "dark" ? "bg-orange-900/20" : "bg-orange-50"}`}>
                      <span className="text-sm text-orange-700 dark:text-orange-300">{area}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-blue-600 mb-3 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Recommended Focus
                </h4>
                <div className="space-y-2">
                  {prelimsPerformanceData.preLimsReadiness.recommendedFocus.map((focus: string, idx: number) => (
                    <div key={idx} className={`p-2 rounded-lg ${theme === "dark" ? "bg-blue-900/20" : "bg-blue-50"}`}>
                      <span className="text-sm text-blue-700 dark:text-blue-300">{focus}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pre-lims Performance Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <Card className="relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-500/20 to-transparent rounded-full blur-2xl group-hover:blur-3xl transition-all" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs md:text-sm font-medium">Average Score</CardTitle>
              <Target className={`w-4 h-4 ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl md:text-3xl font-bold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
              {loading ? "..." : (prelimsPerformanceData?.averageScore || 0)}%
            </div>
            <div className="flex items-center gap-1 mt-1">
              {prelimsPerformanceData?.improvementTrend && prelimsPerformanceData.improvementTrend !== 0 && (
                <>
                  {prelimsPerformanceData.improvementTrend > 0 ? (
                    <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 text-red-400" />
                  )}
                  <span className={`text-xs ${prelimsPerformanceData.improvementTrend > 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {Math.abs(prelimsPerformanceData.improvementTrend)}%
                  </span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-cyan-500/20 to-transparent rounded-full blur-2xl group-hover:blur-3xl transition-all" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs md:text-sm font-medium">Highest Score</CardTitle>
              <Award className={`w-4 h-4 ${theme === "dark" ? "text-cyan-400" : "text-cyan-600"}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl md:text-3xl font-bold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
              {loading ? "..." : (prelimsPerformanceData?.highestScore || 0)}%
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-teal-500/20 to-transparent rounded-full blur-2xl group-hover:blur-3xl transition-all" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs md:text-sm font-medium">Total Tests</CardTitle>
              <BookOpen className={`w-4 h-4 ${theme === "dark" ? "text-teal-400" : "text-teal-600"}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl md:text-3xl font-bold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
              {loading ? "..." : (prelimsPerformanceData?.totalTests || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-500/20 to-transparent rounded-full blur-2xl group-hover:blur-3xl transition-all" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs md:text-sm font-medium">Consistency</CardTitle>
              <Activity className={`w-4 h-4 ${theme === "dark" ? "text-amber-400" : "text-amber-600"}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl md:text-3xl font-bold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
              {loading ? "..." : (prelimsPerformanceData?.consistency || 0)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pre-lims Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-3xl" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base md:text-lg font-semibold">Pre-lims Performance Trend</CardTitle>
                <CardDescription className="text-xs md:text-sm">Your test score progression over time</CardDescription>
              </div>
              <TrendingUp className={`w-5 h-5 ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`} />
            </div>
          </CardHeader>
          <CardContent className="h-64 md:h-80">
            {loading ? (
              <div className={`h-full flex items-center justify-center ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                Loading...
              </div>
            ) : prelimsFilteredHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={prelimsFilteredHistory} margin={{ left: -10, right: 10, top: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorPrelimsScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#334155" : "#e2e8f0"} />
                  <XAxis
                    dataKey="createdAt"
                    tickFormatter={(value) => new Date(value).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                    tick={{ fontSize: 10, fill: theme === "dark" ? "#94a3b8" : "#64748b" }}
                    stroke={theme === "dark" ? "#475569" : "#cbd5e1"}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: theme === "dark" ? "#94a3b8" : "#64748b" }}
                    domain={[0, 100]}
                    stroke={theme === "dark" ? "#475569" : "#cbd5e1"}
                    width={35}
                  />
                  <Tooltip
                    formatter={(value: any) => [`${value}%`, "Score"]}
                    labelFormatter={(value) => new Date(value).toLocaleString("en-IN")}
                    contentStyle={{
                      backgroundColor: theme === "dark" ? "#0f172a" : "#ffffff",
                      border: theme === "dark" ? "1px solid #334155" : "1px solid #e2e8f0",
                      borderRadius: "8px",
                      color: theme === "dark" ? "#f1f5f9" : "#0f172a"
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fill="url(#colorPrelimsScore)"
                    dot={{ fill: "#8b5cf6", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className={`h-full flex flex-col items-center justify-center ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                <BarChart3 className="w-12 h-12 mb-2 opacity-50" />
                <p className="text-sm">No test data available yet</p>
                <p className="text-xs mt-1">Take your first pre-lims test to see your progress</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-full blur-3xl" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base md:text-lg font-semibold">Subject-wise Performance</CardTitle>
                <CardDescription className="text-xs md:text-sm">Performance across different subjects</CardDescription>
              </div>
              <BookOpen className={`w-5 h-5 ${theme === "dark" ? "text-cyan-400" : "text-cyan-600"}`} />
            </div>
          </CardHeader>
          <CardContent className="h-64 md:h-80">
            {loading ? (
              <div className={`h-full flex items-center justify-center ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                Loading...
              </div>
            ) : prelimsPerformanceData?.subjectBreakdown && prelimsPerformanceData.subjectBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={prelimsPerformanceData.subjectBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="subject" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value: any) => [`${value}%`, "Average Score"]} />
                  <Bar dataKey="average" fill="#06b6d4" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className={`h-full flex flex-col items-center justify-center ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                <BookOpen className="w-12 h-12 mb-2 opacity-50" />
                <p className="text-sm">No subject data available</p>
                <p className="text-xs mt-1">Take tests in different subjects to see breakdown</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-2 md:gap-3">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className={`text-2xl md:text-3xl font-bold tracking-tight ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
              Performance Dashboard
            </h1>
            <p className={`text-sm md:text-base mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
              Comprehensive analysis of your UPSC preparation performance
            </p>
          </div>
          {combinedMetrics.totalActivities > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedTimeframe('week')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedTimeframe === 'week'
                    ? theme === "dark"
                      ? "bg-purple-500/20 text-purple-200 border border-purple-500/50"
                      : "bg-purple-100 text-purple-700 border border-purple-300"
                    : theme === "dark"
                    ? "bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700"
                    : "bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200"
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setSelectedTimeframe('month')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedTimeframe === 'month'
                    ? theme === "dark"
                      ? "bg-purple-500/20 text-purple-200 border border-purple-500/50"
                      : "bg-purple-100 text-purple-700 border border-purple-300"
                    : theme === "dark"
                    ? "bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700"
                    : "bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200"
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setSelectedTimeframe('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedTimeframe === 'all'
                    ? theme === "dark"
                      ? "bg-purple-500/20 text-purple-200 border border-purple-500/50"
                      : "bg-purple-100 text-purple-700 border border-purple-300"
                    : theme === "dark"
                    ? "bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700"
                    : "bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200"
                }`}
              >
                All Time
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-purple-500 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('copy-evaluation')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'copy-evaluation'
              ? 'border-purple-500 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Copy Evaluation
        </button>
        <button
          onClick={() => setActiveTab('prelims')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'prelims'
              ? 'border-purple-500 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Prelims
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'copy-evaluation' && renderCopyEvaluationTab()}
        {activeTab === 'prelims' && renderPrelimsTab()}
      </div>
    </div>
  );
};
