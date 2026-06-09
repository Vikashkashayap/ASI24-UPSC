import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Target, Play, CheckCircle, BookOpen, History } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { useTheme } from "../hooks/useTheme";
import { assignedPracticeAPI } from "../services/api";

interface AssignedPracticeItem {
  _id: string;
  subject: string;
  topic: string;
  title: string;
  totalQuestions: number;
  durationMinutes: number;
  totalMarks: number;
  difficulty: string;
  createdAt: string;
  attempted: boolean;
  attempt: { testId: string; isSubmitted: boolean; score?: number } | null;
}

function formatAssignedDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" });
}

export const PracticeTestPage: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === "dark";

  const [assignedTests, setAssignedTests] = useState<AssignedPracticeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);

  useEffect(() => {
    loadAssignedTests();
  }, []);

  const loadAssignedTests = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await assignedPracticeAPI.listMine();
      if (res.data.success) setAssignedTests(res.data.data || []);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to load practice tests");
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async (id: string) => {
    setError(null);
    setStartingId(id);
    try {
      const res = await assignedPracticeAPI.startAttempt(id);
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
    <div className="max-w-4xl mx-auto space-y-6 pb-8 px-3 md:px-4">
      <div className={`relative overflow-hidden rounded-xl md:rounded-2xl p-4 md:p-8 border-2 ${isDark
        ? "bg-gradient-to-br from-slate-800/90 via-blue-900/20 to-slate-900/90 border-blue-500/20"
        : "bg-gradient-to-br from-white via-blue-50/30 to-white border-blue-200/50"
        }`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 md:p-3 rounded-lg shrink-0 ${isDark ? "bg-blue-500/20" : "bg-blue-100"}`}>
              <Target className={`w-5 h-5 md:w-6 md:h-6 ${isDark ? "text-blue-400" : "text-blue-600"}`} />
            </div>
            <div>
              <h1 className={`text-lg md:text-2xl font-bold ${isDark ? "text-slate-50" : "text-slate-900"}`}>
                Practice Test
              </h1>
              <p className={`text-xs md:text-sm mt-0.5 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                Tests assigned to you by your admin — topic-based 50-question practice
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => navigate("/practice-test/history")}
            className={`flex items-center gap-2 shrink-0 ${isDark ? "bg-blue-600 hover:bg-blue-500 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
          >
            <History className="w-4 h-4" />
            View History
          </Button>
        </div>
      </div>

      {error && (
        <div className={`rounded-lg border p-4 text-sm ${isDark ? "bg-red-950/30 border-red-800 text-red-300" : "bg-red-50 border-red-200 text-red-800"}`}>
          {error}
        </div>
      )}

      <Card className={`border-2 rounded-2xl ${isDark ? "bg-slate-800/50 border-slate-700" : "border-blue-100"}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <BookOpen className={`w-5 h-5 ${isDark ? "text-blue-400" : "text-blue-600"}`} />
            Your Assigned Tests
          </CardTitle>
          <CardDescription>
            Start a test below. Each test has 50 questions on a specific subject and topic.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading practice tests…
            </div>
          ) : assignedTests.length === 0 ? (
            <div className={`text-center py-12 rounded-xl border ${isDark ? "border-slate-700 bg-slate-900/30" : "border-slate-200 bg-slate-50"}`}>
              <Target className={`w-10 h-10 mx-auto mb-3 ${isDark ? "text-slate-600" : "text-slate-300"}`} />
              <p className={`text-sm font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                No practice tests assigned yet
              </p>
              <p className={`text-xs mt-1 ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                When your admin assigns a topic practice test, it will appear here.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {assignedTests.map((t) => (
                <li
                  key={t._id}
                  className={`flex flex-wrap items-center justify-between gap-3 p-4 md:p-5 rounded-xl border transition-shadow hover:shadow-md ${isDark ? "bg-slate-800/40 border-slate-700" : "bg-white border-slate-200"}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-base truncate">
                      {t.title || `${t.subject} — ${t.topic}`}
                    </div>
                    <div className={`text-sm mt-0.5 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      {t.subject} · {t.topic}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                        {t.totalQuestions} questions
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${isDark ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                        {t.difficulty}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                        {t.durationMinutes} min
                      </span>
                    </div>
                    <p className={`text-xs mt-2 ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                      Assigned {formatAssignedDate(t.createdAt)}
                    </p>
                    {t.attempted && t.attempt?.isSubmitted && t.attempt.score != null && (
                      <div className={`text-xs mt-2 flex items-center gap-1 font-medium ${isDark ? "text-green-400" : "text-green-600"}`}>
                        <CheckCircle className="w-3.5 h-3.5" />
                        Completed · Score: {t.attempt.score}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 w-full sm:w-auto">
                    {t.attempted && t.attempt ? (
                      t.attempt.isSubmitted ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => navigate(`/result/${t.attempt!.testId}`)}
                          className="w-full sm:w-auto min-h-[44px] touch-manipulation"
                        >
                          View Result
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          onClick={() => navigate(`/test/${t.attempt!.testId}`)}
                          className="w-full sm:w-auto min-h-[44px] touch-manipulation"
                        >
                          Resume Test
                        </Button>
                      )
                    ) : (
                      <Button
                        type="button"
                        onClick={() => handleStart(t._id)}
                        disabled={startingId === t._id}
                        className="w-full sm:w-auto min-h-[44px] touch-manipulation"
                      >
                        {startingId === t._id ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Play className="w-4 h-4 mr-2" />
                        )}
                        Start Test
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

export default PracticeTestPage;
