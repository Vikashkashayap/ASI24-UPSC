import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Loader2, Play, CheckCircle, Clock } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { useTheme } from "../../hooks/useTheme";
import { prelimsMockAPI } from "../../services/api";

interface LiveMock {
  _id: string;
  subject: string;
  title: string;
  totalQuestions: number;
  durationMinutes: number;
  totalMarks: number;
  negativeMark: number;
  liveAt: string;
  attempted: boolean;
  attempt: { testId: string; isSubmitted: boolean; score?: number } | null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" });
}

export const PrelimsMockPage: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [mocks, setMocks] = useState<LiveMock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const res = await prelimsMockAPI.listLive();
      if (res.data.success) setMocks(res.data.data || []);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to load mocks");
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async (mockId: string) => {
    setError(null);
    setStartingId(mockId);
    try {
      const res = await prelimsMockAPI.startAttempt(mockId);
      if (res.data.success && res.data.data?.testId) {
        navigate(`/test/${res.data.data.testId}`);
        return;
      }
      setError(res.data.message || "Could not start test");
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Could not start test");
    } finally {
      setStartingId(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-8">
      <div className={`rounded-xl border-2 p-4 md:p-6 ${theme === "dark" ? "bg-slate-800/50 border-amber-500/20" : "bg-amber-50/50 border-amber-200"}`}>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-amber-500" />
          Prelims Mock
        </h1>
        <p className={`mt-1 text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
          Full-length GS Paper 1 mocks (100 Q · 200 marks · 120 min) scheduled by admin. Start when a test is live.
        </p>
      </div>

      {error && (
        <div className={`rounded-lg border p-4 ${theme === "dark" ? "bg-red-950/30 border-red-800 text-red-300" : "bg-red-50 border-red-200 text-red-800"}`}>
          {error}
        </div>
      )}

      <Card className={theme === "dark" ? "bg-slate-800/50 border-slate-700" : ""}>
        <CardHeader>
          <CardTitle>Live Tests</CardTitle>
          <CardDescription>Tests that are currently active. Click Start to attempt.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
          ) : mocks.length === 0 ? (
            <p className={`py-8 text-center ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
              No live mocks at the moment. Check back after your admin schedules one.
            </p>
          ) : (
            <ul className="space-y-4">
              {mocks.map((m) => (
                <li
                  key={m._id}
                  className={`flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border ${theme === "dark" ? "bg-slate-800/30 border-slate-700" : "bg-slate-50 border-slate-200"}`}
                >
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{m.title || m.subject}</div>
                    <div className={`flex flex-wrap items-center gap-3 mt-1 text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                      <span>{m.totalQuestions} questions</span>
                      <span>{m.durationMinutes} min</span>
                      <span>{m.totalMarks} marks</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Live from {formatDate(m.liveAt)}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {m.attempted && m.attempt ? (
                      <Button
                        variant="outline"
                        onClick={() => navigate(m.attempt!.isSubmitted ? `/result/${m.attempt!.testId}` : `/test/${m.attempt!.testId}`)}
                        className="gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {m.attempt.isSubmitted ? "View Result" : "Resume"}
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleStart(m._id)}
                        disabled={!!startingId}
                        className="bg-amber-600 hover:bg-amber-500 gap-2"
                      >
                        {startingId === m._id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            Start Test
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
