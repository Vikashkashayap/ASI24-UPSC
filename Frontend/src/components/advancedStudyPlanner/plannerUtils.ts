export function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export const UPSC_SUBJECTS = [
  "Polity", "History", "Geography", "Economy",
  "Environment", "Science & Tech", "Current Affairs", "CSAT", "Ethics",
];

export const PRIORITY_COLORS = {
  high: "bg-rose-500/15 text-rose-600 border-rose-200",
  medium: "bg-amber-500/15 text-amber-700 border-amber-200",
  low: "bg-slate-500/10 text-slate-600 border-slate-200",
};

export const DIFFICULTY_COLORS = {
  easy: "text-emerald-600",
  medium: "text-amber-600",
  hard: "text-rose-600",
};

/** Clean planner task label → topic for Prelims Test Generator */
export function sanitizePlannerTopic(rawTopic: string, subject = ""): string {
  let t = (rawTopic || "").trim();
  t = t.replace(/^MCQs\s*[—–-]\s*/i, "");
  t = t.replace(/^Revision\s*[—–-]\s*/i, "");
  t = t.replace(/^Study\s+/i, "");
  if (subject && new RegExp(`^${subject}\\s*`, "i").test(t)) {
    t = t.replace(new RegExp(`^${subject}\\s*`, "i"), "").trim();
  }
  return t || subject;
}

export function buildPlannerPracticeUrl(
  task: { subject: string; topic?: string; syllabusTopicId?: string | null },
  pyq = false
): string {
  const params = new URLSearchParams();
  params.set("from", "planner");
  params.set("subject", task.subject || "");
  params.set("topic", sanitizePlannerTopic(task.topic || "", task.subject));
  if (task.syllabusTopicId) params.set("syllabusTopicId", task.syllabusTopicId);
  if (pyq) params.set("pyq", "1");
  return `/prelims-test?${params.toString()}`;
}
