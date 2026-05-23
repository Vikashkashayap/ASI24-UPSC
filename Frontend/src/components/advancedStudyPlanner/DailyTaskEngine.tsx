import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Circle,
  Clock,
  GripVertical,
  BookOpen,
  Brain,
  Play,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "../../hooks/useTheme";
import { cn } from "../../utils/cn";
import { PRIORITY_COLORS, DIFFICULTY_COLORS, buildPlannerPracticeUrl } from "./plannerUtils";
import type { StudyPlanTask } from "../../services/api";

const SUBJECT_EMOJI: Record<string, string> = {
  Polity: "📘",
  History: "📕",
  Geography: "📗",
  Economy: "📙",
  Environment: "🌿",
  "Science & Tech": "🔬",
  "Current Affairs": "📰",
  CSAT: "🧮",
  Revision: "🔄",
};

interface Props {
  tasks: StudyPlanTask[];
  selectedDate: string;
  onToggleComplete: (taskId: string) => void;
  onCompleteTopic?: (taskId: string) => Promise<{ practiceRoute?: string; mcqTask?: StudyPlanTask } | void>;
  onStartPractice?: (taskId: string) => Promise<{ routes?: { mcq: string; pyq: string } } | void>;
  onReorder: (taskIds: string[]) => void;
  loadingTaskId: string | null;
}

function SortableTask({
  task,
  onToggle,
  onStartReading,
  onPractice,
  onCompleteTopic,
  loading,
}: {
  task: StudyPlanTask;
  onToggle: () => void;
  onStartReading: () => void;
  onPractice: (pyq?: boolean) => void;
  onCompleteTopic: () => void;
  loading: boolean;
}) {
  const { theme } = useTheme();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
  };

  const priority = task.priority || "medium";
  const difficulty = task.difficulty || "medium";
  const emoji = SUBJECT_EMOJI[task.subject] || "📚";
  const isStudy = task.taskType === "subject_study";
  const isMcq = task.taskType === "mcq_practice";
  const showPractice =
    (isStudy && task.completed && (task.practiceUnlocked ?? true)) ||
    (isMcq && (task.practiceUnlocked || task.completed));
  const canStartReading = isStudy && !task.completed;

  return (
    <motion.li
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className={cn(
        "rounded-xl border p-3 transition-shadow",
        theme === "dark" ? "bg-slate-800/60 border-slate-700" : "bg-white border-slate-200",
        task.completed && "opacity-90",
        isDragging && "shadow-lg ring-2 ring-blue-400/50 z-10"
      )}
    >
      <div className="flex items-start gap-2">
        <button type="button" className="cursor-grab touch-none p-1 text-slate-400 shrink-0" {...attributes} {...listeners}>
          <GripVertical className="w-4 h-4" />
        </button>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold flex items-center gap-1.5">
                <span>{emoji}</span>
                <span>{task.subject}</span>
              </p>
              <p className={cn("text-sm mt-0.5", task.completed && "line-through opacity-70")}>
                {task.topic || task.subject}
              </p>
            </div>
            <button
              type="button"
              onClick={onToggle}
              disabled={loading}
              className="shrink-0"
              aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
            >
              {task.completed ? (
                <Check className="w-5 h-5 text-emerald-500" />
              ) : (
                <Circle className="w-5 h-5 text-slate-400" />
              )}
            </button>
          </div>

          {task.startTime && task.endTime && (
            <p className="text-xs tabular-nums opacity-60">
              {task.startTime}–{task.endTime}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 text-xs opacity-70">
              <Clock className="w-3 h-3" /> {(task.duration / 60 >= 1 ? (task.duration / 60).toFixed(1) + " hrs" : task.duration + "m")}
            </span>
            <span className={cn("text-xs capitalize", DIFFICULTY_COLORS[difficulty])}>{difficulty}</span>
            <span className={cn("text-xs px-1.5 py-0.5 rounded border capitalize", PRIORITY_COLORS[priority])}>
              {priority === "high" ? "🔥 " : ""}
              {priority}
            </span>
            {task.taskType === "revision" && (
              <span className="text-xs text-indigo-600 flex items-center gap-0.5">
                <RotateCcw className="w-3 h-3" /> revision
              </span>
            )}
            {task.rescheduledFrom && <span className="text-xs text-amber-600">↪ rescheduled</span>}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {canStartReading && (
              <button
                type="button"
                onClick={onStartReading}
                disabled={loading}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  theme === "dark"
                    ? "bg-blue-600/80 hover:bg-blue-600 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                )}
              >
                <BookOpen className="w-3.5 h-3.5" /> Start Reading
              </button>
            )}

            {showPractice && (
              <>
                <button
                  type="button"
                  onClick={() => onPractice(false)}
                  disabled={loading}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                    theme === "dark"
                      ? "border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                      : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  )}
                >
                  <Brain className="w-3.5 h-3.5" /> Practice MCQs
                </button>
                <button
                  type="button"
                  onClick={() => onPractice(true)}
                  disabled={loading}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                    theme === "dark"
                      ? "border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/10"
                      : "border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                  )}
                >
                  <Sparkles className="w-3.5 h-3.5" /> PYQs
                </button>
              </>
            )}

            {isStudy && !task.completed && (
              <button
                type="button"
                onClick={onCompleteTopic}
                disabled={loading}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border",
                  theme === "dark"
                    ? "border-slate-600 hover:bg-slate-700"
                    : "border-slate-300 hover:bg-slate-50"
                )}
              >
                <Play className="w-3.5 h-3.5" /> Mark Complete
              </button>
            )}
          </div>

          <AnimatePresence>
            {isStudy && task.completed && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0 }}
                className="text-xs text-emerald-600 font-medium"
              >
                ✓ {task.topic} completed — practice MCQs to lock retention
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.li>
  );
}

