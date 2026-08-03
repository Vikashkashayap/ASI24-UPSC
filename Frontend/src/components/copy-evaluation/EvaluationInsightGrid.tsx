import React from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  AlertCircle,
  ListX,
  Lightbulb,
} from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

interface InsightCardProps {
  type: 'strength' | 'weakness' | 'missing' | 'suggestion';
  title: string;
  items: string[];
  delay?: number;
}

const STYLES = {
  strength: {
    dark: 'from-emerald-950/40 to-slate-900/30 border-emerald-500/25',
    light: 'from-emerald-50 to-white border-emerald-200/80',
    iconBg: { dark: 'bg-emerald-500/20', light: 'bg-emerald-100' },
    icon: CheckCircle2,
    iconColor: 'text-emerald-500',
    titleDark: 'text-emerald-300',
    titleLight: 'text-emerald-800',
    dot: 'bg-emerald-500',
  },
  weakness: {
    dark: 'from-rose-950/35 to-slate-900/30 border-rose-500/25',
    light: 'from-rose-50/80 to-white border-rose-200/70',
    iconBg: { dark: 'bg-rose-500/20', light: 'bg-rose-100' },
    icon: AlertCircle,
    iconColor: 'text-rose-500',
    titleDark: 'text-rose-300',
    titleLight: 'text-rose-800',
    dot: 'bg-rose-500',
  },
  missing: {
    dark: 'from-amber-950/35 to-slate-900/30 border-amber-500/25',
    light: 'from-amber-50/80 to-white border-amber-200/70',
    iconBg: { dark: 'bg-amber-500/20', light: 'bg-amber-100' },
    icon: ListX,
    iconColor: 'text-amber-500',
    titleDark: 'text-amber-300',
    titleLight: 'text-amber-800',
    dot: 'bg-amber-500',
  },
  suggestion: {
    dark: 'from-blue-950/35 to-slate-900/30 border-blue-500/25',
    light: 'from-blue-50/80 to-white border-blue-200/70',
    iconBg: { dark: 'bg-blue-500/20', light: 'bg-blue-100' },
    icon: Lightbulb,
    iconColor: 'text-blue-500',
    titleDark: 'text-blue-300',
    titleLight: 'text-blue-800',
    dot: 'bg-blue-500',
  },
};

const InsightCard: React.FC<InsightCardProps> = ({ type, title, items, delay = 0 }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  if (!items?.length) return null;
  const s = STYLES[type];
  const Icon = s.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`rounded-xl border bg-gradient-to-br p-4 h-full ${
        isDark ? s.dark : s.light
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-1.5 rounded-lg ${isDark ? s.iconBg.dark : s.iconBg.light}`}>
          <Icon className={`w-4 h-4 ${s.iconColor}`} />
        </div>
        <span
          className={`font-bold text-sm tracking-tight ${
            isDark ? s.titleDark : s.titleLight
          }`}
        >
          {title}
        </span>
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li
            key={i}
            className={`text-sm leading-relaxed flex gap-2.5 ${
              isDark ? 'text-slate-300' : 'text-slate-700'
            }`}
          >
            <span className={`mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
};

interface Props {
  strengths?: string[];
  weaknesses?: string[];
  missingPoints?: string[];
  suggestions?: string[];
}

export const EvaluationInsightGrid: React.FC<Props> = ({
  strengths = [],
  weaknesses = [],
  missingPoints = [],
  suggestions = [],
}) => {
  if (!strengths.length && !weaknesses.length && !missingPoints.length && !suggestions.length) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <InsightCard type="strength" title="Strengths" items={strengths} delay={0.05} />
      <InsightCard type="weakness" title="Weaknesses" items={weaknesses} delay={0.1} />
      {missingPoints.length > 0 && (
        <InsightCard type="missing" title="Missing Points" items={missingPoints} delay={0.15} />
      )}
      <InsightCard type="suggestion" title="Suggestions" items={suggestions} delay={0.2} />
    </div>
  );
};

export default EvaluationInsightGrid;
