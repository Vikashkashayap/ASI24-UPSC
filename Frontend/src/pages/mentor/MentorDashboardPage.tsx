import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, BarChart3, ClipboardList, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { useTheme } from "../../hooks/useTheme";
import { mentorStaffAPI } from "../../services/api";

type Analytics = {
  rosterSize: number;
  totalTestsAcrossRoster: number;
  avgTestScoreAcrossRoster: number;
  totalMainsEvaluationsAcrossRoster: number;
  studentsWithActivePlan: number;
};

export const MentorDashboardPage: React.FC = () => {
  const { theme } = useTheme();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await mentorStaffAPI.getAnalytics();
        if (!cancelled && res.data?.success) {
          setAnalytics(res.data.data);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sub = theme === "dark" ? "text-slate-400" : "text-slate-600";

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
          Mentor dashboard
        </h1>
        <p className={`mt-1 text-sm ${sub}`}>
          Overview of your assigned students and practice activity.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className={`text-sm ${sub}`}>Loading…</div>
      ) : analytics && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className={theme === "dark" ? "border-slate-700 bg-slate-900/50" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                Assigned students
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-semibold ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                {analytics.rosterSize}
              </p>
            </CardContent>
          </Card>
          <Card className={theme === "dark" ? "border-slate-700 bg-slate-900/50" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-emerald-500" />
                Prelims tests (roster)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-semibold ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                {analytics.totalTestsAcrossRoster}
              </p>
              <p className={`text-xs mt-1 ${sub}`}>
                Avg score {analytics.avgTestScoreAcrossRoster.toFixed(1)}
              </p>
            </CardContent>
          </Card>
          <Card className={theme === "dark" ? "border-slate-700 bg-slate-900/50" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-violet-500" />
                Mains evaluations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-semibold ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                {analytics.totalMainsEvaluationsAcrossRoster}
              </p>
              <p className={`text-xs mt-1 ${sub}`}>
                Students with study plan: {analytics.studentsWithActivePlan}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className={theme === "dark" ? "border-slate-700 bg-slate-900/50" : ""}>
        <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-6">
          <div>
            <p className={`font-medium ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
              View and manage students
            </p>
            <p className={`text-sm ${sub}`}>Open the roster, drill into performance, and leave feedback.</p>
          </div>
          <Button asChild>
            <Link to="/mentor-dashboard/students" className="inline-flex items-center gap-2">
              Go to students
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
