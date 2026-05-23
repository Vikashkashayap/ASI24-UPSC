import { motion } from "framer-motion";
import { useTheme } from "../../hooks/useTheme";
import { cn } from "../../utils/cn";

interface Props {
  score: number;
  examType?: string;
  breakdown?: {
    mockScores: number;
    completion: number;
    revision: number;
    consistency: number;
    studyHours: number;
  };
}

export function ReadinessScore({ score, examType = "UPSC", breakdown }: Props) {
  const { theme } = useTheme();
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  const factors = breakdown
    ? [
        { label: "Mock scores", value: breakdown.mockScores },
        { label: "Completion", value: breakdown.completion },
        { label: "Revision", value: breakdown.revision },
        { label: "Consistency", value: breakdown.consistency },
        { label: "Study hours", value: breakdown.studyHours },
      ]
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "rounded-2xl p-5 border",
        theme === "dark" ? "bg-slate-900/80 border-blue-500/20" : "bg-white border-slate-200 shadow-lg"
      )}
    >
      <h3 className={cn("text-sm font-semibold mb-4", theme === "dark" ? "text-slate-200" : "text-slate-800")}>
        {examType} Readiness Score
      </h3>
      <motion.div
        className="relative w-36 h-36 mx-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke={theme === "dark" ? "#334155" : "#e2e8f0"} strokeWidth="10" />
          <motion.circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="url(#readinessGrad)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
          <defs>
            <linearGradient id="readinessGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
          </defs>
        </svg>
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <span className="text-3xl font-bold">{score}%</span>
          <span className="text-xs opacity-60">ready</span>
        </motion.div>
      </motion.div>
      {factors.length > 0 && (
        <div className="mt-4 space-y-2">
          {factors.map((f) => (
            <motion.div
              key={f.label}
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              className="space-y-0.5"
            >
              <div className="flex justify-between text-xs">
                <span className="opacity-70">{f.label}</span>
                <span className="font-medium">{f.value}%</span>
              </div>
              <div className={cn("h-1.5 rounded-full overflow-hidden", theme === "dark" ? "bg-slate-700" : "bg-slate-100")}>
                <motion.div
                  className="h-full bg-blue-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${f.value}%` }}
                  transition={{ duration: 0.6 }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
