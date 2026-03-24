import { cn } from "../../utils/cn";

const PALETTE = [
  "bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950/50 dark:text-violet-200 dark:border-violet-800",
  "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/50 dark:text-sky-200 dark:border-sky-800",
  "bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800",
  "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-800",
  "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-200 dark:border-rose-800",
  "bg-orange-100 text-orange-900 border-orange-200 dark:bg-orange-950/50 dark:text-orange-200 dark:border-orange-800",
];

function hashSubject(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % PALETTE.length;
}

export function SubjectBadge({ subject, className }: { subject: string; className?: string }) {
  const cls = PALETTE[hashSubject(subject || "x")];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-semibold border",
        cls,
        className
      )}
    >
      {subject || "General"}
    </span>
  );
}

export function TaskTypeTag({
  type,
  className,
}: {
  type: "study" | "test" | "revision" | "other";
  className?: string;
}) {
  const map = {
    study: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
    test: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/30",
    revision: "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30",
    other: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
  };
  const label = type === "other" ? "Task" : type.charAt(0).toUpperCase() + type.slice(1);
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border",
        map[type],
        className
      )}
    >
      {label}
    </span>
  );
}
