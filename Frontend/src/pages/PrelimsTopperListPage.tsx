import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, FileQuestion, Trophy, Play, Loader2, AlertCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useTheme } from "../hooks/useTheme";
import { prelimsTopperAPI } from "../services/api";

interface PrelimsTestItem {
  _id: string;
  title: string;
  totalQuestions: number;
  totalMarks: number;
  negativeMarking: number;
  durationMinutes: number;
  startTime: string;
  endTime: string;
  status: "Upcoming" | "Live" | "Expired";
  canStart: boolean;
  hasAttempt: boolean;
  attempt: { _id: string; score: number; rank: number; submittedAt: string; timeTaken: number } | null;
}

const PrelimsTopperListPage: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [tests, setTests] = useState<PrelimsTestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    try {
      setLoading(true);
      const res = await prelimsTopperAPI.listTests();
      if (res.data.success) setTests(res.data.data || []);
      else setError("Failed to load tests");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load tests");
    } finally {
      setLoading(false);
    }
  };

  const handleStart = (testId: string) => {
    navigate(`/prelims-topper/exam/${testId}`);
  };

  const handleViewRank = (testId: string) => {
    navigate(`/prelims-topper/rank/${testId}`);
  };

  const handleViewResult = (attemptId: string) => {
    navigate(`/prelims-topper/result/${attemptId}`);
  };

  const formatDate = (d: string) => {
    return new Date(d).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const statusBadge = (status: string) => {
    const styles =
      status === "Live"
        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
        : status === "Upcoming"
          ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
          : "bg-slate-500/20 text-slate-400 border-slate-500/30";
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles}`}
      >
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3 text-purple-500" />
          <p className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>Loading tests...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <Card className={theme === "dark" ? "bg-slate-800/50 border-slate-700" : "bg-white border-slate-200"}>
          <CardContent className="pt-6 flex items-center gap-3 text-red-500">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">Prelims Topper Test</h1>
        <p className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>
          Scheduled manual tests. Start when the test is Live.
        </p>
      </div>

      {tests.length === 0 ? (
        <Card className={theme === "dark" ? "bg-slate-800/50 border-slate-700" : "bg-white border-slate-200"}>
          <CardContent className="py-12 text-center">
            <FileQuestion className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>
              No Prelims Topper tests available yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tests.map((t) => (
            <Card
              key={t._id}
              className={
                theme === "dark"
                  ? "bg-slate-800/50 border-slate-700 hover:border-slate-600"
                  : "bg-white border-slate-200 hover:border-slate-300"
              }
            >
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-lg">{t.title}</CardTitle>
                  {statusBadge(t.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {t.durationMinutes} min
                  </span>
                  <span>{t.totalQuestions} questions</span>
                  <span>{t.totalMarks} marks</span>
                  <span>−{t.negativeMarking} per wrong</span>
                </div>
                <div className="text-xs opacity-80">
                  Start: {formatDate(t.startTime)} — End: {formatDate(t.endTime)}
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  {t.canStart && (
                    <Button
                      onClick={() => handleStart(t._id)}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Start
                    </Button>
                  )}
                  {t.hasAttempt && t.attempt && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => handleViewResult(t.attempt!._id)}
                      >
                        View Result
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleViewRank(t._id)}
                      >
                        <Trophy className="w-4 h-4 mr-2" />
                        View Rank
                      </Button>
                    </>
                  )}
                </div>
                {t.hasAttempt && t.attempt && (
                  <p className="text-sm text-slate-500">
                    Your score: {t.attempt.score} | Rank: {t.attempt.rank ?? "—"} | Submitted{" "}
                    {formatDate(t.attempt.submittedAt)}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PrelimsTopperListPage;