export function DailyTaskEngine({
  tasks,
  selectedDate,
  onToggleComplete,
  onCompleteTopic,
  onStartPractice,
  onReorder,
  loadingTaskId,
}: Props) {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [localLoading, setLocalLoading] = useState<string | null>(null);

  const dayTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.date === selectedDate)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [tasks, selectedDate]
  );
  const [ordered, setOrdered] = useState(dayTasks);

  useEffect(() => {
    setOrdered(dayTasks);
  }, [dayTasks, selectedDate]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ordered.findIndex((t) => t._id === active.id);
    const newIndex = ordered.findIndex((t) => t._id === over.id);
    const next = arrayMove(ordered, oldIndex, newIndex);
    setOrdered(next);
    onReorder(next.map((t) => t._id));
  };

  const runPractice = async (taskId: string, pyq?: boolean) => {
    const task = ordered.find((t) => t._id === taskId);
    if (!task) return;

    const fallbackRoute = buildPlannerPracticeUrl(task, pyq);
    setLocalLoading(taskId);
    try {
      if (onStartPractice) {
        const res = await onStartPractice(taskId);
        const route = pyq ? res?.routes?.pyq : res?.routes?.mcq;
        navigate(route || fallbackRoute);
      } else {
        navigate(fallbackRoute);
      }
    } catch {
      navigate(fallbackRoute);
    } finally {
      setLocalLoading(null);
    }
  };

  const runCompleteTopic = async (taskId: string) => {
    if (!onCompleteTopic) {
      onToggleComplete(taskId);
      return;
    }
    setLocalLoading(taskId);
    try {
      const res = await onCompleteTopic(taskId);
      toast.success("Topic completed — MCQs unlocked!");
      if (res?.practiceRoute) {
        // optional auto-navigate omitted; user taps Practice MCQs
      }
    } catch {
      toast.error("Could not complete topic");
    } finally {
      setLocalLoading(null);
    }
  };

  if (dayTasks.length === 0) {
    return (
      <div
        className={cn(
          "text-center py-12 rounded-2xl border border-dashed",
          theme === "dark" ? "border-slate-600 text-slate-400" : "border-slate-300 text-slate-500"
        )}
      >
        <p className="text-sm">No tasks for {selectedDate}. Pick another day or regenerate your plan.</p>
      </div>
    );
  }

  const completed = dayTasks.filter((t) => t.completed).length;
  const percent = Math.round((completed / dayTasks.length) * 100);
  const revisionToday = dayTasks.filter((t) => t.taskType === "revision").length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{selectedDate}</p>
        <motion.span key={percent} initial={{ scale: 1.2 }} animate={{ scale: 1 }} className="text-sm font-bold text-blue-600">
          {percent}% done
        </motion.span>
      </div>
      {revisionToday > 0 && (
        <p className="text-xs text-indigo-600 flex items-center gap-1">
          <RotateCcw className="w-3 h-3" /> {revisionToday} revision task{revisionToday > 1 ? "s" : ""} due today (1/7/30-day cycles)
        </p>
      )}
      <div className={cn("h-2 rounded-full overflow-hidden", theme === "dark" ? "bg-slate-700" : "bg-slate-100")}>
        <motion.div
          className="h-full bg-gradient-to-r from-emerald-400 to-blue-500"
          animate={{ width: `${percent}%` }}
          transition={{ type: "spring", stiffness: 120 }}
        />
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ordered.map((t) => t._id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            <AnimatePresence>
              {ordered.map((task) => {
                const loading = loadingTaskId === task._id || localLoading === task._id;
                return (
                  <SortableTask
                    key={task._id}
                    task={task}
                    onToggle={() => onToggleComplete(task._id)}
                    onStartReading={() => runPractice(task._id)}
                    onPractice={(pyq) => runPractice(task._id, pyq)}
                    onCompleteTopic={() => runCompleteTopic(task._id)}
                    loading={loading}
                  />
                );
              })}
            </AnimatePresence>
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}
