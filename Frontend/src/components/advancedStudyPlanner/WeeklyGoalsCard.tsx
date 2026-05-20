import { motion } from "framer-motion";
import { Target, Calendar } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import { cn } from "../../utils/cn";

interface Props {
  weeklyGoals: string[];
  monthlyTargets: string[];
  revisionStrategy?: string;
}

export function WeeklyGoalsCard({ weeklyGoals, monthlyTargets, revisionStrategy }: Props) {
  const { theme } = useTheme();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("rounded-2xl p-5 border space-y-4", theme === "dark" ? "bg-slate-900/80 border-cyan-500/20" : "bg-white border-cyan-200/60")}
    >
      <motion.div className="flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Target className="text-cyan-500 w-5 h-5" />
        <h3 className="font-semibold">Weekly goals</h3>
      </motion.div>
      <ul className="space-y-2">
        {(weeklyGoals.length ? weeklyGoals : ["Complete daily tasks", "Maintain streak", "Take weekly mock"]).map((g, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="text-sm flex gap-2"
          >
            <span className="text-cyan-500">•</span> {g}
          </motion.li>
        ))}
      </ul>
      {monthlyTargets.length > 0 && (
        <>
          <motion.div className="flex items-center gap-2 pt-2 border-t border-slate-200/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Calendar className="text-indigo-500 w-4 h-4" />
            <h4 className="text-sm font-semibold">Monthly targets</h4>
          </motion.div>
          <ul className="space-y-1">
            {monthlyTargets.map((t, i) => (
              <li key={i} className="text-sm opacity-80">→ {t}</li>
            ))}
          </ul>
        </>
      )}
      {revisionStrategy && (
        <p className="text-xs opacity-70 italic border-t pt-3">{revisionStrategy}</p>
      )}
    </motion.div>
  );
}
