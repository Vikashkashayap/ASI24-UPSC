import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useTheme } from "../../hooks/useTheme";
import { RefreshCw, Loader2, X, CalendarRange } from "lucide-react";
import { cn } from "../../utils/cn";
import type { SyllabusPlanSetupPayload } from "./StudyPlanSetupForm";

const PREP_LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
] as const;

export interface RegeneratePlanModalProps {
  open: boolean;
  onClose: () => void;
  initialStart: string;
  initialEnd: string;
  initialDailyHours: number;
  initialPreparationLevel: string;
  isLoading: boolean;
  onConfirm: (data: SyllabusPlanSetupPayload) => Promise<void>;
}

export function RegeneratePlanModal({
  open,
  onClose,
  initialStart,
  initialEnd,
  initialDailyHours,
  initialPreparationLevel,
  isLoading,
  onConfirm,
}: RegeneratePlanModalProps) {
  const { theme } = useTheme();
  const [startDate, setStartDate] = useState(initialStart);
  const [endDate, setEndDate] = useState(initialEnd);
  const [dailyHours, setDailyHours] = useState(initialDailyHours);
  const [preparationLevel, setPreparationLevel] = useState(initialPreparationLevel);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStartDate(initialStart);
    setEndDate(initialEnd);
    setDailyHours(initialDailyHours);
    setPreparationLevel(initialPreparationLevel);
    setFormError(null);
  }, [open, initialStart, initialEnd, initialDailyHours, initialPreparationLevel]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!startDate.trim() || !endDate.trim()) {
      setFormError("Please choose both start date and last (exam) date.");
      return;
    }
    if (endDate < startDate) {
      setFormError("Last date must be on or after the start date.");
      return;
    }
    await onConfirm({
      startDate: startDate.trim(),
      endDate: endDate.trim(),
      dailyHours: Number(dailyHours) || 6,
      preparationLevel,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="regen-plan-title"
    >
      <div
        className={cn(
          "max-w-md w-full rounded-2xl border shadow-xl p-5 max-h-[90vh] overflow-y-auto",
          theme === "dark" ? "bg-slate-900 border-slate-600 text-slate-100" : "bg-white border-slate-200 text-slate-900"
        )}
      >
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className={theme === "dark" ? "bg-emerald-500/20 p-2 rounded-lg" : "bg-emerald-100 p-2 rounded-lg"}>
              <CalendarRange className={theme === "dark" ? "text-emerald-400 w-5 h-5" : "text-emerald-600 w-5 h-5"} />
            </div>
            <div>
              <h2 id="regen-plan-title" className="text-lg font-bold">
                Regenerate plan
              </h2>
              <p className={cn("text-xs mt-0.5", theme === "dark" ? "text-slate-400" : "text-slate-600")}>
                Enter a new start date and end date — the full syllabus will be distributed topic-wise
                within this date range (subject + chapter/topic + subtopics).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => !isLoading && onClose()}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="regen-start" className="block text-sm font-medium mb-1">
                Plan start date
              </label>
              <Input
                id="regen-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className={theme === "dark" ? "bg-slate-800 border-slate-600" : ""}
              />
              <p className={cn("text-[10px] mt-1", theme === "dark" ? "text-slate-500" : "text-slate-500")}>
                The day you want to begin studying
              </p>
            </div>
            <div>
              <label htmlFor="regen-end" className="block text-sm font-medium mb-1">
                Last / exam date
              </label>
              <Input
                id="regen-end"
                type="date"
                min={startDate || undefined}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className={theme === "dark" ? "bg-slate-800 border-slate-600" : ""}
              />
              <p className={cn("text-[10px] mt-1", theme === "dark" ? "text-slate-500" : "text-slate-500")}>
                Prelims / phase end date — coverage is planned until this day
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="regen-hours" className="block text-sm font-medium mb-1">
              Daily study hours
            </label>
            <Input
              id="regen-hours"
              type="number"
              min={1}
              max={16}
              value={dailyHours}
              onChange={(e) => setDailyHours(Number(e.target.value) || 6)}
              className={theme === "dark" ? "bg-slate-800 border-slate-600" : ""}
            />
          </div>

          <div>
            <span className="block text-sm font-medium mb-2">Preparation level</span>
            <div className="flex flex-wrap gap-2">
              {PREP_LEVELS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPreparationLevel(value)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    preparationLevel === value
                      ? "bg-emerald-600 text-white"
                      : theme === "dark"
                        ? "bg-slate-700 text-slate-300"
                        : "bg-slate-100 text-slate-700"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}

          <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => !isLoading && onClose()} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="!bg-emerald-600 hover:!bg-emerald-700 !text-white">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Generating…
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Regenerate full plan
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
