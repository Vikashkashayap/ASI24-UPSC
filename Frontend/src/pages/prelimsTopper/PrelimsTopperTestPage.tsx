import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Clock,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { ConfirmationDialog } from "../../components/ui/dialog";
import { PdfViewer } from "../../components/prelimsTopper/PdfViewer";
import { useTheme } from "../../hooks/useTheme";
import { prelimsTopperAPI } from "../../services/api";

interface Question {
  questionNumber: number;
}

interface TestData {
  _id: string;
  title: string;
  duration: number;
  startTime: string;
  endTime: string;
  totalQuestions: number;
  questionPdfUrl?: string;
}

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const PrelimsTopperTestPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [test, setTest] = useState<TestData | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [omrCollapsed, setOmrCollapsed] = useState(false);

  const answersRef = useRef<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    if (id) loadTest();
  }, [id]);

  const doSubmit = async (ans: Record<number, string>) => {
    if (!id || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await prelimsTopperAPI.submitTest(id, ans);
      if (res.data.success) navigate(`/prelims-topper/result/${id}`);
      else setError(res.data.message || "Failed to submit");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!test || test.duration <= 0) return;
    const initialSeconds = test.duration * 60;
    setTimeLeft(initialSeconds);
    let mounted = true;
    const intervalId = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1 && mounted) {
          clearInterval(intervalId);
          doSubmit(answersRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [test?._id]);

  const loadTest = async () => {
    try {
      setLoading(true);
      const res = await prelimsTopperAPI.getTestQuestions(id!);
      if (res.data.success) {
        const d = res.data.data;
        setTest(d.test);
        setQuestions(d.questions || []);
        setAnswers(d.existingAnswers || {});
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || "Failed to load test");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (qNum: number, option: string) => {
    setAnswers((prev) => {
      const current = prev[qNum];
      if (current === option) {
        const next = { ...prev };
        delete next[qNum];
        return next;
      }
      return { ...prev, [qNum]: option };
    });
  };

  const handleConfirmSubmit = async () => {
    setShowSubmitDialog(false);
    await doSubmit(answers);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const pdfUrl = test?.questionPdfUrl
    ? (test.questionPdfUrl.startsWith("http") ? test.questionPdfUrl : `${API_BASE}${test.questionPdfUrl.startsWith("/") ? "" : "/"}${test.questionPdfUrl}`)
    : "";

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin text-amber-500" />
      </div>
    );
  }

  if (error && !test) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <AlertCircle className="w-12 h-12 text-red-500" />
              <p className="text-center text-red-600 dark:text-red-400">{error}</p>
              <Button onClick={() => navigate("/prelims-topper")}>Back to Prelims Topper</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!test || questions.length === 0) return null;

  const attemptedCount = Object.keys(answers).length;
  const progress = (attemptedCount / questions.length) * 100;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <Card className={`rounded-none border-x-0 border-t-0 shrink-0 ${theme === "dark" ? "bg-slate-800/50 border-slate-700" : ""}`}>
        <CardContent className="py-3 px-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold truncate">{test.title}</h2>
            <div className="flex items-center gap-4">
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                  timeLeft <= 300 ? "bg-red-500/20 text-red-600" : theme === "dark" ? "bg-slate-700" : "bg-slate-100"
                }`}
              >
                <Clock className="w-4 h-4" />
                <span className="font-mono font-semibold">{formatTime(timeLeft)}</span>
              </div>
              <span className="text-sm">{attemptedCount}/{questions.length} answered</span>
              <Button
                onClick={() => setShowSubmitDialog(true)}
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {submitting ? "Submitting..." : "Submit Test"}
              </Button>
            </div>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </CardContent>
      </Card>

      {/* Main: PDF left, OMR right */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left: PDF Viewer */}
        <div className="flex-1 min-w-0 overflow-hidden p-2">
          <PdfViewer url={pdfUrl} className="h-full" width={undefined} />
        </div>

        {/* Right: OMR Panel */}
        <div
          className={`shrink-0 border-l ${theme === "dark" ? "border-slate-700 bg-slate-900/50" : "border-slate-200 bg-slate-50"}
            ${omrCollapsed ? "w-12" : "w-72 md:w-80"} flex flex-col transition-all`}
        >
          <button
            type="button"
            onClick={() => setOmrCollapsed(!omrCollapsed)}
            className={`flex items-center justify-center p-2 border-b ${theme === "dark" ? "border-slate-700" : "border-slate-200"}`}
          >
            {omrCollapsed ? (
              <ChevronRight className="w-5 h-5" aria-label="Expand OMR" />
            ) : (
              <>
                <span className="text-sm font-medium mr-1">OMR</span>
                <ChevronLeft className="w-4 h-4" aria-label="Collapse OMR" />
              </>
            )}
          </button>
          {!omrCollapsed && (
            <div className="flex-1 overflow-auto p-3">
              <p className="text-xs text-slate-500 mb-3">Select answer for each question (1–100)</p>
              <div className="grid grid-cols-5 gap-1">
                {questions.map((q) => (
                  <div
                    key={q.questionNumber}
                    className={`rounded p-1.5 border ${
                      answers[q.questionNumber]
                        ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                        : theme === "dark"
                        ? "border-slate-700"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="text-xs font-medium text-center mb-1">{q.questionNumber}</div>
                    <div className="flex gap-0.5">
                      {(["A", "B", "C", "D"] as const).map((opt) => {
                        const isSelected = answers[q.questionNumber] === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleAnswerSelect(q.questionNumber, opt)}
                            className={`flex-1 min-w-0 py-0.5 text-[10px] rounded ${
                              isSelected
                                ? "bg-amber-500 text-white"
                                : theme === "dark"
                                ? "bg-slate-700 hover:bg-slate-600"
                                : "bg-slate-200 hover:bg-slate-300"
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <Card className="absolute bottom-4 left-4 right-4 max-w-md mx-auto border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 z-10">
          <CardContent className="py-2">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      <ConfirmationDialog
        isOpen={showSubmitDialog}
        title="Submit Test"
        message={
          attemptedCount === 0
            ? "You haven't answered any questions. Submit anyway?"
            : `You have attempted ${attemptedCount} of ${questions.length} questions. Submit now?`
        }
        confirmText="Submit"
        cancelText="Cancel"
        confirmButtonClass="bg-green-600 hover:bg-green-700 text-white"
        onConfirm={handleConfirmSubmit}
        onCancel={() => setShowSubmitDialog(false)}
        loading={submitting}
      />
    </div>
  );
};
