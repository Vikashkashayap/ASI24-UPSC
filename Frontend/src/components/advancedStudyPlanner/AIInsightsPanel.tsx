import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Lightbulb, RefreshCw } from "lucide-react";
import { Button } from "../ui/button";
import { useTheme } from "../../hooks/useTheme";
import { cn } from "../../utils/cn";
import type { StudyPlanInsight } from "../../services/api";

const icons = {
  warning: AlertTriangle,
  success: CheckCircle2,
  tip: Lightbulb,
};

const styles = {
  warning: "border-rose-200 bg-rose-50/80 text-rose-800",
  success: "border-emerald-200 bg-emerald-50/80 text-emerald-800",
  tip: "border-blue-200 bg-blue-50/80 text-blue-800",
};

interface Props {
  insights: StudyPlanInsight[];
  onRefresh?: () => void;
  loading?: boolean;
}

export function AIInsightsPanel({ insights, onRefresh, loading }: Props) {
  const { theme } = useTheme();

  if (!insights.length) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn("rounded-2xl p-6 border text-center", theme === "dark" ? "bg-slate-900/80 border-slate-700" : "bg-white border-slate-200")}
      >
        <Lightbulb className="w-10 h-10 mx-auto mb-2 text-blue-400 opacity-50" />
        <p className="text-sm opacity-70">Complete tasks to unlock AI insights.</p>
        {onRefresh && (
          <Button type="button" variant="outline" className="mt-3" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            Generate insights
          </Button>
        )}
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <h3 className={cn("font-semibold", theme === "dark" ? "text-white" : "text-slate-900")}>AI Insights</h3>
        {onRefresh && (
          <button type="button" onClick={onRefresh} disabled={loading} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
            <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} /> Refresh
          </button>
        )}
      </motion.div>
      <motion.div
        className="space-y-2"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
      >
        {insights.map((insight, i) => {
          const Icon = icons[insight.type] || Lightbulb;
          const style = styles[insight.type] || styles.tip;
          return (
            <motion.div
              key={insight._id || i}
              variants={{ hidden: { opacity: 0, x: -8 }, visible: { opacity: 1, x: 0 } }}
              className={cn("rounded-xl p-4 border", theme === "dark" ? "bg-slate-800/50 border-slate-700" : style)}
            >
              <motion.div
                className="flex gap-3"
                whileHover={{ scale: 1.01 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <Icon className="w-5 h-5 shrink-0 mt-0.5" />
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <p className="font-semibold text-sm">{insight.title}</p>
                  <p className="text-sm mt-0.5 opacity-90">{insight.message}</p>
                </motion.div>
              </motion.div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
