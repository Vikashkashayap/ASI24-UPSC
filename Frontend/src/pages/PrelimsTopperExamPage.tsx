import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ConfirmationDialog } from "../components/ui/dialog";
import { useTheme } from "../hooks/useTheme";
import { prelimsTopperAPI } from "../services/api";
import { ChevronLeft, ChevronRight, CheckCircle, Clock, AlertCircle } from "lucide-react";

interface Option {
  key: string;
  text: string;
}

interface Question {
  _id: string;
  questionNumber: number;
  questionText: string;
  options: Option[];
}

interface TestInfo {
  _id: string;
  title: string;
  durationMinutes: number;
  totalQuestions: number;
}

export const PrelimsTopperExamPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const [data, setData] = useState<{
    attemptId: string;
    test: TestInfo;
    questions: Question[];
  } | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const state = location.state as any;
    if (state?.attemptId && state?.test && state?.questions?.length) {
      setData(state);
      setTimeRemainingSeconds(state.test.durationMinutes * 60);
      return;
    }
    const attemptId = new URLSearchParams(location.search).get("attemptId");
    if (attemptId) {
      prelimsTopperAPI.getAttempt(attemptId).then((res) => {
        if (res.data.success) setData(res.data.data);
      }).catch(() => setError("Failed to load attempt"));
      return;
    }
    setError("No test data. Start from Prelims Topper.");
  }, [location.state, location.search]);

  useEffect(() => {
    if (!data || timeRemainingSeconds <= 0) return;
    const t = setInterval(() => {
      setTimeRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [data, timeRemainingSeconds]);

  const handleAnswerSelect = (questionId: string, optionKey: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionKey }));
  };

  const handlePrevious = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleNext = () => {
    if (data && currentIndex < data.questions.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const handleSubmit = () => setShowSubmitDialog(true);

  const handleConfirmSubmit = async () => {
    if (!data) return;
    setShowSubmitDialog(false);
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await prelimsTopperAPI.submitTest(data.test._id, answers);
      if (res.data.success) {
        navigate(`/prelims-topper/result/${res.data.data.attemptId}`);
      } else {
        setError(res.data.message || "Submit failed");
      }
    } catch (e: any) {
      setError(e.response?.data?.message || "Failed to submit");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (error && !data) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
            <Button onClick={() => navigate("/prelims-topper")} className="mt-4">
              Back to Prelims Topper
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  const currentQuestion = data.questions[currentIndex];
  const attemptedCount = Object.keys(answers).length;
  const progress = (attemptedCount / data.test.totalQuestions) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className={`text-lg font-semibold ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>
                {data.test.title}
              </h2>
              <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                Question {currentIndex + 1} of {data.test.totalQuestions}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span className={`font-mono font-medium ${timeRemainingSeconds < 300 ? "text-red-600" : ""}`}>
                  {formatTime(timeRemainingSeconds)}
                </span>
              </div>
              <span className="text-sm">{attemptedCount}/{data.test.totalQuestions} answered</span>
            </div>
          </div>
          <div className="mt-4 h-2 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
            <div
              className="h-full bg-amber-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-6">
            <p className={`text-lg leading-relaxed ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>
              {currentQuestion.questionText}
            </p>
            <div className="space-y-3">
              {currentQuestion.options.map((opt) => {
                const isSelected = answers[currentQuestion._id] === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => handleAnswerSelect(currentQuestion._id, opt.key)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? "border-amber-600 bg-amber-50 dark:bg-amber-900/20"
                        : theme === "dark"
                        ? "border-slate-700 bg-slate-800 hover:border-slate-600"
                        : "border-slate-300 bg-white hover:border-slate-400"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center font-semibold ${
                          isSelected ? "border-amber-600 bg-amber-600 text-white" : ""
                        }`}
                      >
                        {isSelected ? <CheckCircle className="w-4 h-4" /> : opt.key}
                      </div>
                      <span className={theme === "dark" ? "text-slate-300" : "text-slate-700"}>{opt.text}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-4">
        <Button onClick={handlePrevious} disabled={currentIndex === 0} variant="outline">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous
        </Button>
        <div className="flex gap-2 flex-wrap justify-center">
          {data.questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`w-8 h-8 rounded-lg text-sm font-medium ${
                i === currentIndex
                  ? "bg-amber-600 text-white"
                  : answers[data.questions[i]._id]
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-300 dark:border-green-700"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-600"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
        {currentIndex < data.questions.length - 1 ? (
          <Button onClick={handleNext} className="bg-amber-600 hover:bg-amber-700">
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? "Submitting..." : "Submit Test"}
          </Button>
        )}
      </div>

      {error && (
        <div className={`p-3 rounded-lg flex items-center gap-2 ${theme === "dark" ? "bg-red-950/50 text-red-300" : "bg-red-50 text-red-800"}`}>
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      <ConfirmationDialog
        isOpen={showSubmitDialog}
        title="Submit Test"
        message={
          attemptedCount === 0
            ? "You haven't answered any questions. Submit anyway?"
            : `You attempted ${attemptedCount} of ${data.test.totalQuestions} questions. Submit now?`
        }
        confirmText="Submit"
        cancelText="Cancel"
        confirmButtonClass="bg-green-600 hover:bg-green-700 text-white"
        onConfirm={handleConfirmSubmit}
        onCancel={() => setShowSubmitDialog(false)}
        loading={isSubmitting}
      />
    </div>
  );
};
