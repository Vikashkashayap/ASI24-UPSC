import React from 'react';
import { useTheme } from '../../../hooks/useTheme';
import { SectionFeedback, BodySection } from '../../../types/copyEvaluation';
import { WhatYouWroteBox } from './WhatYouWroteBox';
import { FeedbackBulletList } from './FeedbackBulletList';
import { StrengthWeaknessGrid } from './StrengthWeaknessGrid';
import { LineByLineFeedbackPanel } from './LineByLineFeedbackPanel';

type SectionData = SectionFeedback | BodySection;

interface Props {
  label: string;
  section: SectionData;
  showStrengthWeakness?: boolean;
}

export const SuperKalamSectionBlock: React.FC<Props> = ({
  label,
  section,
  showStrengthWeakness = true,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const analysis = 'analysis' in section ? section.analysis : undefined;
  const lineFeedback =
    'lineFeedback' in section ? section.lineFeedback : undefined;
  const hasContent =
    section.studentText?.trim() ||
    lineFeedback?.length ||
    analysis?.length ||
    section.strengths?.length ||
    section.weaknesses?.length ||
    section.suggestions?.length;

  if (!hasContent) return null;

  return (
    <div
      className={`py-6 border-b last:border-b-0 ${
        isDark ? 'border-slate-700/40' : 'border-slate-100'
      }`}
    >
      <div className="flex items-center gap-3 mb-5">
        <div
          className={`w-1 h-7 rounded-full ${
            isDark
              ? 'bg-gradient-to-b from-indigo-400 to-blue-600'
              : 'bg-gradient-to-b from-indigo-500 to-blue-600'
          }`}
        />
        <p
          className={`text-xs font-bold tracking-[0.15em] uppercase ${
            isDark ? 'text-blue-300/90' : 'text-blue-700'
          }`}
        >
          {label}
        </p>
      </div>

      <div
        className={`rounded-xl border p-4 xs:p-5 space-y-5 ${
          isDark
            ? 'bg-slate-800/30 border-slate-700/50 shadow-inner shadow-black/10'
            : 'bg-gradient-to-br from-slate-50/80 to-white border-slate-200/80 shadow-sm'
        }`}
      >
        {section.studentText?.trim() && (
          <WhatYouWroteBox
            text={section.studentText}
            compact={Boolean(lineFeedback?.length)}
          />
        )}

        {lineFeedback && lineFeedback.length > 0 && (
          <LineByLineFeedbackPanel items={lineFeedback} />
        )}

        {section.studentText?.trim() &&
          !lineFeedback?.length &&
          !(analysis?.length || section.suggestions?.length) && (
            <p
              className={`text-sm rounded-lg p-3 border ${
                isDark
                  ? 'border-amber-500/20 bg-amber-950/20 text-amber-200/90'
                  : 'border-amber-200 bg-amber-50 text-amber-900'
              }`}
            >
              Line-by-line Research &amp; Analysis is not available for this saved
              evaluation. Upload the copy again to generate detailed per-line feedback.
            </p>
          )}

        {analysis && analysis.length > 0 && (
          <FeedbackBulletList
            variant="analysis"
            items={analysis}
            title={lineFeedback?.length ? 'Section summary — examiner view' : undefined}
          />
        )}

        {showStrengthWeakness && (
          <StrengthWeaknessGrid
            strengths={section.strengths}
            weaknesses={section.weaknesses}
          />
        )}

        {section.suggestions && section.suggestions.length > 0 && (
          <FeedbackBulletList
            variant="suggestions"
            items={section.suggestions}
            title={lineFeedback?.length ? 'Section summary — how to improve' : undefined}
          />
        )}
      </div>
    </div>
  );
};

export default SuperKalamSectionBlock;
