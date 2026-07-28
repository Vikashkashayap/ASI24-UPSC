import React, { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Activity,
  RefreshCw,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Clock,
  Server,
  Cpu,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Progress } from "../../components/ui/progress";
import { useTheme } from "../../hooks/useTheme";
import {
  processingAPI,
  type ProcessingDashboard,
  type ProcessingItem,
  type ProcessingLog,
} from "../../features/processing/api";

export const ProcessingDashboardPage: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [data, setData] = useState<ProcessingDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [logs, setLogs] = useState<ProcessingLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await processingAPI.dashboard({
        page,
        limit: 20,
        status: statusFilter || undefined,
      });
      setData(res.data.data);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to load processing dashboard";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  const openLogs = async (item: ProcessingItem) => {
    setSelectedId(String(item.documentId));
    setLogsLoading(true);
    try {
      const res = await processingAPI.logs(String(item.documentId));
      setLogs(res.data.data || []);
    } catch {
      toast.error("Failed to load logs");
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  const onRetry = async (item: ProcessingItem) => {
    try {
      await processingAPI.retry(String(item.documentId));
      toast.success("Retry queued");
      load();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Retry failed";
      toast.error(msg);
    }
  };

  const stats = data?.stats;
  const inputCls = isDark
    ? "bg-slate-900 border-slate-700 text-slate-100"
    : "bg-white border-slate-200 text-slate-900";

  return (
    <div
      className={`min-h-full w-full ${
        isDark
          ? "bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900"
          : "bg-gradient-to-b from-slate-50 via-white to-indigo-50/30"
      }`}
    >
      <div className="w-full max-w-7xl mx-auto space-y-6 px-3 md:px-6 pb-10 pt-2">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl ${
                isDark ? "bg-indigo-500/15 text-indigo-300" : "bg-indigo-100 text-indigo-700"
              }`}
            >
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1
                className={`text-2xl md:text-3xl font-semibold tracking-tight ${
                  isDark ? "text-slate-50" : "text-slate-900"
                }`}
              >
                Processing Engine
              </h1>
              <p className={`text-sm mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Async AI pipeline — OCR, parse, questions, chunks (embeddings later)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2.5 py-1.5 rounded-full border ${
                data?.redis?.ok
                  ? "border-emerald-300 text-emerald-700"
                  : "border-amber-300 text-amber-700"
              }`}
            >
              <Server className="w-3.5 h-3.5 inline mr-1" />
              {data?.mode === "bullmq" ? "BullMQ + Redis" : `Mode: ${data?.mode || "…"}`}
            </span>
            <Button variant="outline" onClick={load}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Refresh
            </Button>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {[
            { label: "Total", value: stats?.total, icon: Cpu },
            { label: "Queued", value: stats?.queued, icon: Clock },
            { label: "Running", value: stats?.running, icon: Loader2 },
            { label: "Completed", value: stats?.completed, icon: CheckCircle2 },
            { label: "Failed", value: stats?.failed, icon: AlertTriangle },
            { label: "Retrying", value: stats?.retrying, icon: RotateCcw },
          ].map((s) => (
            <div
              key={s.label}
              className={`rounded-2xl border p-3.5 ${
                isDark ? "border-slate-800 bg-slate-900/60" : "border-slate-200 bg-white"
              }`}
            >
              <div className={`text-xs ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                {s.label}
              </div>
              <div
                className={`text-2xl font-semibold mt-1 ${
                  isDark ? "text-slate-100" : "text-slate-900"
                }`}
              >
                {loading ? "…" : s.value ?? 0}
              </div>
            </div>
          ))}
        </div>

        <div
          className={`rounded-2xl border p-4 ${
            isDark ? "border-slate-800 bg-slate-900/50" : "border-slate-200 bg-white"
          }`}
        >
          <h3 className={`text-sm font-semibold mb-3 ${isDark ? "text-slate-200" : "text-slate-800"}`}>
            Queue status
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {Object.entries(data?.queues || {}).map(([name, counts]) => (
              <div
                key={name}
                className={`rounded-xl border px-3 py-2 text-xs ${
                  isDark ? "border-slate-800" : "border-slate-100"
                }`}
              >
                <div className={`font-medium mb-1 ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                  {name}
                </div>
                <div className={isDark ? "text-slate-500" : "text-slate-500"}>
                  waiting {String(counts.waiting ?? 0)} · active {String(counts.active ?? 0)} ·
                  failed {String(counts.failed ?? 0)}
                </div>
              </div>
            ))}
            {!Object.keys(data?.queues || {}).length && (
              <p className={`text-sm ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                Queues initialize on first job (inline mode shows zeros).
              </p>
            )}
          </div>
          <div className={`mt-3 text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
            Providers — LlamaParse: {data?.providers?.llamaParse ? "on" : "off"} · Mistral OCR:{" "}
            {data?.providers?.mistralOcr ? "on" : "off"}
          </div>
        </div>

        <div
          className={`rounded-2xl border overflow-hidden ${
            isDark ? "border-slate-800 bg-slate-900/50" : "border-slate-200 bg-white"
          }`}
        >
          <div className="p-4 flex flex-wrap gap-2 items-center justify-between border-b border-inherit">
            <h3 className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-800"}`}>
              Documents in pipeline
            </h3>
            <select
              className={`rounded-lg border px-2 py-1.5 text-sm ${inputCls}`}
              value={statusFilter}
              onChange={(e) => {
                setPage(1);
                setStatusFilter(e.target.value);
              }}
            >
              <option value="">All statuses</option>
              <option value="queued">queued</option>
              <option value="running">running</option>
              <option value="completed">completed</option>
              <option value="failed">failed</option>
              <option value="retrying">retrying</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className={`text-left text-xs uppercase tracking-wide ${
                    isDark ? "text-slate-500 bg-slate-950/40" : "text-slate-500 bg-slate-50"
                  }`}
                >
                  <th className="px-4 py-3">Document</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-4 py-3">Counts</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading && !(data?.items?.length) && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                      No processing jobs yet. Upload a document in Knowledge Base.
                    </td>
                  </tr>
                )}
                {!loading &&
                  data?.items?.map((item) => (
                    <tr key={item._id} className="border-t border-inherit">
                      <td className="px-4 py-3 min-w-[180px]">
                        <div className={`font-medium ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                          {item.title || String(item.documentId)}
                        </div>
                        <div className={`text-[11px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                          {item.status}
                          {item.documentKind ? ` · ${item.documentKind}` : ""}
                          {item.isScanned ? " · scanned" : ""}
                          {item.detectedSubject ? ` · ${item.detectedSubject}` : ""}
                        </div>
                        {item.lastError && (
                          <div className="text-[11px] text-rose-500 mt-0.5 line-clamp-2">
                            {item.lastError}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{item.stage}</td>
                      <td className="px-4 py-3 min-w-[140px]">
                        <Progress value={item.progress || 0} className="h-2" />
                        <div className={`text-[11px] mt-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                          {item.progress || 0}%
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        p{item.pageCount || 0} · s{item.sectionCount || 0} · q
                        {item.questionCount || 0} · c{item.chunkCount || 0}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="outline" onClick={() => openLogs(item)}>
                            Logs
                          </Button>
                          {(item.status === "failed" || item.status === "completed") && (
                            <Button variant="outline" onClick={() => onRetry(item)}>
                              <RotateCcw className="w-3.5 h-3.5 mr-1" />
                              Retry
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div
            className={`flex items-center justify-between px-4 py-3 border-t text-sm ${
              isDark ? "border-slate-800 text-slate-400" : "border-slate-100 text-slate-500"
            }`}
          >
            <span>{data?.total || 0} jobs</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </Button>
              <span>
                {page} / {data?.totalPages || 1}
              </span>
              <Button
                variant="outline"
                disabled={page >= (data?.totalPages || 1)}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>

        {selectedId && (
          <div
            className={`rounded-2xl border p-4 ${
              isDark ? "border-slate-800 bg-slate-900/50" : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                Stage logs
              </h3>
              <button
                type="button"
                className="text-xs text-slate-500"
                onClick={() => setSelectedId(null)}
              >
                Close
              </button>
            </div>
            {logsLoading && <p className="text-sm text-slate-400">Loading logs…</p>}
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {logs.map((log) => (
                <div
                  key={log._id}
                  className={`rounded-lg border px-3 py-2 text-xs ${
                    isDark ? "border-slate-800" : "border-slate-100"
                  }`}
                >
                  <div className="flex justify-between gap-2">
                    <span className={`font-medium ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                      {log.stage} · {log.workerName}
                    </span>
                    <span
                      className={
                        log.status === "failed"
                          ? "text-rose-500"
                          : log.status === "completed"
                            ? "text-emerald-600"
                            : "text-slate-500"
                      }
                    >
                      {log.status}
                      {log.duration != null ? ` · ${log.duration}ms` : ""}
                    </span>
                  </div>
                  <div className={isDark ? "text-slate-500" : "text-slate-500"}>
                    {log.message || log.errorMessage || "—"}
                  </div>
                </div>
              ))}
              {!logsLoading && !logs.length && (
                <p className="text-sm text-slate-400">No logs for this document.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProcessingDashboardPage;
