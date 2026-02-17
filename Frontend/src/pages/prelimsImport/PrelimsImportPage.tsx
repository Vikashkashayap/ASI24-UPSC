import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Loader2, AlertCircle, Play } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { useTheme } from "../../hooks/useTheme";
import { prelimsImportAPI } from "../../services/api";

interface ImportedTest {
  _id: string;
  title: string;
  totalQuestions: number;
  createdAt: string;
}

export const PrelimsImportPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [tests, setTests] = useState<ImportedTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    try {
      setLoading(true);
      const res = await prelimsImportAPI.getActiveTests();
      if (res.data.success) setTests(res.data.data || []);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to load tests");
    } finally {
      setLoading(false);
    }
  };

  const isDark = theme === "dark";

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <Loader2 className="w-10 h-10 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 max-w-xl mx-auto">
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            <AlertCircle className="w-12 h-12 text-red-500" />
            <p className="text-center text-red-600 dark:text-red-400">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="text-xl md:text-2xl font-semibold mb-2 text-slate-800 dark:text-slate-100">
        Prelims Practice Tests
      </h1>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
        Take a test with one question at a time. Timer and progress shown.
      </p>

      {tests.length === 0 ? (
        <p className="text-slate-500 dark:text-slate-400">No tests available.</p>
      ) : (
        <ul className="space-y-3">
          {tests.map((t) => (
            <li key={t._id}>
              <Card
                className={`cursor-pointer transition hover:shadow-md ${isDark ? "bg-slate-900/50 border-slate-700 hover:border-slate-600" : "bg-white border-slate-200 hover:border-slate-300"}`}
                onClick={() => navigate(`/prelims-import/test/${t._id}`)}
              >
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg ${isDark ? "bg-slate-800" : "bg-slate-100"}`}>
                      <FileText className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 dark:text-slate-100 truncate">
                        {t.title}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {t.totalQuestions} questions
                      </p>
                    </div>
                  </div>
                  <Button size="sm" className="shrink-0">
                    <Play className="w-4 h-4 mr-1" />
                    Start
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
