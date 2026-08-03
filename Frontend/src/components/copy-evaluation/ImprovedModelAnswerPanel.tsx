import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Sparkles, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '../ui/button';
import { FormattedText } from '../FormattedText';

interface Props {
  improvedAnswer?: string;
  modelAnswer?: string;
  modelSuggestions?: string[];
  modelAnswerShared?: boolean;
}

/** Soft-clean AI text into UPSC-style blocks FormattedText can render */
function prepareAnswerText(raw: string): string {
  let t = raw.replace(/\r\n/g, '\n').trim();

  // If AI returned one dense paragraph, try light structure cues
  if (!/\n/.test(t) && t.length > 220) {
    t = t
      .replace(
        /\b(Firstly|Secondly|Thirdly|Finally|Moreover|Furthermore|In conclusion|To conclude)\b/gi,
        '\n\n• $1'
      )
      .replace(/^\n+/, '');
  }

  // Ensure section labels stand alone (Introduction / Body / Conclusion)
  t = t
    .replace(
      /(?:^|\n)\s*(Introduction|Body|Conclusion|Way Forward|Way-forward)\s*:?\s*/gi,
      '\n\n**$1**\n'
    )
    // Ensure bullet markers have a space: "*Text" → "* Text"
    .replace(/^(\s*[*•-])([^\s*])/gm, '$1 $2')
    // Blank line before bold section headings
    .replace(/([^\n])\n(\*\*[^*\n]+\*\*:?\s*)$/gm, '$1\n\n$2')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return t;
}

export const ImprovedModelAnswerPanel: React.FC<Props> = ({
  improvedAnswer,
  modelAnswer,
  modelSuggestions = [],
  modelAnswerShared = false,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [tab, setTab] = useState<'improved' | 'model'>('improved');
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const hasImproved = Boolean(improvedAnswer?.trim());
  const hasModel =
    Boolean(modelAnswer?.trim()) || modelSuggestions.length > 0;

  if (!hasImproved && !hasModel) return null;

  const activeText =
    tab === 'improved' && hasImproved
      ? improvedAnswer!
      : modelAnswer?.trim() ||
        (modelSuggestions.length
          ? modelSuggestions.map((s, i) => `${i + 1}. ${s}`).join('\n\n')
          : '');

  const displayText = activeText ? prepareAnswerText(activeText) : '';

  const copyText = async () => {
    if (!activeText) return;
    try {
      await navigator.clipboard.writeText(activeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border overflow-hidden ${
        isDark
          ? 'bg-slate-900/50 border-slate-700/50'
          : 'bg-white border-slate-200 shadow-sm'
      }`}
    >
      <div
        className={`flex items-center justify-between px-4 xs:px-5 py-3.5 border-b ${
          isDark ? 'border-slate-700/50' : 'border-slate-100'
        }`}
      >
        <div className="flex items-center gap-2">
          <Sparkles className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          <h3 className={`text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            AI Improved & Model Answer
          </h3>
          <span className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
            UPSC format
          </span>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
        </button>
      </div>

      {expanded && (
        <div className="p-4 xs:p-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            {hasImproved && (
              <button
                type="button"
                onClick={() => setTab('improved')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                  tab === 'improved'
                    ? isDark
                      ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                      : 'bg-blue-50 border-blue-200 text-blue-700'
                    : isDark
                      ? 'border-slate-700 text-slate-400'
                      : 'border-slate-200 text-slate-600'
                }`}
              >
                Topper-style Improved Answer
              </button>
            )}
            {hasModel && (
              <button
                type="button"
                onClick={() => setTab('model')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                  tab === 'model' || !hasImproved
                    ? isDark
                      ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                      : 'bg-blue-50 border-blue-200 text-blue-700'
                    : isDark
                      ? 'border-slate-700 text-slate-400'
                      : 'border-slate-200 text-slate-600'
                }`}
              >
                <span className="inline-flex items-center gap-1">
                  <BookOpen className="w-3 h-3" /> Ideal Model Answer
                  {modelAnswerShared && (
                    <span
                      className={`ml-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                        isDark
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      Shared
                    </span>
                  )}
                </span>
              </button>
            )}
            <Button
              type="button"
              variant="outline"
              className="ml-auto h-8 text-xs px-3"
              onClick={copyText}
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 mr-1" /> Copied
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 mr-1" /> Copy
                </>
              )}
            </Button>
          </div>

          <div
            className={`rounded-xl p-5 max-h-[480px] overflow-y-auto custom-scrollbar ${
              isDark
                ? 'bg-slate-800/50 text-slate-300 border border-slate-700/40'
                : 'bg-slate-50/90 text-slate-700 border border-slate-100'
            }`}
          >
            {displayText ? (
              <FormattedText
                text={displayText}
                className={`answer-prose text-[14px] md:text-[15px] leading-[1.75] ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}
              />
            ) : (
              <p className="text-sm text-slate-500">No answer content available.</p>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ImprovedModelAnswerPanel;
