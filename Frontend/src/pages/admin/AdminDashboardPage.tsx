import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { api } from "../../services/api";
import { useTheme } from "../../hooks/useTheme";
import {
  Users,
  FileText,
  ClipboardCheck,
  TrendingUp,
  UserPlus,
  Activity,
  Search,
  Trophy,
  BookOpen,
  ArrowRight,
  BarChart3,
  X,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface DashboardStats {
  totalStudents: number;
  totalTests: number;
  totalMains: number;
  averageScore: number;
  recentRegistrations: number;
  activeStudents: number;
  highPerformers: number;
  totalPrelimsTests: number;
  prelimsAverageScore: number;
  recentEvaluations: number;
}

interface SubjectPerformance {
  subject: string;
  count: number;
  avgScore: number;
  maxScore: number;
  minScore: number;
}

interface MonthlyTrend {
  month: string;
  evaluations: number;
}

interface RecentActivity {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  paper: string;
  year: number;
  score: number;
  evaluatedAt: string;
}

interface SearchResult {
  id: string;
  name: string;
  email: string;
  joinedAt: string;
  totalEvaluations: number;
  latestScore: number | null;
  lastEvaluationDate: string | null;
  lastSubject: string | null;
  lastPaper: string | null;
}

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const CHART_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#06b6d4", "#ef4444", "#8b5cf6"];

export const AdminDashboardPage = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [subjectPerformance, setSubjectPerformance] = useState<SubjectPerformance[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrend[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [activityPage, setActivityPage] = useState(1);
  const ACTIVITY_PAGE_SIZE = 6;

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/admin/dashboard");
      if (res.data.success) {
        const overview = res.data.data.overview || {};
        setStats({
          totalStudents: overview.totalStudents || 0,
          totalTests: overview.totalEvaluations || 0,
          totalMains: overview.pendingEvaluations || 0,
          averageScore: overview.averageScore || 0,
          recentRegistrations: overview.recentRegistrations || 0,
          activeStudents: overview.activeStudents || 0,
          highPerformers: overview.highPerformers || 0,
          totalPrelimsTests: overview.totalPrelimsTests || 0,
          prelimsAverageScore: overview.prelimsAverageScore || 0,
          recentEvaluations: overview.recentEvaluations || 0,
        });
        setSubjectPerformance(res.data.data.subjectPerformance || []);
        setMonthlyTrend(res.data.data.monthlyTrend || []);
        setRecentActivity(res.data.data.recentActivity || []);
      } else {
        setError("Failed to load dashboard statistics");
      }
    } catch (err: any) {
      console.error("Error fetching dashboard stats:", err);
      setError(err?.response?.data?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const res = await api.get(
        `/api/admin/search?query=${encodeURIComponent(searchQuery.trim())}`
      );
      if (res.data.success) {
        setSearchResults(res.data.data.users);
        setShowSearch(true);
      }
    } catch (err: any) {
      console.error("Search error:", err);
    } finally {
      setSearchLoading(false);
    }
  };

  const trendChartData = useMemo(() => {
    return monthlyTrend.map((item) => {
      const [, monthPart] = item.month.split("-");
      const monthIndex = Math.max(0, (parseInt(monthPart, 10) || 1) - 1);
      return {
        label: MONTH_LABELS[monthIndex] || item.month,
        evaluations: item.evaluations,
        full: item.month,
      };
    });
  }, [monthlyTrend]);

  const subjectChartData = useMemo(
    () =>
      subjectPerformance.slice(0, 6).map((s) => ({
        subject: s.subject.length > 14 ? `${s.subject.slice(0, 14)}…` : s.subject,
        fullName: s.subject,
        avgScore: s.avgScore,
        count: s.count,
      })),
    [subjectPerformance]
  );

  const engagementData = useMemo(() => {
    const active = stats?.activeStudents || 0;
    const total = stats?.totalStudents || 0;
    const inactive = Math.max(0, total - active);
    return [
      { name: "Active (30d)", value: active, color: "#10b981" },
      { name: "Inactive", value: inactive, color: isDark ? "#475569" : "#cbd5e1" },
    ].filter((d) => d.value > 0);
  }, [stats, isDark]);

  const volumeData = useMemo(
    () => [
      { name: "Mains", value: stats?.totalTests || 0, color: "#2563eb" },
      { name: "Prelims", value: stats?.totalPrelimsTests || 0, color: "#06b6d4" },
    ].filter((d) => d.value > 0),
    [stats]
  );

  const activityTotalPages = Math.max(
    1,
    Math.ceil(recentActivity.length / ACTIVITY_PAGE_SIZE)
  );
  const pagedActivity = recentActivity.slice(
    (activityPage - 1) * ACTIVITY_PAGE_SIZE,
    activityPage * ACTIVITY_PAGE_SIZE
  );

  const primaryStats = [
    {
      label: "MD Students",
      value: String(stats?.totalStudents || 0),
      icon: Users,
      iconBg: "bg-blue-500/10 text-blue-500",
      hint: "Admin-managed cohort",
    },
    {
      label: "Avg Mains Score",
      value:
        typeof stats?.averageScore === "number"
          ? `${stats.averageScore.toFixed(1)}%`
          : "0.0%",
      icon: TrendingUp,
      iconBg: "bg-amber-500/10 text-amber-500",
      hint: "Across completed evaluations",
    },
    {
      label: "Prelims Tests",
      value: String(stats?.totalPrelimsTests || 0),
      icon: BookOpen,
      iconBg: "bg-sky-500/10 text-sky-500",
      hint: `Avg ${stats?.prelimsAverageScore ?? 0}%`,
    },
    {
      label: "Active (30d)",
      value: String(stats?.activeStudents || 0),
      icon: Activity,
      iconBg: "bg-emerald-500/10 text-emerald-500",
      hint: `${stats?.recentRegistrations || 0} new in 7d`,
    },
  ];

  const secondaryStats = [
    {
      label: "Completed Evaluations",
      value: String(stats?.totalTests || 0),
      icon: FileText,
      iconBg: "bg-emerald-500/10 text-emerald-500",
    },
    {
      label: "Pending",
      value: String(stats?.totalMains || 0),
      icon: ClipboardCheck,
      iconBg: "bg-blue-500/10 text-blue-500",
    },
    {
      label: "New (7d)",
      value: String(stats?.recentRegistrations || 0),
      icon: UserPlus,
      iconBg: "bg-indigo-500/10 text-indigo-500",
    },
    {
      label: "High Performers",
      value: String(stats?.highPerformers || 0),
      icon: Trophy,
      iconBg: "bg-yellow-500/10 text-yellow-500",
    },
  ];

  const tooltipStyle = isDark
    ? { background: "#0f172a", border: "1px solid #334155", borderRadius: 12 }
    : { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12 };

  const axisStroke = isDark ? "#64748b" : "#94a3b8";
  const gridStroke = isDark ? "#1e293b" : "#e2e8f0";

  const scoreBadge = (score: number) =>
    score >= 70
      ? isDark
        ? "bg-emerald-500/15 text-emerald-300"
        : "bg-emerald-50 text-emerald-700"
      : score >= 50
        ? isDark
          ? "bg-amber-500/15 text-amber-300"
          : "bg-amber-50 text-amber-700"
        : isDark
          ? "bg-red-500/15 text-red-300"
          : "bg-red-50 text-red-700";

  if (loading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          isDark ? "bg-[#020012]" : "bg-slate-50"
        }`}
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center p-6 ${
          isDark ? "bg-[#020012] text-slate-50" : "bg-slate-50 text-slate-900"
        }`}
      >
        <div
          className={`p-4 rounded-2xl border ${
            isDark
              ? "bg-red-500/10 border-red-500/20 text-red-400"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {error}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen p-4 sm:p-6 transition-colors duration-500 ${
        isDark ? "bg-[#020012] text-slate-50" : "bg-slate-50 text-slate-900"
      } font-sans`}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-3xl sm:text-[2rem] font-bold tracking-tight text-blue-500">
                Admin Dashboard
              </h1>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  isDark
                    ? "bg-blue-500/15 text-blue-300"
                    : "bg-blue-50 text-blue-600"
                }`}
              >
                <BarChart3 className="h-3 w-3" />
                Live
              </span>
            </div>
            <p
              className={`mt-1 text-sm ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Cohort health, evaluation trends, and recent student activity.
            </p>
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Link to="/admin/students" className="flex-1 sm:flex-none">
              <Button
                variant="outline"
                className={`w-full h-11 px-5 rounded-xl border ${
                  isDark
                    ? "border-slate-700 hover:bg-slate-800 text-slate-200"
                    : "border-slate-200 hover:bg-white text-slate-700"
                }`}
              >
                MD Students
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Button
              onClick={() => setShowSearch(!showSearch)}
              className="flex-1 sm:flex-none h-11 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
            >
              {showSearch ? (
                <X className="h-4 w-4 mr-2" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              {showSearch ? "Close" : "Search Users"}
            </Button>
          </div>
        </div>

        {/* Search */}
        {showSearch && (
          <Card
            className={`rounded-2xl border shadow-sm ${
              isDark
                ? "bg-slate-900/50 border-slate-800"
                : "bg-white border-slate-100"
            }`}
          >
            <CardContent className="p-4 sm:p-5 space-y-4">
              <form onSubmit={handleSearch} className="flex gap-2.5">
                <Input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`h-11 rounded-xl ${
                    isDark
                      ? "bg-slate-800 border-slate-700 text-slate-100"
                      : "bg-white border-slate-200"
                  }`}
                />
                <Button
                  type="submit"
                  disabled={searchLoading}
                  className="h-11 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                >
                  {searchLoading ? "Searching..." : "Search"}
                </Button>
              </form>

              {searchResults.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {searchResults.map((user) => (
                    <Link
                      key={user.id}
                      to={`/admin/students/${user.id}`}
                      className={`rounded-2xl border p-4 transition-all hover:shadow-md hover:border-blue-400/50 ${
                        isDark
                          ? "bg-slate-800/50 border-slate-700"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <p className="font-semibold truncate">{user.name}</p>
                      <p
                        className={`text-xs mt-0.5 truncate ${
                          isDark ? "text-slate-400" : "text-slate-500"
                        }`}
                      >
                        {user.email}
                      </p>
                      <div className="flex items-center justify-between mt-3 text-xs">
                        <span className={isDark ? "text-slate-500" : "text-slate-500"}>
                          {user.totalEvaluations} evals
                        </span>
                        {user.latestScore != null && (
                          <span
                            className={`px-2 py-0.5 rounded-full font-semibold ${scoreBadge(
                              user.latestScore
                            )}`}
                          >
                            {user.latestScore.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Primary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {primaryStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.label}
                className={`rounded-2xl border shadow-sm transition-shadow hover:shadow-md ${
                  isDark
                    ? "bg-slate-900/50 border-slate-800"
                    : "bg-white border-slate-100"
                }`}
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-500 truncate">
                        {stat.label}
                      </p>
                      <p className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
                        {stat.value}
                      </p>
                      <p
                        className={`text-[11px] mt-1.5 truncate ${
                          isDark ? "text-slate-500" : "text-slate-400"
                        }`}
                      >
                        {stat.hint}
                      </p>
                    </div>
                    <div
                      className={`h-11 w-11 rounded-full flex items-center justify-center shrink-0 ${stat.iconBg}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Secondary strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {secondaryStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
                  isDark
                    ? "bg-slate-900/40 border-slate-800"
                    : "bg-white border-slate-100 shadow-sm"
                }`}
              >
                <div
                  className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${stat.iconBg}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 truncate">
                    {stat.label}
                  </p>
                  <p className="text-lg font-bold tracking-tight">{stat.value}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card
            className={`lg:col-span-2 rounded-2xl border shadow-sm ${
              isDark
                ? "bg-slate-900/50 border-slate-800"
                : "bg-white border-slate-100"
            }`}
          >
            <CardHeader className="pb-2">
              <CardTitle
                className={`text-base font-semibold flex items-center gap-2 ${
                  isDark ? "text-slate-100" : "text-slate-900"
                }`}
              >
                <TrendingUp className="h-4 w-4 text-blue-500" />
                Evaluation Trend
                <span
                  className={`text-xs font-normal ${
                    isDark ? "text-slate-500" : "text-slate-400"
                  }`}
                >
                  Last 6 months
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {trendChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart
                    data={trendChartData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="evalFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 12, fill: axisStroke }}
                      stroke={axisStroke}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 12, fill: axisStroke }}
                      stroke={axisStroke}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      labelFormatter={(_, payload) =>
                        payload?.[0]?.payload?.full || ""
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="evaluations"
                      name="Evaluations"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      fill="url(#evalFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div
                  className={`h-[260px] flex flex-col items-center justify-center ${
                    isDark ? "text-slate-500" : "text-slate-400"
                  }`}
                >
                  <TrendingUp className="h-10 w-10 mb-2 opacity-40" />
                  <p className="text-sm">No trend data yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card
            className={`rounded-2xl border shadow-sm ${
              isDark
                ? "bg-slate-900/50 border-slate-800"
                : "bg-white border-slate-100"
            }`}
          >
            <CardHeader className="pb-2">
              <CardTitle
                className={`text-base font-semibold flex items-center gap-2 ${
                  isDark ? "text-slate-100" : "text-slate-900"
                }`}
              >
                <Activity className="h-4 w-4 text-emerald-500" />
                Engagement
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {engagementData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={engagementData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={72}
                        paddingAngle={3}
                      >
                        {engagementData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-1">
                    {engagementData.map((d) => (
                      <div
                        key={d.name}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ background: d.color }}
                          />
                          <span
                            className={isDark ? "text-slate-300" : "text-slate-600"}
                          >
                            {d.name}
                          </span>
                        </span>
                        <span className="font-semibold">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div
                  className={`h-[260px] flex items-center justify-center text-sm ${
                    isDark ? "text-slate-500" : "text-slate-400"
                  }`}
                >
                  No engagement data
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Subject + volume charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card
            className={`lg:col-span-2 rounded-2xl border shadow-sm ${
              isDark
                ? "bg-slate-900/50 border-slate-800"
                : "bg-white border-slate-100"
            }`}
          >
            <CardHeader className="pb-2">
              <CardTitle
                className={`text-base font-semibold flex items-center gap-2 ${
                  isDark ? "text-slate-100" : "text-slate-900"
                }`}
              >
                <BarChart3 className="h-4 w-4 text-blue-500" />
                Subject Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {subjectChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={subjectChartData}
                    layout="vertical"
                    margin={{ top: 5, right: 16, left: 8, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={gridStroke}
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: axisStroke }}
                      stroke={axisStroke}
                    />
                    <YAxis
                      type="category"
                      dataKey="subject"
                      width={90}
                      tick={{ fontSize: 11, fill: axisStroke }}
                      stroke={axisStroke}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: number, _n, item) => [
                        `${value}% avg · ${item?.payload?.count || 0} evals`,
                        item?.payload?.fullName || "Subject",
                      ]}
                    />
                    <Bar
                      dataKey="avgScore"
                      name="Avg Score"
                      radius={[0, 8, 8, 0]}
                      barSize={18}
                    >
                      {subjectChartData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={CHART_COLORS[i % CHART_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div
                  className={`h-[280px] flex flex-col items-center justify-center ${
                    isDark ? "text-slate-500" : "text-slate-400"
                  }`}
                >
                  <FileText className="h-10 w-10 mb-2 opacity-40" />
                  <p className="text-sm">No subject performance yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card
            className={`rounded-2xl border shadow-sm ${
              isDark
                ? "bg-slate-900/50 border-slate-800"
                : "bg-white border-slate-100"
            }`}
          >
            <CardHeader className="pb-2">
              <CardTitle
                className={`text-base font-semibold flex items-center gap-2 ${
                  isDark ? "text-slate-100" : "text-slate-900"
                }`}
              >
                <BookOpen className="h-4 w-4 text-sky-500" />
                Practice Volume
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {volumeData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={volumeData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={72}
                        paddingAngle={3}
                      >
                        {volumeData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend
                        verticalAlign="bottom"
                        height={28}
                        formatter={(value) => (
                          <span
                            className={`text-xs ${
                              isDark ? "text-slate-300" : "text-slate-600"
                            }`}
                          >
                            {value}
                          </span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div
                      className={`rounded-xl p-3 text-center ${
                        isDark ? "bg-slate-800/60" : "bg-slate-50"
                      }`}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Mains
                      </p>
                      <p className="text-xl font-bold text-blue-500 mt-0.5">
                        {stats?.totalTests || 0}
                      </p>
                    </div>
                    <div
                      className={`rounded-xl p-3 text-center ${
                        isDark ? "bg-slate-800/60" : "bg-slate-50"
                      }`}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Prelims
                      </p>
                      <p className="text-xl font-bold text-sky-500 mt-0.5">
                        {stats?.totalPrelimsTests || 0}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div
                  className={`h-[260px] flex items-center justify-center text-sm ${
                    isDark ? "text-slate-500" : "text-slate-400"
                  }`}
                >
                  No practice volume yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent activity */}
        <Card
          className={`rounded-2xl border shadow-sm ${
            isDark
              ? "bg-slate-900/50 border-slate-800"
              : "bg-white border-slate-100"
          }`}
        >
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3">
            <CardTitle
              className={`text-base font-semibold flex items-center gap-2 ${
                isDark ? "text-slate-100" : "text-slate-900"
              }`}
            >
              <Activity className="h-4 w-4 text-blue-500" />
              Recent Activity
            </CardTitle>
            {recentActivity.length > 0 && (
              <span
                className={`text-xs font-medium ${
                  isDark ? "text-slate-500" : "text-slate-400"
                }`}
              >
                {recentActivity.length} latest
              </span>
            )}
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div
                className={`text-center py-12 ${
                  isDark ? "text-slate-500" : "text-slate-400"
                }`}
              >
                <Activity className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No recent activity yet</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {pagedActivity.map((activity) => {
                    const initials = activity.userName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2);
                    return (
                      <div
                        key={activity.id}
                        className={`rounded-2xl border p-4 transition-all hover:shadow-md ${
                          isDark
                            ? "bg-slate-800/40 border-slate-700"
                            : "bg-slate-50/80 border-slate-200"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              isDark
                                ? "bg-blue-500/20 text-blue-300"
                                : "bg-blue-50 text-blue-600"
                            }`}
                          >
                            {initials || "?"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-semibold text-sm truncate">
                                {activity.userName}
                              </p>
                              <span
                                className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold ${scoreBadge(
                                  activity.score
                                )}`}
                              >
                                {activity.score.toFixed(1)}%
                              </span>
                            </div>
                            <p
                              className={`text-xs mt-0.5 truncate ${
                                isDark ? "text-slate-400" : "text-slate-500"
                              }`}
                            >
                              {activity.subject}
                              {activity.paper ? ` · ${activity.paper}` : ""}
                            </p>
                            <p
                              className={`text-[11px] mt-1.5 ${
                                isDark ? "text-slate-500" : "text-slate-400"
                              }`}
                            >
                              {new Date(activity.evaluatedAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        {activity.userId && (
                          <Link
                            to={`/admin/students/${activity.userId}`}
                            className={`mt-3 inline-flex items-center text-xs font-semibold ${
                              isDark
                                ? "text-blue-300 hover:text-blue-200"
                                : "text-blue-600 hover:text-blue-700"
                            }`}
                          >
                            View student
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>

                {activityTotalPages > 1 && (
                  <div className="flex items-center justify-between gap-3 mt-4 pt-3">
                    <p
                      className={`text-xs ${
                        isDark ? "text-slate-500" : "text-slate-400"
                      }`}
                    >
                      Page {activityPage} of {activityTotalPages}
                    </p>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={activityPage <= 1}
                        onClick={() => setActivityPage((p) => Math.max(1, p - 1))}
                        className="h-8 px-3 rounded-xl"
                      >
                        Prev
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={activityPage >= activityTotalPages}
                        onClick={() =>
                          setActivityPage((p) =>
                            Math.min(activityTotalPages, p + 1)
                          )
                        }
                        className="h-8 px-3 rounded-xl"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
