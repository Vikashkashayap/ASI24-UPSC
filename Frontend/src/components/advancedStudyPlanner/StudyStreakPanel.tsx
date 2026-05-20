import { motion } from "framer-motion";
import { Flame, Zap } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import { cn } from "../../utils/cn";
import type { StudyPlanBadge } from "../../services/api";

interface Props {
  current: number;
  longest: number;
  xp: number;
  badges: StudyPlanBadge[];
  heatmap?: { date: string; completedTasks: number; totalTasks: number }[];
}

export function StudyStreakPanel({ current, longest, xp, badges, heatmap = [] }: Props) {
  const { theme } = useTheme();
  const weeks = buildHeatmapGrid(heatmap);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("rounded-2xl p-5 border space-y-4", theme === "dark" ? "bg-slate-900/80 border-orange-500/20" : "bg-white border-slate-200")}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="text-orange-500 w-6 h-6" />
          <motion.div>
            <p className="text-2xl font-bold">{current} Day Streak</p>
            <p className="text-xs opacity-60">Best: {longest} days</p>
          </motion.div>
        </div>
        <motion.div
          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-500/15 text-amber-600"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <Zap className="w-4 h-4" />
          <span className="font-bold">{xp} XP</span>
        </motion.div>
      </div>

      {badges.length > 0 && (
        <motion.div
          className="flex flex-wrap gap-2"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        >
          {badges.map((b) => (
            <motion.span
              key={b.id}
              variants={{ hidden: { opacity: 0, scale: 0.8 }, visible: { opacity: 1, scale: 1 } }}
              className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border", theme === "dark" ? "bg-slate-800 border-slate-600" : "bg-slate-50 border-slate-200")}
              title={b.name}
            >
              <span>{b.icon}</span> {b.name}
            </motion.span>
          ))}
        </motion.div>
      )}

      <div>
        <p className="text-xs font-medium mb-2 opacity-70">Activity heatmap</p>
        <div className="grid grid-cols-7 gap-1">
          {weeks.flat().map((cell, i) => (
            <div
              key={i}
              title={cell.date}
              className={cn(
                "aspect-square rounded-sm min-w-[10px]",
                cell.level === 0 && (theme === "dark" ? "bg-slate-800" : "bg-slate-100"),
                cell.level === 1 && "bg-emerald-300/60",
                cell.level === 2 && "bg-emerald-400/80",
                cell.level === 3 && "bg-emerald-500",
                cell.level === 4 && "bg-emerald-600"
              )}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function buildHeatmapGrid(heatmap: { date: string; completedTasks: number; totalTasks: number }[]) {
  const map = new Map(heatmap.map((h) => [h.date, h]));
  const cells: { date: string; level: number }[] = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    const entry = map.get(ds);
    let level = 0;
    if (entry && entry.totalTasks > 0) {
      const ratio = entry.completedTasks / entry.totalTasks;
      level = ratio >= 1 ? 4 : ratio >= 0.75 ? 3 : ratio >= 0.5 ? 2 : ratio > 0 ? 1 : 0;
    }
    cells.push({ date: ds, level });
  }
  const weeks: typeof cells[] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
