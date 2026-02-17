import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, BarChart3, Loader2, Users, Award, TrendingUp } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { useTheme } from "../../hooks/useTheme";
import { prelimsImportAPI } from "../../services/api";

interface AttemptRow {
  _id: string;
  studentName: string;
  studentEmail: string;
  score: number;
  correctCount: number;
  wrongCount: number;
  notAttempted: number;
  accuracy: number;
  submittedAt: string;
}

interface AnalyticsData {
  test: { _id: string; title: string; totalQuestions: number };
  totalAttempts: number;
  submittedCount: number;
  averageScore: number;
  attempts: AttemptRow[];
}

export const PrelimsTopperAdminAnalyticsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadAnalytics();
  }, [id]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const res = await prelimsImportAPI.getImportedTestAnalytics(id!);
      if (res.data.success) setAnalytics(res.data.data);
    } catch {
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  const topScore = analytics?.attempts?.length
    ? Math.max(...analytics.attempts.map((a) => a.score || 0))
    : 0;
  const highPerformers = analytics?.attempts?.filter((a) => a.accuracy >= 80) || [];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-8 px-3 md:px-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate("/admin/prelims-topper")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      <div
        className={`rounded-xl p-6 border-2 ${
          theme === "dark" ? "bg-slate-800/50 border-amber-500/20" : "bg-white border-amber-200"
        }`}
      >
        <h1 className="text-xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-amber-500" />
          Test Analytics
        </h1>
        <p className={`text-sm mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
          {analytics?.test?.title || "Prelims Topper Test"} — performance overview
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
        </div>
      ) : analytics ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className={theme === "dark" ? "bg-slate-800/50 border-slate-700" : ""}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{analytics.submittedCount}</p>
                    <p className="text-sm text-slate-500">Submissions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className={theme === "dark" ? "bg-slate-800/50 border-slate-700" : ""}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                    <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{analytics.averageScore.toFixed(2)}</p>
                    <p className="text-sm text-slate-500">Average Score</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className={theme === "dark" ? "bg-slate-800/50 border-slate-700" : ""}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                    <Award className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{topScore}</p>
                    <p className="text-sm text-slate-500">Top Score</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className={theme === "dark" ? "bg-slate-800/50 border-slate-700" : ""}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                    <Award className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{highPerformers.length}</p>
                    <p className="text-sm text-slate-500">≥80% accuracy</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {analytics.attempts.length > 0 && (
            <Card className={theme === "dark" ? "bg-slate-800/50 border-slate-700" : ""}>
              <CardHeader>
                <CardTitle>All attempts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={`border-b ${theme === "dark" ? "border-slate-700" : "border-slate-200"}`}>
                        <th className="text-left py-2 font-medium">Student</th>
                        <th className="text-left py-2 font-medium">Score</th>
                        <th className="text-left py-2 font-medium">Correct</th>
                        <th className="text-left py-2 font-medium">Wrong</th>
                        <th className="text-left py-2 font-medium">Accuracy</th>
                        <th className="text-left py-2 font-medium">Submitted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.attempts.map((a) => (
                        <tr key={a._id} className={`border-b ${theme === "dark" ? "border-slate-700/50" : "border-slate-100"}`}>
                          <td className="py-3">
                            <p className="font-medium">{a.studentName}</p>
                            <p className="text-slate-500 text-xs">{a.studentEmail}</p>
                          </td>
                          <td className="py-3">{a.score?.toFixed(2) ?? "—"}</td>
                          <td className="py-3">{a.correctCount}</td>
                          <td className="py-3">{a.wrongCount}</td>
                          <td className="py-3">{a.accuracy != null ? `${a.accuracy}%` : "—"}</td>
                          <td className="py-3 text-slate-500">
                            {a.submittedAt ? new Date(a.submittedAt).toLocaleString() : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {analytics.attempts.length === 0 && (
            <Card className={theme === "dark" ? "bg-slate-800/50 border-slate-700" : ""}>
              <CardContent className="py-12 text-center">
                <p className="text-slate-500">No submissions yet for this test.</p>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card className={theme === "dark" ? "bg-slate-800/50 border-slate-700" : ""}>
          <CardContent className="py-12 text-center">
            <p className="text-slate-500">No analytics data available</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
