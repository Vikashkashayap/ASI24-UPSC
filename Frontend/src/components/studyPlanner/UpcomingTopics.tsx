import { useTheme } from "../../hooks/useTheme";
import { cn } from "../../utils/cn";
import { Calendar, BookOpen } from "lucide-react";
import type { StudyPlanTask } from "../../services/api";

export interface UpcomingTopicsProps {
  tasks: StudyPlanTask[];
  fromDate: string; // YYYY-MM-DD
  limit?: number;
  className?: string;
}

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateLabel(dateStr: string): string {
  const [y, m, day] = dateStr.split("-").map(Number);
  const d = new Date(y, m - 1, day);
  const today = toDateString(new Date());
  if (dateStr === today) return "Today";
  const tomorrow = toDateString(new Date(Date.now() + 86400000));
  if (dateStr === tomorrow) return "Tomorrow";
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

/** From tasks, get subject_study and mock_test topics for the next N days starting from fromDate. */
export function UpcomingTopics({
  tasks,
  fromDate,
  limit = 7,
  className,
}: UpcomingTopicsProps) {
  const { theme } = useTheme();
  const from = new Date(fromDate);
  const cutoff = new Date(from);
  cutoff.setDate(cutoff.getDate() + limit);
  const cutoffStr = toDateString(cutoff);

  const relevant = tasks.filter(
    (t) =>
      t.date >= fromDate &&
      t.date <= cutoffStr &&
      (t.taskType === "subject_study" ||
        t.taskType === "study" ||
        t.taskType === "test" ||
        t.taskType === "mcq_practice" ||
        t.taskType === "mock_test")
  );

  const byDate: Record<string, { subject: string; topic: string; taskType: string }[]> = {};
  for (const t of relevant) {
    if (!byDate[t.date]) byDate[t.date] = [];
    byDate[t.date].push({
      subject: t.subject,
      topic: t.topic || t.subject,
      taskType: t.taskType,
    });
  }

  const sortedDates = Object.keys(byDate).sort();
  const displayDates = sortedDates.slice(0, limit);

  if (displayDates.length === 0) {
    return (
      <p
        className={cn(
          "text-sm py-4 text-center",
          theme === "dark" ? "text-slate-400" : "text-slate-500",
          className
        )}
      >
        No upcoming topics in the next {limit} days.
      </p>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <Calendar className={theme === "dark" ? "text-slate-400 w-4 h-4" : "text-slate-500 w-4 h-4"} />
        <span
          className={cn(
            "text-sm font-medium",
            theme === "dark" ? "text-slate-200" : "text-slate-800"
          )}
        >
          Upcoming topics
        </span>
      </div>
      <ul className="space-y-2">
        {displayDates.map((dateStr) => (
          <li
            key={dateStr}
            className={cn(
              "rounded-lg border p-2.5",
              theme === "dark" ? "border-slate-700 bg-slate-800/50" : "border-slate-200 bg-slate-50/80"
            )}
          >
            <p
              className={cn(
                "text-xs font-medium",
                theme === "dark" ? "text-slate-400" : "text-slate-500"
              )}
            >
              {formatDateLabel(dateStr)}
            </p>
            <ul className="mt-1 space-y-0.5">
              {byDate[dateStr].map((item, i) => (
                <li
                  key={`${dateStr}-${i}`}
                  className={cn(
                    "flex items-center gap-1.5 text-sm",
                    theme === "dark" ? "text-slate-200" : "text-slate-700"
                  )}
                >
                  <BookOpen className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                  {item.taskType === "mock_test" ? (
                    <span className="font-medium">Mock Test</span>
                  ) : (
                    <span>{item.subject}</span>
                  )}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
