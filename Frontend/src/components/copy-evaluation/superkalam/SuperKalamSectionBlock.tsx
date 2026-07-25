import React from 'react';
import { useTheme } from '../../../hooks/useTheme';
import { SectionFeedback, BodySection } from '../../../types/copyEvaluation';
import { WhatYouWroteBox } from './WhatYouWroteBox';
import { FeedbackBulletList } from './FeedbackBulletList';
import { LineByLineFeedbackPanel } from './LineByLineFeedbackPanel';

type SectionData = SectionFeedback | BodySection;

interface Props {
  label: string;
  section: SectionData;
}

/** Section block: student's writing + line-by-line examiner notes only (no repeated SW/summary). */
export const SuperKalamSectionBlock: React.FC<Props> = ({ label, section }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const lineFeedback =
    'lineFeedback' in section ? section.lineFeedback : undefined;
  const analysis = 'analysis' in section ? section.analysis : undefined;
  const hasLines = Boolean(lineFeedback?.length);
  const hasContent =
    section.studentText?.trim() ||
    hasLines ||
    (!hasLines &&
      (analysis?.length ||
        section.suggestions?.length ||
        section.strengths?.length ||
        section.weaknesses?.length));

  if (!hasContent) return null;

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
          <WhatYouWroteBox
            text={section.studentText}
            compact={hasLines}
          />
        )}

        {hasLines && <LineByLineFeedbackPanel items={lineFeedback!} />}

        {!hasLines && section.studentText?.trim() && (
          <p
            className={`text-sm rounded-lg p-3 border ${
              isDark
                ? 'border-amber-500/20 bg-amber-950/20 text-amber-200/90'
                : 'border-amber-200 bg-amber-50 text-amber-900'
            }`}
          >
            Line-by-line feedback unavailable for this saved evaluation. Upload
            again for detailed examiner notes.
          </p>
        )}

        {/* Fallback only when no line-by-line data (legacy evals) */}
        {!hasLines && analysis && analysis.length > 0 && (
          <FeedbackBulletList variant="analysis" items={analysis} />
        )}
        {!hasLines && section.suggestions && section.suggestions.length > 0 && (
          <FeedbackBulletList
            variant="suggestions"
            items={section.suggestions}
          />
        )}
      </div>
    </div>
  );
};

export default SuperKalamSectionBlock;
