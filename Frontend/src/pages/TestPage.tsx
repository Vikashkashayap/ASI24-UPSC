import React, { useState, useEffect } from "react";
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
  topic: string;
  difficulty: string;
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

  useEffect(() => {
    if (id) {
      loadTest();
    }
  }, [id]);

  useEffect(() => {
    // Timer
    const interval = setInterval(() => {
      setTimeElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

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
    setAnswers((prev) => ({
      ...prev,
      [questionId]: option,
    }));
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (test && currentIndex < test.questions.length - 1) {
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

    try {
      // Convert answers to question ID format for backend
      const answersObject: { [key: string]: string } = {};
      test.questions.forEach((q) => {
        if (answers[q._id]) {
          answersObject[q._id] = answers[q._id];
        }
      });

      const response = await testAPI.submitTest(id!, { answers: answersObject });

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
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className={theme === "dark" ? "text-red-300" : "text-red-800"}>{error}</p>
              <Button onClick={() => navigate("/prelims-test")} className="mt-4">
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
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      {/* Header with Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className={`text-lg font-semibold ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>
                {test.subject} - {test.topic}
              </h2>
              <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                Difficulty: {test.difficulty} | Question {currentIndex + 1} of {test.totalQuestions}
              </p>
            </div>
            <div className="flex items-center gap-4">
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
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div>
              <h3 className={`text-lg font-semibold mb-4 ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>
                {currentQuestion.question}
              </h3>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {(["A", "B", "C", "D"] as const).map((option) => {
                const optionText = currentQuestion.options[option];
                const isSelected = answers[currentQuestion._id] === option;

                return (
                  <button
                    key={option}
                    onClick={() => handleAnswerSelect(currentQuestion._id, option)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? "border-purple-600 bg-purple-50 dark:bg-purple-900/20"
                        : theme === "dark"
                        ? "border-slate-700 bg-slate-800 hover:border-slate-600"
                        : "border-slate-300 bg-white hover:border-slate-400"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center font-semibold ${
                          isSelected
                            ? "border-purple-600 bg-purple-600 text-white"
                            : theme === "dark"
                            ? "border-slate-600 text-slate-400"
                            : "border-slate-400 text-slate-600"
                        }`}
                      >
                        {isSelected ? <CheckCircle className="w-4 h-4" /> : option}
                      </div>
                      <span className={`flex-1 ${theme === "dark" ? "text-slate-400" : "text-slate-700"}`}>
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

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4">
        <Button
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          variant="outline"
          className="flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>

        <div className="flex gap-2">
          {test.questions.map((_, index) => {
            const isAnswered = answers[test.questions[index]._id];
            return (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                  index === currentIndex
                    ? "bg-purple-600 text-white"
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

        {currentIndex < test.questions.length - 1 ? (
          <Button
            onClick={handleNext}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Submitting...
              </>
            ) : (
              "Submit Test"
            )}
          </Button>
        )}
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

