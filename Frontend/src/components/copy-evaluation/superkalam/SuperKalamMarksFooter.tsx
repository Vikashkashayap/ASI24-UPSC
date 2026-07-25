import React from 'react';
import { useTheme } from '../../../hooks/useTheme';
import { VisionEvaluationResult } from '../../../types/copyEvaluation';
import { ModelAnswerPanel } from '../ModelAnswerPanel';
import { FeedbackBulletList } from './FeedbackBulletList';

interface Props {
  result: VisionEvaluationResult;
}

/** Priority fixes + model answer only (no repeated marks). */
export const SuperKalamMarksFooter: React.FC<Props> = ({ result }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const priorities = result.improvementPriority?.filter(Boolean) || [];

  if (!priorities.length && !(result.modelAnswerSuggestions?.length)) {
    return null;
  }

  return (
    <div className="space-y-5">
      {priorities.length > 0 && (
        <div>
          <p
            className={`text-xs font-bold tracking-[0.14em] uppercase mb-3 ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Fix these first
          </p>
          <FeedbackBulletList variant="suggestions" items={priorities} />
        </div>
      )}

      {(result.modelAnswerSuggestions?.length ?? 0) > 0 && (
        <div
          className={`pt-4 border-t ${
            isDark ? 'border-slate-700/50' : 'border-slate-200'
          }`}
        >
          <ModelAnswerPanel suggestions={result.modelAnswerSuggestions || []} />
        </div>
      )}
    </div>
  );
};

export default SuperKalamMarksFooter;
