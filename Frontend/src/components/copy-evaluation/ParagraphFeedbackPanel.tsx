import React from 'react';
import { motion } from 'framer-motion';
import { Check, AlertTriangle, AlignLeft } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import {
  VisionEvaluationResult,
  ParagraphFeedback,
} from '../../types/copyEvaluation';

interface Props {
  result: VisionEvaluationResult;
}

function paragraphsFromResult(result: VisionEvaluationResult): ParagraphFeedback[] {
  if (result.paragraph_feedback?.length) return result.paragraph_feedback;
  if (result.paragraphFeedback?.length) return result.paragraphFeedback;

  const sections: {
    title: string;
    positives: string[];
    mistakes: string[];
    suggestions: string[];
  }[] = [];

  const pushSection = (
    title: string,
    sec?: {
      strengths?: string[];
      weaknesses?: string[];
      suggestions?: string[];
    }
  ) => {
    if (!sec) return;
    const positives = (sec.strengths || []).slice(0, 3);
    const mistakes = (sec.weaknesses || []).slice(0, 3);
    const suggestions = (sec.suggestions || []).slice(0, 3);
    if (positives.length || mistakes.length || suggestions.length) {
      sections.push({ title, positives, mistakes, suggestions });
    }
  };

  pushSection('Introduction', result.introduction);
  (result.body || []).forEach((b, i) => {
    pushSection(b.sectionTitle || `Body ${i + 1}`, b);
  });
  pushSection('Conclusion', result.conclusion);

  return sections.map((s, i) => ({
    paragraphIndex: i + 1,
    text: s.title,
    positives: s.positives,
    mistakes: s.mistakes,
    suggestions: s.suggestions,
  }));
}

export const ParagraphFeedbackPanel: React.FC<Props> = ({ result }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const paragraphs = paragraphsFromResult(result);

  if (!paragraphs.length) return null;

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
      <div className="flex items-center gap-2 mb-4">
        <AlignLeft className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
        <h3 className={`text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
          Section Feedback
        </h3>
        <span className="text-xs text-slate-500">Intro · Body · Conclusion</span>
      </div>
      <div className="space-y-4">
        {paragraphs.map((p, i) => (
          <div
            key={i}
            className={`rounded-xl p-4 border ${
              isDark
                ? 'bg-slate-800/40 border-slate-700/40'
                : 'bg-slate-50 border-slate-100'
            }`}
          >
            <p
              className={`text-sm font-semibold mb-3 ${
                isDark ? 'text-slate-200' : 'text-slate-800'
              }`}
            >
              {p.text || `Section ${p.paragraphIndex || i + 1}`}
            </p>
            <ul className="space-y-2">
              {(p.positives || []).map((pos, j) => (
                <li
                  key={`p-${j}`}
                  className={`flex gap-2 text-sm ${
                    isDark ? 'text-emerald-300/90' : 'text-emerald-800'
                  }`}
                >
                  <Check className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-500" />
                  <span>{pos}</span>
                </li>
              ))}
              {(p.mistakes || []).map((m, j) => (
                <li
                  key={`m-${j}`}
                  className={`flex gap-2 text-sm ${
                    isDark ? 'text-amber-300/90' : 'text-amber-900'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" />
                  <span>{m}</span>
                </li>
              ))}
              {(p.suggestions || []).map((s, j) => (
                <li
                  key={`s-${j}`}
                  className={`flex gap-2 text-sm ${
                    isDark ? 'text-blue-300/90' : 'text-blue-800'
                  }`}
                >
                  <span className="text-blue-500 font-bold flex-shrink-0">→</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default ParagraphFeedbackPanel;
