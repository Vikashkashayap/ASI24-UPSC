import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useTheme } from "../../hooks/useTheme";
import { CalendarClock, Loader2 } from "lucide-react";

export interface StudyPlanSetupFormProps {
  onSubmit: (data: { examDate: string; dailyHours: number; preparationLevel: string }) => Promise<void>;
  isLoading?: boolean;
}

const PREP_LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
] as const;

export function StudyPlanSetupForm({ onSubmit, isLoading = false }: StudyPlanSetupFormProps) {
  const { theme } = useTheme();
  const [examDate, setExamDate] = useState("");
  const [dailyHours, setDailyHours] = useState(6);
  const [preparationLevel, setPreparationLevel] = useState("intermediate");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examDate.trim()) return;
    await onSubmit({
      examDate: examDate.trim(),
      dailyHours: Number(dailyHours) || 6,
      preparationLevel,
    });
  };

  const today = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  return (
    <Card
      className={
        theme === "dark"
          ? "bg-slate-800/90 border-slate-700"
          : "bg-white border-slate-200"
      }
    >
      <CardHeader>
        <div className="flex items-center gap-3">
          <div
            className={
              theme === "dark" ? "bg-teal-500/20 p-2 rounded-lg" : "bg-teal-100 p-2 rounded-lg"
            }
          >
            <CalendarClock
              className={theme === "dark" ? "text-teal-400 w-5 h-5" : "text-teal-600 w-5 h-5"}
            />
          </div>
          <div>
            <CardTitle className={theme === "dark" ? "text-slate-50" : "text-slate-900"}>
              Set up your study plan
            </CardTitle>
            <CardDescription className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>
              Set your exam target (e.g. UPSC Prelims 2026), daily study hours, and level. We'll generate a rotation plan with daily tasks and 1-3-7 revision.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="examDate"
              className={
                "block text-sm font-medium mb-1.5 " +
                (theme === "dark" ? "text-slate-300" : "text-slate-700")
              }
            >
              Exam target date (e.g. UPSC Prelims 2026)
            </label>
            <Input
              id="examDate"
              type="date"
              min={today}
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              required
              className={
                theme === "dark"
                  ? "bg-slate-900 border-slate-600 text-slate-100"
                  : "bg-white border-slate-300"
              }
            />
          </div>
          <div>
            <label
              htmlFor="dailyHours"
              className={
                "block text-sm font-medium mb-1.5 " +
                (theme === "dark" ? "text-slate-300" : "text-slate-700")
              }
            >
              Daily study hours (1–16)
            </label>
            <Input
              id="dailyHours"
              type="number"
              min={1}
              max={16}
              value={dailyHours}
              onChange={(e) => setDailyHours(Number(e.target.value) || 6)}
              className={
                theme === "dark"
                  ? "bg-slate-900 border-slate-600 text-slate-100"
                  : "bg-white border-slate-300"
              }
            />
          </div>
          <div>
            <span
              className={
                "block text-sm font-medium mb-2 " +
                (theme === "dark" ? "text-slate-300" : "text-slate-700")
              }
            >
              Preparation level
            </span>
            <div className="flex flex-wrap gap-2">
              {PREP_LEVELS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPreparationLevel(value)}
                  className={
                    "px-3 py-2 rounded-lg text-sm font-medium transition-colors " +
                    (preparationLevel === value
                      ? theme === "dark"
                        ? "bg-teal-600 text-white"
                        : "bg-teal-600 text-white"
                      : theme === "dark"
                        ? "bg-slate-700 text-slate-300 hover:bg-slate-600"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200")
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Generating plan…
              </>
            ) : (
              "Generate study plan"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
