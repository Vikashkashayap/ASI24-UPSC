import React from 'react';
import { CheckCircle2, AlertTriangle, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { SectionFeedback, BodySection } from '../../types/copyEvaluation';

type SectionData = SectionFeedback | BodySection;

interface Props {
  title: string;
  section: SectionData;
  defaultOpen?: boolean;
  accent?: 'purple' | 'blue' | 'emerald' | 'amber';
}

export const EvaluationSectionCard: React.FC<Props> = ({
  title,
  section,
  defaultOpen = true,
  accent = 'blue',
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [open, setOpen] = React.useState(defaultOpen);

  const accentMap = {
    purple: isDark ? 'border-blue-500/30 bg-blue-950/20' : 'border-blue-200 bg-blue-50/40',
    blue: isDark ? 'border-blue-500/30 bg-blue-950/20' : 'border-blue-200 bg-blue-50/40',
    emerald: isDark ? 'border-emerald-500/30 bg-emerald-950/20' : 'border-emerald-200 bg-emerald-50/40',
    amber: isDark ? 'border-amber-500/30 bg-amber-950/20' : 'border-amber-200 bg-amber-50/40',
  };

  const studentText = section.studentText?.trim();
  const analysis = 'analysis' in section ? section.analysis : undefined;

  const ListBlock = ({
    items,
    icon: Icon,
    color,
    label,
  }: {
    items?: string[];
    icon: React.ElementType;
    color: string;
    label: string;
  }) =>
    items?.length ? (
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Icon className={`w-4 h-4 ${color}`} />
          <span className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {label}
          </span>
        </div>
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className={`text-sm flex gap-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              <span className={`${color} mt-0.5`}>•</span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    ) : null;

  return (
    <div className={`rounded-xl border-2 overflow-hidden ${accentMap[accent]}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-4 py-3 text-left ${
          isDark ? 'hover:bg-slate-800/40' : 'hover:bg-white/60'
        }`}
      >
        <h3 className={`font-semibold text-sm xs:text-base ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
          {title}
        </h3>
        {open ? (
          <ChevronUp className={`w-5 h-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
        ) : (
          <ChevronDown className={`w-5 h-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
        )}
      </button>

      {open && (
        <div className={`px-4 pb-4 space-y-4 border-t ${isDark ? 'border-slate-700/50' : 'border-slate-200/80'}`}>
          {studentText && (
            <div
              className={`text-sm leading-relaxed whitespace-pre-wrap p-3 rounded-lg max-h-48 overflow-y-auto custom-scrollbar ${
                isDark ? 'bg-slate-900/60 text-slate-300 border border-slate-700/40' : 'bg-white text-slate-700 border border-slate-100'
              }`}
            >
              {studentText}
            </div>
          )}

          {analysis?.map((line, i) => (
            <p key={i} className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {line}
            </p>
          ))}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ListBlock items={section.strengths} icon={CheckCircle2} color="text-emerald-500" label="Strengths" />
            <ListBlock items={section.weaknesses} icon={AlertTriangle} color="text-amber-500" label="Weaknesses" />
            <ListBlock items={section.suggestions} icon={Lightbulb} color="text-yellow-500" label="Suggestions" />
          </div>
        </div>
      )}
    </div>
  );
};

export default EvaluationSectionCard;
