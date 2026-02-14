import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { ConfirmationDialog } from "../components/ui/dialog";
import { useTheme } from "../hooks/useTheme";
import { testAPI } from "../services/api";

interface Question {
  _id: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  userAnswer?: string | null;
}

interface TestData {
  _id: string;
  subject: string;
  examType?: "GS" | "CSAT";
  topic: string;
  difficulty?: string;
  totalQuestions: number;
  questions: Question[];
  isSubmitted: boolean;
}

const TestPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [test, setTest] = useState<TestData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [questionTimeSpent, setQuestionTimeSpent] = useState<{ [key: string]: number }>({});
  const questionStartTimeRef = useRef(Date.now());

  useEffect(() => {
    if (id) {
      loadTest();
    }
  }, [id]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (test) questionStartTimeRef.current = Date.now();
  }, [test, currentIndex]);

  const loadTest = async () => {
    try {
      setIsLoading(true);
      const response = await testAPI.getTest(id!);
      
      if (response.data.success) {
        const testData = response.data.data;
        
        // If already submitted, redirect to results
        if (testData.isSubmitted) {
          navigate(`/result/${id}`);
          return;
        }

        setTest(testData);
        
        // Initialize answers from existing user answers
        const initialAnswers: { [key: string]: string } = {};
        testData.questions.forEach((q: Question) => {
          if (q.userAnswer) {
            initialAnswers[q._id] = q.userAnswer;
          }
        });
        setAnswers(initialAnswers);
      } else {
        setError("Failed to load test");
      }
    } catch (err: any) {
      console.error("Error loading test:", err);
      setError(err.response?.data?.message || "Failed to load test");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSelect = (questionId: string, option: string) => {
    setAnswers((prev) => {
      const current = prev[questionId];
      if (current === option) {
        const next = { ...prev };
        delete next[questionId];
        return next;
      }
      return { ...prev, [questionId]: option };
    });
  };

  const recordTimeForCurrentQuestion = () => {
    if (!test) return;
    const q = test.questions[currentIndex];
    if (!q) return;
    const elapsed = (Date.now() - questionStartTimeRef.current) / 1000;
    setQuestionTimeSpent((prev) => ({
      ...prev,
      [q._id]: (prev[q._id] || 0) + elapsed,
    }));
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      recordTimeForCurrentQuestion();
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (test && currentIndex < test.questions.length - 1) {
      recordTimeForCurrentQuestion();
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleSubmit = () => {
    if (!test) return;
    setShowSubmitDialog(true);
  };

  const handleConfirmSubmit = async () => {
    if (!test) return;

    setShowSubmitDialog(false);
    setIsSubmitting(true);
    setError(null);

    const currentQ = test.questions[currentIndex];
    const timeForCurrent = currentQ ? (Date.now() - questionStartTimeRef.current) / 1000 : 0;
    const finalTimeSpent: { [key: string]: number } = { ...questionTimeSpent };
    if (currentQ) {
      finalTimeSpent[currentQ._id] = (finalTimeSpent[currentQ._id] || 0) + timeForCurrent;
    }

    try {
      const answersObject: { [key: string]: string } = {};
      test.questions.forEach((q) => {
        if (answers[q._id]) {
          answersObject[q._id] = answers[q._id];
        }
      });

      const response = await testAPI.submitTest(id!, {
        answers: answersObject,
        questionTimeSpent: finalTimeSpent,
      });

      if (response.data.success) {
        navigate(`/result/${id}`);
      } else {
        setError(response.data.message || "Failed to submit test");
      }
    } catch (err: any) {
      console.error("Error submitting test:", err);
      setError(err.response?.data?.message || "Failed to submit test");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelSubmit = () => {
    setShowSubmitDialog(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>Loading test...</p>
        </div>
      </div>
    );
  }

  if (error && !test) {
    return (
      <div className="max-w-2xl mx-auto px-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className={theme === "dark" ? "text-red-300" : "text-red-800"}>{error}</p>
              <Button onClick={() => navigate("/prelims-test")} className="mt-4 min-h-[44px] touch-manipulation">
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!test) return null;

  const currentQuestion = test.questions[currentIndex];
  const attemptedCount = Object.keys(answers).length;
  const progress = (attemptedCount / test.totalQuestions) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 pb-6 sm:pb-8 px-3 sm:px-4 overflow-x-hidden">
      {/* Header with Progress */}
      <Card>
        <CardContent className="pt-4 sm:pt-6 pb-4 sm:pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <h2 className={`text-base sm:text-lg font-semibold truncate ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>
                {test.subject} - {test.topic}
              </h2>
              <p className={`text-xs sm:text-sm mt-0.5 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                {test.examType === "CSAT" ? "CSAT" : `Difficulty: ${test.difficulty ?? "—"}`} | Q {currentIndex + 1}/{test.totalQuestions}
              </p>
            </div>
            <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Clock className={`w-4 h-4 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`} />
                <span className={`text-sm font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                  {formatTime(timeElapsed)}
                </span>
              </div>
              <div className={`text-sm font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                {attemptedCount}/{test.totalQuestions} answered
              </div>
            </div>
          </div>
          {/* Progress Bar */}
          <div className="mt-4">
            <div className={`h-2 rounded-full overflow-hidden ${theme === "dark" ? "bg-slate-700" : "bg-slate-200"}`}>
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Question Card */}
      <Card>
        <CardContent className="pt-4 sm:pt-6 pb-4 sm:pb-6">
          <div className="space-y-4 sm:space-y-6">
            <div className="min-w-0 overflow-hidden">
              <div className={`text-base sm:text-lg font-semibold mb-3 sm:mb-4 leading-relaxed break-words ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>
                {currentQuestion.question.split('\n').map((line, lineIdx, lines) => {
                  const trimmedLine = line.trim();
                  if (!trimmedLine) return null;
                  
                  // Format numbered statements with proper indentation
                  const numberedMatch = trimmedLine.match(/^(\d+)\.\s*(.+)$/);
                  if (numberedMatch) {
                    return (
                      <div key={lineIdx} className="ml-4 mt-2 first:mt-1">
                        <span className="font-bold mr-1">{numberedMatch[1]}.</span>
                        <span>{numberedMatch[2]}</span>
                      </div>
                    );
                  }
                  
                  // Format List-I / List-II sections
                  if (trimmedLine.match(/^(List-I|List-II|Match List-I|Assertion|Reason):?$/i)) {
                    return (
                      <div key={lineIdx} className={`mt-3 mb-2 font-bold ${theme === "dark" ? "text-purple-300" : "text-purple-700"}`}>
                        {trimmedLine}
                      </div>
                    );
                  }
                  
                  // Format regular lines
                  return (
                    <div key={lineIdx} className={lineIdx === 0 ? "" : "mt-2"}>
                      {trimmedLine}
                    </div>
                  );
                }).filter(Boolean)}
              </div>
            </div>

            {/* Options - touch-friendly, tap again to unselect */}
            <div className="space-y-2 sm:space-y-3">
              {(["A", "B", "C", "D"] as const).map((option) => {
                const optionText = currentQuestion.options[option];
                const isSelected = answers[currentQuestion._id] === option;

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleAnswerSelect(currentQuestion._id, option)}
                    className={`w-full text-left p-3 sm:p-4 min-h-[48px] sm:min-h-[56px] rounded-xl border-2 transition-all active:scale-[0.99] touch-manipulation ${
                      isSelected
                        ? "border-purple-600 bg-purple-50 dark:bg-purple-900/20"
                        : theme === "dark"
                        ? "border-slate-700 bg-slate-800 hover:border-slate-600 active:border-slate-500"
                        : "border-slate-300 bg-white hover:border-slate-400 active:border-slate-500"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex-shrink-0 w-7 h-7 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center text-sm font-semibold ${
                          isSelected
                            ? "border-purple-600 bg-purple-600 text-white"
                            : theme === "dark"
                            ? "border-slate-600 text-slate-400"
                            : "border-slate-400 text-slate-600"
                        }`}
                      >
                        {isSelected ? <CheckCircle className="w-4 h-4" /> : option}
                      </div>
                      <span className={`flex-1 text-sm sm:text-base break-words ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>
                        {optionText}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation - mobile friendly: wrap question numbers, touch-friendly buttons */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <Button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            variant="outline"
            className="flex items-center gap-1.5 min-h-[44px] px-3 sm:px-4 touch-manipulation"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Previous</span>
          </Button>

          {currentIndex < test.questions.length - 1 ? (
            <Button
              onClick={handleNext}
              className="flex items-center gap-1.5 min-h-[44px] px-3 sm:px-4 bg-gradient-to-r from-purple-600 to-indigo-600 touch-manipulation"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 min-h-[44px] px-3 sm:px-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 touch-manipulation"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span className="hidden sm:inline">Submitting...</span>
                </>
              ) : (
                "Submit Test"
              )}
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center">
          {test.questions.map((_, index) => {
            const isAnswered = answers[test.questions[index]._id];
            return (
              <button
                key={index}
                type="button"
                onClick={() => setCurrentIndex(index)}
                className={`min-w-[36px] w-9 h-9 sm:w-8 sm:h-8 rounded-lg text-xs sm:text-sm font-medium transition-colors touch-manipulation ${
                  index === currentIndex
                    ? "bg-purple-600 text-white ring-2 ring-purple-400 ring-offset-2 dark:ring-offset-slate-900"
                    : isAnswered
                    ? theme === "dark"
                      ? "bg-green-900/30 text-green-400 border border-green-700"
                      : "bg-green-100 text-green-700 border border-green-300"
                    : theme === "dark"
                    ? "bg-slate-800 text-slate-400 border border-slate-700"
                    : "bg-slate-100 text-slate-600 border border-slate-300"
                }`}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <Card className={`border ${theme === "dark" ? "border-red-800 bg-red-950/50" : "border-red-200 bg-red-50"}`}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className={`w-5 h-5 ${theme === "dark" ? "text-red-400" : "text-red-600"}`} />
              <p className={theme === "dark" ? "text-red-300" : "text-red-800"}>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showSubmitDialog}
        title="Submit Test"
        message={
          attemptedCount === 0
            ? "You haven't answered any questions. Are you sure you want to submit the test?"
            : `You have attempted ${attemptedCount} out of ${test.totalQuestions} questions. Once submitted, you cannot change your answers. Are you sure you want to submit the test?`
        }
        confirmText="Submit Test"
        cancelText="Cancel"
        confirmButtonClass="bg-green-600 hover:bg-green-700 text-white"
        onConfirm={handleConfirmSubmit}
        onCancel={handleCancelSubmit}
        loading={isSubmitting}
      />
    </div>
  );
};

export default TestPage;

