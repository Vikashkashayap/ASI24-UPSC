import React, { useCallback, useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Clock,
  Server,
  Cpu,
  Layers,
} from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { useTheme } from "../../hooks/useTheme";
import {
  aiOrchestratorAPI,
  type AiHealthMonitor,
} from "../../services/api";

const LEVEL_STYLE: Record<
  string,
  { dark: string; light: string; icon: typeof CheckCircle2 }
> = {
  healthy: {
    dark: "text-emerald-300 bg-emerald-500/15 border-emerald-500/35",
    light: "text-emerald-800 bg-emerald-50 border-emerald-200",
    icon: CheckCircle2,
  },
  degraded: {
    dark: "text-amber-300 bg-amber-500/15 border-amber-500/35",
    light: "text-amber-900 bg-amber-50 border-amber-200",
    icon: AlertTriangle,
  },
  critical: {
    dark: "text-red-300 bg-red-500/15 border-red-500/35",
    light: "text-red-800 bg-red-50 border-red-200",
    icon: AlertTriangle,
  },
  idle: {
    dark: "text-slate-300 bg-slate-500/15 border-slate-500/35",
    light: "text-slate-700 bg-slate-50 border-slate-200",
    icon: Activity,
  },
  unknown: {
    dark: "text-slate-300 bg-slate-500/15 border-slate-500/35",
    light: "text-slate-700 bg-slate-50 border-slate-200",
    icon: Activity,
  },
};

function pct(n: number | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  const v = n <= 1 ? n * 100 : n;
  return `${v.toFixed(1)}%`;
}

function ms(n: number | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return `${Math.round(n)} ms`;
}

function money(n: number | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return `$${Number(n).toFixed(4)}`;
}

export const AdminAiHealthMonitorPage: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const muted = isDark ? "text-slate-400" : "text-slate-500";
  const [data, setData] = useState<AiHealthMonitor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [windowMinutes, setWindowMinutes] = useState(60);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await aiOrchestratorAPI.health({ windowMinutes });
      const payload = res.data;
      if (payload?.success === false) {
        setError("Failed to load AI health");
        setData(null);
      } else {
        setData(payload);
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string; error?: string } } };
      setError(
        ax.response?.data?.message ||
          ax.response?.data?.error ||
          "Failed to load AI health monitor"
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [windowMinutes]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(id);
  }, [load]);

  const level = data?.status?.level || "unknown";
  const levelStyle = LEVEL_STYLE[level] || LEVEL_STYLE.unknown;
  const LevelIcon = levelStyle.icon;
  const m = data?.metrics;
  const q = data?.queue;
  const model = data?.currentModel;

  const metricCards = [
    { label: "Avg response", value: ms(m?.averageResponseTimeMs), icon: Clock },
    { label: "Success rate", value: pct(m?.successRate), icon: CheckCircle2 },
    { label: "Failure rate", value: pct(m?.failureRate), icon: AlertTriangle },
    { label: "Requests", value: m?.requestCount?.toLocaleString?.() ?? "—", icon: Activity },
    { label: "Avg tokens", value: m?.averageTokens != null ? Math.round(m.averageTokens).toLocaleString() : "—", icon: Cpu },
    { label: "Avg cost", value: money(m?.averageCost), icon: Server },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className={`text-xl font-bold ${isDark ? "text-slate-50" : "text-slate-900"}`}>
            AI Health Monitor
          </h1>
          <p className={`text-sm mt-1 ${muted}`}>
            Latency, success rate, queue depth, and active models
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={windowMinutes}
            onChange={(e) => setWindowMinutes(Number(e.target.value))}
            className={`text-sm rounded-lg border px-2.5 py-2 ${
              isDark
                ? "bg-slate-900 border-slate-700 text-slate-200"
                : "bg-white border-slate-200 text-slate-800"
            }`}
          >
            <option value={15}>Last 15 min</option>
            <option value={60}>Last 60 min</option>
            <option value={360}>Last 6 hours</option>
            <option value={1440}>Last 24 hours</option>
          </select>
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
      </div>

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
          <Card className={isDark ? "bg-slate-900 border-slate-700" : ""}>
            <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <span
                className={`inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border font-semibold ${
                  isDark ? levelStyle.dark : levelStyle.light
                }`}
              >
                <LevelIcon className="w-4 h-4" />
                {data?.status?.label || level}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  {data?.status?.detail || "No status detail available."}
                </p>
                <p className={`text-xs mt-1 ${muted}`}>
                  Window {data?.windowMinutes ?? windowMinutes} min
                  {data?.updatedAt
                    ? ` · Updated ${new Date(data.updatedAt).toLocaleString()}`
                    : ""}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {metricCards.map((s) => (
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
                <div className="flex items-center gap-2 mb-3">
                  <Layers className={`w-4 h-4 ${muted}`} />
                  <h2 className={`font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                    Queue
                  </h2>
                </div>
                {!q ? (
                  <p className={`text-sm ${muted}`}>No queue stats.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {[
                      ["Size", q.size],
                      ["Queued", q.queued],
                      ["Active", q.active],
                      ["Max concurrency", q.maxConcurrency],
                    ].map(([label, value]) => (
                      <div
                        key={String(label)}
                        className={`rounded-lg border px-3 py-2 ${
                          isDark ? "border-slate-700/70" : "border-slate-100"
                        }`}
                      >
                        <p className={`text-xs ${muted}`}>{label}</p>
                        <p
                          className={`text-lg font-bold tabular-nums ${
                            isDark ? "text-slate-100" : "text-slate-900"
                          }`}
                        >
                          {value ?? "—"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className={isDark ? "bg-slate-900 border-slate-700" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Cpu className={`w-4 h-4 ${muted}`} />
                  <h2 className={`font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                    Models
                  </h2>
                </div>
                {!model ? (
                  <p className={`text-sm ${muted}`}>No model info.</p>
                ) : (
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        ["Active", model.active],
                        ["Lite", model.lite],
                        ["Flash", model.flash],
                        ["Last task", model.lastTask],
                      ].map(([label, value]) => (
                        <div key={String(label)} className="flex justify-between gap-3">
                          <span className={muted}>{label}</span>
                          <span
                            className={`font-medium truncate max-w-[60%] text-right ${
                              isDark ? "text-slate-200" : "text-slate-800"
                            }`}
                          >
                            {value || "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                    {(model.recent?.length ?? 0) > 0 && (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1.5">
                        <p className={`text-xs uppercase tracking-wide ${muted}`}>Recent usage</p>
                        {model.recent!.map((r) => (
                          <div key={`${r.model}-${r.lastUsed}`} className="flex justify-between gap-2">
                            <span className={`truncate ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                              {r.model}
                            </span>
                            <span className={`text-xs shrink-0 ${muted}`}>
                              ×{r.count} · {r.lastUsed ? new Date(r.lastUsed).toLocaleString() : "—"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminAiHealthMonitorPage;
