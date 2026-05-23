import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useTheme } from "../../hooks/useTheme";
import { cn } from "../../utils/cn";
import { UPSC_SUBJECTS } from "./plannerUtils";
import type { AdvancedPlannerSetup } from "../../services/api";

const PREP_LEVELS = ["beginner", "intermediate", "advanced"] as const;
const SESSIONS = ["morning", "afternoon", "evening", "night"] as const;

interface Props {
  onSubmit: (data: AdvancedPlannerSetup) => Promise<void>;
  isLoading?: boolean;
  initialValues?: Partial<AdvancedPlannerSetup>;
  title?: string;
  submitLabel?: string;
}

export function SmartSetupForm({
  onSubmit,
  isLoading,
  initialValues,
  title = "Build your AI study plan",
  submitLabel = "Generate Smart Plan",
}: Props) {
  const { theme } = useTheme();
  const today = new Date().toISOString().slice(0, 10);
  const [examType, setExamType] = useState<"UPSC" | "MPPSC">(initialValues?.examType || "UPSC");
  const [examDate, setExamDate] = useState(initialValues?.examDate?.slice(0, 10) || "");
  const [targetYear, setTargetYear] = useState(initialValues?.targetYear || "2026");
  const [dailyHours, setDailyHours] = useState(initialValues?.dailyHours ?? 6);
  const [weakSubjects, setWeakSubjects] = useState<string[]>(initialValues?.weakSubjects || []);
  const [strongSubjects, setStrongSubjects] = useState<string[]>(initialValues?.strongSubjects || []);
  const [optionalSubject, setOptionalSubject] = useState(initialValues?.optionalSubject || "");
  const [preparationLevel, setPreparationLevel] = useState(initialValues?.preparationLevel || "intermediate");
  const [sleepTime, setSleepTime] = useState(initialValues?.sleepTime || "23:00");
  const [wakeTime, setWakeTime] = useState(initialValues?.wakeTime || "06:00");
  const [preferredSession, setPreferredSession] = useState(initialValues?.preferredSession || "morning");
  const [mockScore, setMockScore] = useState(initialValues?.mockTestAverageScore ?? 50);

  const toggleSubject = (list: string[], setList: (v: string[]) => void, s: string) => {
    setList(list.includes(s) ? list.filter((x) => x !== s) : [...list, s]);
  };

  const inputCls = theme === "dark" ? "bg-slate-900/80 border-slate-600 text-slate-100" : "bg-white border-slate-300";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examDate) return;
    await onSubmit({
      examDate,
      examType,
      targetYear,
      dailyHours: Number(dailyHours),
      weakSubjects,
      strongSubjects,
      optionalSubject,
      preparationLevel,
      sleepTime,
      wakeTime,
      preferredSession,
      mockTestAverageScore: Number(mockScore),
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={cn("border-2 overflow-hidden", theme === "dark" ? "bg-slate-900/80 border-indigo-500/20" : "bg-white/90 border-indigo-200/60 backdrop-blur-xl")}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg shadow-indigo-500/25">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className={theme === "dark" ? "text-white" : "text-slate-900"}>{title}</CardTitle>
              <CardDescription>Tell the AI coach about your preparation — it builds a plan around your weak areas.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Exam Type</label>
                <div className="flex gap-2">
                  {(["UPSC", "MPPSC"] as const).map((t) => (
                    <button key={t} type="button" onClick={() => setExamType(t)} className={cn("flex-1 py-2 rounded-lg text-sm font-medium border transition-all", examType === t ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-300")}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Target Year</label>
                <Input value={targetYear} onChange={(e) => setTargetYear(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Exam Date</label>
                <Input type="date" min={today} value={examDate} onChange={(e) => setExamDate(e.target.value)} required className={inputCls} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Daily Study Hours</label>
                <Input type="number" min={1} max={16} value={dailyHours} onChange={(e) => setDailyHours(Number(e.target.value))} className={inputCls} />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Weak Subjects (tap to select)</label>
              <div className="flex flex-wrap gap-2">
                {UPSC_SUBJECTS.map((s) => (
                  <button key={s} type="button" onClick={() => toggleSubject(weakSubjects, setWeakSubjects, s)} className={cn("px-3 py-1.5 rounded-full text-xs font-medium border transition-all", weakSubjects.includes(s) ? "bg-rose-500/20 border-rose-400 text-rose-700" : "border-slate-300 opacity-70")}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Strong Subjects</label>
              <div className="flex flex-wrap gap-2">
                {UPSC_SUBJECTS.map((s) => (
                  <button key={s} type="button" onClick={() => toggleSubject(strongSubjects, setStrongSubjects, s)} className={cn("px-3 py-1.5 rounded-full text-xs font-medium border transition-all", strongSubjects.includes(s) ? "bg-emerald-500/20 border-emerald-400 text-emerald-700" : "border-slate-300 opacity-70")}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Optional Subject</label>
                <Input value={optionalSubject} onChange={(e) => setOptionalSubject(e.target.value)} placeholder="e.g. Sociology" className={inputCls} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Mock Avg Score %</label>
                <Input type="number" min={0} max={100} value={mockScore} onChange={(e) => setMockScore(Number(e.target.value))} className={inputCls} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Wake Time</label>
                <Input type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Sleep Time</label>
                <Input type="time" value={sleepTime} onChange={(e) => setSleepTime(e.target.value)} className={inputCls} />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Preparation Level</label>
              <div className="flex flex-wrap gap-2">
                {PREP_LEVELS.map((l) => (
                  <button key={l} type="button" onClick={() => setPreparationLevel(l)} className={cn("px-4 py-2 rounded-lg text-sm capitalize", preparationLevel === l ? "bg-indigo-600 text-white" : "bg-slate-100")}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Preferred Study Session</label>
              <div className="flex flex-wrap gap-2">
                {SESSIONS.map((s) => (
                  <button key={s} type="button" onClick={() => setPreferredSession(s)} className={cn("px-4 py-2 rounded-lg text-sm capitalize", preferredSession === s ? "bg-indigo-600 text-white" : "bg-slate-100")}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-indigo-600 hover:from-indigo-700 hover:to-indigo-700 border-0">
              {isLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />AI is crafting your plan…</> : <><Sparkles className="w-4 h-4 mr-2" />{submitLabel}</>}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
