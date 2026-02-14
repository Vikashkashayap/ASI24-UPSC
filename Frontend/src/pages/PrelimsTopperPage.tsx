import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useTheme } from "../hooks/useTheme";
import { prelimsTopperAPI } from "../services/api";
import { Trophy, Clock, Calendar, Play, History, AlertCircle } from "lucide-react";

interface ExcelTest {
  _id: string;
  title: string;
  durationMinutes: number;
  startTime: string;
  endTime: string;
  negativeMarking: number;
  totalQuestions: number;
  createdAt: string;
}

export const PrelimsTopperPage = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [tests, setTests] = useState<ExcelTest[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [testsRes, attemptsRes] = await Promise.all([
        prelimsTopperAPI.getStudentTests(),
        prelimsTopperAPI.getAttempts().catch(() => ({ data: { success: true, data: { attempts: [] } } })),
      ]);
      if (testsRes.data.success) setTests(testsRes.data.data.tests || []);
      if (attemptsRes.data?.success) setAttempts(attemptsRes.data.data.attempts || []);
    } catch (e: any) {
      setError(e.response?.data?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async (testId: string) => {
    setStartingId(testId);
    setError(null);
    try {
      const res = await prelimsTopperAPI.startTest(testId);
      if (res.data.success) {
        navigate("/prelims-topper/exam", { state: res.data.data });
      } else {
        setError(res.data.message || "Failed to start test");
      }
    } catch (e: any) {
      setError(e.response?.data?.message || "Failed to start test");
    } finally {
      setStartingId(null);
    }
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className={`max-w-4xl mx-auto space-y-6 ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
      <div className="flex items-center gap-3">
        <div className={`p-3 rounded-xl ${theme === "dark" ? "bg-amber-500/20" : "bg-amber-100"}`}>
          <Trophy className={`w-8 h-8 ${theme === "dark" ? "text-amber-400" : "text-amber-600"}`} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Prelims Topper</h1>
          <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
            Scheduled Excel-based tests. Start within the allowed time window.
          </p>
        </div>
      </div>

      {error && (
        <div className={`flex items-center gap-2 p-3 rounded-lg ${theme === "dark" ? "bg-red-950/50 border border-red-800 text-red-300" : "bg-red-50 border border-red-200 text-red-800"}`}>
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Card className={theme === "dark" ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}>
        <CardHeader>
          <CardTitle>Available Tests</CardTitle>
          <CardDescription>
            Tests you can take now (within start and end time)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tests.length === 0 ? (
            <p className={`py-6 text-center ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
              No tests available at the moment. Check back during the scheduled window.
            </p>
          ) : (
            <ul className="space-y-4">
              {tests.map((test) => (
                <li
                  key={test._id}
                  className={`flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border ${
                    theme === "dark" ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div>
                    <h3 className="font-semibold">{test.title}</h3>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {test.durationMinutes} min
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {test.totalQuestions} questions
                      </span>
                      <span>Start: {formatDate(test.startTime)}</span>
                      <span>End: {formatDate(test.endTime)}</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleStart(test._id)}
                    disabled={!!startingId}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    {startingId === test._id ? (
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent inline-block" />
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Start Test
                      </>
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {attempts.length > 0 && (
        <Card className={theme === "dark" ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Your Attempts
            </CardTitle>
            <CardDescription>View results of past tests</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {attempts.slice(0, 10).map((a) => (
                <li
                  key={a._id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    theme === "dark" ? "bg-slate-800/50" : "bg-slate-50"
                  }`}
                >
                  <span className="font-medium">{a.title}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Score: {a.score} | {a.accuracy?.toFixed(1)}%</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/prelims-topper/result/${a._id}`)}
                    >
                      View Result
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
