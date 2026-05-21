import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';

interface Props {
  strengths?: string[];
  weaknesses?: string[];
}

export const StrengthWeaknessGrid: React.FC<Props> = ({
  strengths = [],
  weaknesses = [],
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!strengths.length && !weaknesses.length) return null;

  const Card = ({
    type,
    items,
  }: {
    type: 'strength' | 'weakness';
    items: string[];
  }) => {
    if (!items.length) return null;
    const isStr = type === 'strength';
    return (
      <div
        className={`relative overflow-hidden rounded-xl border p-4 xs:p-5 h-full transition-shadow hover:shadow-md ${
          isStr
            ? isDark
              ? 'bg-gradient-to-br from-emerald-950/40 to-slate-900/30 border-emerald-500/25 shadow-emerald-900/10'
              : 'bg-gradient-to-br from-emerald-50 to-white border-emerald-200/80 shadow-sm shadow-emerald-100/30'
            : isDark
              ? 'bg-gradient-to-br from-rose-950/35 to-slate-900/30 border-rose-500/25 shadow-rose-900/10'
              : 'bg-gradient-to-br from-rose-50/80 to-white border-rose-200/70 shadow-sm shadow-rose-100/20'
        }`}
      >
        <div
          className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-30 ${
            isStr ? 'bg-emerald-400' : 'bg-rose-400'
          }`}
        />
        <div className="relative flex items-center gap-2.5 mb-4">
          <div
            className={`p-1.5 rounded-lg ${
              isStr
                ? isDark
                  ? 'bg-emerald-500/20'
                  : 'bg-emerald-100'
                : isDark
                  ? 'bg-rose-500/20'
                  : 'bg-rose-100'
            }`}
          >
            {isStr ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-500" />
            )}
          </div>
          <span
            className={`font-bold text-sm tracking-tight ${
              isStr
                ? isDark
                  ? 'text-emerald-300'
                  : 'text-emerald-800'
                : isDark
                  ? 'text-rose-300'
                  : 'text-rose-800'
            }`}
          >
            {isStr ? 'Strengths' : 'Weaknesses'}
          </span>
        </div>
        <ul className="relative space-y-2.5">
          {items.map((item, i) => (
            <li
              key={i}
              className={`text-sm leading-relaxed flex gap-2.5 ${
                isDark ? 'text-slate-300' : 'text-slate-700'
              }`}
            >
              <span
                className={`mt-2 w-1 h-1 rounded-full flex-shrink-0 ${
                  isStr ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card type="strength" items={strengths} />
      <Card type="weakness" items={weaknesses} />
    </div>
  );
};

export default StrengthWeaknessGrid;
