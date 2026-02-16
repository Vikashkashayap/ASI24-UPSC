import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, FileText, Loader2, ArrowRight, Target, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { useTheme } from "../../hooks/useTheme";
import { prelimsTopperAPI } from "../../services/api";

interface PrelimsTest {
  _id: string;
  title: string;
  duration: number;
  startTime: string;
  endTime: string;
  totalQuestions: number;
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
      const res = await prelimsTopperAPI.getActiveTests();
      if (res.data.success) setTests(res.data.data || []);
    } catch {
      setTests([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleString("en-IN", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8 px-3 md:px-4">
      <div
        className={`rounded-xl p-6 border-2 ${
          theme === "dark"
            ? "bg-gradient-to-br from-amber-900/30 to-slate-900 border-amber-500/20"
            : "bg-gradient-to-br from-amber-50 to-white border-amber-200"
        }`}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className={`p-3 rounded-xl ${theme === "dark" ? "bg-amber-500/20" : "bg-amber-100"}`}>
            <Target className={`w-8 h-8 ${theme === "dark" ? "text-amber-400" : "text-amber-600"}`} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Prelims Topper Test</h1>
            <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
              Real exam-style tests from uploaded question papers
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
        </div>
      ) : tests.length === 0 ? (
        <Card className={theme === "dark" ? "bg-slate-800/50 border-slate-700" : ""}>
          <CardContent className="py-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Active Tests</h3>
            <p className={`text-sm max-w-md mx-auto ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
              There are no Prelims Topper Tests available right now. Tests appear only between their start and end times. Check back later!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            Active Tests
          </h2>
          {tests.map((t) => (
            <Card
              key={t._id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                theme === "dark" ? "bg-slate-800/50 border-slate-700 hover:border-amber-500/30" : "hover:border-amber-300"
              }`}
              onClick={() => navigate(`/prelims-topper/test/${t._id}`)}
            >
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{t.title}</h3>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {t.duration} mins
                      </span>
                      <span>• {t.totalQuestions} questions</span>
                      <span>• Ends {formatDate(t.endTime)}</span>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 flex-shrink-0 text-amber-500" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className={theme === "dark" ? "bg-slate-800/30 border-slate-700" : ""}>
        <CardContent className="py-4">
          <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
            Prelims Topper Tests use real question papers uploaded by your institute. Each test has a timer and UPSC Prelims scoring (+2 correct, -0.66 wrong).
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
