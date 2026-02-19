import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useTheme } from "../../hooks/useTheme";
import { useAuth } from "../../hooks/useAuth";
import { dartAPI } from "../../services/api";
import {
  DART_CATEGORIES,
  DART_ALL_SUBJECTS,
  DART_PRELIMS_SUBJECTS,
  DART_MAINS_SUBJECTS,
  EMOTIONAL_STATUS_OPTIONS,
  PHYSICAL_HEALTH_OPTIONS,
} from "../../constants/dart";
import {
  X,
  Loader2,
  Calendar,
  Clock,
  Moon,
  BookOpen,
  Target,
  Heart,
  Activity,
  Newspaper,
  PenLine,
  Trophy,
  ChevronDown,
} from "lucide-react";

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
  const isDark = theme === "dark";
  const inputClass = isDark
    ? "bg-slate-800/80 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
    : "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400";
  const sectionBg = isDark ? "bg-slate-800/40 border-slate-700" : "bg-slate-50/80 border-slate-200";
  const labelClass = `block text-sm font-medium mb-1.5 ${isDark ? "text-slate-300" : "text-slate-700"}`;
  const sectionTitleClass = `text-xs font-semibold uppercase tracking-wider mb-3 ${isDark ? "text-slate-500" : "text-slate-500"}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-2xl max-h-[90vh] overflow-y-auto p-0 ${isDark ? "bg-gradient-to-b from-slate-900 to-slate-900" : "bg-slate-50/95"}`}>
        <DialogHeader className={`sticky top-0 z-10 ${isDark ? "bg-slate-900/95 backdrop-blur border-slate-700" : "bg-white/95 backdrop-blur border-slate-200"}`}>
          <DialogTitle className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${isDark ? "bg-purple-500/20" : "bg-purple-100"}`}>
              <Calendar className={`w-5 h-5 ${isDark ? "text-purple-400" : "text-purple-600"}`} />
            </div>
            <div>
              <span className={`block text-lg font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>DART</span>
              <span className={`block text-xs font-normal ${isDark ? "text-slate-400" : "text-slate-500"}`}>Daily Activity & Reflection</span>
            </div>
          </DialogTitle>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className={`p-2 rounded-xl transition-colors ${isDark ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-200 text-slate-600"}`}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </DialogHeader>

        {user?.name && (
          <div className={`px-6 py-3 flex items-center gap-2 ${isDark ? "bg-purple-500/10 border-b border-slate-800" : "bg-purple-50/80 border-b border-slate-200"}`}>
            <span className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>Logging as</span>
            <span className={`px-2.5 py-0.5 rounded-full text-sm font-semibold ${isDark ? "bg-purple-500/30 text-purple-300" : "bg-purple-200/80 text-purple-800"}`}>
              {user.name}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="px-6 pb-8 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
              {error}
            </div>
          )}

          {/* Basics */}
          <section className={`p-4 rounded-xl border ${sectionBg}`}>
            <h3 className={sectionTitleClass}>Date & profile</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Date</label>
                <div className="relative">
                  <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={`pl-10 h-11 rounded-xl border ${inputClass}`}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Category</label>
                <div className="relative">
                  <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={`w-full h-11 rounded-xl border pl-3 pr-10 appearance-none ${inputClass}`}
                  >
                    {DART_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Sleep & time */}
          <section className={`p-4 rounded-xl border ${sectionBg}`}>
            <h3 className={`${sectionTitleClass} flex items-center gap-2`}>
              <Moon className="w-3.5 h-3.5" />
              Sleep & wake
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Wake-up time</label>
                <div className="relative">
                  <Clock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                  <Input
                    type="time"
                    value={wakeUpTime}
                    onChange={(e) => setWakeUpTime(e.target.value)}
                    className={`pl-10 h-11 rounded-xl border ${inputClass}`}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Sleep hours</label>
                <Input
                  type="number"
                  min={0}
                  max={24}
                  step={0.5}
                  placeholder="e.g. 7"
                  value={sleepHours}
                  onChange={(e) => setSleepHours(e.target.value)}
                  className={`h-11 rounded-xl border ${inputClass}`}
                />
              </div>
            </div>
            {isWorking && (
              <div className="mt-4">
                <label className={labelClass}>Official working hours</label>
                <Input
                  type="number"
                  min={0}
                  max={24}
                  step={0.5}
                  placeholder="e.g. 8"
                  value={officialWorkHours}
                  onChange={(e) => setOfficialWorkHours(e.target.value)}
                  className={`h-11 rounded-xl border ${inputClass}`}
                />
              </div>
            )}
          </section>

          {/* Study hours */}
          <section className={`p-4 rounded-xl border ${sectionBg}`}>
            <h3 className={`${sectionTitleClass} flex items-center gap-2`}>
              <Target className="w-3.5 h-3.5" />
              Study hours
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Total study hours</label>
                <Input
                  type="number"
                  min={0}
                  max={24}
                  step={0.5}
                  placeholder="e.g. 6"
                  value={totalStudyHours}
                  onChange={(e) => setTotalStudyHours(e.target.value)}
                  className={`h-11 rounded-xl border ${inputClass}`}
                />
              </div>
              <div>
                <label className={labelClass}>Target study hours</label>
                <Input
                  type="number"
                  min={0}
                  max={24}
                  step={0.5}
                  placeholder="e.g. 8"
                  value={targetStudyHours}
                  onChange={(e) => setTargetStudyHours(e.target.value)}
                  className={`h-11 rounded-xl border ${inputClass}`}
                />
              </div>
            </div>
          </section>

          {/* Subjects */}
          <section className={`p-4 rounded-xl border ${sectionBg}`}>
            <h3 className={`${sectionTitleClass} flex items-center gap-2`}>
              <BookOpen className="w-3.5 h-3.5" />
              Subjects studied
            </h3>
            <p className={`text-xs mb-3 ${isDark ? "text-slate-500" : "text-slate-500"}`}>Select all that apply</p>
            <div className="space-y-4">
              <div>
                <p className={`text-[11px] font-medium uppercase tracking-wider mb-2 ${isDark ? "text-purple-400/80" : "text-purple-600/90"}`}>Prelims</p>
                <div className="flex flex-wrap gap-2">
                  {(DART_PRELIMS_SUBJECTS as readonly string[]).map((sub) => {
                    const checked = subjectStudied.includes(sub);
                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => toggleSubject(sub)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                          checked
                            ? isDark ? "bg-purple-500/40 text-purple-200 ring-1 ring-purple-400/50" : "bg-purple-600 text-white shadow-sm"
                            : isDark ? "bg-slate-700/60 text-slate-300 hover:bg-slate-600/80" : "bg-white border border-slate-200 text-slate-700 hover:border-purple-300 hover:bg-purple-50/50"
                        }`}
                      >
                        {sub}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className={`text-[11px] font-medium uppercase tracking-wider mb-2 ${isDark ? "text-purple-400/80" : "text-purple-600/90"}`}>Mains & more</p>
                <div className="flex flex-wrap gap-2">
                  {(DART_MAINS_SUBJECTS as readonly string[]).map((sub) => {
                    const checked = subjectStudied.includes(sub);
                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => toggleSubject(sub)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                          checked
                            ? isDark ? "bg-purple-500/40 text-purple-200 ring-1 ring-purple-400/50" : "bg-purple-600 text-white shadow-sm"
                            : isDark ? "bg-slate-700/60 text-slate-300 hover:bg-slate-600/80" : "bg-white border border-slate-200 text-slate-700 hover:border-purple-300 hover:bg-purple-50/50"
                        }`}
                      >
                        {sub}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* Chapters */}
          <section className={`p-4 rounded-xl border ${sectionBg}`}>
            <label className={labelClass}>Chapters covered (optional)</label>
            <Input
              placeholder="e.g. Polity Ch 1–3"
              value={chaptersCovered}
              onChange={(e) => setChaptersCovered(e.target.value)}
              className={`h-11 rounded-xl border ${inputClass}`}
            />
          </section>

          {/* Daily habits */}
          <section className={`p-4 rounded-xl border ${sectionBg}`}>
            <h3 className={sectionTitleClass}>Daily habits</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { key: "newspaper", checked: newspaperRead, set: setNewspaperRead, label: "Newspaper read", icon: Newspaper },
                { key: "answer", checked: answerWritingDone, set: setAnswerWritingDone, label: "Answer writing done", icon: PenLine },
                { key: "challenge", checked: challengeCompleted, set: setChallengeCompleted, label: "Challenge completed", icon: Trophy },
              ].map(({ key, checked, set, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => set(!checked)}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all duration-200 ${
                    checked
                      ? isDark ? "bg-purple-500/30 border-purple-500/60 text-purple-200" : "bg-purple-50 border-purple-400 text-purple-800"
                      : isDark ? "border-slate-600 bg-slate-800/40 text-slate-400 hover:border-slate-500" : "border-slate-200 bg-white text-slate-600 hover:border-purple-200 hover:bg-purple-50/30"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Well-being */}
          <section className={`p-4 rounded-xl border ${sectionBg}`}>
            <h3 className={`${sectionTitleClass} flex items-center gap-2`}>
              <Heart className="w-3.5 h-3.5" />
              <Activity className="w-3.5 h-3.5" />
              Well-being
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Emotional status</label>
                <div className="relative">
                  <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                  <select
                    value={emotionalStatus}
                    onChange={(e) => setEmotionalStatus(e.target.value)}
                    className={`w-full h-11 rounded-xl border pl-3 pr-10 appearance-none ${inputClass}`}
                  >
                    <option value="">Select</option>
                    {EMOTIONAL_STATUS_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Physical health</label>
                <div className="relative">
                  <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                  <select
                    value={physicalHealthStatus}
                    onChange={(e) => setPhysicalHealthStatus(e.target.value)}
                    className={`w-full h-11 rounded-xl border pl-3 pr-10 appearance-none ${inputClass}`}
                  >
                    <option value="">Select</option>
                    {PHYSICAL_HEALTH_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className={`flex gap-3 pt-6 border-t ${isDark ? "border-slate-700" : "border-slate-200"}`}>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className={`flex-1 sm:flex-none rounded-xl ${isDark ? "border-slate-600 hover:bg-slate-800" : ""}`}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className={`flex-1 sm:flex-none rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-lg shadow-purple-500/25 min-h-[44px] ${isDark ? "bg-purple-600 hover:bg-purple-500" : ""}`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save entry"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
