import { FormEvent, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { studentProfilerAPI } from "../services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { User, Calendar, Target, BookOpen } from "lucide-react";

interface StudyPlan {
  summary: {
    strategy: string;
    focusSubjects: string[];
    dailyLoadType: string;
  };
  dailyPlan: Array<{
    day: string;
    subject: string;
    topic: string;
    durationHours: number;
    activity: string;
  }>;
  weeklyPlan: Array<{
    week: string;
    primaryFocus: string[];
    revisionDays: string[];
    testDay: string;
  }>;
  revisionSchedule: Array<{
    topic: string;
    revisionDaysAfter: number[];
  }>;
  dynamicRules: string[];
}

export const StudentProfilerPage = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "plan">("form");

  const [formData, setFormData] = useState({
    targetYear: new Date().getFullYear() + 2, // Default: 2 years from now
    dailyHours: 6,
    weakSubjects: [] as string[],
    examStage: "Prelims" as "Prelims" | "Mains" | "Both",
    currentDate: new Date().toISOString().split("T")[0],
  });

  const availableSubjects = [
    "Polity",
    "Economy",
    "History",
    "Geography",
    "Environment",
    "Science & Tech",
    "Ethics",
    "Current Affairs",
  ];

  const toggleSubject = (subject: string) => {
    setFormData((prev) => ({
      ...prev,
      weakSubjects: prev.weakSubjects.includes(subject)
        ? prev.weakSubjects.filter((s) => s !== subject)
        : [...prev.weakSubjects, subject],
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await studentProfilerAPI.generatePlan({
        targetYear: String(formData.targetYear),
        dailyHours: formData.dailyHours,
        weakSubjects: formData.weakSubjects,
        examStage: formData.examStage,
        currentDate: formData.currentDate,
      });

      if (response.data.success) {
        setPlan(response.data.data);
        setStep("plan");
      } else {
        setError(response.data.message || "Failed to generate study plan");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "An error occurred while generating your plan");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToForm = () => {
    setStep("form");
    setPlan(null);
    setError(null);
  };

  const handleSaveAndContinue = () => {
    // Navigate to planner page or dashboard
    navigate("/planner");
  };

  if (step === "plan" && plan) {
    return (
      <div className={`min-h-screen px-3 md:px-4 py-6 md:py-8 ${
        theme === "dark" ? "bg-[#020012]" : "bg-slate-50"
      }`}>
        <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
          {/* Enhanced Header */}
          <div className={`relative overflow-hidden rounded-2xl p-6 md:p-8 border-2 transition-all duration-300 ${
            theme === "dark" 
              ? "bg-gradient-to-br from-slate-800/90 via-emerald-900/20 to-slate-900/90 border-emerald-500/20 shadow-xl shadow-emerald-500/10" 
              : "bg-gradient-to-br from-white via-emerald-50/30 to-white border-emerald-200/50 shadow-xl shadow-emerald-100/30"
          }`}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-3xl" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className={`p-2.5 md:p-3 rounded-xl ${
                  theme === "dark" ? "bg-emerald-500/20" : "bg-emerald-100"
                }`}>
                  <Target className={`w-6 h-6 ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`} />
                </div>
                <div className="flex flex-col gap-1 md:gap-2">
                  <h1 className={`text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r ${
                    theme === "dark" 
                      ? "from-emerald-200 via-emerald-300 to-emerald-400 bg-clip-text text-transparent" 
                      : "from-emerald-600 via-emerald-700 to-emerald-800 bg-clip-text text-transparent"
                  }`}>
                    Your Personalized Study Plan
                  </h1>
                  <p className={`text-sm md:text-base ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                    AI-generated plan tailored for your UPSC preparation
                  </p>
                </div>
              </div>
              <Button 
                onClick={handleBackToForm} 
                variant="outline" 
                className={`text-xs md:text-sm border-2 ${
                  theme === "dark"
                    ? "border-emerald-500/50 bg-emerald-900/20 hover:bg-emerald-900/30 text-emerald-300"
                    : "border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-700"
                }`}
              >
                Edit Profile
              </Button>
            </div>
          </div>

          {/* Summary Card */}
          <Card className={`relative overflow-hidden border-2 transition-all duration-300 hover:shadow-xl ${
            theme === "dark" 
              ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-emerald-500/20 shadow-lg" 
              : "bg-gradient-to-br from-white to-emerald-50/20 border-emerald-200/50 shadow-lg"
          }`}>
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-3xl" />
            <CardHeader className="relative z-10 pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  theme === "dark" ? "bg-emerald-500/20" : "bg-emerald-100"
                }`}>
                  <BookOpen className={`w-5 h-5 ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`} />
                </div>
                <div>
                  <CardTitle className={`text-lg md:text-xl font-bold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
                    Strategy Overview
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative z-10 space-y-3">
              <p className={`text-sm md:text-base ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                {plan.summary.strategy}
              </p>
              <div className="flex flex-wrap gap-2">
                <div className={`px-3 py-1 rounded-full text-xs md:text-sm ${
                  theme === "dark" 
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
                    : "bg-emerald-100 text-emerald-700 border border-emerald-300"
                }`}>
                  Focus: {plan.summary.focusSubjects.join(", ")}
                </div>
                <div className={`px-3 py-1 rounded-full text-xs md:text-sm ${
                  theme === "dark" 
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" 
                    : "bg-purple-100 text-purple-700 border border-purple-300"
                }`}>
                  Load: {plan.summary.dailyLoadType}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Daily Plan */}
          <Card className={`relative overflow-hidden border-2 transition-all duration-300 hover:shadow-xl ${
            theme === "dark" 
              ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-purple-500/20 shadow-lg" 
              : "bg-gradient-to-br from-white to-purple-50/20 border-purple-200/50 shadow-lg"
          }`}>
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-3xl" />
            <CardHeader className="relative z-10 pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  theme === "dark" ? "bg-purple-500/20" : "bg-purple-100"
                }`}>
                  <Calendar className={`w-5 h-5 ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`} />
                </div>
                <div>
                  <CardTitle className={`text-lg md:text-xl font-bold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
                    7-Day Study Schedule
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm mt-1">
                    Your weekly routine with subject balance and time allocation
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="space-y-3">
                {plan.dailyPlan.map((day, idx) => (
                  <div
                    key={idx}
                    className={`p-3 md:p-4 rounded-lg border transition-colors ${
                      theme === "dark"
                        ? "border-slate-800 bg-slate-900/50 hover:bg-slate-900/70"
                        : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className={`text-sm md:text-base font-semibold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
                          {day.day}
                        </h3>
                        <p className={`text-xs md:text-sm mt-1 ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                          {day.subject}
                        </p>
                        <p className={`text-xs md:text-sm mt-1 ${theme === "dark" ? "text-emerald-300" : "text-emerald-600"}`}>
                          {day.topic}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs md:text-sm font-medium ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                          {day.durationHours}h
                        </div>
                        <div className={`text-[10px] md:text-xs mt-1 ${theme === "dark" ? "text-purple-300" : "text-purple-600"}`}>
                          {day.activity}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Weekly Plan & Revision Schedule */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <Card className={`relative overflow-hidden border-2 transition-all duration-300 hover:shadow-xl ${
              theme === "dark" 
                ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-cyan-500/20 shadow-lg" 
                : "bg-gradient-to-br from-white to-cyan-50/20 border-cyan-200/50 shadow-lg"
            }`}>
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-full blur-3xl" />
              <CardHeader className="relative z-10 pb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    theme === "dark" ? "bg-cyan-500/20" : "bg-cyan-100"
                  }`}>
                    <Calendar className={`w-5 h-5 ${theme === "dark" ? "text-cyan-400" : "text-cyan-600"}`} />
                  </div>
                  <div>
                    <CardTitle className={`text-base md:text-lg font-bold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
                      Weekly Structure
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="space-y-3">
                  {plan.weeklyPlan.map((week, idx) => (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-lg border ${
                        theme === "dark"
                          ? "border-slate-800 bg-slate-900/50"
                          : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className={`text-sm md:text-base font-semibold mb-2 ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
                        {week.week}
                      </div>
                      <div className={`text-xs md:text-sm space-y-1 ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                        <div>Focus: {week.primaryFocus.join(", ")}</div>
                        <div>Revision: {week.revisionDays.join(", ")}</div>
                        <div className={theme === "dark" ? "text-emerald-300" : "text-emerald-600"}>Test: {week.testDay}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className={`relative overflow-hidden border-2 transition-all duration-300 hover:shadow-xl ${
              theme === "dark" 
                ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-indigo-500/20 shadow-lg" 
                : "bg-gradient-to-br from-white to-indigo-50/20 border-indigo-200/50 shadow-lg"
            }`}>
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-full blur-3xl" />
              <CardHeader className="relative z-10 pb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    theme === "dark" ? "bg-indigo-500/20" : "bg-indigo-100"
                  }`}>
                    <BookOpen className={`w-5 h-5 ${theme === "dark" ? "text-indigo-400" : "text-indigo-600"}`} />
                  </div>
                  <div>
                    <CardTitle className={`text-base md:text-lg font-bold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
                      Revision Schedule
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm mt-1">
                      Spaced repetition: Revise after 3, 7, and 21 days
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {plan.revisionSchedule.slice(0, 10).map((rev, idx) => (
                    <div 
                      key={idx} 
                      className={`p-2 rounded border ${
                        theme === "dark"
                          ? "border-slate-800 bg-slate-900/50"
                          : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className={`text-xs md:text-sm mb-1 ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                        {rev.topic}
                      </div>
                      <div className={`text-[10px] md:text-xs ${theme === "dark" ? "text-purple-300" : "text-purple-600"}`}>
                        Revise after: {rev.revisionDaysAfter.join(", ")} days
                      </div>
                    </div>
                  ))}
                  {plan.revisionSchedule.length > 10 && (
                    <div className={`text-xs text-center ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                      +{plan.revisionSchedule.length - 10} more topics
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Dynamic Rules */}
          <Card className={`relative overflow-hidden border-2 transition-all duration-300 hover:shadow-xl ${
            theme === "dark" 
              ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-teal-500/20 shadow-lg" 
              : "bg-gradient-to-br from-white to-teal-50/20 border-teal-200/50 shadow-lg"
          }`}>
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-teal-500/10 to-transparent rounded-full blur-3xl" />
            <CardHeader className="relative z-10 pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  theme === "dark" ? "bg-teal-500/20" : "bg-teal-100"
                }`}>
                  <Target className={`w-5 h-5 ${theme === "dark" ? "text-teal-400" : "text-teal-600"}`} />
                </div>
                <div>
                  <CardTitle className={`text-base md:text-lg font-bold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
                    Dynamic Re-planning Rules
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm mt-1">
                    Your plan will automatically adjust based on these rules
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <ul className="space-y-2">
                {plan.dynamicRules.map((rule, idx) => (
                  <li key={idx} className={`text-xs md:text-sm flex items-start gap-2 ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                    <span className={`mt-1 ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}>•</span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <Button 
              onClick={handleBackToForm} 
              variant="outline" 
              className={`text-xs md:text-sm border-2 ${
                theme === "dark"
                  ? "border-emerald-500/50 bg-emerald-900/20 hover:bg-emerald-900/30 text-emerald-300"
                  : "border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-700"
              }`}
            >
              Modify Profile
            </Button>
            <Button 
              onClick={handleSaveAndContinue} 
              className="text-xs md:text-sm bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/30"
            >
              Save & Continue to Planner
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center px-3 md:px-4 py-6 md:py-8 ${
      theme === "dark" ? "bg-[#020012]" : "bg-slate-50"
    }`}>
      <div className="w-full max-w-3xl space-y-6 md:space-y-8">
        {/* Enhanced Header */}
        <div className={`relative overflow-hidden rounded-2xl p-6 md:p-8 border-2 transition-all duration-300 ${
          theme === "dark" 
            ? "bg-gradient-to-br from-slate-800/90 via-emerald-900/20 to-slate-900/90 border-emerald-500/20 shadow-xl shadow-emerald-500/10" 
            : "bg-gradient-to-br from-white via-emerald-50/30 to-white border-emerald-200/50 shadow-xl shadow-emerald-100/30"
        }`}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-3xl" />
          <div className="relative z-10 flex items-center gap-3 md:gap-4">
            <div className={`p-2.5 md:p-3 rounded-xl ${
              theme === "dark" ? "bg-emerald-500/20" : "bg-emerald-100"
            }`}>
              <User className={`w-6 h-6 ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`} />
            </div>
            <div className="flex flex-col gap-1 md:gap-2">
              <h1 className={`text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r ${
                theme === "dark" 
                  ? "from-emerald-200 via-emerald-300 to-emerald-400 bg-clip-text text-transparent" 
                  : "from-emerald-600 via-emerald-700 to-emerald-800 bg-clip-text text-transparent"
              }`}>
                Student Profiler
              </h1>
              <p className={`text-sm md:text-base ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                Tell us about your UPSC preparation goals and we'll generate a personalized study plan
              </p>
            </div>
          </div>
        </div>

      <Card className={`relative overflow-hidden border-2 transition-all duration-300 hover:shadow-xl ${
        theme === "dark" 
          ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-emerald-500/20 shadow-lg" 
          : "bg-gradient-to-br from-white to-emerald-50/20 border-emerald-200/50 shadow-lg"
      }`}>
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-3xl" />
        <CardHeader className="pb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              theme === "dark" ? "bg-emerald-500/20" : "bg-emerald-100"
            }`}>
              <Target className={`w-5 h-5 ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`} />
            </div>
            <div>
              <CardTitle className={`text-xl md:text-2xl font-bold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
                Create Your Study Profile
              </CardTitle>
              <CardDescription className="text-xs md:text-sm mt-1">
                Tell us about your UPSC preparation goals and we'll generate a personalized study plan
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
            {/* Target Year */}
            <div className="space-y-2">
              <label className={`text-sm md:text-base font-medium ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>
                Target Exam Year
              </label>
              <input
                type="number"
                required
                min={new Date().getFullYear()}
                max={new Date().getFullYear() + 5}
                value={formData.targetYear}
                onChange={(e) => setFormData({ ...formData, targetYear: parseInt(e.target.value) })}
                className={`w-full rounded-lg border px-3 py-2 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/70 ${
                  theme === "dark"
                    ? "border-slate-700 bg-slate-900 text-slate-100"
                    : "border-slate-300 bg-white text-slate-900"
                }`}
              />
            </div>

            {/* Daily Hours */}
            <div className="space-y-2">
              <label className={`text-sm md:text-base font-medium ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>
                Daily Study Hours
              </label>
              <input
                type="number"
                required
                min={1}
                max={16}
                value={formData.dailyHours}
                onChange={(e) => setFormData({ ...formData, dailyHours: parseInt(e.target.value) })}
                className={`w-full rounded-lg border px-3 py-2 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/70 ${
                  theme === "dark"
                    ? "border-slate-700 bg-slate-900 text-slate-100"
                    : "border-slate-300 bg-white text-slate-900"
                }`}
              />
              <p className={`text-xs md:text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                Enter realistic hours you can commit daily (1-16 hours)
              </p>
            </div>

            {/* Exam Stage */}
            <div className="space-y-2">
              <label className={`text-sm md:text-base font-medium ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>
                Exam Stage
              </label>
              <select
                required
                value={formData.examStage}
                onChange={(e) => setFormData({ ...formData, examStage: e.target.value as any })}
                className={`w-full rounded-lg border px-3 py-2 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/70 ${
                  theme === "dark"
                    ? "border-slate-700 bg-slate-900 text-slate-100"
                    : "border-slate-300 bg-white text-slate-900"
                }`}
              >
                <option value="Prelims">Prelims Only</option>
                <option value="Mains">Mains Only</option>
                <option value="Both">Both Prelims & Mains</option>
              </select>
            </div>

            {/* Weak Subjects */}
            <div className="space-y-2">
              <label className={`text-sm md:text-base font-medium ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>
                Weak Subjects (Select all that apply)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
                {availableSubjects.map((subject) => (
                  <button
                    key={subject}
                    type="button"
                    onClick={() => toggleSubject(subject)}
                    className={`px-3 py-2 rounded-lg border text-xs md:text-sm transition-all ${
                      formData.weakSubjects.includes(subject)
                        ? theme === "dark"
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                          : "bg-emerald-100 border-emerald-500 text-emerald-700"
                        : theme === "dark"
                        ? "bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600"
                        : "bg-white border-slate-300 text-slate-700 hover:border-slate-400"
                    }`}
                  >
                    {subject}
                  </button>
                ))}
              </div>
              <p className={`text-xs md:text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                Selected: {formData.weakSubjects.length > 0 ? formData.weakSubjects.join(", ") : "None"}
              </p>
            </div>

            {/* Current Date */}
            <div className="space-y-2">
              <label className={`text-sm md:text-base font-medium ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>
                Start Date
              </label>
              <input
                type="date"
                required
                value={formData.currentDate}
                onChange={(e) => setFormData({ ...formData, currentDate: e.target.value })}
                className={`w-full rounded-lg border px-3 py-2 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/70 ${
                  theme === "dark"
                    ? "border-slate-700 bg-slate-900 text-slate-100"
                    : "border-slate-300 bg-white text-slate-900"
                }`}
              />
            </div>

            {error && (
              <div className={`p-3 rounded-lg border text-xs md:text-sm ${
                theme === "dark"
                  ? "bg-red-500/20 border-red-500/50 text-red-300"
                  : "bg-red-50 border-red-300 text-red-700"
              }`}>
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full text-sm md:text-base bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/30" 
              disabled={loading}
            >
              {loading ? "Generating Your Plan..." : "Generate Study Plan"}
            </Button>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

