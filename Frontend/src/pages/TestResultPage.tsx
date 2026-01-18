import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, Award, TrendingUp, BookOpen, ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useTheme } from "../hooks/useTheme";
import { testAPI } from "../services/api";

interface QuestionResult {
  _id: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: string;
  userAnswer: string | null;
  explanation: string;
  isCorrect: boolean;
}

interface TestResult {
  _id: string;
  subject: string;
  topic: string;
  difficulty: string;
  totalQuestions: number;
  score: number;
  correctAnswers: number;
  wrongAnswers: number;
  accuracy: number;
  questions: QuestionResult[];
  createdAt: string;
  submittedAt: string;
}

const TestResultPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [result, setResult] = useState<TestResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadResult();
    }
  }, [id]);

  const loadResult = async () => {
    try {
      setIsLoading(true);
      const response = await testAPI.getTest(id!);
      
      if (response.data.success) {
        const testData = response.data.data;
        
        // If not submitted, redirect to test page
        if (!testData.isSubmitted) {
          navigate(`/test/${id}`);
          return;
        }

        setResult(testData);
      } else {
        setError("Failed to load results");
      }
    } catch (err: any) {
      console.error("Error loading results:", err);
      setError(err.response?.data?.message || "Failed to load results");
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number, total: number) => {
    const percentage = (score / (total * 2)) * 100; // Max score is total * 2
    if (percentage >= 70) return "text-green-600";
    if (percentage >= 50) return "text-orange-600";
    return "text-red-600";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>Loading results...</p>
        </div>
      </div>
    );
  }

  if (error && !result) {
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

  if (!result) return null;

  const maxScore = result.totalQuestions * 2;
  const scorePercentage = (result.score / maxScore) * 100;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 md:space-y-6 pb-6 md:pb-8 px-3 md:px-4 overflow-x-hidden">
      {/* Header Actions - Mobile-first */}
      <div className="flex items-center justify-between gap-2">
        <Button onClick={() => navigate("/prelims-test")} variant="outline" className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm">
          <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
          <span className="hidden xs:inline">Generate New Test</span>
          <span className="xs:hidden">New Test</span>
        </Button>
      </div>

      {/* Score Summary Card - Mobile-first */}
      <Card className="bg-gradient-to-br from-purple-600 to-indigo-600 text-white">
        <CardContent className="pt-4 md:pt-6 px-3 md:px-6">
          <div className="text-center">
            <Award className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 opacity-90" />
            <h2 className="text-lg md:text-2xl font-semibold mb-2">Test Results</h2>
            <div className="text-3xl md:text-5xl font-bold mb-2">
              {result.score.toFixed(2)}
              <span className="text-xl md:text-3xl opacity-75">/{maxScore}</span>
            </div>
            <div className="text-sm md:text-lg mb-3 md:mb-4 space-y-1 md:space-y-0">
              <div className="block md:inline">
                {result.correctAnswers} Correct
              </div>
              <span className="hidden md:inline"> | </span>
              <div className="block md:inline">
                {result.wrongAnswers} Wrong
              </div>
              <span className="hidden md:inline"> | </span>
              <div className="block md:inline">
                {result.accuracy.toFixed(1)}% Accuracy
              </div>
            </div>
            <div className="inline-block bg-white/20 backdrop-blur-sm px-3 md:px-6 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-semibold break-words">
              {result.subject} - {result.topic} ({result.difficulty})
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid - Mobile-first: 2 columns on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        <Card>
          <CardContent className="pt-3 md:pt-6 px-3 md:px-6">
            <div className="text-center">
              <div className={`text-xl md:text-3xl font-bold mb-1 ${getScoreColor(result.score, result.totalQuestions)}`}>
                {result.score.toFixed(2)}
              </div>
              <div className={`text-[10px] md:text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                Total Score
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-3 md:pt-6 px-3 md:px-6">
            <div className="text-center">
              <div className="text-xl md:text-3xl font-bold mb-1 text-green-600">{result.correctAnswers}</div>
              <div className={`text-[10px] md:text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                Correct
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-3 md:pt-6 px-3 md:px-6">
            <div className="text-center">
              <div className="text-xl md:text-3xl font-bold mb-1 text-red-600">{result.wrongAnswers}</div>
              <div className={`text-[10px] md:text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                Wrong
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-3 md:pt-6 px-3 md:px-6">
            <div className="text-center">
              <div className="text-xl md:text-3xl font-bold mb-1 text-blue-600">{result.accuracy.toFixed(1)}%</div>
              <div className={`text-[10px] md:text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                Accuracy
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Questions Review - Mobile-first */}
      <Card>
        <CardHeader className="px-3 md:px-6 pb-3 md:pb-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <BookOpen className="w-4 h-4 md:w-5 md:h-5" />
            Question Review
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 md:px-6">
          <div className="space-y-3 md:space-y-4">
            {result.questions.map((question, index) => {
              const isExpanded = expandedQuestion === question._id;

              return (
                <div
                  key={question._id}
                  className={`border rounded-lg p-3 md:p-4 transition-all overflow-hidden ${
                    question.isCorrect
                      ? theme === "dark"
                        ? "border-green-800 bg-green-950/20"
                        : "border-green-200 bg-green-50"
                      : theme === "dark"
                      ? "border-red-800 bg-red-950/20"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  <div className="flex items-start gap-2 md:gap-3">
                    <div className="flex-shrink-0 mt-0.5 md:mt-1">
                      {question.isCorrect ? (
                        <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 md:w-6 md:h-6 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex items-start justify-between gap-2 md:gap-4 mb-2 md:mb-3">
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className={`text-sm md:text-base leading-relaxed ${theme === "dark" ? "text-slate-200" : "text-slate-900"} break-words`}>
                            <span className="font-bold">Q{index + 1}.</span>{" "}
                            <div className="mt-1 font-normal">
                              {question.question.split('\n').map((line, lineIdx, lines) => {
                                const trimmedLine = line.trim();
                                if (!trimmedLine) return null;
                                
                                // Format numbered statements with proper indentation
                                const numberedMatch = trimmedLine.match(/^(\d+)\.\s*(.+)$/);
                                if (numberedMatch) {
                                  return (
                                    <div key={lineIdx} className="ml-4 mt-2 first:mt-1">
                                      <span className="font-semibold mr-1">{numberedMatch[1]}.</span>
                                      <span>{numberedMatch[2]}</span>
                                    </div>
                                  );
                                }
                                
                                // Format List-I / List-II sections
                                if (trimmedLine.match(/^(List-I|List-II|Match List-I|Assertion|Reason):?$/i)) {
                                  return (
                                    <div key={lineIdx} className={`mt-3 mb-2 font-semibold ${theme === "dark" ? "text-purple-300" : "text-purple-700"}`}>
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
                        </div>
                        <span
                          className={`text-[10px] md:text-xs font-medium px-1.5 md:px-2 py-0.5 md:py-1 rounded flex-shrink-0 ${
                            question.isCorrect
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                        >
                          {question.isCorrect ? "+2" : "-0.66"}
                        </span>
                      </div>

                      {/* Options - Mobile-first */}
                      <div className="space-y-1.5 md:space-y-2 mb-2 md:mb-3">
                        {(["A", "B", "C", "D"] as const).map((option) => {
                          const optionText = question.options[option];
                          const isCorrect = option === question.correctAnswer;
                          const isUserAnswer = option === question.userAnswer;

                          return (
                            <div
                              key={option}
                              className={`p-2 md:p-3 rounded-lg border-2 ${
                                isCorrect
                                  ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                                  : isUserAnswer && !isCorrect
                                  ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                                  : theme === "dark"
                                  ? "border-slate-700 bg-slate-800"
                                  : "border-slate-300 bg-white"
                              }`}
                            >
                              <div className="flex items-center gap-1.5 md:gap-2">
                                <span
                                  className={`font-semibold text-xs md:text-sm flex-shrink-0 ${
                                    isCorrect
                                      ? "text-green-700 dark:text-green-400"
                                      : isUserAnswer && !isCorrect
                                      ? "text-red-700 dark:text-red-400"
                                      : theme === "dark"
                                      ? "text-slate-400"
                                      : "text-slate-600"
                                  }`}
                                >
                                  {option}.
                                </span>
                                <span className={`text-xs md:text-sm break-words ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                                  {optionText}
                                </span>
                                {isCorrect && (
                                  <CheckCircle className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-600 ml-auto flex-shrink-0" />
                                )}
                                {isUserAnswer && !isCorrect && (
                                  <XCircle className="w-3.5 h-3.5 md:w-4 md:h-4 text-red-600 ml-auto flex-shrink-0" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* User Answer Summary - Mobile-first */}
                      <div className={`text-xs md:text-sm mb-2 md:mb-3 p-2 rounded break-words ${
                        theme === "dark" ? "bg-slate-800" : "bg-slate-100"
                      }`}>
                        <div className="flex flex-wrap gap-1 md:gap-2">
                          <span className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>
                            Your Answer:{" "}
                          </span>
                          <span className={`font-semibold ${
                            question.isCorrect
                              ? "text-green-600"
                              : "text-red-600"
                          }`}>
                            {question.userAnswer || "Not Attempted"}
                          </span>
                          <span className={`hidden md:inline ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`}>{'|'}</span>
                          <span className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>
                            <span className="block md:inline">Correct: </span>
                          </span>
                          <span className="font-semibold text-green-600">{question.correctAnswer}</span>
                        </div>
                      </div>

                      {/* Explanation - Mobile-first */}
                      <button
                        onClick={() => setExpandedQuestion(isExpanded ? null : question._id)}
                        className={`w-full text-left text-xs md:text-sm font-medium min-h-[44px] px-2 py-2 rounded touch-manipulation ${
                          theme === "dark" ? "text-purple-400 hover:bg-purple-900/20" : "text-purple-600 hover:bg-purple-50"
                        } mb-2 transition-colors`}
                      >
                        {isExpanded ? "Hide" : "Show"} Explanation
                      </button>

                      {isExpanded && (
                        <div className={`p-2 md:p-3 rounded-lg ${
                          theme === "dark" ? "bg-slate-800 border border-slate-700" : "bg-blue-50 border border-blue-200"
                        }`}>
                          <div className="flex items-start gap-1.5 md:gap-2 mb-1.5 md:mb-2">
                            <TrendingUp className={`w-3.5 h-3.5 md:w-4 md:h-4 mt-0.5 flex-shrink-0 ${
                              theme === "dark" ? "text-blue-400" : "text-blue-600"
                            }`} />
                            <span className={`font-semibold text-xs md:text-sm ${
                              theme === "dark" ? "text-blue-300" : "text-blue-800"
                            }`}>
                              Explanation:
                            </span>
                          </div>
                          <p className={`text-xs md:text-sm break-words ${
                            theme === "dark" ? "text-slate-300" : "text-slate-700"
                          }`}>
                            {question.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestResultPage;

