import React from 'react';
import { Search, Lightbulb, FileSearch } from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';

type Variant = 'analysis' | 'suggestions';

interface Props {
  variant: Variant;
  items: string[];
  title?: string;
}

const config = {
  analysis: {
    icon: FileSearch,
    iconBg: { light: 'bg-blue-100', dark: 'bg-blue-500/15' },
    iconColor: 'text-blue-600 dark:text-blue-400',
    defaultTitle: 'Research & Analysis',
    subtitle: 'Section-level summary — har line ke baad yeh overview',
  },
  suggestions: {
    icon: Lightbulb,
    iconBg: { light: 'bg-amber-100', dark: 'bg-amber-500/15' },
    iconColor: 'text-amber-600 dark:text-amber-400',
    defaultTitle: 'How to Improve',
    subtitle: 'Key action points for this section',
  },
};

export const FeedbackBulletList: React.FC<Props> = ({
  variant,
  items,
  title,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { icon: Icon, iconBg, iconColor, defaultTitle, subtitle } = config[variant];

  if (!items?.length) return null;

  return (
    <div
      className={`rounded-xl border p-4 xs:p-5 ${
        variant === 'analysis'
          ? isDark
            ? 'bg-blue-950/20 border-blue-500/20'
            : 'bg-blue-50/60 border-blue-200/60'
          : isDark
            ? 'bg-amber-950/20 border-amber-500/20'
            : 'bg-amber-50/60 border-amber-200/60'
      }`}
    >
      <div className="mb-4">
        <div className="flex items-center gap-2.5 mb-1.5">
          <div
            className={`p-2 rounded-lg shadow-sm ${isDark ? iconBg.dark : iconBg.light}`}
          >
            <Icon className={`w-4 h-4 ${iconColor}`} />
          </div>
          <h4
            className={`text-sm font-bold ${
              isDark ? 'text-slate-100' : 'text-slate-800'
            }`}
          >
            {title || defaultTitle}
          </h4>
        </div>
        <p
          className={`text-xs ml-11 ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          {subtitle}
        </p>
      </div>

      <ul className={`space-y-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
        {items.map((item, i) => (
          <li key={i} className="flex gap-3 group">
            <div className="flex-shrink-0 mt-0.5">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-transform group-hover:scale-110 ${
                  variant === 'analysis'
                    ? isDark
                      ? 'bg-blue-500/20 text-blue-300'
                      : 'bg-blue-500 text-white'
                    : isDark
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-amber-500 text-white'
                }`}
              >
                {i + 1}
              </div>
            </div>
            <span className="text-sm leading-relaxed pt-0.5">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FeedbackBulletList;
