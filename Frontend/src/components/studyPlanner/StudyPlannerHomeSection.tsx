import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../hooks/useTheme";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import {
  studyPlanAPI,
  type StudyPlanTask,
  type PlannerDashboardSummary,
  type StudyPlanType,
} from "../../services/api";
import { SubjectBadge, TaskTypeTag } from "./subjectBadge";
import { Flame, AlertTriangle, CalendarDays, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "../../utils/cn";

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatStudyTestLine(t: StudyPlanTask): { line: string; sub?: string } {
  if (t.taskType === "test" || t.taskType === "mcq_practice") {
    const q = t.questions ?? 20;
    return {
      line: `${t.subject} → ${t.topic.replace(/\s*—\s*MCQ block.*$/, "")} Test`,
      sub: `${q} MCQs`,
    };
  }
  const sub = (t.subtopics || []).slice(0, 2).join(", ");
  return {
    line: `${t.subject} → ${t.topic} (Study)`,
    sub: sub || undefined,
  };
}

export function StudyPlannerHomeSection() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<StudyPlanType | null>(null);
  const [dashboard, setDashboard] = useState<PlannerDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [explainOpen, setExplainOpen] = useState(false);
  const [explainText, setExplainText] = useState("");
  const [explainLoading, setExplainLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await studyPlanAPI.get(toDateString(new Date()));
      setPlan(res.data.plan);
      setDashboard(res.data.dashboard ?? null);
    } catch {
      setPlan(null);
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleExplain = async () => {
    if (!plan) return;
    setExplainLoading(true);
    setExplainText("");
    setExplainOpen(true);
    try {
      const res = await studyPlanAPI.explain();
      setExplainText(res.data.explanation || "");
    } catch {
      setExplainText("Could not load explanation.");
    } finally {
      setExplainLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className={theme === "dark" ? "border-slate-700 bg-slate-800/40" : "border-slate-200"}>
        <CardContent className="py-8 text-center text-sm text-slate-500">Loading planner…</CardContent>
      </Card>
    );
  }

  if (!plan) {
    return (
      <Card className={theme === "dark" ? "border-teal-500/20 bg-slate-800/60" : "border-teal-200 bg-white"}>
        <CardHeader>
          <CardTitle className={theme === "dark" ? "text-slate-50" : "text-slate-900"}>
            Study Planner
          </CardTitle>
          <CardDescription>Set dates and daily hours on the planner page to unlock today’s targets here.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" onClick={() => navigate("/planner")}>
            Open Study Planner
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  const targets = dashboard?.todaysTarget ?? [];
  const pending = dashboard?.pendingFromYesterday ?? [];
  const preview = dashboard?.tomorrowPreview ?? [];

  const cardCls = theme === "dark" ? "border-slate-700 bg-slate-800/80" : "border-slate-200 bg-white";

  return (
    <div className="space-y-4">
      {explainOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div
            className={cn(
              "max-w-md w-full rounded-2xl border shadow-xl p-5 max-h-[70vh] overflow-y-auto",
              theme === "dark" ? "bg-slate-900 border-slate-600" : "bg-white border-slate-200"
            )}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-500" />
                Explain my plan
              </span>
              <button
                type="button"
                className="text-sm text-slate-500 hover:underline"
                onClick={() => setExplainOpen(false)}
              >
                Close
              </button>
            </div>
            {explainLoading ? (
              <p className="text-sm text-slate-500">Thinking…</p>
            ) : (
              <p className="text-sm whitespace-pre-wrap text-slate-600 dark:text-slate-300">{explainText}</p>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className={theme === "dark" ? "bg-orange-500/20 p-2 rounded-lg" : "bg-orange-100 p-2 rounded-lg"}>
            <Flame className={theme === "dark" ? "text-orange-400 w-5 h-5" : "text-orange-600 w-5 h-5"} />
          </div>
          <h2 className={cn("text-lg md:text-xl font-bold", theme === "dark" ? "text-slate-50" : "text-slate-900")}>
            Study Planner — Today
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="!min-h-[40px] text-xs" onClick={handleExplain}>
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            Explain my plan
          </Button>
          <Button type="button" variant="primary" className="!min-h-[40px] text-xs" onClick={() => navigate("/planner")}>
            Full planner
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </div>

      {dashboard?.smartMessage && (
        <p
          className={cn(
            "text-xs md:text-sm rounded-lg px-3 py-2 border",
            theme === "dark" ? "bg-amber-950/30 border-amber-800/50 text-amber-100" : "bg-amber-50 border-amber-200 text-amber-900"
          )}
        >
          {dashboard.smartMessage}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <Card className={cardCls}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <span aria-hidden>🔥</span> Today&apos;s target
            </CardTitle>
            <CardDescription>Study vs test, by subject</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {targets.length === 0 ? (
              <p className="text-xs text-slate-500">No study/test slots for today in the plan range.</p>
            ) : (
              <ul className="space-y-2">
                {targets.slice(0, 8).map((t) => {
                  const { line, sub } = formatStudyTestLine(t);
                  const kind =
                    t.taskType === "test" || t.taskType === "mcq_practice" ? "test" : "study";
                  return (
                    <li key={t._id} className="text-xs md:text-sm">
                      <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                        <SubjectBadge subject={t.subject} />
                        <TaskTypeTag type={kind} />
                      </div>
                      <p className={theme === "dark" ? "text-slate-200" : "text-slate-800"}>{line}</p>
                      {sub && <p className="text-[10px] text-slate-500">{sub}</p>}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className={cardCls}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Pending (yesterday)
            </CardTitle>
            <CardDescription>Incomplete items from yesterday</CardDescription>
          </CardHeader>
          <CardContent>
            {pending.length === 0 ? (
              <p className="text-xs text-slate-500">Nothing pending from yesterday.</p>
            ) : (
              <ul className="space-y-2">
                {pending.slice(0, 6).map((t) => (
                  <li key={t._id} className="text-xs md:text-sm">
                    <SubjectBadge subject={t.subject} className="mb-1" />
                    <p className={theme === "dark" ? "text-slate-200" : "text-slate-800"}>{t.topic}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className={cardCls}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-sky-500" />
              Tomorrow preview
            </CardTitle>
            <CardDescription>Next study &amp; test focus</CardDescription>
          </CardHeader>
          <CardContent>
            {preview.length === 0 ? (
              <p className="text-xs text-slate-500">No entries for tomorrow.</p>
            ) : (
              <ul className="space-y-2">
                {preview.slice(0, 6).map((t) => {
                  const { line } = formatStudyTestLine(t);
                  return (
                    <li key={t._id} className="text-xs md:text-sm">
                      <SubjectBadge subject={t.subject} className="mb-1" />
                      <p className={theme === "dark" ? "text-slate-200" : "text-slate-800"}>{line}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
