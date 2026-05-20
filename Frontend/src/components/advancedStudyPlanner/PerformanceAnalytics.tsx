import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from "recharts";
import { useTheme } from "../../hooks/useTheme";
import { cn } from "../../utils/cn";
import type { PlannerAnalytics } from "../../services/api";

interface Props {
  analytics: PlannerAnalytics | null;
  loading?: boolean;
}

export function PerformanceAnalytics({ analytics, loading }: Props) {
  const { theme } = useTheme();
  const card = cn("rounded-2xl p-4 border", theme === "dark" ? "bg-slate-900/80 border-slate-700" : "bg-white border-slate-200");

  if (loading || !analytics) {
    return <div className={cn(card, "h-64 animate-pulse")} />;
  }

  const radarData = analytics.subjectStrength.slice(0, 6).map((s) => ({
    subject: s.subject.slice(0, 8),
    strength: s.strength,
  }));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <h3 className={cn("font-semibold text-lg", theme === "dark" ? "text-white" : "text-slate-900")}>
        Performance Analytics
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div className={card} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-sm font-medium mb-3">Study consistency</p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={analytics.consistency}>
              <defs>
                <linearGradient id="consistencyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#334155" : "#e2e8f0"} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke={theme === "dark" ? "#94a3b8" : "#64748b"} />
              <YAxis tick={{ fontSize: 10 }} stroke={theme === "dark" ? "#94a3b8" : "#64748b"} />
              <Tooltip />
              <Area type="monotone" dataKey="percent" stroke="#8b5cf6" fill="url(#consistencyGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div className={card} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <p className="text-sm font-medium mb-3">Daily study hours</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={analytics.dailyHours}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#334155" : "#e2e8f0"} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="hours" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div className={card} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <p className="text-sm font-medium mb-3">Mock performance</p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={analytics.mockPerformance}>
              <Area type="monotone" dataKey="score" stroke="#10b981" fill="#10b98133" strokeWidth={2} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Tooltip />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div className={card} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <p className="text-sm font-medium mb-3">Subject strength</p>
          <ResponsiveContainer width="100%" height={180}>
            <RadarChart data={radarData}>
              <PolarGrid stroke={theme === "dark" ? "#475569" : "#cbd5e1"} />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9 }} />
              <Radar dataKey="strength" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.4} />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      <motion.div
        className={cn("grid grid-cols-2 sm:grid-cols-4 gap-3")}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Stat label="Completion" value={`${analytics.completionPercent}%`} />
        <Stat label="Weak focus" value={analytics.weakTopics[0]?.topic || "—"} />
        <Stat label="Best subject" value={analytics.subjectStrength.sort((a, b) => b.strength - a.strength)[0]?.subject || "—"} />
        <Stat label="Mocks tracked" value={String(analytics.mockPerformance.length)} />
      </motion.div>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl p-3 bg-violet-500/10 border border-violet-500/20 text-center">
      <p className="text-xs opacity-70">{label}</p>
      <p className="font-bold text-sm truncate">{value}</p>
    </div>
  );
}
