import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Send,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { useTheme } from "../../hooks/useTheme";
import { prelimsImportAPI } from "../../services/api";
import { cleanDisplayText } from "../../utils/prelimsImportText";

interface OptionSet {
  A: string;
  B: string;
  C: string;
  D: string;
}

interface Question {
  _id: string;
  questionNumber: number;
  questionText: string;
  options: OptionSet;
}

interface TestInfo {
  _id: string;
  title: string;
  totalQuestions: number;
  duration?: number;
  marksPerQuestion?: number;
  negativeMark?: number;
  totalMarks?: number;
}

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

export const PrelimsTopperTestPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [test, setTest] = useState<TestInfo | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const answersRef = useRef<Record<number, string>>({});
  const submitRef = useRef<(ans: Record<number, string>) => Promise<void>>(() => Promise.resolve());

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    if (id) loadTest();
  }, [id]);

  const loadTest = async () => {
    try {
      setLoading(true);
      const res = await prelimsImportAPI.getTest(id!);
      if (res.data.success) {
        const d = res.data.data;
        setTest(d.test);
        setQuestions(d.questions || []);
        setAnswers(typeof d.existingAnswers === "object" ? d.existingAnswers : {});
      } else {
        setError(res.data.message || "Failed to load test");
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to load test");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!test || !questions.length) return;
    const totalMinutes = test.duration && test.duration > 0 ? test.duration : Math.min(questions.length * 2, 180);
    const initialSeconds = totalMinutes * 60;
    setTimeLeft(initialSeconds);
    let mounted = true;
    const intervalId = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1 && mounted) {
          clearInterval(intervalId);
          submitRef.current(answersRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [test?._id, questions.length]);

  const handleSubmit = async (ans: Record<number, string>) => {
    if (!id || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await prelimsImportAPI.submitTest(id, ans);
      if (res.data.success) navigate(`/prelims-topper/result/${id}`);
      else setError(res.data.message || "Failed to submit");
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to submit");
    } finally {
      setSubmitting(false);
      setShowSubmitConfirm(false);
    }
  };

  useEffect(() => {
    submitRef.current = handleSubmit;
  });

  const setAnswer = (option: string) => {
    const q = questions[currentIndex];
    if (!q) return;
    setAnswers((prev) => ({ ...prev, [q.questionNumber]: option }));
  };

  const attemptedCount = Object.keys(answers).length;
  const current = questions[currentIndex];
  const isDark = theme === "dark";

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin text-amber-500" />
      </div>
    );
  }

  if (error && !test) {
    return (
      <div className="p-4 max-w-xl mx-auto">
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            <AlertCircle className="w-12 h-12 text-red-500" />
            <p className="text-center text-red-600 dark:text-red-400">{error}</p>
            <Button variant="outline" onClick={() => navigate("/prelims-topper")}>
              Back to Prelims Topper
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!test || !questions.length) return null;

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? "bg-[#0f0a1a]" : "bg-slate-100"}`}>
      <div
        className={`sticky top-0 z-10 flex items-center justify-between gap-4 px-4 py-3 border-b shadow-sm ${
          isDark ? "bg-slate-900/95 border-slate-700" : "bg-white border-slate-200"
        }`}
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-mono font-medium">
            <Clock className="w-5 h-5" />
            <span>{formatTime(timeLeft)}</span>
          </div>
          <span className="text-sm text-slate-500 dark:text-slate-400 truncate">
            {attemptedCount} / {questions.length} attempted
          </span>
        </div>
        <h1 className="text-sm font-medium truncate max-w-[140px] sm:max-w-xs" title={test.title}>
          {test.title}
        </h1>
      </div>

      {error && (
        <div className="mx-4 mt-2 p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex-1 p-4 md:p-6 max-w-3xl mx-auto w-full">
        <div
          className={`rounded-2xl shadow-lg p-6 md:p-8 ${
            isDark
              ? "bg-slate-800/80 border border-slate-700"
              : "bg-white border border-slate-200 shadow-slate-200/50"
          }`}
        >
          <p
            className={`text-sm font-medium mb-3 ${
              isDark ? "text-slate-400" : "text-slate-500"
            }`}
          >
            Question {current.questionNumber} of {questions.length}
          </p>
          <p
            className={`text-base leading-relaxed mb-6 ${
              isDark ? "text-slate-100" : "text-slate-800"
            }`}
          >
            {cleanDisplayText(current.questionText)}
          </p>
          <div className="space-y-3">
            {(["A", "B", "C", "D"] as const).map((key) => {
              const raw = current.options[key];
              const label = cleanDisplayText(raw);
              if (!label) return null;
              const isSelected = answers[current.questionNumber] === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setAnswer(key)}
                  className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all ${
                    isSelected
                      ? "border-amber-500 bg-amber-50 text-amber-900 dark:border-amber-400 dark:bg-amber-500/25 dark:text-amber-100"
                      : isDark
                        ? "border-slate-600 bg-slate-700/50 text-slate-200 hover:border-slate-500 hover:bg-slate-700"
                        : "border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  <span className="font-semibold mr-2">{key}.</span>
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between mt-6 gap-4">
          <button
            type="button"
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-medium transition ${
              currentIndex === 0
                ? "opacity-50 cursor-not-allowed bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                : isDark
                  ? "bg-amber-600 text-white hover:bg-amber-500"
                  : "bg-amber-600 text-white hover:bg-amber-700"
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          <button
            type="button"
            onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
            disabled={currentIndex === questions.length - 1}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-medium text-white bg-gradient-to-r from-amber-600 to-emerald-500 hover:from-amber-500 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-slate-400 disabled:to-slate-400 transition shadow-md"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-8">
          <p
            className={`text-sm font-medium mb-2 ${
              isDark ? "text-slate-400" : "text-slate-600"
            }`}
          >
            Go to question
          </p>
          <div className="flex flex-wrap gap-1.5">
            {questions.map((q, i) => {
              const isCurrent = i === currentIndex;
              const hasAnswer = !!answers[q.questionNumber];
              return (
                <button
                  key={q._id}
                  type="button"
                  onClick={() => setCurrentIndex(i)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition ${
                    isCurrent
                      ? "bg-amber-600 text-white ring-2 ring-amber-400 ring-offset-2 dark:ring-offset-slate-900"
                      : hasAnswer
                        ? isDark
                          ? "bg-slate-600 text-slate-200 hover:bg-slate-500"
                          : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                        : isDark
                          ? "bg-slate-700/60 text-slate-400 hover:bg-slate-600 hover:text-slate-300"
                          : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 hover:border-slate-300"
                  }`}
                >
                  {q.questionNumber}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <Button
            onClick={() => setShowSubmitConfirm(true)}
            disabled={submitting}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Submit Test
          </Button>
        </div>
      </div>

      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-sm w-full">
            <CardContent className="p-6">
              <p className="font-medium mb-2">Submit test?</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                You have attempted {attemptedCount} of {questions.length} questions. This cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowSubmitConfirm(false)}>
                  Cancel
                </Button>
                <Button onClick={() => handleSubmit(answers)} disabled={submitting} className="bg-amber-600 hover:bg-amber-700">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
