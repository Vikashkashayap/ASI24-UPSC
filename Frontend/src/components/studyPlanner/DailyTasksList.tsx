import { Check, Circle, Clock, BookOpen, FileText, Target, RotateCcw, ClipboardList, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { useTheme } from "../../hooks/useTheme";
import { cn } from "../../utils/cn";
import type { StudyPlanTask } from "../../services/api";

export interface DailyTasksListProps {
  tasks: StudyPlanTask[];
  selectedDate: string;
  onToggleComplete: (taskId: string) => void;
  loadingTaskId: string | null;
}

const taskTypeIcon: Record<string, React.ReactNode> = {
  subject_study: <BookOpen className="w-4 h-4" />,
  current_affairs: <FileText className="w-4 h-4" />,
  mcq_practice: <Target className="w-4 h-4" />,
  revision: <RotateCcw className="w-4 h-4" />,
  mock_test: <ClipboardList className="w-4 h-4" />,
};

export function DailyTasksList({
  tasks,
  selectedDate,
  onToggleComplete,
  loadingTaskId,
}: DailyTasksListProps) {
  const { theme } = useTheme();
  const dayTasks = tasks.filter((t) => t.date === selectedDate);

  if (dayTasks.length === 0) {
    return (
      <p
        className={cn(
          "text-sm py-6 text-center",
          theme === "dark" ? "text-slate-400" : "text-slate-500"
        )}
      >
        No tasks for this day.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {dayTasks.map((task) => {
        const isLoading = loadingTaskId === task._id;
        const timeSlot =
          task.startTime && task.endTime
            ? `${task.startTime}–${task.endTime}`
            : null;
        const isCurrentAffairs = task.taskType === "current_affairs";

        const content = (
          <>
            <button
              type="button"
              onClick={() => !isLoading && onToggleComplete(task._id)}
              disabled={isLoading}
              className={cn(
                "flex-shrink-0 mt-0.5 rounded-full p-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
                theme === "dark" ? "focus:ring-emerald-500" : "focus:ring-emerald-400",
                task.completed
                  ? "text-emerald-500"
                  : theme === "dark"
                    ? "text-slate-500 hover:text-slate-400"
                    : "text-slate-400 hover:text-slate-600"
              )}
              aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
            >
              {task.completed ? (
                <Check className="w-5 h-5" />
              ) : (
                <Circle className="w-5 h-5" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              {timeSlot && (
                <p
                  className={cn(
                    "text-xs font-medium tabular-nums",
                    theme === "dark" ? "text-slate-400" : "text-slate-500"
                  )}
                >
                  {timeSlot}
                </p>
              )}
              <p
                className={cn(
                  "text-sm font-medium",
                  task.completed
                    ? "line-through opacity-80"
                    : theme === "dark"
                      ? "text-slate-200"
                      : "text-slate-800"
                )}
              >
                {task.topic || task.subject}
              </p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-xs",
                    theme === "dark" ? "text-slate-500" : "text-slate-500"
                  )}
                >
                  {taskTypeIcon[task.taskType] || <BookOpen className="w-4 h-4" />}
                  {task.subject}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 text-xs",
                    theme === "dark" ? "text-slate-500" : "text-slate-500"
                  )}
                >
                  <Clock className="w-3.5 h-3.5" />
                  {task.duration} min
                </span>
                {isCurrentAffairs && (
                  <Link
                    to="/current-affairs"
                    className={cn(
                      "inline-flex items-center gap-1 text-xs font-medium",
                      theme === "dark" ? "text-teal-400 hover:text-teal-300" : "text-teal-600 hover:text-teal-700"
                    )}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Current Affairs
                  </Link>
                )}
              </div>
            </div>
          </>
        );

        return (
          <li
            key={task._id}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-3 transition-all",
              theme === "dark"
                ? "border-slate-700/80 bg-slate-800/50 hover:border-slate-600"
                : "border-slate-200 bg-white hover:border-slate-300",
              task.completed && (theme === "dark" ? "opacity-75" : "opacity-85")
            )}
          >
            {content}
          </li>
        );
      })}
    </ul>
  );
}
