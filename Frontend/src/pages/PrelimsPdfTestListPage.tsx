import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useTheme } from "../hooks/useTheme";
import { prelimsPdfTestAPI, PrelimsPdfTestListItem } from "../services/api";
import { FileText, Clock, Calendar, Play, Loader2, AlertCircle } from "lucide-react";

export const PrelimsPdfTestListPage = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [list, setList] = useState<PrelimsPdfTestListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startingId, setStartingId] = useState<string | null>(null);

  useEffect(() => {
    loadList();
  }, []);

  const loadList = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await prelimsPdfTestAPI.list();
      if (res.data.success) setList(res.data.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to load tests");
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async (testId: string) => {
    setStartingId(testId);
    setError("");
    try {
      const res = await prelimsPdfTestAPI.start(testId);
      if (res.data.success && res.data.data?.attemptId) {
        navigate(`/prelims-pdf-test/${res.data.data.attemptId}`);
        return;
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to start test");
    } finally {
      setStartingId(null);
    }
  };

  const isDark = theme === "dark";
  const upcoming = list.filter((t) => t.status === "Upcoming");
  const live = list.filter((t) => t.status === "Live");
  const expired = list.filter((t) => t.status === "Expired");

  return (
    <div className={`min-h-screen p-6 ${isDark ? "bg-[#020012] text-slate-50" : "bg-slate-50 text-slate-900"}`}>
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Scheduled PDF Prelims Tests</h1>
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-500 border border-red-500/30">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        ) : (
          <>
            {live.length > 0 && (
              <Card className={isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}>
                <CardHeader>
                  <CardTitle className={`text-lg ${isDark ? "text-slate-200" : "text-slate-900"}`}>Live</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {live.map((t) => (
                    <div
                      key={t._id}
                      className={`flex flex-wrap items-center justify-between gap-3 p-4 rounded-lg border ${isDark ? "bg-emerald-900/20 border-emerald-700" : "bg-emerald-50 border-emerald-200"}`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-600" />
                        <span className="font-medium">{t.title}</span>
                        <span className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                          {t.duration} min · -{t.negativeMarking} per wrong
                        </span>
                      </div>
                      <Button
                        onClick={() => handleStart(t._id)}
                        disabled={startingId === t._id}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        {startingId === t._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 mr-1" />}
                        Start Test
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            {upcoming.length > 0 && (
              <Card className={isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}>
                <CardHeader>
                  <CardTitle className={`text-lg ${isDark ? "text-slate-200" : "text-slate-900"}`}>Upcoming</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {upcoming.map((t) => (
                    <div
                      key={t._id}
                      className={`flex flex-wrap items-center gap-2 p-4 rounded-lg border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}
                    >
                      <FileText className="w-4 h-4 text-slate-500" />
                      <span className="font-medium">{t.title}</span>
                      <span className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                        <Calendar className="w-3 h-3 inline mr-0.5" />
                        Starts {new Date(t.startTime).toLocaleString()} · {t.duration} min
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            {expired.length > 0 && (
              <Card className={isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}>
                <CardHeader>
                  <CardTitle className={`text-lg ${isDark ? "text-slate-400" : "text-slate-600"}`}>Expired</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {expired.map((t) => (
                    <div
                      key={t._id}
                      className={`flex flex-wrap items-center gap-2 p-4 rounded-lg border opacity-75 ${isDark ? "bg-slate-800/30 border-slate-700" : "bg-slate-100 border-slate-200"}`}
                    >
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span className={isDark ? "text-slate-400" : "text-slate-600"}>{t.title}</span>
                      <span className={`text-sm ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                        Ended {new Date(t.endTime).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            {list.length === 0 && (
              <p className={`text-center py-8 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                No scheduled PDF tests at the moment.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};
