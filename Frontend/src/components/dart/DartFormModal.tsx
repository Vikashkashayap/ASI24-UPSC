import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useTheme } from "../../hooks/useTheme";
import { useAuth } from "../../hooks/useAuth";
import { dartAPI } from "../../services/api";
import {
  DART_CATEGORIES,
  DART_ALL_SUBJECTS,
  EMOTIONAL_STATUS_OPTIONS,
  PHYSICAL_HEALTH_OPTIONS,
} from "../../constants/dart";
import { X, Loader2, Calendar } from "lucide-react";

export interface DartFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const todayDateString = () => new Date().toISOString().slice(0, 10);

export const DartFormModal: React.FC<DartFormModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [category, setCategory] = useState<string>("full_time");
  const [date, setDate] = useState(todayDateString());
  const [wakeUpTime, setWakeUpTime] = useState("");
  const [sleepHours, setSleepHours] = useState("");
  const [officialWorkHours, setOfficialWorkHours] = useState("");
  const [totalStudyHours, setTotalStudyHours] = useState("");
  const [subjectStudied, setSubjectStudied] = useState<string[]>([]);
  const [chaptersCovered, setChaptersCovered] = useState("");
  const [newspaperRead, setNewspaperRead] = useState(false);
  const [answerWritingDone, setAnswerWritingDone] = useState(false);
  const [emotionalStatus, setEmotionalStatus] = useState("");
  const [physicalHealthStatus, setPhysicalHealthStatus] = useState("");
  const [targetStudyHours, setTargetStudyHours] = useState("");
  const [challengeCompleted, setChallengeCompleted] = useState(false);

  const toggleSubject = (sub: string) => {
    setSubjectStudied((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await dartAPI.submit({
        category,
        date: new Date(date).toISOString(),
        wakeUpTime: wakeUpTime || undefined,
        sleepHours: sleepHours ? Number(sleepHours) : 0,
        officialWorkHours: officialWorkHours ? Number(officialWorkHours) : 0,
        totalStudyHours: totalStudyHours ? Number(totalStudyHours) : 0,
        subjectStudied,
        chaptersCovered: chaptersCovered || undefined,
        newspaperRead,
        answerWritingDone,
        emotionalStatus: emotionalStatus || undefined,
        physicalHealthStatus: physicalHealthStatus || undefined,
        targetStudyHours: targetStudyHours ? Number(targetStudyHours) : 0,
        challengeCompleted,
      });
      onSuccess?.();
      onOpenChange(false);
      setDate(todayDateString());
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to save. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const isWorking = category === "working_professional";
  const inputClass = theme === "dark"
    ? "bg-slate-800 border-slate-600 text-slate-100"
    : "bg-white border-slate-300 text-slate-900";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="sticky top-0 z-10 bg-inherit">
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-500" />
            DART – Daily Activity & Reflection
          </DialogTitle>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className={`p-1.5 rounded-lg ${theme === "dark" ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </DialogHeader>

        {user?.name && (
          <p className={`px-6 pb-2 text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
            Logging as: <span className="font-medium text-purple-500">{user.name}</span>
          </p>
        )}

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Date
              </label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={`w-full h-10 rounded-md border px-3 text-sm ${inputClass}`}
              >
                {DART_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Wake-up time (e.g. 05:30)
              </label>
              <Input
                type="time"
                value={wakeUpTime}
                onChange={(e) => setWakeUpTime(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Sleep hours
              </label>
              <Input
                type="number"
                min={0}
                max={24}
                step={0.5}
                placeholder="e.g. 7"
                value={sleepHours}
                onChange={(e) => setSleepHours(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {isWorking && (
            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Official working hours
              </label>
              <Input
                type="number"
                min={0}
                max={24}
                step={0.5}
                placeholder="e.g. 8"
                value={officialWorkHours}
                onChange={(e) => setOfficialWorkHours(e.target.value)}
                className={inputClass}
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Total study hours
              </label>
              <Input
                type="number"
                min={0}
                max={24}
                step={0.5}
                placeholder="e.g. 6"
                value={totalStudyHours}
                onChange={(e) => setTotalStudyHours(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Target study hours
              </label>
              <Input
                type="number"
                min={0}
                max={24}
                step={0.5}
                placeholder="e.g. 8"
                value={targetStudyHours}
                onChange={(e) => setTargetStudyHours(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
              Subjects studied (select all that apply)
            </label>
            <div className={`flex flex-wrap gap-2 p-3 rounded-lg border ${theme === "dark" ? "bg-slate-800/50 border-slate-600" : "bg-slate-50 border-slate-200"}`}>
              {DART_ALL_SUBJECTS.map((sub) => (
                <label key={sub} className={`inline-flex items-center gap-1.5 cursor-pointer text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                  <input
                    type="checkbox"
                    checked={subjectStudied.includes(sub)}
                    onChange={() => toggleSubject(sub)}
                    className="rounded border-slate-400 text-purple-600 focus:ring-purple-500"
                  />
                  {sub}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
              Chapters covered (optional)
            </label>
            <Input
              placeholder="e.g. Polity Ch 1–3"
              value={chaptersCovered}
              onChange={(e) => setChaptersCovered(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="flex flex-wrap gap-4">
            <label className={`inline-flex items-center gap-2 cursor-pointer ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
              <input
                type="checkbox"
                checked={newspaperRead}
                onChange={(e) => setNewspaperRead(e.target.checked)}
                className="rounded border-slate-400 text-purple-600"
              />
              Newspaper read
            </label>
            <label className={`inline-flex items-center gap-2 cursor-pointer ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
              <input
                type="checkbox"
                checked={answerWritingDone}
                onChange={(e) => setAnswerWritingDone(e.target.checked)}
                className="rounded border-slate-400 text-purple-600"
              />
              Answer writing done
            </label>
            <label className={`inline-flex items-center gap-2 cursor-pointer ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
              <input
                type="checkbox"
                checked={challengeCompleted}
                onChange={(e) => setChallengeCompleted(e.target.checked)}
                className="rounded border-slate-400 text-purple-600"
              />
              Challenge completed
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Emotional status
              </label>
              <select
                value={emotionalStatus}
                onChange={(e) => setEmotionalStatus(e.target.value)}
                className={`w-full h-10 rounded-md border px-3 text-sm ${inputClass}`}
              >
                <option value="">Select</option>
                {EMOTIONAL_STATUS_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Physical health
              </label>
              <select
                value={physicalHealthStatus}
                onChange={(e) => setPhysicalHealthStatus(e.target.value)}
                className={`w-full h-10 rounded-md border px-3 text-sm ${inputClass}`}
              >
                <option value="">Select</option>
                {PHYSICAL_HEALTH_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className={theme === "dark" ? "border-slate-600" : ""}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-purple-600 hover:bg-purple-700">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Submit"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
