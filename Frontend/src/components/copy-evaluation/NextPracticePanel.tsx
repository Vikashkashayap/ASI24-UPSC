import React from 'react';
import { motion } from 'framer-motion';
import { Target, BookMarked, AlertTriangle, PenLine } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { NextPracticeItem } from '../../types/copyEvaluation';

const TYPE_META: Record<
  string,
  { icon: typeof Target; label: string; color: string }
> = {
  pyq: { icon: Target, label: 'Related PYQ', color: 'text-blue-500' },
  notes: { icon: BookMarked, label: 'Related Notes', color: 'text-emerald-500' },
  weak_topic: {
    icon: AlertTriangle,
    label: 'Weak Topic',
    color: 'text-amber-500',
  },
  practice: { icon: PenLine, label: 'Practice', color: 'text-violet-500' },
};

interface Props {
  items?: NextPracticeItem[];
}

export const NextPracticePanel: React.FC<Props> = ({ items = [] }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  if (!items.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-4 xs:p-5 ${
        isDark
          ? 'bg-slate-900/50 border-slate-700/50'
          : 'bg-white border-slate-200 shadow-sm'
      }`}
    >
      <h3 className={`text-sm font-bold mb-3 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
        Next Practice
      </h3>
      <ul className="space-y-2.5">
        {items.map((item, i) => {
          const meta = TYPE_META[item.type || 'practice'] || TYPE_META.practice;
          const Icon = meta.icon;
          return (
            <li
              key={i}
              className={`flex gap-3 p-3 rounded-xl border ${
                isDark
                  ? 'bg-slate-800/40 border-slate-700/40'
                  : 'bg-slate-50 border-slate-100'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isDark ? 'bg-slate-700/60' : 'bg-white border border-slate-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${meta.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">
                  {meta.label}
                </p>
                <p
                  className={`text-sm font-medium ${
                    isDark ? 'text-slate-200' : 'text-slate-800'
                  }`}
                >
                  {item.title}
                </p>
                {item.description && (
                  <p className="text-xs mt-0.5 text-slate-500 leading-relaxed">
                    {item.description}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </motion.div>
  );
};

export default NextPracticePanel;
