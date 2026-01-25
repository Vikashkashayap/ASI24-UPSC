import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, BookOpen, Target, TrendingUp, History } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { useTheme } from "../hooks/useTheme";
import { testAPI } from "../services/api";

const TestGeneratorPage: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [subject, setSubject] = useState("Polity");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("Moderate");
  const [count, setCount] = useState(10);

  const subjects = ["Polity", "History", "Geography", "Economy", "Environment", "Science & Tech"];
  const difficulties = ["Easy", "Moderate", "Hard"];
  const questionCounts = [5, 10, 20];

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!topic.trim()) {
      setError("Please enter a topic");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await testAPI.generateTest({
        subject,
        topic: topic.trim(),
        difficulty,
        count,
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
    <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 pb-8 px-3 md:px-4">
      {/* Enhanced Header */}
      <div className={`relative overflow-hidden rounded-2xl p-6 md:p-8 border-2 transition-all duration-300 ${
        theme === "dark" 
          ? "bg-gradient-to-br from-slate-800/90 via-amber-900/20 to-slate-900/90 border-amber-500/20 shadow-xl shadow-amber-500/10" 
          : "bg-gradient-to-br from-white via-amber-50/30 to-white border-amber-200/50 shadow-xl shadow-amber-100/30"
      }`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-amber-500/10 to-transparent rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6">
          <div className="flex items-center gap-3 md:gap-4">
            <div className={`p-2.5 md:p-3 rounded-xl ${
              theme === "dark" ? "bg-amber-500/20" : "bg-amber-100"
            }`}>
              <BookOpen className={`w-6 h-6 ${theme === "dark" ? "text-amber-400" : "text-amber-600"}`} />
            </div>
            <div className="flex flex-col gap-1 md:gap-2">
              <h1 className={`text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r ${
                theme === "dark" 
                  ? "from-amber-200 via-amber-300 to-amber-400 bg-clip-text text-transparent" 
                  : "from-amber-600 via-amber-700 to-amber-800 bg-clip-text text-transparent"
              }`}>
                UPSC Prelims Test Generator
              </h1>
              <p className={`text-sm md:text-base ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                Generate AI-powered UPSC Prelims MCQs and test your knowledge
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate('/test-history')}
            variant="outline"
            className={`flex items-center gap-2 border-2 ${
              theme === "dark"
                ? "border-amber-500/50 bg-amber-900/20 hover:bg-amber-900/30 text-amber-300"
                : "border-amber-300 bg-white hover:bg-amber-50 text-amber-700"
            }`}
          >
            <History className="w-4 h-4" />
            View History
          </Button>
        </div>
      </div>

      <Card className={`relative overflow-hidden border-2 transition-all duration-300 hover:shadow-xl ${
        theme === "dark" 
          ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-amber-500/20 shadow-lg" 
          : "bg-gradient-to-br from-white to-amber-50/20 border-amber-200/50 shadow-lg"
      }`}>
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-amber-500/10 to-transparent rounded-full blur-3xl" />
        <CardHeader className="relative z-10 pb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              theme === "dark" ? "bg-amber-500/20" : "bg-amber-100"
            }`}>
              <BookOpen className={`w-5 h-5 ${theme === "dark" ? "text-amber-400" : "text-amber-600"}`} />
            </div>
            <div>
              <CardTitle className={`text-lg md:text-xl font-bold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
                Test Configuration
              </CardTitle>
              <CardDescription className="mt-1">
                Select your preferences to generate a customized test
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGenerate} className="space-y-6">
            {/* Subject Selection */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Subject
              </label>
              <div className="grid grid-cols-2 gap-3">
                {subjects.map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setSubject(sub)}
                    disabled={isGenerating}
                    className={`px-4 py-3 rounded-lg border transition-colors ${
                      subject === sub
                        ? "bg-purple-600 text-white border-purple-600"
                        : theme === "dark"
                        ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
                        : "border-slate-300 bg-white hover:bg-slate-50"
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>

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
                className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  theme === "dark"
                    ? "bg-slate-800 border-slate-700 text-slate-200"
                    : "border-slate-300 bg-white"
                }`}
                disabled={isGenerating}
                required
              />
            </div>

            {/* Difficulty Selection */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Difficulty Level
              </label>
              <div className="grid grid-cols-3 gap-3">
                {difficulties.map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setDifficulty(diff)}
                    disabled={isGenerating}
                    className={`px-4 py-3 rounded-lg border transition-colors ${
                      difficulty === diff
                        ? "bg-purple-600 text-white border-purple-600"
                        : theme === "dark"
                        ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
                        : "border-slate-300 bg-white hover:bg-slate-50"
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            {/* Question Count */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Number of Questions
              </label>
              <div className="grid grid-cols-3 gap-3">
                {questionCounts.map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setCount(num)}
                    disabled={isGenerating}
                    className={`px-4 py-3 rounded-lg border transition-colors ${
                      count === num
                        ? "bg-purple-600 text-white border-purple-600"
                        : theme === "dark"
                        ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
                        : "border-slate-300 bg-white hover:bg-slate-50"
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className={`border rounded-lg p-4 flex items-start gap-3 ${
                theme === "dark"
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
              disabled={isGenerating || !topic.trim()}
              className={`w-full px-6 py-4 text-base font-semibold ${
                isGenerating || !topic.trim()
                  ? "bg-slate-400 border-slate-400 text-slate-200 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg transform hover:scale-[1.01] active:scale-[0.99]"
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

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

