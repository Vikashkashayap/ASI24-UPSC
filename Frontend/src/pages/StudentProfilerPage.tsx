import { FormEvent, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { studentProfilerAPI } from "../services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";

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
      <div className="min-h-screen bg-[#020012] bg-gradient-to-b from-[#050015] via-[#020012] to-black px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-50">Your Personalized Study Plan</h1>
              <p className="text-sm md:text-base text-slate-400 mt-1">AI-generated plan tailored for your UPSC preparation</p>
            </div>
            <Button onClick={handleBackToForm} variant="outline" className="text-xs md:text-sm">
              Edit Profile
            </Button>
          </div>

          {/* Summary Card */}
          <Card className="bg-slate-950/80 border-slate-800">
            <CardHeader>
              <CardTitle className="text-lg md:text-xl text-slate-50">Strategy Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm md:text-base text-slate-300">{plan.summary.strategy}</p>
              <div className="flex flex-wrap gap-2">
                <div className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs md:text-sm">
                  Focus: {plan.summary.focusSubjects.join(", ")}
                </div>
                <div className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs md:text-sm">
                  Load: {plan.summary.dailyLoadType}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Daily Plan */}
          <Card className="bg-slate-950/80 border-slate-800">
            <CardHeader>
              <CardTitle className="text-lg md:text-xl text-slate-50">7-Day Study Schedule</CardTitle>
              <CardDescription className="text-xs md:text-sm text-slate-400">
                Your weekly routine with subject balance and time allocation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {plan.dailyPlan.map((day, idx) => (
                  <div
                    key={idx}
                    className="p-3 md:p-4 rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-slate-900/70 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="text-sm md:text-base font-semibold text-slate-50">{day.day}</h3>
                        <p className="text-xs md:text-sm text-slate-300 mt-1">{day.subject}</p>
                        <p className="text-xs md:text-sm text-emerald-300 mt-1">{day.topic}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xs md:text-sm font-medium text-slate-400">{day.durationHours}h</div>
                        <div className="text-[10px] md:text-xs text-purple-300 mt-1">{day.activity}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Weekly Plan & Revision Schedule */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <Card className="bg-slate-950/80 border-slate-800">
              <CardHeader>
                <CardTitle className="text-base md:text-lg text-slate-50">Weekly Structure</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {plan.weeklyPlan.map((week, idx) => (
                    <div key={idx} className="p-3 rounded-lg border border-slate-800 bg-slate-900/50">
                      <div className="text-sm md:text-base font-semibold text-slate-50 mb-2">{week.week}</div>
                      <div className="text-xs md:text-sm text-slate-300 space-y-1">
                        <div>Focus: {week.primaryFocus.join(", ")}</div>
                        <div>Revision: {week.revisionDays.join(", ")}</div>
                        <div className="text-emerald-300">Test: {week.testDay}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-950/80 border-slate-800">
              <CardHeader>
                <CardTitle className="text-base md:text-lg text-slate-50">Revision Schedule</CardTitle>
                <CardDescription className="text-xs md:text-sm text-slate-400">
                  Spaced repetition: Revise after 3, 7, and 21 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {plan.revisionSchedule.slice(0, 10).map((rev, idx) => (
                    <div key={idx} className="p-2 rounded border border-slate-800 bg-slate-900/50">
                      <div className="text-xs md:text-sm text-slate-300 mb-1">{rev.topic}</div>
                      <div className="text-[10px] md:text-xs text-purple-300">
                        Revise after: {rev.revisionDaysAfter.join(", ")} days
                      </div>
                    </div>
                  ))}
                  {plan.revisionSchedule.length > 10 && (
                    <div className="text-xs text-slate-400 text-center">
                      +{plan.revisionSchedule.length - 10} more topics
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Dynamic Rules */}
          <Card className="bg-slate-950/80 border-slate-800">
            <CardHeader>
              <CardTitle className="text-base md:text-lg text-slate-50">Dynamic Re-planning Rules</CardTitle>
              <CardDescription className="text-xs md:text-sm text-slate-400">
                Your plan will automatically adjust based on these rules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {plan.dynamicRules.map((rule, idx) => (
                  <li key={idx} className="text-xs md:text-sm text-slate-300 flex items-start gap-2">
                    <span className="text-emerald-400 mt-1">•</span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <Button onClick={handleBackToForm} variant="outline" className="text-xs md:text-sm">
              Modify Profile
            </Button>
            <Button onClick={handleSaveAndContinue} className="text-xs md:text-sm bg-emerald-500 hover:bg-emerald-600">
              Save & Continue to Planner
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020012] bg-gradient-to-b from-[#050015] via-[#020012] to-black px-4 py-8">
      <Card className="w-full max-w-2xl bg-slate-950/90 border-slate-800">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl md:text-2xl text-slate-50">Create Your Study Profile</CardTitle>
          <CardDescription className="text-xs md:text-sm text-slate-400">
            Tell us about your UPSC preparation goals and we'll generate a personalized study plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
            {/* Target Year */}
            <div className="space-y-2">
              <label className="text-sm md:text-base text-slate-200">Target Exam Year</label>
              <input
                type="number"
                required
                min={new Date().getFullYear()}
                max={new Date().getFullYear() + 5}
                value={formData.targetYear}
                onChange={(e) => setFormData({ ...formData, targetYear: parseInt(e.target.value) })}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm md:text-base text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/70"
              />
            </div>

            {/* Daily Hours */}
            <div className="space-y-2">
              <label className="text-sm md:text-base text-slate-200">Daily Study Hours</label>
              <input
                type="number"
                required
                min={1}
                max={16}
                value={formData.dailyHours}
                onChange={(e) => setFormData({ ...formData, dailyHours: parseInt(e.target.value) })}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm md:text-base text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/70"
              />
              <p className="text-xs md:text-sm text-slate-400">Enter realistic hours you can commit daily (1-16 hours)</p>
            </div>

            {/* Exam Stage */}
            <div className="space-y-2">
              <label className="text-sm md:text-base text-slate-200">Exam Stage</label>
              <select
                required
                value={formData.examStage}
                onChange={(e) => setFormData({ ...formData, examStage: e.target.value as any })}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm md:text-base text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/70"
              >
                <option value="Prelims">Prelims Only</option>
                <option value="Mains">Mains Only</option>
                <option value="Both">Both Prelims & Mains</option>
              </select>
            </div>

            {/* Weak Subjects */}
            <div className="space-y-2">
              <label className="text-sm md:text-base text-slate-200">Weak Subjects (Select all that apply)</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
                {availableSubjects.map((subject) => (
                  <button
                    key={subject}
                    type="button"
                    onClick={() => toggleSubject(subject)}
                    className={`px-3 py-2 rounded-lg border text-xs md:text-sm transition-all ${
                      formData.weakSubjects.includes(subject)
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                        : "bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600"
                    }`}
                  >
                    {subject}
                  </button>
                ))}
              </div>
              <p className="text-xs md:text-sm text-slate-400">
                Selected: {formData.weakSubjects.length > 0 ? formData.weakSubjects.join(", ") : "None"}
              </p>
            </div>

            {/* Current Date */}
            <div className="space-y-2">
              <label className="text-sm md:text-base text-slate-200">Start Date</label>
              <input
                type="date"
                required
                value={formData.currentDate}
                onChange={(e) => setFormData({ ...formData, currentDate: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm md:text-base text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/70"
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 text-xs md:text-sm">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full text-sm md:text-base bg-emerald-500 hover:bg-emerald-600" disabled={loading}>
              {loading ? "Generating Your Plan..." : "Generate Study Plan"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

