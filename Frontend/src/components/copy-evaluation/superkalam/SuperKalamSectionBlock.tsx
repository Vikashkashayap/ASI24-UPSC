import React from 'react';
import { useTheme } from '../../../hooks/useTheme';
import { SectionFeedback, BodySection } from '../../../types/copyEvaluation';
import { WhatYouWroteBox } from './WhatYouWroteBox';
import { FeedbackBulletList } from './FeedbackBulletList';

type SectionData = SectionFeedback | BodySection;

interface Props {
  label: string;
  section: SectionData;
}

/** Section block: student's writing + analysis / suggestions */
export const SuperKalamSectionBlock: React.FC<Props> = ({ label, section }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const analysis = 'analysis' in section ? section.analysis : undefined;
  const hasContent =
    section.studentText?.trim() ||
    analysis?.length ||
    section.suggestions?.length ||
    section.strengths?.length ||
    section.weaknesses?.length;

  if (!hasContent) return null;

  const analysisItems = [
    ...(analysis || []),
    ...(section.strengths || []).map((s) => `Strength: ${s}`),
    ...(section.weaknesses || []).map((w) => `Weakness: ${w}`),
  ];

  return (
    <div
      className={`py-5 border-b last:border-b-0 ${
        isDark ? 'border-slate-700/40' : 'border-slate-100'
      }`}
    >
      <p
        className={`text-xs font-bold tracking-[0.14em] uppercase mb-3 ${
          isDark ? 'text-blue-300/90' : 'text-blue-700'
        }`}
      >
        {label}
      </p>

      <div className="space-y-4">
        {section.studentText?.trim() && (
          <WhatYouWroteBox text={section.studentText} />
        )}

        {analysisItems.length > 0 && (
          <FeedbackBulletList variant="analysis" items={analysisItems} />
        )}
        {section.suggestions && section.suggestions.length > 0 && (
          <FeedbackBulletList variant="suggestions" items={section.suggestions} />
        )}
      </div>
    </div>
  );
};

export default SuperKalamSectionBlock;
