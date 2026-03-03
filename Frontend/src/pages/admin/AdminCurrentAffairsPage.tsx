import { useEffect, useState } from "react";
import { useTheme } from "../../hooks/useTheme";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { currentAffairsAdminAPI, type CurrentAffairType } from "../../services/api";
import {
  Newspaper,
  RefreshCw,
  List,
  ToggleLeft,
  ToggleRight,
  Loader2,
  ExternalLink,
} from "lucide-react";

export default function AdminCurrentAffairsPage() {
  const { theme } = useTheme();
  const [items, setItems] = useState<CurrentAffairType[]>([]);
  const [loading, setLoading] = useState(true);
  const [runLoading, setRunLoading] = useState(false);
  const [error, setError] = useState("");
  const [runResult, setRunResult] = useState<{ created: number; skipped: number } | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterActive, setFilterActive] = useState<string>(""); // "" | "true" | "false"

  const fetchList = async (pageNum = 1) => {
    try {
      setLoading(true);
      setError("");
      const params: Record<string, number | string> = { page: pageNum, limit: 20 };
      if (filterActive !== "") params.isActive = filterActive;
      const res = await currentAffairsAdminAPI.list(params);
      if (res.data.success && res.data.data) {
        setItems(res.data.data.items);
        setTotalPages(res.data.data.totalPages || 1);
        setTotal(res.data.data.total || 0);
        setPage(res.data.data.page || 1);
      }
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : "Failed to load current affairs";
      setError(String(msg));
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList(1);
  }, [filterActive]);

  const handleRunNow = async () => {
    setRunLoading(true);
    setRunResult(null);
    setError("");
    try {
      const res = await currentAffairsAdminAPI.runNow();
      if (res.data.success && res.data.data) {
        setRunResult(res.data.data);
        fetchList(1);
      }
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : "Run failed";
      setError(String(msg));
    } finally {
      setRunLoading(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await currentAffairsAdminAPI.toggle(id);
      setItems((prev) =>
        prev.map((a) => (a._id === id ? { ...a, isActive: !a.isActive } : a))
      );
    } catch {
      setError("Failed to toggle");
    }
  };

  const isDark = theme === "dark";

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 px-3 md:px-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1
          className={`text-2xl md:text-3xl font-bold ${
            isDark ? "text-slate-100" : "text-slate-900"
          }`}
        >
          Current Affairs (Admin)
        </h1>
        <Button
          onClick={handleRunNow}
          disabled={runLoading}
          className="inline-flex items-center gap-2"
        >
          {runLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {runLoading ? "Running…" : "Run job now"}
        </Button>
      </div>

      {runResult && (
        <Card
          className={
            isDark
              ? "border-emerald-500/30 bg-emerald-500/10"
              : "border-emerald-200 bg-emerald-50"
          }
        >
          <CardContent className="py-3">
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
              Job completed: {runResult.created} created, {runResult.skipped} skipped (duplicates or errors).
            </p>
          </CardContent>
        </Card>
      )}

      {error && (
        <div
          className={`p-4 rounded-xl border ${
            isDark
              ? "bg-red-500/10 border-red-500/30 text-red-300"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {error}
        </div>
      )}

      <Card className={isDark ? "border-slate-800 bg-slate-950/60" : "border-slate-200 bg-white"}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <List className="w-5 h-5" />
            All articles ({total})
          </CardTitle>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFilterActive("")}
              className={`px-3 py-1 rounded-lg text-xs font-medium ${
                filterActive === ""
                  ? "bg-blue-600 text-white"
                  : isDark
                  ? "bg-slate-800 text-slate-300"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilterActive("true")}
              className={`px-3 py-1 rounded-lg text-xs font-medium ${
                filterActive === "true"
                  ? "bg-green-600 text-white"
                  : isDark
                  ? "bg-slate-800 text-slate-300"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setFilterActive("false")}
              className={`px-3 py-1 rounded-lg text-xs font-medium ${
                filterActive === "false"
                  ? "bg-amber-600 text-white"
                  : isDark
                  ? "bg-slate-800 text-slate-300"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              Inactive
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center">
              <Newspaper
                className={`w-12 h-12 mx-auto mb-3 ${
                  isDark ? "text-slate-500" : "text-slate-400"
                }`}
              />
              <p className={isDark ? "text-slate-400" : "text-slate-600"}>
                No current affairs yet. Click &quot;Run job now&quot; to fetch from GNews and generate with AI.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((a) => (
                <div
                  key={a._id}
                  className={`flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border ${
                    isDark
                      ? "bg-slate-800/50 border-slate-700"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-2 mb-1">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          isDark ? "bg-blue-500/20 text-blue-300" : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {a.gsPaper}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] ${
                          isDark ? "bg-slate-600 text-slate-300" : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {a.difficulty}
                      </span>
                      {!a.isActive && (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400">
                          Hidden
                        </span>
                      )}
                    </div>
                    <p className={`font-medium truncate ${isDark ? "text-slate-200" : "text-slate-900"}`}>
                      {a.title}
                    </p>
                    {a.date && (
                      <p className={`text-xs mt-0.5 ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                        {new Date(a.date).toLocaleDateString("en-IN")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {a.sourceUrl && (
                      <a
                        href={a.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`p-2 rounded-lg ${
                          isDark ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-200 text-slate-600"
                        }`}
                        title="Source"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleToggle(a._id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        a.isActive
                          ? "bg-green-500/20 text-green-600 dark:text-green-400"
                          : "bg-slate-500/20 text-slate-600 dark:text-slate-400"
                      }`}
                      title={a.isActive ? "Deactivate" : "Activate"}
                    >
                      {a.isActive ? (
                        <ToggleRight className="w-4 h-4" />
                      ) : (
                        <ToggleLeft className="w-4 h-4" />
                      )}
                      {a.isActive ? "Active" : "Inactive"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => fetchList(page - 1)}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <span
                className={`flex items-center px-3 text-sm ${
                  isDark ? "text-slate-300" : "text-slate-700"
                }`}
              >
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => fetchList(page + 1)}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className={isDark ? "border-slate-800 bg-slate-950/60" : "border-slate-200 bg-white"}>
        <CardHeader>
          <CardTitle className="text-base">About</CardTitle>
          <CardDescription>
            Daily job runs at 6 AM (Asia/Kolkata). It fetches India news from GNews, filters UPSC-relevant topics,
            and generates structured current affairs using Claude 3.5 Sonnet. Use &quot;Run job now&quot; to run manually.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
