import { useState } from "react";
import {
  Check,
  Circle,
  Clock,
  BookOpen,
  FileText,
  Target,
  RotateCcw,
  ClipboardList,
  ExternalLink,
  SkipForward,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTheme } from "../../hooks/useTheme";
import { cn } from "../../utils/cn";
import type { StudyPlanTask } from "../../services/api";
import { SubjectBadge, TaskTypeTag } from "./subjectBadge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { TopicTest } from "./TopicTest";

export interface DailyTasksListProps {
  tasks: StudyPlanTask[];
  selectedDate: string;
  onToggleComplete: (taskId: string) => void;
  loadingTaskId: string | null;
  onSubmitTestResult?: (taskId: string, accuracy: number) => Promise<void>;
  onSkipTest?: (taskId: string) => Promise<void>;
  testActionLoadingId?: string | null;
}

function displayTaskKind(taskType: string): "study" | "test" | "revision" | "other" {
  if (taskType === "study" || taskType === "subject_study") return "study";
  if (taskType === "test" || taskType === "mcq_practice") return "test";
  if (taskType === "revision") return "revision";
  return "other";
}

const taskTypeIcon: Record<string, React.ReactNode> = {
  subject_study: <BookOpen className="w-4 h-4" />,
  study: <BookOpen className="w-4 h-4" />,
  current_affairs: <FileText className="w-4 h-4" />,
  mcq_practice: <Target className="w-4 h-4" />,
  test: <Target className="w-4 h-4" />,
  revision: <RotateCcw className="w-4 h-4" />,
  mock_test: <ClipboardList className="w-4 h-4" />,
};

export function DailyTasksList({
  tasks,
  selectedDate,
  onToggleComplete,
  loadingTaskId,
  onSubmitTestResult,
  onSkipTest,
  testActionLoadingId,
}: DailyTasksListProps) {
  const { theme } = useTheme();
  const [accuracyDraft, setAccuracyDraft] = useState<Record<string, string>>({});
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
          task.startTime && task.endTime ? `${task.startTime}–${task.endTime}` : null;
        const isCurrentAffairs = task.taskType === "current_affairs";
        const kind = displayTaskKind(task.taskType);
        const isPlannerTest = task.taskType === "test" && Boolean(onSubmitTestResult);
        const testBusy = testActionLoadingId === task._id;

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
              {task.completed ? <Check className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <SubjectBadge subject={task.subject} />
                <TaskTypeTag type={kind} />
                {task.testSkipped && (
                  <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">Skipped</span>
                )}
                {task.testAccuracy != null && (
                  <span className="text-[10px] font-medium text-slate-500">Score: {task.testAccuracy}%</span>
                )}
              </div>
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
              {(task.subtopics?.length ?? 0) > 0 && (
                <ul className="mt-1 text-xs text-slate-500 dark:text-slate-400 list-disc list-inside">
                  {task.subtopics!.map((st, i) => (
                    <li key={i}>{st}</li>
                  ))}
                </ul>
              )}
              {task.revisionTopicSummaries && task.revisionTopicSummaries.length > 0 && kind === "revision" && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {task.revisionTopicSummaries.slice(0, 5).join(" · ")}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-xs",
                    theme === "dark" ? "text-slate-500" : "text-slate-500"
                  )}
                >
                  {taskTypeIcon[task.taskType] || <BookOpen className="w-4 h-4" />}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 text-xs",
                    theme === "dark" ? "text-slate-500" : "text-slate-500"
                  )}
                >
                  <Clock className="w-3.5 h-3.5" />
                  {task.duration} min
                  {task.questions != null ? ` · ${task.questions} MCQs` : ""}
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

              {isPlannerTest && !task.completed && !task.testSkipped && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="%"
                    className={cn(
                      "w-20 h-8 text-xs",
                      theme === "dark" ? "bg-slate-900 border-slate-600" : ""
                    )}
                    value={accuracyDraft[task._id] ?? ""}
                    onChange={(e) =>
                      setAccuracyDraft((d) => ({ ...d, [task._id]: e.target.value }))
                    }
                  />
                  <Button
                    type="button"
                    variant="primary"
                    disabled={testBusy}
                    className="!min-h-0 h-8 py-1 text-xs"
                    onClick={async () => {
                      const v = Number(accuracyDraft[task._id]);
                      if (Number.isNaN(v) || !onSubmitTestResult) return;
                      await onSubmitTestResult(task._id, v);
                    }}
                  >
                    Log score
                  </Button>
                  {onSkipTest && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={testBusy}
                      className="!min-h-0 h-8 py-1 text-xs"
                      onClick={() => onSkipTest(task._id)}
                    >
                      <SkipForward className="w-3.5 h-3.5 mr-1" />
                      Skip test
                    </Button>
                  )}
                </div>
              )}

              {isPlannerTest && !task.completed && !task.testSkipped && (
                <TopicTest
                  subject={task.subject}
                  chapter={task.subtopics?.[0] || task.topic || "General"}
                  topic={task.topic || task.subject}
                />
              )}
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
              task.completed && (theme === "dark" ? "opacity-75" : "opacity-85"),
              task.carriedOverFromDate &&
                (theme === "dark" ? "ring-1 ring-amber-500/30" : "ring-1 ring-amber-400/40")
            )}
          >
            {content}
          </li>
        );
      })}
    </ul>
  );
}
