import React, { useCallback, useEffect, useState } from "react";
import {
  Coins,
  Loader2,
  RefreshCw,
  TrendingDown,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { useTheme } from "../../hooks/useTheme";
import {
  aiOrchestratorAPI,
  type AiCostAnalytics,
} from "../../services/api";

function money(n: number | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return `$${Number(n).toFixed(4)}`;
}

function num(n: number | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return Number(n).toLocaleString();
}

export const AdminAiAnalyticsPage: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const muted = isDark ? "text-slate-400" : "text-slate-500";
  const [data, setData] = useState<AiCostAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await aiOrchestratorAPI.analytics({ limit: 40 });
      const payload = res.data;
      if (payload?.success === false) {
        setError("Failed to load AI cost analytics");
        setData(null);
      } else {
        setData(payload);
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string; error?: string } } };
      setError(
        ax.response?.data?.message ||
          ax.response?.data?.error ||
          "Failed to load AI cost analytics"
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = data?.summary;
  const stats = [
    {
      label: "Requests",
      value: num(summary?.requests),
      icon: Zap,
    },
    {
      label: "Actual tokens",
      value: num(summary?.actualTokens),
      icon: Coins,
    },
    {
      label: "Actual cost",
      value: money(summary?.actualCost),
      icon: Coins,
    },
    {
      label: "Est. cost",
      value: money(summary?.estimatedCost),
      icon: Coins,
    },
    {
      label: "Avg savings",
      value:
        summary?.avgSavingsPct != null
          ? `${summary.avgSavingsPct.toFixed(1)}%`
          : "—",
      icon: TrendingDown,
    },
    {
      label: "Avg latency",
      value:
        summary?.avgLatencyMs != null
          ? `${Math.round(summary.avgLatencyMs)} ms`
          : "—",
      icon: Clock,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className={`text-xl font-bold ${isDark ? "text-slate-50" : "text-slate-900"}`}>
            AI Cost Analytics
          </h1>
          <p className={`text-sm mt-1 ${muted}`}>
            Estimated vs actual tokens and spend across orchestrator tasks
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
          className="gap-2"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Refresh
        </Button>
      </div>

      {data?.live && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            data.live.targetMet
              ? isDark
                ? "border-emerald-700/50 bg-emerald-950/40 text-emerald-300"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
              : isDark
                ? "border-amber-700/50 bg-amber-950/40 text-amber-300"
                : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          Prompt savings {data.live.promptSavingsPct?.toFixed?.(1) ?? data.live.promptSavingsPct}%
          {" · "}
          Target {data.live.targetSavingsPct}%
          {data.live.targetMet ? " — met" : " — below target"}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 text-red-700 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {stats.map((s) => (
              <Card key={s.label} className={isDark ? "bg-slate-900 border-slate-700" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <s.icon className={`w-4 h-4 ${muted}`} />
                    <span className={`text-xs ${muted}`}>{s.label}</span>
                  </div>
                  <div
                    className={`text-2xl font-bold tabular-nums ${
                      isDark ? "text-slate-50" : "text-slate-900"
                    }`}
                  >
                    {s.value}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className={isDark ? "bg-slate-900 border-slate-700" : ""}>
              <CardContent className="p-4">
                <h2 className={`font-semibold mb-3 ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                  By task
                </h2>
                {(data?.byTask?.length ?? 0) === 0 ? (
                  <p className={`text-sm ${muted}`}>No task breakdown yet.</p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {data!.byTask.map((row) => (
                      <div
                        key={row.task}
                        className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${
                          isDark ? "border-slate-700/70" : "border-slate-100"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className={`font-medium truncate ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                            {row.task}
                          </p>
                          <p className={`text-xs ${muted}`}>
                            {num(row.requests)} req · {num(row.actualTokens)} tokens
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`font-semibold tabular-nums ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                            {money(row.actualCost)}
                          </p>
                          <p className={`text-xs ${muted}`}>
                            {row.avgSavingsPct?.toFixed?.(1) ?? row.avgSavingsPct}% saved
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className={isDark ? "bg-slate-900 border-slate-700" : ""}>
              <CardContent className="p-4">
                <h2 className={`font-semibold mb-3 ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                  By day
                </h2>
                {(data?.byDay?.length ?? 0) === 0 ? (
                  <p className={`text-sm ${muted}`}>No daily data yet.</p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {data!.byDay.map((row) => (
                      <div
                        key={row.date}
                        className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${
                          isDark ? "border-slate-700/70" : "border-slate-100"
                        }`}
                      >
                        <div>
                          <p className={`font-medium ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                            {row.date}
                          </p>
                          <p className={`text-xs ${muted}`}>
                            {num(row.requests)} req · {num(row.actualTokens)} tokens
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold tabular-nums ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                            {money(row.actualCost)}
                          </p>
                          <p className={`text-xs ${muted}`}>est {money(row.estimatedCost)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className={isDark ? "bg-slate-900 border-slate-700" : ""}>
            <CardContent className="p-4">
              <h2 className={`font-semibold mb-3 ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                Recent requests
              </h2>
              {(data?.recent?.length ?? 0) === 0 ? (
                <p className={`text-sm ${muted}`}>No recent AI requests logged.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={`text-left text-xs uppercase tracking-wide ${muted}`}>
                        <th className="py-2 pr-3 font-medium">Task</th>
                        <th className="py-2 pr-3 font-medium">Model</th>
                        <th className="py-2 pr-3 font-medium">Status</th>
                        <th className="py-2 pr-3 font-medium">Tokens</th>
                        <th className="py-2 pr-3 font-medium">Cost</th>
                        <th className="py-2 font-medium">When</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data!.recent.map((row) => (
                        <tr
                          key={row.requestId}
                          className={`border-t ${isDark ? "border-slate-800" : "border-slate-100"}`}
                        >
                          <td className={`py-2.5 pr-3 ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                            {row.task}
                          </td>
                          <td className={`py-2.5 pr-3 truncate max-w-[140px] ${muted}`}>{row.model}</td>
                          <td className="py-2.5 pr-3">
                            <span className="inline-flex items-center gap-1">
                              {String(row.status).toLowerCase().includes("fail") ||
                              String(row.status).toLowerCase().includes("error") ? (
                                <XCircle className="w-3.5 h-3.5 text-red-500" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              )}
                              {row.status}
                            </span>
                          </td>
                          <td className="py-2.5 pr-3 tabular-nums">
                            {num(row.actualTokens)}
                            <span className={`text-xs ml-1 ${muted}`}>
                              (est {num(row.estimatedTokens)})
                            </span>
                          </td>
                          <td className="py-2.5 pr-3 tabular-nums">{money(row.actualCost)}</td>
                          <td className={`py-2.5 text-xs ${muted}`}>
                            {row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default AdminAiAnalyticsPage;
