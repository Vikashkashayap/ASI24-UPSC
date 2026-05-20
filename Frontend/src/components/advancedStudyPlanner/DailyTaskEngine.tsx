import { useEffect, useMemo, useState } from "react";
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
import { Check, Circle, Clock, GripVertical, BookOpen } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import { cn } from "../../utils/cn";
import { PRIORITY_COLORS, DIFFICULTY_COLORS } from "./plannerUtils";
import type { StudyPlanTask } from "../../services/api";

interface Props {
  tasks: StudyPlanTask[];
  selectedDate: string;
  onToggleComplete: (taskId: string) => void;
  onReorder: (taskIds: string[]) => void;
  loadingTaskId: string | null;
}

function SortableTask({
  task,
  onToggle,
  loading,
}: {
  task: StudyPlanTask;
  onToggle: () => void;
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

  return (
    <motion.li
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className={cn(
        "flex items-start gap-2 rounded-xl border p-3 transition-shadow",
        theme === "dark" ? "bg-slate-800/60 border-slate-700" : "bg-white border-slate-200",
        task.completed && "opacity-75",
        isDragging && "shadow-lg ring-2 ring-violet-400/50 z-10"
      )}
    >
      <button type="button" className="cursor-grab touch-none p-1 text-slate-400" {...attributes} {...listeners}>
        <GripVertical className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={onToggle}
        disabled={loading}
        className="shrink-0 mt-0.5"
        aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
      >
        {task.completed ? <Check className="w-5 h-5 text-emerald-500" /> : <Circle className="w-5 h-5 text-slate-400" />}
      </button>
      <motion.div className="flex-1 min-w-0" animate={task.completed ? { scale: [1, 0.98, 1] } : {}}>
        {task.startTime && task.endTime && (
          <p className="text-xs tabular-nums opacity-60">{task.startTime}–{task.endTime}</p>
        )}
        <p className={cn("text-sm font-medium", task.completed && "line-through")}>{task.topic || task.subject}</p>
        <motion.div
          className="flex flex-wrap gap-2 mt-1.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <span className="inline-flex items-center gap-1 text-xs opacity-70">
            <BookOpen className="w-3 h-3" /> {task.subject}
          </span>
          <span className="inline-flex items-center gap-1 text-xs opacity-70">
            <Clock className="w-3 h-3" /> {task.duration}m
          </span>
          <span className={cn("text-xs capitalize", DIFFICULTY_COLORS[difficulty])}>{difficulty}</span>
          <span className={cn("text-xs px-1.5 py-0.5 rounded border capitalize", PRIORITY_COLORS[priority])}>{priority}</span>
          {task.rescheduledFrom && (
            <span className="text-xs text-amber-600">↪ rescheduled</span>
          )}
        </motion.div>
      </motion.div>
    </motion.li>
  );
}

export function DailyTaskEngine({ tasks, selectedDate, onToggleComplete, onReorder, loadingTaskId }: Props) {
  const { theme } = useTheme();
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

  if (dayTasks.length === 0) {
    return (
      <div className={cn("text-center py-12 rounded-2xl border border-dashed", theme === "dark" ? "border-slate-600 text-slate-400" : "border-slate-300 text-slate-500")}>
        <p className="text-sm">No tasks for {selectedDate}. Pick another day or regenerate your plan.</p>
      </div>
    );
  }

  const completed = dayTasks.filter((t) => t.completed).length;
  const percent = Math.round((completed / dayTasks.length) * 100);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{selectedDate}</p>
        <motion.span
          key={percent}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          className="text-sm font-bold text-violet-600"
        >
          {percent}% done
        </motion.span>
      </div>
      <div className={cn("h-2 rounded-full overflow-hidden", theme === "dark" ? "bg-slate-700" : "bg-slate-100")}>
        <motion.div
          className="h-full bg-gradient-to-r from-emerald-400 to-violet-500"
          animate={{ width: `${percent}%` }}
          transition={{ type: "spring", stiffness: 120 }}
        />
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ordered.map((t) => t._id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            <AnimatePresence>
              {ordered.map((task) => (
                <SortableTask
                  key={task._id}
                  task={task}
                  onToggle={() => onToggleComplete(task._id)}
                  loading={loadingTaskId === task._id}
                />
              ))}
            </AnimatePresence>
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}
