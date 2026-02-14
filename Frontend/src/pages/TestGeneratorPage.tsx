import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, BookOpen, Target, TrendingUp, History } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { SubjectToggle } from "../components/SubjectToggle";
import { useTheme } from "../hooks/useTheme";
import { testAPI } from "../services/api";
import {
  SUBJECTS,
  GS_SUBJECTS,
  CSAT_CATEGORIES,
  type ExamType,
} from "../constants/testGenerator";

const TestGeneratorPage: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [subjects, setSubjects] = useState<string[]>(["Polity"]);
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("Moderate");
  const [questionCount, setQuestionCount] = useState(20);
  const [csatCategories, setCsatCategories] = useState<string[]>([]);
  // Current Affairs: optional month/year (future ready)
  const [currentAffairsMonth, setCurrentAffairsMonth] = useState<string>("");
  const [currentAffairsYear, setCurrentAffairsYear] = useState<string>("");

  const hasCsat = subjects.includes("CSAT");
  const hasGsSubject = subjects.some((s) => s !== "CSAT" && GS_SUBJECTS.includes(s as any));
  const examType: ExamType = hasCsat && !hasGsSubject ? "CSAT" : "GS";

  const csatMixedError =
    hasCsat && hasGsSubject
      ? "CSAT cannot be mixed with GS subjects."
      : null;

  const showCsatCategories = examType === "CSAT";
  const showGsOptions = examType === "GS";
  const showCurrentAffairsOptions = subjects.includes("Current Affairs");

  const canSubmit = useMemo(() => {
    if (!topic.trim()) return false;
    if (csatMixedError) return false;
    if (examType === "CSAT" && csatCategories.length === 0) return false;
    if (subjects.length === 0) return false;
    return true;
  }, [topic, csatMixedError, examType, csatCategories.length, subjects.length]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!topic.trim()) {
      setError("Please enter a topic");
      return;
    }
    if (csatMixedError) {
      setError(csatMixedError);
      return;
    }
    if (examType === "CSAT" && csatCategories.length === 0) {
      setError("Please select at least one CSAT category.");
      return;
    }
    if (subjects.length === 0) {
      setError("Please select at least one subject.");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await testAPI.generateTest({
        subjects,
        topic: topic.trim(),
        examType,
        questionCount,
        ...(showGsOptions && { difficulty }),
        ...(examType === "CSAT" && { csatCategories }),
        ...(showCurrentAffairsOptions && (currentAffairsMonth || currentAffairsYear) && {
          currentAffairsPeriod: {
            month: currentAffairsMonth || undefined,
            year: currentAffairsYear || undefined,
          },
        }),
      });

      if (response.data.success) {
        navigate(`/test/${response.data.data._id}`);
      } else {
        setError(response.data.message || "Failed to generate test");
      }
    } catch (err: any) {
      console.error("Error generating test:", err);
      setError(err.response?.data?.message || "Failed to generate test. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-8 pb-6 md:pb-8 px-3 md:px-4 min-h-0">
      {/* Enhanced Header - compact on mobile for full mobile view */}
      <div className={`relative overflow-hidden rounded-xl md:rounded-2xl p-4 md:p-8 border-2 transition-all duration-300 ${theme === "dark"
        ? "bg-gradient-to-br from-slate-800/90 via-amber-900/20 to-slate-900/90 border-amber-500/20 shadow-xl shadow-amber-500/10"
        : "bg-gradient-to-br from-white via-amber-50/30 to-white border-amber-200/50 shadow-xl shadow-amber-100/30"
        }`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-amber-500/10 to-transparent rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-6">
          <div className="flex items-center gap-2 md:gap-4 min-w-0">
            <div className={`p-2 md:p-3 rounded-lg md:rounded-xl shrink-0 ${theme === "dark" ? "bg-amber-500/20" : "bg-amber-100"
              }`}>
              <BookOpen className={`w-5 h-5 md:w-6 md:h-6 ${theme === "dark" ? "text-amber-400" : "text-amber-600"}`} />
            </div>
            <div className="flex flex-col gap-0.5 md:gap-2 min-w-0">
              <h1 className={`text-lg md:text-3xl font-bold tracking-tight bg-gradient-to-r truncate ${theme === "dark"
                ? "from-amber-200 via-amber-300 to-amber-400 bg-clip-text text-transparent"
                : "from-amber-600 via-amber-700 to-amber-800 bg-clip-text text-transparent"
                }`}>
                UPSC Prelims Test Generator
              </h1>
              <p className={`text-xs md:text-base ${theme === "dark" ? "text-slate-300" : "text-slate-600"} hidden sm:block`}>
                Generate AI-powered UPSC Prelims MCQs and test your knowledge
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate('/test-history')}
            className={`flex items-center justify-center gap-2 shadow-lg transition-all duration-300 shrink-0 w-full sm:w-auto min-h-[44px] touch-manipulation ${theme === "dark"
              ? "bg-amber-600 hover:bg-amber-500 text-white border border-amber-500"
              : "bg-amber-500 hover:bg-amber-600 text-white border border-amber-600"
              }`}
          >
            <History className="w-4 h-4" />
            View History
          </Button>
        </div>
      </div>

      <Card className={`relative overflow-hidden border-2 transition-all duration-300 hover:shadow-xl rounded-2xl ${theme === "dark"
        ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-amber-500/20 shadow-lg"
        : "bg-gradient-to-br from-white to-amber-50/20 border-amber-200/50 shadow-lg"
        }`}>
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-amber-500/10 to-transparent rounded-full blur-3xl" />
        <CardHeader className="relative z-10 pb-3 md:pb-4 px-4 md:px-6 pt-4 md:pt-6">
          <div className="flex items-center gap-2 md:gap-3">
            <div className={`p-2 rounded-lg shrink-0 ${theme === "dark" ? "bg-amber-500/20" : "bg-amber-100"
              }`}>
              <BookOpen className={`w-5 h-5 ${theme === "dark" ? "text-amber-400" : "text-amber-600"}`} />
            </div>
            <div className="min-w-0">
              <CardTitle className={`text-base md:text-xl font-bold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
                Test Configuration
              </CardTitle>
              <CardDescription className="mt-0.5 md:mt-1 text-xs md:text-sm">
                Select your preferences to generate a customized test
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 md:px-6 pb-4 md:pb-6">
          <form onSubmit={handleGenerate} className="space-y-4 md:space-y-6">
            {/* Subject Selection – multi-select */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Subject
              </label>
              <SubjectToggle
                options={SUBJECTS}
                selected={subjects}
                onChange={setSubjects}
                disabled={isGenerating}
              />
            </div>

            {/* CSAT categories – shown only when examType is CSAT */}
            {showCsatCategories && (
              <div>
                <SubjectToggle
                  label="CSAT categories (select at least one)"
                  options={CSAT_CATEGORIES}
                  selected={csatCategories}
                  onChange={setCsatCategories}
                  disabled={isGenerating}
                />
              </div>
            )}

            {/* Topic Input */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Topic <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Fundamental Rights, Ancient History, Climate Change"
                className={`w-full px-4 py-3 md:py-2 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-transparent text-base touch-manipulation ${theme === "dark"
                  ? "bg-slate-800 border-slate-700 text-slate-200"
                  : "border-slate-300 bg-white"
                  }`}
                disabled={isGenerating}
                required
              />
            </div>

            {/* Current Affairs: optional month/year (future ready) */}
            {showCurrentAffairsOptions && (
              <div className={`p-4 rounded-lg border ${theme === "dark" ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                <p className={`text-sm font-medium mb-2 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                  Current Affairs period (optional, for future use)
                </p>
                <div className="flex flex-wrap gap-4">
                  <div>
                    <label className={`block text-xs mb-1 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>Month</label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={currentAffairsMonth}
                      onChange={(e) => setCurrentAffairsMonth(e.target.value)}
                      placeholder="e.g. 1–12"
                      className={`w-24 px-3 py-2 rounded-lg border ${theme === "dark" ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-white border-slate-300"}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs mb-1 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>Year</label>
                    <input
                      type="number"
                      min={2020}
                      max={2030}
                      value={currentAffairsYear}
                      onChange={(e) => setCurrentAffairsYear(e.target.value)}
                      placeholder="e.g. 2024"
                      className={`w-24 px-3 py-2 rounded-lg border ${theme === "dark" ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-white border-slate-300"}`}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Validation error: CSAT mixed with GS */}
            {csatMixedError && (
              <div className={`border rounded-lg p-4 flex items-start gap-3 ${theme === "dark"
                ? "bg-red-950/50 border-red-800"
                : "bg-red-50 border-red-200"
                }`}>
                <span className={`text-red-500 ${theme === "dark" ? "text-red-400" : "text-red-600"}`}>⚠</span>
                <p className={theme === "dark" ? "text-red-300" : "text-red-800"}>{csatMixedError}</p>
              </div>
            )}

            {/* Error Message */}
            {error && !csatMixedError && (
              <div className={`border rounded-lg p-4 flex items-start gap-3 ${theme === "dark"
                ? "bg-red-950/50 border-red-800"
                : "bg-red-50 border-red-200"
                }`}>
                <span className={`text-red-500 ${theme === "dark" ? "text-red-400" : "text-red-600"}`}>⚠</span>
                <p className={theme === "dark" ? "text-red-300" : "text-red-800"}>{error}</p>
              </div>
            )}

            {/* Generate Button */}
            <Button
              type="submit"
              disabled={isGenerating || !canSubmit}
              className={`w-full px-6 py-4 md:py-4 text-base font-semibold min-h-[48px] touch-manipulation ${isGenerating || !canSubmit
                ? "bg-slate-400 border-slate-400 text-slate-200 cursor-not-allowed"
                : "bg-gradient-to-r from-purple-600 to-green-600 hover:from-purple-700 hover:to-green-700 text-white hover:shadow-lg transform hover:scale-[1.01] active:scale-[0.99]"
                }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating Test... This may take 30-60 seconds
                </>
              ) : (
                <>
                  <Target className="mr-2 h-5 w-5" />
                  Generate Test
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Info Cards - hidden on small mobile for cleaner full mobile view */}
      <div className="max-sm:hidden grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${theme === "dark" ? "bg-purple-900/30" : "bg-purple-100"}`}>
                <BookOpen className={`w-6 h-6 ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`} />
              </div>
              <div>
                <div className={`text-sm font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                  AI-Powered
                </div>
                <div className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                  Expert questions
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${theme === "dark" ? "bg-indigo-900/30" : "bg-indigo-100"}`}>
                <Target className={`w-6 h-6 ${theme === "dark" ? "text-indigo-400" : "text-indigo-600"}`} />
              </div>
              <div>
                <div className={`text-sm font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                  UPSC Standard
                </div>
                <div className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                  Real exam style
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${theme === "dark" ? "bg-green-900/30" : "bg-green-100"}`}>
                <TrendingUp className={`w-6 h-6 ${theme === "dark" ? "text-green-400" : "text-green-600"}`} />
              </div>
              <div>
                <div className={`text-sm font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                  Instant Results
                </div>
                <div className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                  Detailed feedback
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestGeneratorPage;
