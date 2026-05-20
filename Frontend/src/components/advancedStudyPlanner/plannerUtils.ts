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
