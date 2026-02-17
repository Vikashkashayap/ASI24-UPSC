import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Loader2, ArrowRight, Target, Award, Clock, Calendar } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { useTheme } from "../../hooks/useTheme";
import { prelimsImportAPI } from "../../services/api";

type TestStatus = "live" | "upcoming" | "ended";

interface PrelimsTest {
  _id: string;
  title: string;
  totalQuestions: number;
  startTime?: string | null;
  endTime?: string | null;
  status: TestStatus;
  duration?: number;
  marksPerQuestion?: number;
  negativeMark?: number;
  createdAt?: string;
}

function formatSchedule(start: string | null | undefined, end: string | null | undefined): string {
  if (!start && !end) return "Always available";
  const s = start ? new Date(start).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) : null;
  const e = end ? new Date(end).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) : null;
  if (s && e) return `${s} – ${e}`;
  if (s) return `Starts ${s}`;
  if (e) return `Ends ${e}`;
  return "";
}

export const PrelimsTopperPage: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [tests, setTests] = useState<PrelimsTest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActiveTests();
  }, []);

  const loadActiveTests = async () => {
    try {
      setLoading(true);
      const res = await prelimsImportAPI.getActiveTests();
      if (res.data.success) setTests(res.data.data || []);
    } catch {
      setTests([]);
    } finally {
      setLoading(false);
    }
  };

  const isDark = theme === "dark";
  const liveTests = tests.filter((t) => t.status === "live");
  const upcomingTests = tests.filter((t) => t.status === "upcoming");
  const endedTests = tests.filter((t) => t.status === "ended");

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8 px-3 md:px-4">
      <div
        className={`rounded-xl p-6 border-2 ${
          isDark
            ? "bg-gradient-to-br from-amber-900/30 to-slate-900 border-amber-500/20"
            : "bg-gradient-to-br from-amber-50 to-white border-amber-200"
        }`}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className={`p-3 rounded-xl ${isDark ? "bg-amber-500/20" : "bg-amber-100"}`}>
            <Target className={`w-8 h-8 ${isDark ? "text-amber-400" : "text-amber-600"}`} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Prelims Topper Test</h1>
            <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              Real exam-style tests from uploaded question papers. Start only when the test is Live (scheduled time).
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
        </div>
      ) : tests.length === 0 ? (
        <Card className={isDark ? "bg-slate-800/50 border-slate-700" : ""}>
          <CardContent className="py-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Tests Yet</h3>
            <p className={`text-sm max-w-md mx-auto ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              There are no Prelims Topper Tests available yet. Your admin can upload question paper PDFs and set schedules.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {liveTests.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                Live now
              </h2>
              <div className="space-y-3">
                {liveTests.map((t) => (
                  <Card
                    key={t._id}
                    className={`cursor-pointer transition-all hover:shadow-lg border-green-500/30 ${
                      isDark ? "bg-slate-800/50 border-slate-700 hover:border-green-500/50" : "hover:border-green-400"
                    }`}
                    onClick={() => navigate(`/prelims-topper/test/${t._id}`)}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold truncate">{t.title}</h3>
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30">
                              Live
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-500">
                            <span>{t.totalQuestions} questions</span>
                            <span>{t.duration ?? 120} mins</span>
                            <span>• -{(t.negativeMark ?? 0.66).toFixed(2)} negative</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {formatSchedule(t.startTime, t.endTime)}
                            </span>
                          </div>
                        </div>
                        <Button className="bg-green-600 hover:bg-green-700 text-white shrink-0">
                          Start
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {upcomingTests.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-3 text-amber-600 dark:text-amber-400">
                <Calendar className="w-5 h-5" />
                Upcoming
              </h2>
              <div className="space-y-3">
                {upcomingTests.map((t) => (
                  <Card
                    key={t._id}
                    className={`opacity-90 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold truncate">{t.title}</h3>
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              Upcoming
                            </span>
                          </div>
                          <p className={`text-sm mt-2 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                            Starts {t.startTime ? new Date(t.startTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"}
                          </p>
                          <p className="text-xs mt-1 text-slate-500">{t.totalQuestions} questions • {t.duration ?? 120} mins</p>
                        </div>
                        <Button variant="outline" disabled className="shrink-0 opacity-70">
                          Starts at schedule time
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {endedTests.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-3 text-slate-500">
                <Clock className="w-5 h-5" />
                Ended
              </h2>
              <div className="space-y-3">
                {endedTests.map((t) => (
                  <Card
                    key={t._id}
                    className={`opacity-75 ${isDark ? "bg-slate-800/30 border-slate-700" : "bg-slate-100 border-slate-200"}`}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold truncate text-slate-600 dark:text-slate-400">{t.title}</h3>
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-500/20 text-slate-500 border border-slate-500/30">
                              Ended
                            </span>
                          </div>
                          <p className={`text-sm mt-2 ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                            Ended {t.endTime ? new Date(t.endTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"}
                          </p>
                          <p className="text-xs mt-1 text-slate-500">{t.totalQuestions} questions • {t.duration ?? 120} mins</p>
                        </div>
                        <Button variant="outline" disabled className="shrink-0">
                          Closed
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <Card className={isDark ? "bg-slate-800/30 border-slate-700" : ""}>
            <CardContent className="py-4">
              <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                Prelims Topper Tests use real question papers uploaded by your institute. You can start only when a test is <strong>Live</strong> (within the schedule set by admin). Each test has a timer and UPSC Prelims scoring (+2 correct, -0.66 wrong).
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
