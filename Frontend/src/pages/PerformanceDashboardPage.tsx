import { useEffect, useState } from "react";
import { api, dartAPI } from "../services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { AnimatePresence, motion } from "framer-motion";
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
import { useAuth } from "../hooks/useAuth";
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
  AlertTriangle,
  Sunrise,
  Smile
} from "lucide-react";
import { DartReportCard } from "../components/dart/DartReportCard";

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

const GRADIENT_COLORS = {
  dark: {
    primary: "rgba(37, 99, 235, 0.3)",
    secondary: "rgba(6, 182, 212, 0.3)",
    success: "rgba(20, 184, 166, 0.3)"
  },
  light: {
    primary: "rgba(37, 99, 235, 0.1)",
    secondary: "rgba(6, 182, 212, 0.1)",
    success: "rgba(20, 184, 166, 0.1)"
  }
};

// DART analytics type
interface DartAnalytics {
  enrollmentName?: string | null;
  performanceScore?: number;
  performanceScoreLevel?: string;
  consistencyIndex?: number;
  // Report download meta
  firstDartDate?: string | null;
  daysSinceFirstDart?: number;
  daysUntil15DayReport?: number;
  canDownload7DayReport?: boolean;
  canDownload15DayReport?: boolean;
  canDownload30DayReport?: boolean;
  entriesCount?: number;
  entriesCountLast7?: number;
  entriesCountLast15?: number;
  entriesCountLast30?: number;
  dailyTimeDistribution?: { name: string; value: number; color: string }[];
  sevenDayStudyTrend?: { day: string; studyHours: number; targetHours: number }[];
  targetVsActual?: { date: string; target: number; actual: number }[];
  subjectFrequency?: { name: string; count: number }[];
  wakeUpConsistency?: { date: string; wakeUpTime: string; before6: boolean }[];
  answerWritingWeeklyCount?: number;
  emotionalStatusPie?: { name: string; value: number }[];
  todaySummary?: any;
}

