import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useTheme } from "../../hooks/useTheme";
import { CalendarClock, Loader2 } from "lucide-react";

export interface SyllabusPlanSetupPayload {
  startDate: string;
  endDate: string;
  dailyHours: number;
  preparationLevel: string;
  syllabusJson?: unknown;
}

export interface StudyPlanSetupFormProps {
  onSubmit: (data: SyllabusPlanSetupPayload) => Promise<void>;
  isLoading?: boolean;
}

const PREP_LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
] as const;

export function StudyPlanSetupForm({ onSubmit, isLoading = false }: StudyPlanSetupFormProps) {
  const { theme } = useTheme();
  const today = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState("");
  const [dailyHours, setDailyHours] = useState(6);
  const [preparationLevel, setPreparationLevel] = useState("intermediate");
  const [syllabusJsonText, setSyllabusJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate.trim() || !endDate.trim()) return;
    if (endDate < startDate) return;
    let parsedJson: unknown = undefined;
    if (syllabusJsonText.trim()) {
      try {
        parsedJson = JSON.parse(syllabusJsonText);
        setJsonError(null);
      } catch {
        setJsonError("Invalid JSON format. Please fix and try again.");
        return;
      }
    }
    await onSubmit({
      startDate: startDate.trim(),
      endDate: endDate.trim(),
      dailyHours: Number(dailyHours) || 6,
      preparationLevel,
      syllabusJson: parsedJson,
    });
  };

  const handleJsonFile = async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      JSON.parse(text);
      setSyllabusJsonText(text);
      setJsonError(null);
    } catch {
      setJsonError("Uploaded file is not valid JSON.");
    }
  };

  return (
    <Card
      className={
        theme === "dark" ? "bg-slate-800/90 border-slate-700" : "bg-white border-slate-200"
      }
    >
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={theme === "dark" ? "bg-teal-500/20 p-2 rounded-lg" : "bg-teal-100 p-2 rounded-lg"}>
            <CalendarClock
              className={theme === "dark" ? "text-teal-400 w-5 h-5" : "text-teal-600 w-5 h-5"}
            />
          </div>
          <div>
            <CardTitle className={theme === "dark" ? "text-slate-50" : "text-slate-900"}>
              Build your syllabus plan
            </CardTitle>
            <CardDescription className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>
              Pick your window and daily hours. Topics come from the admin syllabus (Excel). If none is uploaded yet,
              a default topic map is used so you can try the planner immediately.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="startDate"
                className={
                  "block text-sm font-medium mb-1.5 " +
                  (theme === "dark" ? "text-slate-300" : "text-slate-700")
                }
              >
                Start date
              </label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
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
                htmlFor="endDate"
                className={
                  "block text-sm font-medium mb-1.5 " +
                  (theme === "dark" ? "text-slate-300" : "text-slate-700")
                }
              >
                End date (exam / phase end)
              </label>
              <Input
                id="endDate"
                type="date"
                min={startDate || today}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className={
                  theme === "dark"
                    ? "bg-slate-900 border-slate-600 text-slate-100"
                    : "bg-white border-slate-300"
                }
              />
            </div>
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
                      ? "bg-teal-600 text-white"
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
          <div>
            <label
              htmlFor="syllabusJson"
              className={
                "block text-sm font-medium mb-1.5 " +
                (theme === "dark" ? "text-slate-300" : "text-slate-700")
              }
            >
              Syllabus JSON (optional)
            </label>
            <textarea
              id="syllabusJson"
              value={syllabusJsonText}
              onChange={(e) => {
                setSyllabusJsonText(e.target.value);
                if (jsonError) setJsonError(null);
              }}
              placeholder='{"subjects":[{"name":"Polity","topics":[{"topic":"FR","subtopics":["Art 12","Art 13"],"weight":"heavy"}]}]}'
              rows={6}
              className={
                "w-full rounded-md border px-3 py-2 text-sm " +
                (theme === "dark"
                  ? "bg-slate-900 border-slate-600 text-slate-100"
                  : "bg-white border-slate-300 text-slate-800")
              }
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Input
                type="file"
                accept=".json,application/json"
                onChange={(e) => handleJsonFile(e.target.files?.[0] || null)}
                className={theme === "dark" ? "bg-slate-900 border-slate-600 text-slate-200" : ""}
              />
            </div>
            {jsonError && <p className="text-xs text-red-500 mt-1">{jsonError}</p>}
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
