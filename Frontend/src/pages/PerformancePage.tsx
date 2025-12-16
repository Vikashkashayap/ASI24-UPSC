import { useEffect, useState } from "react";
import { api } from "../services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useTheme } from "../hooks/useTheme";

const COLORS = ["#0f766e", "#059669", "#14b8a6", "#22c55e", "#06b6d4", "#4ade80"];

export const PerformancePage = () => {
  const { theme } = useTheme();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
      <div className="flex flex-col gap-1 md:gap-2">
        <h1 className={`text-xl md:text-2xl font-semibold tracking-tight ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>Performance</h1>
        <p className={`text-xs md:text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>Visualize your marks, subjects, and answer history.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        <Card>
          <CardHeader className="pb-2 md:pb-3">
            <CardTitle className="text-sm md:text-base">Marks trend</CardTitle>
            <CardDescription className="text-xs md:text-sm">Line view of your scores.</CardDescription>
          </CardHeader>
          <CardContent className="h-48 md:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.history || []} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                <XAxis
                  dataKey="createdAt"
                  tickFormatter={(value) => new Date(value).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
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
                  labelFormatter={(value) => new Date(value).toLocaleString("en-IN")}
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
            <CardTitle className="text-sm md:text-base">Weak areas</CardTitle>
            <CardDescription className="text-xs md:text-sm">Subject-wise average scores.</CardDescription>
          </CardHeader>
          <CardContent className="h-48 md:h-64 flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
            <div className="w-full md:w-1/2 h-32 md:h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.subjectBreakdown || []}
                    dataKey="average"
                    nameKey="subject"
                    innerRadius={30}
                    outerRadius={50}
                    paddingAngle={3}
                  >
                    {(data?.subjectBreakdown || []).map((_: any, index: number) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => [`${value}`, "Average"]} 
                    contentStyle={{ fontSize: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className={`flex-1 text-[10px] md:text-xs space-y-1 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
              {(data?.subjectBreakdown || []).map((s: any, idx: number) => (
                <div key={s.subject} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <span className={theme === "dark" ? "text-slate-200" : "text-slate-900"}>{s.subject}</span>
                  </div>
                  <span className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>{s.average}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2 md:pb-3">
          <CardTitle className="text-sm md:text-base">Answer history</CardTitle>
          <CardDescription className="text-xs md:text-sm">Recent evaluated attempts.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto text-[10px] md:text-xs">
            <table className="min-w-full border-separate border-spacing-y-1">
              <thead>
                <tr className={`text-left ${theme === "dark" ? "text-slate-500" : "text-slate-600"}`}>
                  <th className="py-1.5 md:py-2 pr-2 md:pr-4">Date</th>
                  <th className="py-1.5 md:py-2 pr-2 md:pr-4">Subject</th>
                  <th className="py-1.5 md:py-2 pr-2 md:pr-4 hidden sm:table-cell">Question</th>
                  <th className="py-1.5 md:py-2 pr-2 md:pr-4">Score</th>
                </tr>
              </thead>
              <tbody>
                {(data?.history || []).map((row: any) => (
                  <tr key={row.id} className={theme === "dark" ? "bg-slate-900/50 hover:bg-slate-800/50" : "bg-slate-50 hover:bg-slate-100"}>
                    <td className={`py-1.5 md:py-2 pr-2 md:pr-4 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                      {new Date(row.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                    </td>
                    <td className={`py-1.5 md:py-2 pr-2 md:pr-4 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>{row.subject}</td>
                    <td className={`py-1.5 md:py-2 pr-2 md:pr-4 max-w-[150px] md:max-w-xs truncate hidden sm:table-cell ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>{row.question}</td>
                    <td className={`py-1.5 md:py-2 pr-2 md:pr-4 font-medium ${theme === "dark" ? "text-emerald-300" : "text-emerald-600"}`}>{row.score}</td>
                  </tr>
                ))}
                {!loading && (!data || data.history.length === 0) && (
                  <tr>
                    <td colSpan={4} className={`py-3 md:py-4 text-center ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                      No answers evaluated yet. Start with your first mains-style attempt today.
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
