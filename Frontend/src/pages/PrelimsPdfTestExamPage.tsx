import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { ConfirmationDialog } from "../components/ui/dialog";
import { useTheme } from "../hooks/useTheme";
import { prelimsPdfTestAPI, PrelimsPdfTestAttemptData, PrelimsPdfQuestionInAttempt } from "../services/api";

const PrelimsPdfTestExamPage: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [data, setData] = useState<PrelimsPdfTestAttemptData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerStarted, setTimerStarted] = useState(false);

  const loadAttempt = useCallback(async () => {
    if (!attemptId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await prelimsPdfTestAPI.getAttempt(attemptId);
      if (res.data.success) {
        const d = res.data.data;
        if (d.isSubmitted) {
          navigate(`/prelims-pdf-result/${attemptId}`);
          return;
        }
        setData(d);
        const initial: Record<number, string> = {};
        d.questions.forEach((q) => {
          if (q.userAnswer) initial[q.questionNumber] = q.userAnswer;
        });
        setAnswers(initial);
        if (!timerStarted) {
          setTimerSeconds(d.duration * 60);
          setTimerStarted(true);
        }
      } else {
        setError("Failed to load test");
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to load test");
    } finally {
      setLoading(false);
    }
  }, [attemptId, navigate, timerStarted]);

  useEffect(() => {
    loadAttempt();
  }, [loadAttempt]);

  useEffect(() => {
    if (!data || data.isSubmitted) return;
    const t = setInterval(() => {
      setTimerSeconds((s) => {
        if (s <= 1) {
          clearInterval(t);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [data?.isSubmitted]);

  const saveAnswers = useCallback(async () => {
    if (!attemptId || !data) return;
    try {
      await prelimsPdfTestAPI.saveAnswers(attemptId, answers);
    } catch (_) {}
  }, [attemptId, data, answers]);

  useEffect(() => {
    const id = setInterval(saveAnswers, 30000);
    return () => clearInterval(id);
  }, [saveAnswers]);

  const handleAnswerSelect = (questionNumber: number, option: string) => {
    setAnswers((prev) => ({ ...prev, [questionNumber]: option }));
  };

  const handleConfirmSubmit = async () => {
    if (!attemptId || !data) return;
    setShowSubmitDialog(false);
    setSubmitting(true);
    setError(null);
    try {
      await prelimsPdfTestAPI.saveAnswers(attemptId, answers);
      const res = await prelimsPdfTestAPI.submit(attemptId);
      if (res.data.success) {
        navigate(`/prelims-pdf-result/${attemptId}`);
        return;
      }
      setError(res.data.message || "Submit failed");
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
          <p className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>Loading test...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className={theme === "dark" ? "text-red-300" : "text-red-800"}>{error}</p>
              <Button onClick={() => navigate("/prelims-pdf-tests")} className="mt-4">
                Back to Tests
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = data.questions[currentIndex];
  const attemptedCount = Object.keys(answers).length;
  const progress = (attemptedCount / data.totalQuestions) * 100;
  const isDark = theme === "dark";

  const renderQuestionText = (q: PrelimsPdfQuestionInAttempt) => (
    <div className="space-y-3">
      {q.questionText.english && (
        <div lang="en" className={`leading-relaxed ${isDark ? "text-slate-200" : "text-slate-900"}`}>
          {q.questionText.english}
        </div>
      )}
      {q.questionText.hindi && (
        <div
          lang="hi"
          dir="ltr"
          className={`text-base leading-relaxed ${isDark ? "text-slate-300" : "text-slate-700"}`}
          style={{ fontFamily: "'Noto Sans Devanagari', 'Mangal', 'Nirmala UI', 'Segoe UI', sans-serif" }}
        >
          {q.questionText.hindi}
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      <Card className={isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className={`text-lg font-semibold ${isDark ? "text-slate-200" : "text-slate-900"}`}>{data.title}</h2>
              <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                Question {currentIndex + 1} of {data.totalQuestions}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className={`w-4 h-4 ${isDark ? "text-slate-400" : "text-slate-600"}`} />
                <span className={`text-sm font-medium ${timerSeconds <= 300 ? "text-red-500" : isDark ? "text-slate-300" : "text-slate-700"}`}>
                  {formatTime(timerSeconds)}
                </span>
              </div>
              <div className={`text-sm font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                {attemptedCount}/{data.totalQuestions} answered
              </div>
            </div>
          </div>
          <div className="mt-4">
            <div className={`h-2 rounded-full overflow-hidden ${isDark ? "bg-slate-700" : "bg-slate-200"}`}>
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className={`text-sm font-semibold ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              Q{currentQuestion.questionNumber}.
            </div>
            <div className="leading-relaxed">{renderQuestionText(currentQuestion)}</div>
            <div className="space-y-3">
              {currentQuestion.options.map((opt) => {
                const isSelected = answers[currentQuestion.questionNumber] === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => handleAnswerSelect(currentQuestion.questionNumber, opt.key)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? "border-purple-600 bg-purple-50 dark:bg-purple-900/20"
                        : isDark
                        ? "border-slate-700 bg-slate-800 hover:border-slate-600"
                        : "border-slate-300 bg-white hover:border-slate-400"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center font-semibold ${
                          isSelected ? "border-purple-600 bg-purple-600 text-white" : isDark ? "border-slate-600 text-slate-400" : "border-slate-400 text-slate-600"
                        }`}
                      >
                        {isSelected ? <CheckCircle className="w-4 h-4" /> : opt.key}
                      </div>
                      <div className="flex-1 space-y-1 min-w-0">
                        {opt.english && (
                          <div lang="en" className={`leading-relaxed ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                            {opt.english}
                          </div>
                        )}
                        {opt.hindi && (
                          <div
                            lang="hi"
                            dir="ltr"
                            className={`text-sm leading-relaxed ${isDark ? "text-slate-300" : "text-slate-600"}`}
                            style={{ fontFamily: "'Noto Sans Devanagari', 'Mangal', 'Nirmala UI', sans-serif" }}
                          >
                            {opt.hindi}
                          </div>
                        )}
                        {!opt.english && !opt.hindi && (
                          <span className={isDark ? "text-slate-400" : "text-slate-600"}>—</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Button
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
          variant="outline"
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>
        <div className="flex gap-1 flex-wrap justify-center max-w-full">
          {data.questions.map((q, idx) => (
            <button
              key={q._id}
              onClick={() => setCurrentIndex(idx)}
              className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                idx === currentIndex
                  ? "bg-purple-600 text-white"
                  : answers[q.questionNumber]
                  ? isDark
                    ? "bg-green-900/30 text-green-400 border border-green-700"
                    : "bg-green-100 text-green-700 border border-green-300"
                  : isDark
                  ? "bg-slate-800 text-slate-400 border border-slate-700"
                  : "bg-slate-100 text-slate-600 border border-slate-300"
              }`}
            >
              {q.questionNumber}
            </button>
          ))}
        </div>
        {currentIndex < data.questions.length - 1 ? (
          <Button onClick={() => setCurrentIndex((i) => i + 1)} className="gap-2 bg-gradient-to-r from-purple-600 to-indigo-600">
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={() => setShowSubmitDialog(true)}
            disabled={submitting}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            {submitting ? "Submitting..." : "Submit Test"}
          </Button>
        )}
      </div>

      {error && (
        <Card className={`border ${isDark ? "border-red-800 bg-red-950/50" : "border-red-200 bg-red-50"}`}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className={`w-5 h-5 ${isDark ? "text-red-400" : "text-red-600"}`} />
              <p className={isDark ? "text-red-300" : "text-red-800"}>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <ConfirmationDialog
        isOpen={showSubmitDialog}
        title="Submit Test"
        message={
          attemptedCount === 0
            ? "You haven't answered any questions. Are you sure you want to submit?"
            : `You have attempted ${attemptedCount} out of ${data.totalQuestions} questions. Submit now?`
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

export default PrelimsPdfTestExamPage;
