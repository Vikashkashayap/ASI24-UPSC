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
  Sparkles
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

export const PerformancePage = () => {
  const { theme } = useTheme();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'all' | 'month' | 'week'>('all');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/api/performance");
        setData(res.data);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Filter data based on timeframe
  const getFilteredHistory = () => {
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

  const filteredHistory = getFilteredHistory();
  const isAgentView = data?.isAgentView || false;

  // Agent Dashboard View
  if (isAgentView && data?.students) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className={`text-2xl md:text-3xl font-bold tracking-tight ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
                Agent Dashboard
              </h1>
              <p className={`text-sm md:text-base mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                Monitor all students' performance and progress
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Users className={`w-5 h-5 ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`} />
              <span className={`text-lg font-semibold ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>
                {data.aggregateStats?.totalStudents || 0} Students
              </span>
            </div>
          </div>
        </div>

        {/* Aggregate Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/20 to-transparent rounded-full blur-2xl" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <Users className="w-4 h-4 text-purple-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
                {data.aggregateStats?.totalStudents || 0}
              </div>
              <p className={`text-xs mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                Registered users
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/20 to-transparent rounded-full blur-2xl" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Active Students</CardTitle>
                <Activity className="w-4 h-4 text-cyan-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
                {data.aggregateStats?.activeStudents || 0}
              </div>
              <p className={`text-xs mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                With evaluations
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-teal-500/20 to-transparent rounded-full blur-2xl" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                <BarChart3 className="w-4 h-4 text-teal-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
                {data.aggregateStats?.averageScoreAcrossAll || 0}%
              </div>
              <p className={`text-xs mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                Across all students
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Students List */}
        <Card>
          <CardHeader>
            <CardTitle>Students Performance Overview</CardTitle>
            <CardDescription>Detailed view of each student's progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="space-y-4 min-w-[800px]">
                {data.students?.map((student: any) => (
                  <div
                    key={student.studentId}
                    className={`p-4 rounded-xl border transition-all hover:shadow-lg ${
                      theme === "dark"
                        ? "bg-slate-900/50 border-purple-900/50 hover:border-purple-700/50"
                        : "bg-slate-50 border-slate-200 hover:border-purple-300"
                    }`}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex-1 min-w-[200px]">
                        <h3 className={`font-semibold ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>
                          {student.studentName}
                        </h3>
                        <p className={`text-xs mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                          {student.studentEmail}
                        </p>
                      </div>
                      <div className="flex items-center gap-6 flex-wrap">
                        <div className="text-center">
                          <div className={`text-2xl font-bold ${theme === "dark" ? "text-purple-300" : "text-purple-600"}`}>
                            {student.averageScore || 0}%
                          </div>
                          <div className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                            Average
                          </div>
                        </div>
                        <div className="text-center">
                          <div className={`text-2xl font-bold ${theme === "dark" ? "text-cyan-300" : "text-cyan-600"}`}>
                            {student.totalEvaluations || 0}
                          </div>
                          <div className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                            Evaluations
                          </div>
                        </div>
                        <div className="text-center">
                          <div className={`text-2xl font-bold ${theme === "dark" ? "text-teal-300" : "text-teal-600"}`}>
                            {student.highestScore || 0}%
                          </div>
                          <div className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                            Highest
                          </div>
                        </div>
                      </div>
                    </div>
                    {student.weakSubjects?.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-700/50">
                        <p className={`text-xs mb-2 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                          Weak Areas:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {student.weakSubjects.map((subject: string, idx: number) => (
                            <span
                              key={idx}
                              className={`px-2 py-1 rounded-full text-xs ${
                                theme === "dark"
                                  ? "bg-red-900/30 text-red-300 border border-red-800/50"
                                  : "bg-red-50 text-red-700 border border-red-200"
                              }`}
                            >
                              {subject}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {(!data.students || data.students.length === 0) && (
                  <div className={`text-center py-12 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                    No students found
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Regular Student Dashboard View
  return (
    <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-2 md:gap-3">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className={`text-2xl md:text-3xl font-bold tracking-tight ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
              Performance Dashboard
            </h1>
            <p className={`text-sm md:text-base mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
              Track your progress, identify strengths, and improve weak areas
            </p>
          </div>
          {data && data.totalEvaluations > 0 && (
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

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
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
              {loading ? "..." : (data?.averageScore || 0)}%
            </div>
            <div className="flex items-center gap-1 mt-1">
              {data?.improvementTrend && data.improvementTrend !== 0 && (
                <>
                  {data.improvementTrend > 0 ? (
                    <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 text-red-400" />
                  )}
                  <span className={`text-xs ${data.improvementTrend > 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {Math.abs(data.improvementTrend)}%
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
              {loading ? "..." : (data?.highestScore || 0)}%
            </div>
            <p className={`text-xs mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
              Personal best
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-teal-500/20 to-transparent rounded-full blur-2xl group-hover:blur-3xl transition-all" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs md:text-sm font-medium">Total Attempts</CardTitle>
              <BookOpen className={`w-4 h-4 ${theme === "dark" ? "text-teal-400" : "text-teal-600"}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl md:text-3xl font-bold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
              {loading ? "..." : (data?.totalEvaluations || 0)}
            </div>
            <p className={`text-xs mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
              Evaluations
            </p>
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
              {loading ? "..." : (data?.consistency || 0)}%
            </div>
            <p className={`text-xs mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
              Score stability
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Marks Trend - Enhanced */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-3xl" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base md:text-lg font-semibold">Performance Trend</CardTitle>
                <CardDescription className="text-xs md:text-sm">Your score progression over time</CardDescription>
              </div>
              <TrendingUp className={`w-5 h-5 ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`} />
            </div>
          </CardHeader>
          <CardContent className="h-64 md:h-80">
            {loading ? (
              <div className={`h-full flex items-center justify-center ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                Loading...
              </div>
            ) : filteredHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={filteredHistory} margin={{ left: -10, right: 10, top: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
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
                    fill="url(#colorScore)"
                    dot={{ fill: "#8b5cf6", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className={`h-full flex flex-col items-center justify-center ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                <BarChart3 className="w-12 h-12 mb-2 opacity-50" />
                <p className="text-sm">No data available yet</p>
                <p className="text-xs mt-1">Start submitting answers to see your progress</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subject Performance */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-full blur-3xl" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base md:text-lg font-semibold">Subject Analysis</CardTitle>
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
            ) : data?.subjectBreakdown && data.subjectBreakdown.length > 0 ? (
              <div className="h-full flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-1/2 h-48 md:h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.subjectBreakdown}
                        dataKey="average"
                        nameKey="subject"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                        label={({ subject, average }) => `${subject}: ${average}%`}
                      >
                        {(data.subjectBreakdown || []).map((_: any, index: number) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any) => [`${value}%`, "Average"]}
                        contentStyle={{ 
                          backgroundColor: theme === "dark" ? "#0f172a" : "#ffffff",
                          border: theme === "dark" ? "1px solid #334155" : "1px solid #e2e8f0",
                          borderRadius: "8px"
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto">
                  {data.subjectBreakdown.map((s: any, idx: number) => (
                    <div key={s.subject} className={`p-3 rounded-lg ${theme === "dark" ? "bg-slate-900/50" : "bg-slate-50"}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block h-3 w-3 rounded-full"
                            style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                          />
                          <span className={`text-sm font-medium ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>
                            {s.subject}
                          </span>
                        </div>
                        <span className={`text-sm font-bold ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>
                          {s.average}%
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>
                          High: {s.highest}%
                        </span>
                        <span className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>
                          Low: {s.lowest}%
                        </span>
                        <span className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>
                          {s.count} attempts
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className={`h-full flex flex-col items-center justify-center ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                <BookOpen className="w-12 h-12 mb-2 opacity-50" />
                <p className="text-sm">No subject data available</p>
                <p className="text-xs mt-1">Submit evaluations to see subject-wise breakdown</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weak Areas & Answer History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Weak Areas Card */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-red-500/10 to-transparent rounded-full blur-3xl" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base md:text-lg font-semibold">Focus Areas</CardTitle>
                <CardDescription className="text-xs md:text-sm">Subjects that need more attention</CardDescription>
              </div>
              <Target className={`w-5 h-5 ${theme === "dark" ? "text-red-400" : "text-red-600"}`} />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className={`py-8 text-center ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                Loading...
              </div>
            ) : data?.weakSubjects && data.weakSubjects.length > 0 ? (
              <div className="space-y-3">
                {data.weakSubjects.map((subject: string, idx: number) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border transition-all hover:scale-[1.02] ${
                      theme === "dark"
                        ? "bg-gradient-to-r from-red-900/20 to-red-800/10 border-red-800/50"
                        : "bg-gradient-to-r from-red-50 to-red-100/50 border-red-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          theme === "dark" ? "bg-red-900/50" : "bg-red-100"
                        }`}>
                          <span className={`text-lg font-bold ${theme === "dark" ? "text-red-300" : "text-red-600"}`}>
                            {idx + 1}
                          </span>
                        </div>
                        <div>
                          <p className={`font-semibold ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>
                            {subject}
                          </p>
                          <p className={`text-xs mt-0.5 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                            Needs improvement
                          </p>
                        </div>
                      </div>
                      <Zap className={`w-5 h-5 ${theme === "dark" ? "text-red-400" : "text-red-600"}`} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`py-8 text-center ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                <Target className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No weak areas identified yet</p>
                <p className="text-xs mt-1">Keep practicing to identify improvement areas</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Performance */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-teal-500/10 to-transparent rounded-full blur-3xl" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base md:text-lg font-semibold">Recent Performance</CardTitle>
                <CardDescription className="text-xs md:text-sm">Your latest evaluation results</CardDescription>
              </div>
              <Clock className={`w-5 h-5 ${theme === "dark" ? "text-teal-400" : "text-teal-600"}`} />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className={`py-8 text-center ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                Loading...
              </div>
            ) : data?.recentPerformance && data.recentPerformance.length > 0 ? (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {data.recentPerformance.map((item: any, idx: number) => (
                  <div
                    key={item.id || idx}
                    className={`p-4 rounded-xl border transition-all hover:scale-[1.01] ${
                      theme === "dark"
                        ? "bg-slate-900/50 border-slate-700/50 hover:border-teal-700/50"
                        : "bg-slate-50 border-slate-200 hover:border-teal-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className={`font-semibold text-sm ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>
                          {item.subject}
                        </p>
                        <p className={`text-xs mt-0.5 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                          {new Date(item.createdAt).toLocaleDateString("en-IN", { 
                            day: "numeric", 
                            month: "short", 
                            year: "numeric" 
                          })}
                        </p>
                      </div>
                      <div className={`text-2xl font-bold ${
                        item.score >= 70 
                          ? theme === "dark" ? "text-emerald-300" : "text-emerald-600"
                          : item.score >= 50
                          ? theme === "dark" ? "text-amber-300" : "text-amber-600"
                          : theme === "dark" ? "text-red-300" : "text-red-600"
                      }`}>
                        {item.score}%
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`px-2 py-1 rounded ${
                        theme === "dark" ? "bg-slate-800 text-slate-300" : "bg-slate-200 text-slate-700"
                      }`}>
                        {item.paper}
                      </span>
                      <span className={`px-2 py-1 rounded ${
                        theme === "dark" ? "bg-slate-800 text-slate-300" : "bg-slate-200 text-slate-700"
                      }`}>
                        Grade: {item.grade}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`py-8 text-center ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent evaluations</p>
                <p className="text-xs mt-1">Start submitting answers to track your progress</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Answer History Table */}
      <Card className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-3xl" />
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base md:text-lg font-semibold">Complete Answer History</CardTitle>
              <CardDescription className="text-xs md:text-sm">All your evaluated attempts in detail</CardDescription>
            </div>
            <Sparkles className={`w-5 h-5 ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2">
              <thead>
                <tr className={`text-left ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                  <th className="py-2 pr-4 text-xs md:text-sm font-medium">Date</th>
                  <th className="py-2 pr-4 text-xs md:text-sm font-medium">Subject</th>
                  <th className="py-2 pr-4 text-xs md:text-sm font-medium hidden sm:table-cell">Paper</th>
                  <th className="py-2 pr-4 text-xs md:text-sm font-medium">Score</th>
                  <th className="py-2 pr-4 text-xs md:text-sm font-medium hidden md:table-cell">Grade</th>
                  <th className="py-2 pr-4 text-xs md:text-sm font-medium hidden lg:table-cell">Marks</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className={`py-8 text-center ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                      Loading...
                    </td>
                  </tr>
                ) : filteredHistory.length > 0 ? (
                  filteredHistory.map((row: any, idx: number) => (
                    <tr 
                      key={row.id || idx} 
                      className={`transition-all hover:scale-[1.01] ${
                        theme === "dark" 
                          ? "bg-slate-900/50 hover:bg-slate-800/50" 
                          : "bg-slate-50 hover:bg-slate-100"
                      }`}
                    >
                      <td className={`py-3 pr-4 rounded-l-lg text-xs md:text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                        {new Date(row.createdAt).toLocaleDateString("en-IN", { 
                          day: "numeric", 
                          month: "short",
                          year: "numeric"
                        })}
                      </td>
                      <td className={`py-3 pr-4 text-xs md:text-sm font-medium ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>
                        {row.subject}
                      </td>
                      <td className={`py-3 pr-4 text-xs md:text-sm hidden sm:table-cell ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                        {row.paper}
                      </td>
                      <td className={`py-3 pr-4 text-xs md:text-sm font-bold ${
                        row.score >= 70 
                          ? theme === "dark" ? "text-emerald-300" : "text-emerald-600"
                          : row.score >= 50
                          ? theme === "dark" ? "text-amber-300" : "text-amber-600"
                          : theme === "dark" ? "text-red-300" : "text-red-600"
                      }`}>
                        {row.score}%
                      </td>
                      <td className={`py-3 pr-4 text-xs md:text-sm hidden md:table-cell ${
                        theme === "dark" ? "text-slate-300" : "text-slate-700"
                      }`}>
                        <span className={`px-2 py-1 rounded ${
                          row.grade === 'A' 
                            ? theme === "dark" ? "bg-emerald-900/30 text-emerald-300" : "bg-emerald-100 text-emerald-700"
                            : row.grade === 'B'
                            ? theme === "dark" ? "bg-blue-900/30 text-blue-300" : "bg-blue-100 text-blue-700"
                            : row.grade === 'C'
                            ? theme === "dark" ? "bg-amber-900/30 text-amber-300" : "bg-amber-100 text-amber-700"
                            : theme === "dark" ? "bg-red-900/30 text-red-300" : "bg-red-100 text-red-700"
                        }`}>
                          {row.grade}
                        </span>
                      </td>
                      <td className={`py-3 pr-4 rounded-r-lg text-xs md:text-sm hidden lg:table-cell ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                        {row.totalMarks}/{row.maxMarks}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className={`py-12 text-center ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                      <div className="flex flex-col items-center gap-2">
                        <BookOpen className="w-12 h-12 opacity-50" />
                        <p className="text-sm font-medium">No answers evaluated yet</p>
                        <p className="text-xs">Start with your first mains-style attempt today</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
