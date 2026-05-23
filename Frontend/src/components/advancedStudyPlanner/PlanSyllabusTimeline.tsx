import { useMemo } from "react";
import { CalendarDays, Clock, BookOpen, ChevronRight } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import { cn } from "../../utils/cn";
import type { StudyPlanTask } from "../../services/api";

type Props = {
  tasks: StudyPlanTask[];
  selectedDate: string;
  weakSubjects?: string[];
  daysToShow?: number;
};

function formatDayLabel(dateStr: string) {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

function taskTypeLabel(type: StudyPlanTask["taskType"]) {
  switch (type) {
    case "subject_study":
      return "Study";
    case "mcq_practice":
      return "MCQs";
    case "revision":
      return "Revision";
    case "current_affairs":
      return "CA";
    case "mock_test":
      return "Mock";
    default:
      return type;
  }
}

export function PlanSyllabusTimeline({ tasks, selectedDate, weakSubjects = [], daysToShow = 7 }: Props) {
  const { theme } = useTheme();

  const grouped = useMemo(() => {
    const start = new Date(`${selectedDate}T12:00:00`);
    const dates: string[] = [];
    for (let i = 0; i < daysToShow; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dates.push(d.toISOString().slice(0, 10));
    }

    return dates.map((date) => {
      const dayTasks = tasks
        .filter((t) => t.date === date)
        .sort((a, b) => {
          const ta = a.startTime || "99:99";
          const tb = b.startTime || "99:99";
          return ta.localeCompare(tb) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
        });
      const syllabusTasks = dayTasks.filter(
        (t) => t.taskType === "subject_study" || (t.syllabusModule && t.taskType !== "current_affairs"),
      );
      return { date, dayTasks, syllabusTasks };
    });
  }, [tasks, selectedDate, daysToShow]);

  const hasSyllabus = grouped.some((g) => g.syllabusTasks.some((t) => t.syllabusModule));

  return (
    <div
      className={cn(
        "rounded-2xl border-2 overflow-hidden",
        theme === "dark" ? "bg-slate-900/80 border-slate-700" : "bg-white border-slate-200",
      )}
    >
      <div
        className={cn(
          "px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2",
          theme === "dark" ? "border-slate-700 bg-slate-800/50" : "border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50",
        )}
      >
        <div>
          <h3 className="text-base font-bold flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600" />
            Syllabus timeline
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Topics from your syllabus JSON, scheduled by day & time
            {weakSubjects.length ? ` · focus: ${weakSubjects.join(", ")}` : ""}
          </p>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
          {daysToShow} days
        </span>
      </div>

      {!hasSyllabus ? (
        <p className="p-4 text-sm text-slate-500">
          Regenerate your plan to map official syllabus modules to each time slot.
        </p>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[420px] overflow-y-auto">
          {grouped.map(({ date, dayTasks, syllabusTasks }) => (
            <div key={date} className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <CalendarDays className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-bold">{formatDayLabel(date)}</span>
                {date === selectedDate && (
                  <span className="text-[10px] font-bold uppercase text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                    Today
                  </span>
                )}
              </div>

              {syllabusTasks.length === 0 ? (
                <p className="text-xs text-slate-400 pl-6">No syllabus study block this day.</p>
              ) : (
                <ul className="space-y-2 pl-1">
                  {syllabusTasks.map((task) => (
                    <li
                      key={task._id}
                      className={cn(
                        "rounded-xl border px-3 py-2.5 flex gap-3",
                        theme === "dark" ? "border-slate-700 bg-slate-800/40" : "border-slate-200 bg-slate-50/80",
                        task.completed && "opacity-60",
                      )}
                    >
                      <div className="shrink-0 text-center min-w-[52px]">
                        {task.startTime && (
                          <p className="text-xs font-bold tabular-nums text-blue-600">{task.startTime}</p>
                        )}
                        {task.endTime && (
                          <p className="text-[10px] tabular-nums text-slate-400">{task.endTime}</p>
                        )}
                        <p className="text-[10px] text-slate-400 mt-1 flex items-center justify-center gap-0.5">
                          <Clock className="w-3 h-3" />
                          {task.duration}m
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        {task.syllabusModule && (
                          <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600 truncate">
                            {task.syllabusModule}
                          </p>
                        )}
                        <p className={cn("text-sm font-semibold leading-snug", task.completed && "line-through")}>
                          {task.topic}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
                            {task.subject}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-medium">
                            {taskTypeLabel(task.taskType)}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 self-center" />
                    </li>
                  ))}
                </ul>
              )}

              {dayTasks.length > syllabusTasks.length && (
                <p className="text-[10px] text-slate-400 mt-2 pl-6">
                  + {dayTasks.length - syllabusTasks.length} other tasks (CA, mock, etc.)
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
