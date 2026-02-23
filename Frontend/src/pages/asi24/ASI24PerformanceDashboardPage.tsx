import { useParams } from "react-router-dom";
import { getExamLabel, isValidExamSlug } from "../../constants/exams";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  Target,
  Activity,
  FileText,
  ClipboardList,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import { Navigate } from "react-router-dom";
import { useState } from "react";
import { useTheme } from "../../hooks/useTheme";

// Mock data for all exams (SSC, Banking, etc.) - replace with API later
const MOCK_METRICS = {
  overallAverage: 14,
  totalActivities: 19,
  copyEvaluations: 0,
  prelimsTests: 19,
};

const MOCK_ACTIVITY_DATA = [
  { name: "Mock Tests", value: 19, color: "#8b5cf6" },
  { name: "Sectional Tests", value: 0, color: "#06b6d4" },
];

const MOCK_SCORE_TREND = [
  { name: "Week 1", score: 12 },
  { name: "Week 2", score: 14 },
  { name: "Week 3", score: 11 },
  { name: "Week 4", score: 16 },
  { name: "Week 5", score: 14 },
];

export function ASI24PerformanceDashboardPage() {
  const { examSlug } = useParams<{ examSlug: string }>();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [selectedTimeframe, setSelectedTimeframe] = useState<"week" | "month" | "all">("all");
  const [activeTab, setActiveTab] = useState<"overview" | "mock-tests" | "pyq">("overview");

  if (!examSlug || !isValidExamSlug(examSlug)) {
    return <Navigate to="/" replace />;
  }

  const examName = getExamLabel(examSlug);
  const filterCls = isDark ? "bg-slate-900/60 border border-purple-800/40" : "bg-slate-100 border border-slate-200";
  const filterBtnInactive = isDark ? "text-slate-300 hover:text-slate-100 hover:bg-slate-800/60" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200";

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className={`text-2xl md:text-3xl font-bold ${isDark ? "text-slate-50" : "text-slate-900"}`}>
          Performance Dashboard
        </h1>
        <p className={`mt-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
          Comprehensive analysis of your {examName} preparation performance.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className={`flex gap-2 p-1 rounded-xl w-fit ${filterCls}`}>
          {(["week", "month", "all"] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setSelectedTimeframe(tf)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition ${selectedTimeframe === tf ? "bg-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/25" : filterBtnInactive}`}
            >
              {tf === "all" ? "All Time" : tf === "month" ? "Month" : "Week"}
            </button>
          ))}
        </div>
        <div className={`flex gap-2 p-1 rounded-xl w-fit ${filterCls}`}>
          {(["overview", "mock-tests", "pyq"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition ${activeTab === tab ? "bg-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/25" : filterBtnInactive}`}
            >
              {tab === "pyq" ? "PYQ" : tab === "mock-tests" ? "Mock Tests" : "Overview"}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "overview" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <Card className={`relative overflow-hidden group transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${isDark ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-2 border-purple-500/20 shadow-lg shadow-purple-500/10" : "bg-white border border-slate-200 shadow-md"}`}>
              {isDark && <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/30 via-purple-400/20 to-transparent rounded-full blur-3xl" />}
              <CardHeader className="pb-3 relative z-10">
                <div className="flex items-center justify-between">
                  <CardTitle className={`text-xs md:text-sm font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>Overall Average</CardTitle>
                  <div className={`p-2 rounded-lg ${isDark ? "bg-purple-500/20" : "bg-purple-100"}`}>
                    <Target className={`w-4 h-4 ${isDark ? "text-purple-400" : "text-purple-600"}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-300 to-purple-500 bg-clip-text text-transparent">{MOCK_METRICS.overallAverage}%</div>
                <div className={`mt-2 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Combined performance</div>
              </CardContent>
            </Card>

            <Card className={`relative overflow-hidden group transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${isDark ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-2 border-cyan-500/20 shadow-lg shadow-cyan-500/10" : "bg-white border border-slate-200 shadow-md"}`}>
              {isDark && <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/30 via-cyan-400/20 to-transparent rounded-full blur-3xl" />}
              <CardHeader className="pb-3 relative z-10">
                <div className="flex items-center justify-between">
                  <CardTitle className={`text-xs md:text-sm font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>Total Activities</CardTitle>
                  <div className={`p-2 rounded-lg ${isDark ? "bg-cyan-500/20" : "bg-cyan-100"}`}>
                    <Activity className={`w-4 h-4 ${isDark ? "text-cyan-400" : "text-cyan-600"}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-cyan-300 to-cyan-500 bg-clip-text text-transparent">{MOCK_METRICS.totalActivities}</div>
                <div className={`mt-2 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>All activities</div>
              </CardContent>
            </Card>

            <Card className={`relative overflow-hidden group transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${isDark ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-2 border-teal-500/20 shadow-lg shadow-teal-500/10" : "bg-white border border-slate-200 shadow-md"}`}>
              <CardHeader className="pb-3 relative z-10">
                <div className="flex items-center justify-between">
                  <CardTitle className={`text-xs md:text-sm font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>Sectional Tests</CardTitle>
                  <div className={`p-2 rounded-lg ${isDark ? "bg-teal-500/20" : "bg-teal-100"}`}>
                    <FileText className={`w-4 h-4 ${isDark ? "text-teal-400" : "text-teal-600"}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-teal-300 to-teal-500 bg-clip-text text-transparent">{MOCK_METRICS.copyEvaluations}</div>
                <div className={`mt-2 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Section-wise practice</div>
              </CardContent>
            </Card>

            <Card className={`relative overflow-hidden group transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${isDark ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-2 border-amber-500/20 shadow-lg shadow-amber-500/10" : "bg-white border border-slate-200 shadow-md"}`}>
              <CardHeader className="pb-3 relative z-10">
                <div className="flex items-center justify-between">
                  <CardTitle className={`text-xs md:text-sm font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>Mock Tests</CardTitle>
                  <div className={`p-2 rounded-lg ${isDark ? "bg-amber-500/20" : "bg-amber-100"}`}>
                    <ClipboardList className={`w-4 h-4 ${isDark ? "text-amber-400" : "text-amber-600"}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">{MOCK_METRICS.prelimsTests}</div>
                <div className={`mt-2 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>MCQ tests</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className={`relative overflow-hidden border-2 ${isDark ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-purple-500/20 shadow-lg" : "bg-white border-slate-200 shadow-md"}`}>
              <CardHeader className="pb-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isDark ? "bg-purple-500/20" : "bg-purple-100"}`}>
                    <BarChart3 className={`w-5 h-5 ${isDark ? "text-purple-400" : "text-purple-600"}`} />
                  </div>
                  <div>
                    <CardTitle className={`text-lg md:text-xl font-bold ${isDark ? "text-slate-50" : "text-slate-900"}`}>Activity Distribution</CardTitle>
                    <CardDescription className={`mt-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>Mock tests vs Sectional tests</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={MOCK_ACTIVITY_DATA}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      innerRadius={40}
                      paddingAngle={5}
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {MOCK_ACTIVITY_DATA.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        border: "1px solid #334155",
                        borderRadius: "12px",
                        padding: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className={`relative overflow-hidden border-2 ${isDark ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-cyan-500/20 shadow-lg" : "bg-white border-slate-200 shadow-md"}`}>
              <CardHeader className="pb-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isDark ? "bg-cyan-500/20" : "bg-cyan-100"}`}>
                    <TrendingUp className={`w-5 h-5 ${isDark ? "text-cyan-400" : "text-cyan-600"}`} />
                  </div>
                  <div>
                    <CardTitle className={`text-lg md:text-xl font-bold ${isDark ? "text-slate-50" : "text-slate-900"}`}>Performance Overview</CardTitle>
                    <CardDescription className={`mt-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>Average scores across activities</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={MOCK_SCORE_TREND}
                    margin={{ top: 20, right: 20, left: 0, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#334155" : "#cbd5e1"} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: isDark ? "#94a3b8" : "#64748b" }} />
                    <YAxis tick={{ fontSize: 11, fill: isDark ? "#94a3b8" : "#64748b" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? "#0f172a" : "#ffffff",
                        border: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
                        borderRadius: "12px",
                        padding: "12px",
                      }}
                    />
                    <Bar
                      dataKey="score"
                      fill="url(#barGradientPurple)"
                      name="Score %"
                      radius={[4, 4, 0, 0]}
                    />
                    <defs>
                      <linearGradient
                        id="barGradientPurple"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
                        <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.8} />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {activeTab === "mock-tests" && (
        <Card className={isDark ? "border border-purple-800/40 bg-slate-900/40 p-8" : "border border-slate-200 bg-white shadow-md p-8"}>
          <p className={isDark ? "text-slate-400" : "text-slate-600"}>Mock tests list and history will appear here.</p>
          <span className={`inline-block mt-3 rounded-lg px-4 py-2 text-sm ${isDark ? "bg-slate-800/60 text-slate-300" : "bg-slate-100 text-slate-700"}`}>Coming soon</span>
        </Card>
      )}

      {activeTab === "pyq" && (
        <Card className={isDark ? "border border-purple-800/40 bg-slate-900/40 p-8" : "border border-slate-200 bg-white shadow-md p-8"}>
          <p className={isDark ? "text-slate-400" : "text-slate-600"}>Previous year papers and solutions will appear here.</p>
          <span className={`inline-block mt-3 rounded-lg px-4 py-2 text-sm ${isDark ? "bg-slate-800/60 text-slate-300" : "bg-slate-100 text-slate-700"}`}>Coming soon</span>
        </Card>
      )}
    </div>
  );
}