export const PerformanceDashboardPage = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [copyPerformanceData, setCopyPerformanceData] = useState<any | null>(null);
  const [prelimsPerformanceData, setPrelimsPerformanceData] = useState<any | null>(null);
  const [dartAnalytics, setDartAnalytics] = useState<DartAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'all' | 'month' | 'week'>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'copy-evaluation' | 'prelims'>('overview');
  useEffect(() => {
    const loadData = async () => {
      try {
        const [copyRes, prelimsRes, dartRes] = await Promise.all([
          api.get("/api/performance"),
          api.get("/api/tests/prelims-performance"),
          dartAPI.getAnalytics({ days: 30 }).catch(() => ({ data: { success: false } }))
        ]);
        setCopyPerformanceData(copyRes.data);
        setPrelimsPerformanceData(prelimsRes.data.data);
        if (dartRes?.data?.success && dartRes.data.data) setDartAnalytics(dartRes.data.data);
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
        <Card className={`relative overflow-hidden group transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${
          theme === "dark" 
            ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-blue-500/20 shadow-lg shadow-blue-500/10" 
            : "bg-gradient-to-br from-white to-blue-50/30 border-blue-200/50 shadow-lg shadow-blue-100/50"
        } border-2`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/30 via-blue-400/20 to-transparent rounded-full blur-3xl group-hover:blur-[40px] transition-all duration-500" />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="pb-3 relative z-10">
            <div className="flex items-center justify-between">
              <CardTitle className={`text-xs md:text-sm font-semibold ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Overall Average
              </CardTitle>
              <div className={`p-2 rounded-lg ${
                theme === "dark" ? "bg-blue-500/20" : "bg-blue-100"
              }`}>
                <Target className={`w-4 h-4 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${
              theme === "dark" 
                ? "from-blue-300 to-blue-500 bg-clip-text text-transparent" 
                : "from-blue-600 to-blue-800 bg-clip-text text-transparent"
            }`}>
              {loading ? "..." : `${combinedMetrics.overallAverage}%`}
            </div>
            <div className={`mt-2 text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
              Combined performance
            </div>
          </CardContent>
        </Card>

        <Card className={`relative overflow-hidden group transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${
          theme === "dark" 
            ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-cyan-500/20 shadow-lg shadow-cyan-500/10" 
            : "bg-gradient-to-br from-white to-cyan-50/30 border-cyan-200/50 shadow-lg shadow-cyan-100/50"
        } border-2`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/30 via-cyan-400/20 to-transparent rounded-full blur-3xl group-hover:blur-[40px] transition-all duration-500" />
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="pb-3 relative z-10">
            <div className="flex items-center justify-between">
              <CardTitle className={`text-xs md:text-sm font-semibold ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Total Activities
              </CardTitle>
              <div className={`p-2 rounded-lg ${
                theme === "dark" ? "bg-cyan-500/20" : "bg-cyan-100"
              }`}>
                <Activity className={`w-4 h-4 ${theme === "dark" ? "text-cyan-400" : "text-cyan-600"}`} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${
              theme === "dark" 
                ? "from-cyan-300 to-cyan-500 bg-clip-text text-transparent" 
                : "from-cyan-600 to-cyan-800 bg-clip-text text-transparent"
            }`}>
              {loading ? "..." : combinedMetrics.totalActivities}
            </div>
            <div className={`mt-2 text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
              All activities
            </div>
          </CardContent>
        </Card>

        <Card className={`relative overflow-hidden group transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${
          theme === "dark" 
            ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-teal-500/20 shadow-lg shadow-teal-500/10" 
            : "bg-gradient-to-br from-white to-teal-50/30 border-teal-200/50 shadow-lg shadow-teal-100/50"
        } border-2`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-teal-500/30 via-teal-400/20 to-transparent rounded-full blur-3xl group-hover:blur-[40px] transition-all duration-500" />
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="pb-3 relative z-10">
            <div className="flex items-center justify-between">
              <CardTitle className={`text-xs md:text-sm font-semibold ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Copy Evaluations
              </CardTitle>
              <div className={`p-2 rounded-lg ${
                theme === "dark" ? "bg-teal-500/20" : "bg-teal-100"
              }`}>
                <FileText className={`w-4 h-4 ${theme === "dark" ? "text-teal-400" : "text-teal-600"}`} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${
              theme === "dark" 
                ? "from-teal-300 to-teal-500 bg-clip-text text-transparent" 
                : "from-teal-600 to-teal-800 bg-clip-text text-transparent"
            }`}>
              {loading ? "..." : combinedMetrics.copyEvaluations}
            </div>
            <div className={`mt-2 text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
              Mains answers
            </div>
          </CardContent>
        </Card>

        <Card className={`relative overflow-hidden group transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${
          theme === "dark" 
            ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-amber-500/20 shadow-lg shadow-amber-500/10" 
            : "bg-gradient-to-br from-white to-amber-50/30 border-amber-200/50 shadow-lg shadow-amber-100/50"
        } border-2`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/30 via-amber-400/20 to-transparent rounded-full blur-3xl group-hover:blur-[40px] transition-all duration-500" />
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="pb-3 relative z-10">
            <div className="flex items-center justify-between">
              <CardTitle className={`text-xs md:text-sm font-semibold ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Prelims Tests
              </CardTitle>
              <div className={`p-2 rounded-lg ${
                theme === "dark" ? "bg-amber-500/20" : "bg-amber-100"
              }`}>
                <ClipboardList className={`w-4 h-4 ${theme === "dark" ? "text-amber-400" : "text-amber-600"}`} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${
              theme === "dark" 
                ? "from-amber-300 to-amber-500 bg-clip-text text-transparent" 
                : "from-amber-600 to-amber-800 bg-clip-text text-transparent"
            }`}>
              {loading ? "..." : combinedMetrics.prelimsTests}
            </div>
            <div className={`mt-2 text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
              MCQ tests
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Type Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className={`relative overflow-hidden border-2 transition-all duration-300 hover:shadow-xl ${
          theme === "dark" 
            ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-blue-500/20 shadow-lg" 
            : "bg-gradient-to-br from-white to-blue-50/20 border-blue-200/50 shadow-lg"
        }`}>
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-3xl" />
          <CardHeader className="relative z-10 pb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                theme === "dark" ? "bg-blue-500/20" : "bg-blue-100"
              }`}>
                <BarChart3 className={`w-5 h-5 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`} />
              </div>
              <div>
                <CardTitle className={`text-lg md:text-xl font-bold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
                  Activity Distribution
                </CardTitle>
                <CardDescription className="mt-1">Copy evaluations vs Prelims tests</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            {combinedMetrics.totalActivities > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Copy Evaluations', value: combinedMetrics.copyEvaluations, color: '#2563eb' },
                      { name: 'Prelims Tests', value: combinedMetrics.prelimsTests, color: '#06b6d4' }
                    ]}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={40}
                    paddingAngle={5}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    <Cell fill="url(#colorPurple)" />
                    <Cell fill="url(#colorCyan)" />
                  </Pie>
                  <defs>
                    <linearGradient id="colorPurple" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.8}/>
                    </linearGradient>
                    <linearGradient id="colorCyan" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#0891b2" stopOpacity={0.8}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: theme === "dark" ? "#0f172a" : "#ffffff",
                      border: theme === "dark" ? "1px solid #334155" : "1px solid #e2e8f0",
                      borderRadius: "12px",
                      padding: "12px",
                      boxShadow: theme === "dark" ? "0 10px 25px rgba(0,0,0,0.5)" : "0 10px 25px rgba(0,0,0,0.1)"
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className={`h-[250px] flex flex-col items-center justify-center ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                <div className={`p-4 rounded-full mb-4 ${
                  theme === "dark" ? "bg-slate-800" : "bg-slate-100"
                }`}>
                  <BarChart3 className="w-12 h-12 opacity-50" />
                </div>
                <p className="text-sm font-medium">No activity data yet</p>
                <p className="text-xs mt-1 opacity-75">Start practicing to see distribution</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={`relative overflow-hidden border-2 transition-all duration-300 hover:shadow-xl ${
          theme === "dark" 
            ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-cyan-500/20 shadow-lg" 
            : "bg-gradient-to-br from-white to-cyan-50/20 border-cyan-200/50 shadow-lg"
        }`}>
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-full blur-3xl" />
          <CardHeader className="relative z-10 pb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                theme === "dark" ? "bg-cyan-500/20" : "bg-cyan-100"
              }`}>
                <TrendingUp className={`w-5 h-5 ${theme === "dark" ? "text-cyan-400" : "text-cyan-600"}`} />
              </div>
              <div>
                <CardTitle className={`text-lg md:text-xl font-bold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
                  Performance Overview
                </CardTitle>
                <CardDescription className="mt-1">Average scores across activities</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={[
                  { name: 'Copy Evaluations', score: copyPerformanceData?.averageScore || 0, color: '#2563eb' },
                  { name: 'Prelims Tests', score: prelimsPerformanceData?.averageScore || 0, color: '#06b6d4' }
                ]}
                margin={{ top: 20, right: 20, left: 0, bottom: 10 }}
              >
                <defs>
                  <linearGradient id="barGradientPurple" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.8}/>
                  </linearGradient>
                  <linearGradient id="barGradientCyan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#0891b2" stopOpacity={0.8}/>
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke={theme === "dark" ? "#334155" : "#e2e8f0"}
                  opacity={0.3}
                />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12, fill: theme === "dark" ? "#94a3b8" : "#64748b" }}
                  stroke={theme === "dark" ? "#475569" : "#cbd5e1"}
                />
                <YAxis 
                  domain={[0, 100]} 
                  tick={{ fontSize: 12, fill: theme === "dark" ? "#94a3b8" : "#64748b" }}
                  stroke={theme === "dark" ? "#475569" : "#cbd5e1"}
                />
                <Tooltip 
                  formatter={(value) => [`${value}%`, "Average Score"]}
                  contentStyle={{
                    backgroundColor: theme === "dark" ? "#0f172a" : "#ffffff",
                    border: theme === "dark" ? "1px solid #334155" : "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "12px",
                    boxShadow: theme === "dark" ? "0 10px 25px rgba(0,0,0,0.5)" : "0 10px 25px rgba(0,0,0,0.1)"
                  }}
                />
                <Bar 
                  dataKey="score" 
                  radius={[8, 8, 0, 0]}
                  fill={(entry: any) => entry.name === 'Copy Evaluations' ? "url(#barGradientPurple)" : "url(#barGradientCyan)"}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className={`relative overflow-hidden border-2 ${
        theme === "dark" 
          ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-slate-700/50 shadow-lg" 
          : "bg-gradient-to-br from-white to-slate-50/50 border-slate-200/50 shadow-lg"
      }`}>
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-500/5 to-transparent rounded-full blur-3xl" />
        <CardHeader className="relative z-10 pb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              theme === "dark" ? "bg-blue-500/20" : "bg-blue-100"
            }`}>
              <Zap className={`w-5 h-5 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`} />
            </div>
            <div>
              <CardTitle className={`text-lg md:text-xl font-bold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
                Quick Actions
              </CardTitle>
              <CardDescription className="mt-1">Access detailed performance analysis</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setActiveTab('copy-evaluation')}
              className={`group relative p-5 rounded-xl border-2 transition-all duration-300 text-left overflow-hidden hover:scale-[1.02] ${
                theme === "dark"
                  ? "border-blue-700/50 bg-gradient-to-br from-blue-900/30 to-blue-800/20 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20"
                  : "border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-200/50"
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative flex items-start gap-4">
                <div className={`p-3 rounded-lg ${
                  theme === "dark" ? "bg-blue-500/20 group-hover:bg-blue-500/30" : "bg-blue-100 group-hover:bg-blue-200"
                } transition-colors`}>
                  <FileText className={`w-6 h-6 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`} />
                </div>
                <div className="flex-1">
                  <h3 className={`font-bold text-base mb-1 ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
                    Copy Evaluation Performance
                  </h3>
                  <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                    Detailed mains-style answer analysis
                  </p>
                </div>
                <ArrowUpRight className={`w-5 h-5 mt-1 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1 ${
                  theme === "dark" ? "text-blue-400" : "text-blue-600"
                }`} />
              </div>
            </button>

            <button
              onClick={() => setActiveTab('prelims')}
              className={`group relative p-5 rounded-xl border-2 transition-all duration-300 text-left overflow-hidden hover:scale-[1.02] ${
                theme === "dark"
                  ? "border-cyan-700/50 bg-gradient-to-br from-cyan-900/30 to-cyan-800/20 hover:border-cyan-500 hover:shadow-lg hover:shadow-cyan-500/20"
                  : "border-cyan-200 bg-gradient-to-br from-cyan-50 to-cyan-100/50 hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-200/50"
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative flex items-start gap-4">
                <div className={`p-3 rounded-lg ${
                  theme === "dark" ? "bg-cyan-500/20 group-hover:bg-cyan-500/30" : "bg-cyan-100 group-hover:bg-cyan-200"
                } transition-colors`}>
                  <ClipboardList className={`w-6 h-6 ${theme === "dark" ? "text-cyan-400" : "text-cyan-600"}`} />
                </div>
                <div className="flex-1">
                  <h3 className={`font-bold text-base mb-1 ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
                    Prelims Test Performance
                  </h3>
                  <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                    MCQ-based test analysis & readiness
                  </p>
                </div>
                <ArrowUpRight className={`w-5 h-5 mt-1 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1 ${
                  theme === "dark" ? "text-cyan-400" : "text-cyan-600"
                }`} />
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* DART Analytics Sections */}
      {dartAnalytics && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card className={`relative overflow-hidden border-2 ${
              theme === "dark" ? "bg-slate-800/90 border-blue-500/20" : "bg-white border-blue-200/50"
            }`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">Daily Time Distribution</CardTitle>
                <CardDescription>Study, Sleep, Work, Waste (avg)</CardDescription>
              </CardHeader>
              <CardContent>
                {dartAnalytics.dailyTimeDistribution?.length && dartAnalytics.dailyTimeDistribution[0]?.name !== "No data" ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={dartAnalytics.dailyTimeDistribution}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, value }) => `${name}: ${value}h`}
                      >
                        {dartAnalytics.dailyTimeDistribution.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: theme === "dark" ? "#0f172a" : "#fff", borderRadius: "8px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className={`h-[220px] flex items-center justify-center ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                    Log DART entries to see distribution
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className={`relative overflow-hidden border-2 ${
              theme === "dark" ? "bg-slate-800/90 border-cyan-500/20" : "bg-white border-cyan-200/50"
            }`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">7 Day Study Trend</CardTitle>
                <CardDescription>Study hours over last 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                {dartAnalytics.sevenDayStudyTrend?.length ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={dartAnalytics.sevenDayStudyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#334155" : "#e2e8f0"} />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: theme === "dark" ? "#94a3b8" : "#64748b" }} />
                      <YAxis tick={{ fontSize: 11, fill: theme === "dark" ? "#94a3b8" : "#64748b" }} />
                      <Tooltip contentStyle={{ backgroundColor: theme === "dark" ? "#0f172a" : "#fff", borderRadius: "8px" }} />
                      <Line type="monotone" dataKey="studyHours" stroke="#2563eb" strokeWidth={2} name="Study (hrs)" />
                      <Line type="monotone" dataKey="targetHours" stroke="#06b6d4" strokeWidth={2} name="Target (hrs)" strokeDasharray="4 4" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className={`h-[220px] flex items-center justify-center ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                    Log DART entries to see trend
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card className={`relative overflow-hidden border-2 ${
              theme === "dark" ? "bg-slate-800/90 border-amber-500/20" : "bg-white border-amber-200/50"
            }`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">Target vs Actual Study</CardTitle>
                <CardDescription>Last 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                {dartAnalytics.targetVsActual?.length ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={dartAnalytics.targetVsActual} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#334155" : "#e2e8f0"} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: theme === "dark" ? "#94a3b8" : "#64748b" }} />
                      <YAxis tick={{ fontSize: 11, fill: theme === "dark" ? "#94a3b8" : "#64748b" }} />
                      <Tooltip contentStyle={{ backgroundColor: theme === "dark" ? "#0f172a" : "#fff", borderRadius: "8px" }} />
                      <Bar dataKey="target" fill="#94a3b8" name="Target (hrs)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="actual" fill="#2563eb" name="Actual (hrs)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className={`h-[220px] flex items-center justify-center ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                    Log DART entries to see comparison
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className={`relative overflow-hidden border-2 ${
              theme === "dark" ? "bg-slate-800/90 border-teal-500/20" : "bg-white border-teal-200/50"
            }`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">Subject Frequency</CardTitle>
                <CardDescription>Days studied per subject</CardDescription>
              </CardHeader>
              <CardContent>
                {dartAnalytics.subjectFrequency?.length ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={dartAnalytics.subjectFrequency.slice(0, 10)} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#334155" : "#e2e8f0"} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: theme === "dark" ? "#94a3b8" : "#64748b" }} />
                      <YAxis type="category" dataKey="name" width={55} tick={{ fontSize: 10, fill: theme === "dark" ? "#94a3b8" : "#64748b" }} />
                      <Tooltip contentStyle={{ backgroundColor: theme === "dark" ? "#0f172a" : "#fff", borderRadius: "8px" }} />
                      <Bar dataKey="count" fill="#14b8a6" name="Days" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className={`h-[220px] flex items-center justify-center ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                    Log subjects in DART to see frequency
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card className={`relative overflow-hidden border-2 ${
              theme === "dark" ? "bg-slate-800/90 border-cyan-500/20" : "bg-white border-cyan-200/50"
            }`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sunrise className="w-4 h-4" /> Wake-up Consistency
                </CardTitle>
                <CardDescription>Last 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                {dartAnalytics.wakeUpConsistency?.length ? (
                  <div className="space-y-2">
                    {dartAnalytics.wakeUpConsistency.map((row, i) => (
                      <div key={i} className={`flex justify-between items-center py-1.5 px-3 rounded-lg ${theme === "dark" ? "bg-slate-700/50" : "bg-slate-100"}`}>
                        <span className="text-sm font-medium">{row.date}</span>
                        <span className={`text-sm ${row.before6 ? "text-green-500" : "text-slate-500"}`}>
                          {row.wakeUpTime} {row.before6 && "✓ Before 6 AM"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`h-[180px] flex items-center justify-center ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                    Log wake-up time in DART
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className={`relative overflow-hidden border-2 ${
              theme === "dark" ? "bg-slate-800/90 border-indigo-500/20" : "bg-white border-indigo-200/50"
            }`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">Answer Writing (Last 7 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${theme === "dark" ? "text-indigo-400" : "text-indigo-600"}`}>
                  {dartAnalytics.answerWritingWeeklyCount ?? 0} days
                </div>
                <p className="text-sm text-slate-500 mt-1">Days with answer writing done</p>
              </CardContent>
            </Card>
          </div>

          <Card className={`relative overflow-hidden border-2 mb-8 ${
            theme === "dark" ? "bg-slate-800/90 border-slate-600" : "bg-white border-slate-200"
          }`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Smile className="w-4 h-4" /> Emotional Status (Mental Health Insights)
              </CardTitle>
              <CardDescription>Distribution over logged days</CardDescription>
            </CardHeader>
            <CardContent>
              {dartAnalytics.emotionalStatusPie?.length && dartAnalytics.emotionalStatusPie.some((d) => d.value > 0) ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={dartAnalytics.emotionalStatusPie}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {dartAnalytics.emotionalStatusPie.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: theme === "dark" ? "#0f172a" : "#fff", borderRadius: "8px" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className={`h-[200px] flex items-center justify-center ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                  Log emotional status in DART to see insights
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </>
  );

  const renderCopyEvaluationTab = () => (
    <>
      {/* Copy Evaluation Performance Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
        <Card className={`relative overflow-hidden group transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${
          theme === "dark" 
            ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-blue-500/20 shadow-lg shadow-blue-500/10" 
            : "bg-gradient-to-br from-white to-blue-50/30 border-blue-200/50 shadow-lg shadow-blue-100/50"
        } border-2`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/30 via-blue-400/20 to-transparent rounded-full blur-3xl group-hover:blur-[40px] transition-all duration-500" />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="pb-3 relative z-10">
            <div className="flex items-center justify-between">
              <CardTitle className={`text-xs md:text-sm font-semibold ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Average Score
              </CardTitle>
              <div className={`p-2 rounded-lg ${
                theme === "dark" ? "bg-blue-500/20" : "bg-blue-100"
              }`}>
                <Target className={`w-4 h-4 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${
              theme === "dark" 
                ? "from-blue-300 to-blue-500 bg-clip-text text-transparent" 
                : "from-blue-600 to-blue-800 bg-clip-text text-transparent"
            }`}>
              {loading ? "..." : `${copyPerformanceData?.averageScore || 0}%`}
            </div>
            <div className="flex items-center gap-1 mt-2">
              {copyPerformanceData?.improvementTrend && copyPerformanceData.improvementTrend !== 0 && (
                <>
                  {copyPerformanceData.improvementTrend > 0 ? (
                    <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-red-400" />
                  )}
                  <span className={`text-xs font-semibold ${copyPerformanceData.improvementTrend > 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {Math.abs(copyPerformanceData.improvementTrend)}%
                  </span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className={`relative overflow-hidden group transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${
          theme === "dark" 
            ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-cyan-500/20 shadow-lg shadow-cyan-500/10" 
            : "bg-gradient-to-br from-white to-cyan-50/30 border-cyan-200/50 shadow-lg shadow-cyan-100/50"
        } border-2`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/30 via-cyan-400/20 to-transparent rounded-full blur-3xl group-hover:blur-[40px] transition-all duration-500" />
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="pb-3 relative z-10">
            <div className="flex items-center justify-between">
              <CardTitle className={`text-xs md:text-sm font-semibold ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Highest Score
              </CardTitle>
              <div className={`p-2 rounded-lg ${
                theme === "dark" ? "bg-cyan-500/20" : "bg-cyan-100"
              }`}>
                <Award className={`w-4 h-4 ${theme === "dark" ? "text-cyan-400" : "text-cyan-600"}`} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${
              theme === "dark" 
                ? "from-cyan-300 to-cyan-500 bg-clip-text text-transparent" 
                : "from-cyan-600 to-cyan-800 bg-clip-text text-transparent"
            }`}>
              {loading ? "..." : `${copyPerformanceData?.highestScore || 0}%`}
            </div>
            <div className={`mt-2 text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
              Best performance
            </div>
          </CardContent>
        </Card>

        <Card className={`relative overflow-hidden group transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${
          theme === "dark" 
            ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-teal-500/20 shadow-lg shadow-teal-500/10" 
            : "bg-gradient-to-br from-white to-teal-50/30 border-teal-200/50 shadow-lg shadow-teal-100/50"
        } border-2`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-teal-500/30 via-teal-400/20 to-transparent rounded-full blur-3xl group-hover:blur-[40px] transition-all duration-500" />
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="pb-3 relative z-10">
            <div className="flex items-center justify-between">
              <CardTitle className={`text-xs md:text-sm font-semibold ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Total Evaluations
              </CardTitle>
              <div className={`p-2 rounded-lg ${
                theme === "dark" ? "bg-teal-500/20" : "bg-teal-100"
              }`}>
                <BookOpen className={`w-4 h-4 ${theme === "dark" ? "text-teal-400" : "text-teal-600"}`} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${
              theme === "dark" 
                ? "from-teal-300 to-teal-500 bg-clip-text text-transparent" 
                : "from-teal-600 to-teal-800 bg-clip-text text-transparent"
            }`}>
              {loading ? "..." : copyPerformanceData?.totalEvaluations || 0}
            </div>
            <div className={`mt-2 text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
              Total submissions
            </div>
          </CardContent>
        </Card>

        <Card className={`relative overflow-hidden group transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${
          theme === "dark" 
            ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-amber-500/20 shadow-lg shadow-amber-500/10" 
            : "bg-gradient-to-br from-white to-amber-50/30 border-amber-200/50 shadow-lg shadow-amber-100/50"
        } border-2`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/30 via-amber-400/20 to-transparent rounded-full blur-3xl group-hover:blur-[40px] transition-all duration-500" />
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="pb-3 relative z-10">
            <div className="flex items-center justify-between">
              <CardTitle className={`text-xs md:text-sm font-semibold ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Consistency
              </CardTitle>
              <div className={`p-2 rounded-lg ${
                theme === "dark" ? "bg-amber-500/20" : "bg-amber-100"
              }`}>
                <Activity className={`w-4 h-4 ${theme === "dark" ? "text-amber-400" : "text-amber-600"}`} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${
              theme === "dark" 
                ? "from-amber-300 to-amber-500 bg-clip-text text-transparent" 
                : "from-amber-600 to-amber-800 bg-clip-text text-transparent"
            }`}>
              {loading ? "..." : `${copyPerformanceData?.consistency || 0}%`}
            </div>
            <div className={`mt-2 text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
              Score stability
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Copy Evaluation Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card className={`relative overflow-hidden border-2 transition-all duration-300 hover:shadow-xl ${
          theme === "dark" 
            ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-blue-500/20 shadow-lg" 
            : "bg-gradient-to-br from-white to-blue-50/20 border-blue-200/50 shadow-lg"
        }`}>
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-3xl" />
          <CardHeader className="pb-4 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  theme === "dark" ? "bg-blue-500/20" : "bg-blue-100"
                }`}>
                  <TrendingUp className={`w-5 h-5 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`} />
                </div>
                <div>
                  <CardTitle className={`text-lg md:text-xl font-bold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
                    Copy Evaluation Trend
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm mt-1">Your mains answer performance over time</CardDescription>
                </div>
              </div>
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
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
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
                    stroke="#2563eb"
                    strokeWidth={2}
                    fill="url(#colorCopyScore)"
                    dot={{ fill: "#2563eb", r: 4 }}
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

        <Card className={`relative overflow-hidden border-2 transition-all duration-300 hover:shadow-xl ${
          theme === "dark" 
            ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-cyan-500/20 shadow-lg" 
            : "bg-gradient-to-br from-white to-cyan-50/20 border-cyan-200/50 shadow-lg"
        }`}>
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-full blur-3xl" />
          <CardHeader className="pb-4 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  theme === "dark" ? "bg-cyan-500/20" : "bg-cyan-100"
                }`}>
                  <BookOpen className={`w-5 h-5 ${theme === "dark" ? "text-cyan-400" : "text-cyan-600"}`} />
                </div>
                <div>
                  <CardTitle className={`text-lg md:text-xl font-bold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
                    Subject Performance
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm mt-1">Performance across different subjects</CardDescription>
                </div>
              </div>
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
                  <Bar dataKey="average" fill="#2563eb" />
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
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-3xl" />
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
        <Card className={`relative overflow-hidden group transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${
          theme === "dark" 
            ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-blue-500/20 shadow-lg shadow-blue-500/10" 
            : "bg-gradient-to-br from-white to-blue-50/30 border-blue-200/50 shadow-lg shadow-blue-100/50"
        } border-2`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/30 via-blue-400/20 to-transparent rounded-full blur-3xl group-hover:blur-[40px] transition-all duration-500" />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="pb-3 relative z-10">
            <div className="flex items-center justify-between">
              <CardTitle className={`text-xs md:text-sm font-semibold ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Average Score
              </CardTitle>
              <div className={`p-2 rounded-lg ${
                theme === "dark" ? "bg-blue-500/20" : "bg-blue-100"
              }`}>
                <Target className={`w-4 h-4 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${
              theme === "dark" 
                ? "from-blue-300 to-blue-500 bg-clip-text text-transparent" 
                : "from-blue-600 to-blue-800 bg-clip-text text-transparent"
            }`}>
              {loading ? "..." : `${prelimsPerformanceData?.averageScore || 0}%`}
            </div>
            <div className="flex items-center gap-1 mt-2">
              {prelimsPerformanceData?.improvementTrend && prelimsPerformanceData.improvementTrend !== 0 && (
                <>
                  {prelimsPerformanceData.improvementTrend > 0 ? (
                    <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-red-400" />
                  )}
                  <span className={`text-xs font-semibold ${prelimsPerformanceData.improvementTrend > 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {Math.abs(prelimsPerformanceData.improvementTrend)}%
                  </span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className={`relative overflow-hidden group transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${
          theme === "dark" 
            ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-cyan-500/20 shadow-lg shadow-cyan-500/10" 
            : "bg-gradient-to-br from-white to-cyan-50/30 border-cyan-200/50 shadow-lg shadow-cyan-100/50"
        } border-2`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/30 via-cyan-400/20 to-transparent rounded-full blur-3xl group-hover:blur-[40px] transition-all duration-500" />
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="pb-3 relative z-10">
            <div className="flex items-center justify-between">
              <CardTitle className={`text-xs md:text-sm font-semibold ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Highest Score
              </CardTitle>
              <div className={`p-2 rounded-lg ${
                theme === "dark" ? "bg-cyan-500/20" : "bg-cyan-100"
              }`}>
                <Award className={`w-4 h-4 ${theme === "dark" ? "text-cyan-400" : "text-cyan-600"}`} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${
              theme === "dark" 
                ? "from-cyan-300 to-cyan-500 bg-clip-text text-transparent" 
                : "from-cyan-600 to-cyan-800 bg-clip-text text-transparent"
            }`}>
              {loading ? "..." : `${prelimsPerformanceData?.highestScore || 0}%`}
            </div>
            <div className={`mt-2 text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
              Best performance
            </div>
          </CardContent>
        </Card>

        <Card className={`relative overflow-hidden group transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${
          theme === "dark" 
            ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-teal-500/20 shadow-lg shadow-teal-500/10" 
            : "bg-gradient-to-br from-white to-teal-50/30 border-teal-200/50 shadow-lg shadow-teal-100/50"
        } border-2`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-teal-500/30 via-teal-400/20 to-transparent rounded-full blur-3xl group-hover:blur-[40px] transition-all duration-500" />
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="pb-3 relative z-10">
            <div className="flex items-center justify-between">
              <CardTitle className={`text-xs md:text-sm font-semibold ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Total Tests
              </CardTitle>
              <div className={`p-2 rounded-lg ${
                theme === "dark" ? "bg-teal-500/20" : "bg-teal-100"
              }`}>
                <BookOpen className={`w-4 h-4 ${theme === "dark" ? "text-teal-400" : "text-teal-600"}`} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${
              theme === "dark" 
                ? "from-teal-300 to-teal-500 bg-clip-text text-transparent" 
                : "from-teal-600 to-teal-800 bg-clip-text text-transparent"
            }`}>
              {loading ? "..." : prelimsPerformanceData?.totalTests || 0}
            </div>
            <div className={`mt-2 text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
              Total attempts
            </div>
          </CardContent>
        </Card>

        <Card className={`relative overflow-hidden group transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${
          theme === "dark" 
            ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-amber-500/20 shadow-lg shadow-amber-500/10" 
            : "bg-gradient-to-br from-white to-amber-50/30 border-amber-200/50 shadow-lg shadow-amber-100/50"
        } border-2`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/30 via-amber-400/20 to-transparent rounded-full blur-3xl group-hover:blur-[40px] transition-all duration-500" />
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="pb-3 relative z-10">
            <div className="flex items-center justify-between">
              <CardTitle className={`text-xs md:text-sm font-semibold ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Consistency
              </CardTitle>
              <div className={`p-2 rounded-lg ${
                theme === "dark" ? "bg-amber-500/20" : "bg-amber-100"
              }`}>
                <Activity className={`w-4 h-4 ${theme === "dark" ? "text-amber-400" : "text-amber-600"}`} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${
              theme === "dark" 
                ? "from-amber-300 to-amber-500 bg-clip-text text-transparent" 
                : "from-amber-600 to-amber-800 bg-clip-text text-transparent"
            }`}>
              {loading ? "..." : `${prelimsPerformanceData?.consistency || 0}%`}
            </div>
            <div className={`mt-2 text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
              Score stability
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pre-lims Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card className={`relative overflow-hidden border-2 transition-all duration-300 hover:shadow-xl ${
          theme === "dark" 
            ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-blue-500/20 shadow-lg" 
            : "bg-gradient-to-br from-white to-blue-50/20 border-blue-200/50 shadow-lg"
        }`}>
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-3xl" />
          <CardHeader className="pb-4 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  theme === "dark" ? "bg-blue-500/20" : "bg-blue-100"
                }`}>
                  <TrendingUp className={`w-5 h-5 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`} />
                </div>
                <div>
                  <CardTitle className={`text-lg md:text-xl font-bold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
                    Pre-lims Performance Trend
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm mt-1">Your test score progression over time</CardDescription>
                </div>
              </div>
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
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
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
                    stroke="#2563eb"
                    strokeWidth={2}
                    fill="url(#colorPrelimsScore)"
                    dot={{ fill: "#2563eb", r: 4 }}
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

        <Card className={`relative overflow-hidden border-2 transition-all duration-300 hover:shadow-xl ${
          theme === "dark" 
            ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-cyan-500/20 shadow-lg" 
            : "bg-gradient-to-br from-white to-cyan-50/20 border-cyan-200/50 shadow-lg"
        }`}>
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-full blur-3xl" />
          <CardHeader className="pb-4 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  theme === "dark" ? "bg-cyan-500/20" : "bg-cyan-100"
                }`}>
                  <BookOpen className={`w-5 h-5 ${theme === "dark" ? "text-cyan-400" : "text-cyan-600"}`} />
                </div>
                <div>
                  <CardTitle className={`text-lg md:text-xl font-bold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
                    Subject-wise Performance
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm mt-1">Performance across different subjects</CardDescription>
                </div>
              </div>
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

  const enrollmentName = dartAnalytics?.enrollmentName || user?.name || "Student";

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6 lg:space-y-8 overflow-x-hidden">
      {/* Welcome + compact metric strip */}
      <div className={`rounded-xl p-3 md:p-4 border ${
        theme === "dark" ? "bg-slate-800/80 border-slate-700/60" : "bg-white border-slate-200/80 shadow-sm"
      }`}>
        <h2 className={`text-sm md:text-base font-semibold mb-3 flex items-center gap-1.5 ${
          theme === "dark" ? "text-slate-100" : "text-slate-900"
        }`}>
          <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
          Welcome, {enrollmentName}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {/* Performance Score */}
          <div className={`rounded-xl border p-3 flex items-center gap-3 ${
            theme === "dark"
              ? "bg-slate-900/60 border-blue-500/20"
              : "bg-blue-50/40 border-blue-100"
          }`}>
            <div className={`shrink-0 p-2 rounded-lg ${
              theme === "dark" ? "bg-blue-500/15" : "bg-blue-100"
            }`}>
              <Target className="w-4 h-4 text-blue-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-[10px] font-medium uppercase tracking-wide ${
                theme === "dark" ? "text-slate-500" : "text-slate-500"
              }`}>
                Performance Score
              </p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className={`text-xl font-bold leading-none ${
                  (dartAnalytics?.performanceScore ?? 0) >= 80 ? "text-green-500" :
                  (dartAnalytics?.performanceScore ?? 0) >= 60 ? "text-blue-500" :
                  (dartAnalytics?.performanceScore ?? 0) >= 40 ? "text-amber-500" : "text-slate-500"
                }`}>
                  {dartAnalytics?.performanceScore ?? 0}
                </span>
                <span className={`text-[11px] truncate ${
                  theme === "dark" ? "text-slate-400" : "text-slate-500"
                }`}>
                  {dartAnalytics?.performanceScoreLevel ?? "Needs Improvement"}
                </span>
              </div>
            </div>
          </div>

          {/* Consistency Index */}
          <div className={`rounded-xl border p-3 flex items-center gap-3 ${
            theme === "dark"
              ? "bg-slate-900/60 border-cyan-500/20"
              : "bg-cyan-50/40 border-cyan-100"
          }`}>
            <div className="relative w-11 h-11 shrink-0">
              <svg className="w-11 h-11 -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-cyan-500/20 stroke-[3]"
                  stroke="currentColor"
                  fill="none"
                  strokeDasharray="100"
                  d="M18 2.5 a 15.5 15.5 0 0 1 0 31 a 15.5 15.5 0 0 1 0 -31"
                />
                <path
                  className="text-cyan-500 stroke-[3] transition-all duration-500"
                  stroke="currentColor"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray="100"
                  strokeDashoffset={100 - (dartAnalytics?.consistencyIndex ?? 0)}
                  d="M18 2.5 a 15.5 15.5 0 0 1 0 31 a 15.5 15.5 0 0 1 0 -31"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-cyan-500">
                {dartAnalytics?.consistencyIndex ?? 0}%
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-[10px] font-medium uppercase tracking-wide ${
                theme === "dark" ? "text-slate-500" : "text-slate-500"
              }`}>
                Consistency
              </p>
              <p className={`text-[11px] mt-0.5 leading-snug ${
                theme === "dark" ? "text-slate-400" : "text-slate-600"
              }`}>
                Days with 6+ hrs study
              </p>
            </div>
          </div>

          <DartReportCard
            analytics={dartAnalytics}
            studentName={enrollmentName}
            className="sm:col-span-2 lg:col-span-1"
          />
        </div>
      </div>

      {/* Header Section - compact on mobile */}
      <div className={`relative overflow-hidden rounded-xl md:rounded-2xl p-4 md:p-8 mb-4 md:mb-6 border-2 transition-all duration-300 ${
        theme === "dark"
          ? "bg-gradient-to-br from-slate-800/90 via-blue-900/20 to-slate-900/90 border-blue-500/20 shadow-xl shadow-blue-500/10"
          : "bg-gradient-to-br from-white via-blue-50/30 to-white border-blue-200/50 shadow-xl shadow-blue-100/30"
      }`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col gap-3 md:gap-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 md:gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
                <div className={`p-2 md:p-2.5 rounded-lg md:rounded-xl shrink-0 ${
                  theme === "dark" ? "bg-blue-500/20" : "bg-blue-100"
                }`}>
                  <BarChart3 className={`w-5 h-5 md:w-6 md:h-6 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`} />
                </div>
                <h1 className={`text-xl md:text-4xl font-bold tracking-tight bg-gradient-to-r truncate ${
                  theme === "dark"
                    ? "from-blue-200 via-blue-300 to-blue-400 bg-clip-text text-transparent"
                    : "from-blue-600 via-blue-700 to-blue-800 bg-clip-text text-transparent"
                }`}>
                  Performance Dashboard
                </h1>
              </div>
              <p className={`text-xs md:text-lg mt-1 md:mt-2 md:ml-14 ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                Comprehensive analysis of your UPSC preparation performance
              </p>
            </div>
            {combinedMetrics.totalActivities > 0 && (
              <div className={`flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-xl flex-shrink-0 ${
                theme === "dark" ? "bg-slate-800/50" : "bg-white/50"
              }`}>
                <button
                  onClick={() => setSelectedTimeframe('week')}
                  className={`px-3 sm:px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 min-h-[44px] touch-manipulation ${
                    selectedTimeframe === 'week'
                      ? theme === "dark"
                        ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-500/30"
                        : "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-500/30"
                      : theme === "dark"
                      ? "bg-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                      : "bg-transparent text-slate-600 hover:text-slate-900 hover:bg-white"
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setSelectedTimeframe('month')}
                  className={`px-3 sm:px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 min-h-[44px] touch-manipulation ${
                    selectedTimeframe === 'month'
                      ? theme === "dark"
                        ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-500/30"
                        : "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-500/30"
                      : theme === "dark"
                      ? "bg-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                      : "bg-transparent text-slate-600 hover:text-slate-900 hover:bg-white"
                  }`}
                >
                  Month
                </button>
                <button
                  onClick={() => setSelectedTimeframe('all')}
                  className={`px-3 sm:px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 min-h-[44px] touch-manipulation ${
                    selectedTimeframe === 'all'
                      ? theme === "dark"
                        ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-500/30"
                        : "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-500/30"
                      : theme === "dark"
                      ? "bg-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                      : "bg-transparent text-slate-600 hover:text-slate-900 hover:bg-white"
                  }`}
                >
                  All Time
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation - touch-friendly on mobile */}
      <div className={`relative flex gap-1.5 sm:gap-2 p-1.5 rounded-xl border-2 ${
        theme === "dark" 
          ? "bg-slate-800/50 border-slate-700/50" 
          : "bg-slate-100/50 border-slate-200/50"
      } mb-4 md:mb-6`}>
        <button
          onClick={() => setActiveTab('overview')}
          className={`relative flex-1 px-2 sm:px-4 py-3 sm:py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-300 min-h-[44px] touch-manipulation ${
            activeTab === 'overview'
              ? theme === "dark"
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30'
                : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30'
              : theme === "dark"
              ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Overview
          </span>
        </button>
        <button
          onClick={() => setActiveTab('copy-evaluation')}
          className={`relative flex-1 px-2 sm:px-4 py-3 sm:py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-300 min-h-[44px] touch-manipulation ${
            activeTab === 'copy-evaluation'
              ? theme === "dark"
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30'
                : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30'
              : theme === "dark"
              ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            <FileText className="w-4 h-4" />
            Copy Evaluation
          </span>
        </button>
        <button
          onClick={() => setActiveTab('prelims')}
          className={`relative flex-1 px-2 sm:px-4 py-3 sm:py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-300 min-h-[44px] touch-manipulation ${
            activeTab === 'prelims'
              ? theme === "dark"
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30'
                : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30'
              : theme === "dark"
              ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            <ClipboardList className="w-4 h-4" />
            Prelims
          </span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-6 min-w-0">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="min-w-0"
          >
            {activeTab === 'overview' && renderOverviewTab()}
            {activeTab === 'copy-evaluation' && renderCopyEvaluationTab()}
            {activeTab === 'prelims' && renderPrelimsTab()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
