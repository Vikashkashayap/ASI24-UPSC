import { useEffect, useState } from "react";
import { api, copyEvaluationAPI } from "../services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { useTheme } from "../hooks/useTheme";
import { FileText, TrendingUp, Award } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const DashboardPage = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any | null>(null);
  const [copyEvalStats, setCopyEvalStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/api/performance");
        const performance = res.data;
        setStats({
          totalAnswers: performance.history.length,
          averageScore: performance.averageScore,
          weakSubjects: performance.weakSubjects,
          consistency: performance.consistency,
          trend: performance.trend,
        });
      } catch {
        setStats({ totalAnswers: 0, averageScore: 0, weakSubjects: [], consistency: 0, trend: [] });
      }

      // Load Copy Evaluation Analytics
      try {
        const evalRes = await copyEvaluationAPI.getAnalytics();
        if (evalRes.data.success) {
          setCopyEvalStats(evalRes.data.data);
        }
      } catch {
        setCopyEvalStats({ totalEvaluations: 0, averageScore: 0, improvementTrend: 0 });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const dailySuggestion =
    "Pick one PYQ from your weakest GS paper today, write it under 10-12 minutes, and then compare it with the model structure.";

  return (
    <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 pb-8">
      <div className="flex flex-col gap-1 md:gap-2">
        <h1 className={`text-xl md:text-2xl font-semibold tracking-tight ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>Dashboard</h1>
        <p className={`text-xs md:text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>A quick snapshot of your mains practice journey.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="col-span-1">
          <CardHeader className="pb-2 md:pb-3">
            <CardTitle className="text-sm md:text-base">Total answers</CardTitle>
            <CardDescription className="text-xs hidden md:block">How many times you showed up.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 md:pt-2">
            <div className={`text-xl md:text-2xl font-semibold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
              {loading ? "--" : stats?.totalAnswers || 0}
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-1">
          <CardHeader className="pb-2 md:pb-3">
            <CardTitle className="text-sm md:text-base">Average score</CardTitle>
            <CardDescription className="text-xs hidden md:block">Across all evaluated answers.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 md:pt-2">
            <div className="text-xl md:text-2xl font-semibold text-emerald-600 dark:text-emerald-300">
              {loading ? "--" : stats?.averageScore || 0}
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-1">
          <CardHeader className="pb-2 md:pb-3">
            <CardTitle className="text-sm md:text-base">Weak subjects</CardTitle>
            <CardDescription className="text-xs hidden md:block">Top areas to rebuild.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 md:pt-2">
            <div className={`text-xs ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
              {loading ? "--" : stats?.weakSubjects?.join(", ") || "TBD"}
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-1">
          <CardHeader className="pb-2 md:pb-3">
            <CardTitle className="text-sm md:text-base">Consistency</CardTitle>
            <CardDescription className="text-xs hidden md:block">How stable your marks trend is.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 md:pt-2">
            <div className={`text-xl md:text-2xl font-semibold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
              {loading ? "--" : `${stats?.consistency || 0}%`}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <Card className="md:col-span-2">
          <CardHeader className="pb-2 md:pb-3">
            <CardTitle className="text-sm md:text-base">Marks trend</CardTitle>
            <CardDescription className="text-xs md:text-sm">Line view of your scores.</CardDescription>
          </CardHeader>
          <CardContent className="h-48 md:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats?.trend || []} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  tick={{ fontSize: 9, fill: theme === "dark" ? "#94a3b8" : "#64748b" }}
                  stroke={theme === "dark" ? "#475569" : "#cbd5e1"}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tick={{ fontSize: 9, fill: theme === "dark" ? "#94a3b8" : "#64748b" }} 
                  domain={[0, 100]} 
                  stroke={theme === "dark" ? "#475569" : "#cbd5e1"}
                  width={30}
                />
                <Tooltip
                  formatter={(value: any) => [`${value} marks`, "Score"]}
                  labelFormatter={(value) => new Date(value).toLocaleDateString("en-IN")}
                  contentStyle={{ 
                    backgroundColor: theme === "dark" ? "#0f172a" : "#ffffff", 
                    border: theme === "dark" ? "1px solid #334155" : "1px solid #e2e8f0",
                    borderRadius: "8px",
                    color: theme === "dark" ? "#f1f5f9" : "#0f172a"
                  }}
                />
                <Line type="monotone" dataKey="score" stroke="#14b8a6" strokeWidth={2} dot={{ fill: "#14b8a6", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 md:pb-3">
            <CardTitle className="text-sm md:text-base">Daily suggestion</CardTitle>
            <CardDescription className="text-xs md:text-sm">A small nudge for today.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className={`text-xs md:text-sm leading-relaxed ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>{dailySuggestion}</p>
          </CardContent>
        </Card>
      </div>

      {/* Copy Evaluation Analytics */}
      {copyEvalStats && copyEvalStats.totalEvaluations > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          {/* Stats Card */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow col-span-1"
            onClick={() => navigate('/copy-evaluation')}
          >
            <CardHeader className="pb-2 md:pb-3">
              <CardTitle className="text-sm md:text-base">Copy Evaluations</CardTitle>
              <CardDescription className="text-xs hidden md:block">Your answer copy performance</CardDescription>
            </CardHeader>
            <CardContent className="pt-0 md:pt-2">
              <div className="space-y-2 md:space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>Total Evaluations</span>
                  <div className={`text-xl md:text-2xl font-semibold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
                    {copyEvalStats.totalEvaluations}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>Average Score</span>
                  <div className="text-xl md:text-2xl font-semibold text-emerald-600 dark:text-emerald-300">
                    {copyEvalStats.averageScore}%
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>Improvement</span>
                  <div className={`text-xl md:text-2xl font-semibold flex items-center gap-1 ${
                    copyEvalStats.improvementTrend > 0 ? 'text-green-600 dark:text-green-400' : 
                    copyEvalStats.improvementTrend < 0 ? 'text-red-600 dark:text-red-400' : 
                    theme === "dark" ? "text-slate-400" : "text-slate-600"
                  }`}>
                    {copyEvalStats.improvementTrend > 0 && <TrendingUp className="w-4 h-4" />}
                    {copyEvalStats.improvementTrend !== 0 ? `${Math.abs(copyEvalStats.improvementTrend)}%` : '-'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bar Chart */}
          {copyEvalStats.recentEvaluations && copyEvalStats.recentEvaluations.length > 0 && (
            <Card className="md:col-span-2 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/copy-evaluation')}>
              <CardHeader className="pb-2 md:pb-3">
                <CardTitle className="text-sm md:text-base">Copy Evaluation Trend</CardTitle>
                <CardDescription className="text-xs md:text-sm">Recent evaluation scores</CardDescription>
              </CardHeader>
              <CardContent className="h-48 md:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={copyEvalStats.recentEvaluations.slice(0, 10).map((e: any) => ({
                      date: new Date(e.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
                      score: e.score,
                      name: e.subject || 'Copy'
                    }))} 
                    margin={{ left: -20, right: 10, top: 10, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 9, fill: theme === "dark" ? "#94a3b8" : "#64748b" }}
                      stroke={theme === "dark" ? "#475569" : "#cbd5e1"}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      tick={{ fontSize: 9, fill: theme === "dark" ? "#94a3b8" : "#64748b" }} 
                      domain={[0, 100]} 
                      stroke={theme === "dark" ? "#475569" : "#cbd5e1"}
                      width={30}
                    />
                    <Tooltip
                      formatter={(value: any) => [`${value}%`, "Score"]}
                      contentStyle={{ 
                        backgroundColor: theme === "dark" ? "#0f172a" : "#ffffff", 
                        border: theme === "dark" ? "1px solid #334155" : "1px solid #e2e8f0",
                        borderRadius: "8px",
                        color: theme === "dark" ? "#f1f5f9" : "#0f172a"
                      }}
                    />
                    <Bar dataKey="score" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
