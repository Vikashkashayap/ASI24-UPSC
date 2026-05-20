import { useTheme } from "../../hooks/useTheme";
import { cn } from "../../utils/cn";

export function PlannerSkeleton() {
  const { theme } = useTheme();
  const bone = theme === "dark" ? "bg-slate-700/60" : "bg-slate-200";
  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
      <div className={cn("h-40 rounded-3xl", bone)} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={cn("h-32 rounded-2xl md:col-span-2", bone)} />
        <div className={cn("h-32 rounded-2xl", bone)} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={cn("h-80 rounded-2xl", bone)} />
        <div className={cn("h-80 rounded-2xl lg:col-span-2", bone)} />
      </div>
    </div>
  );
}
