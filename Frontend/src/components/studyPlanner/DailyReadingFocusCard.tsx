import { useTheme } from "../../hooks/useTheme";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { BookOpen, ClipboardCheck } from "lucide-react";
import { cn } from "../../utils/cn";
import type { StudyPlanTask } from "../../services/api";
import { SubjectBadge } from "./subjectBadge";

export interface DailyReadingFocusCardProps {
  tasks: StudyPlanTask[];
  selectedDate: string;
}

/**
 * Plain-language summary: subject → chapter (topic) → what to read / practice for the selected day.
 */
export function DailyReadingFocusCard({ tasks, selectedDate }: DailyReadingFocusCardProps) {
  const { theme } = useTheme();
  const dayTasks = tasks.filter((t) => t.date === selectedDate);
  const studyTasks = dayTasks.filter((t) => t.taskType === "study" || t.taskType === "subject_study");
  const testTasks = dayTasks.filter((t) => t.taskType === "test" || t.taskType === "mcq_practice");

  if (studyTasks.length === 0 && testTasks.length === 0) {
    return null;
  }

  return (
    <Card
      className={cn(
        "border-2",
        theme === "dark" ? "bg-slate-800/90 border-teal-500/30" : "bg-gradient-to-br from-teal-50/80 to-white border-teal-200"
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className={theme === "dark" ? "bg-teal-500/20 p-2 rounded-lg" : "bg-teal-100 p-2 rounded-lg"}>
            <BookOpen className={theme === "dark" ? "text-teal-300 w-5 h-5" : "text-teal-700 w-5 h-5"} />
          </div>
          <div>
            <CardTitle className={theme === "dark" ? "text-slate-50 text-base" : "text-slate-900 text-base"}>
              Today's target — {selectedDate}
            </CardTitle>
            <CardDescription className={theme === "dark" ? "text-slate-400 text-xs" : "text-slate-600 text-xs"}>
              Subject-wise chapter / topic; keep checking items from the list below
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {studyTasks.length > 0 && (
          <div>
            <p className={cn("text-xs font-semibold uppercase tracking-wide mb-2", theme === "dark" ? "text-teal-400" : "text-teal-700")}>
              Reading focus
            </p>
            <ul className="space-y-2">
              {studyTasks.map((t) => (
                <li
                  key={t._id}
                  className={cn(
                    "rounded-xl border p-3 text-sm",
                    theme === "dark" ? "border-slate-600 bg-slate-900/40" : "border-teal-100 bg-white/80"
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <SubjectBadge subject={t.subject} />
                  </div>
                  <p className={cn("font-semibold", theme === "dark" ? "text-slate-100" : "text-slate-900")}>
                    Chapter / topic: {t.topic}
                  </p>
                  <p className={cn("text-xs mt-1", theme === "dark" ? "text-slate-300" : "text-slate-700")}>
                    <span className="font-medium text-teal-600 dark:text-teal-400">You should cover: </span>
                    {(t.subtopics && t.subtopics.length > 0
                      ? t.subtopics.join(" · ")
                      : "Read the full topic and revise notes + PYQs")}
                  </p>
                  <p className={cn("text-[11px] mt-1.5", theme === "dark" ? "text-slate-500" : "text-slate-500")}>
                    Estimated: {t.duration} min
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {testTasks.length > 0 && (
          <div>
            <p className={cn("text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1", theme === "dark" ? "text-fuchsia-400" : "text-fuchsia-700")}>
              <ClipboardCheck className="w-3.5 h-3.5" />
              Practice (MCQ)
            </p>
            <ul className="space-y-2">
              {testTasks.map((t) => (
                <li
                  key={t._id}
                  className={cn(
                    "rounded-xl border p-3 text-sm",
                    theme === "dark" ? "border-slate-600 bg-slate-900/40" : "border-fuchsia-100 bg-white/80"
                  )}
                >
                  <SubjectBadge subject={t.subject} className="mb-1" />
                  <p className={cn("font-semibold", theme === "dark" ? "text-slate-100" : "text-slate-900")}>
                    {t.topic.replace(/\s*—\s*MCQ block.*$/i, "")} — MCQ test
                  </p>
                  <p className={cn("text-xs mt-1", theme === "dark" ? "text-slate-300" : "text-slate-700")}>
                    Attempt {t.questions ?? 20} MCQs today — log your score in the timetable below
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
