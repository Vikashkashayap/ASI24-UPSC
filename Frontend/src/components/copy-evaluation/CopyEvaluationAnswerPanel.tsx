import React, { useEffect, useState } from 'react';
import { BookOpen, FileImage, AlignLeft } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { api } from '../../services/api';
import { VisionEvaluationResult } from './CopyEvaluationResultView';

interface StoredPage {
  pageNumber: number;
  fileName: string;
}

interface CopyEvaluationAnswerPanelProps {
  evaluationId: string;
  result: VisionEvaluationResult;
  storedPages?: StoredPage[];
}

type Tab = 'answer' | 'pages';

export const CopyEvaluationAnswerPanel: React.FC<CopyEvaluationAnswerPanelProps> = ({
  evaluationId,
  result,
  storedPages = [],
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [tab, setTab] = useState<Tab>('answer');
  const [pageUrls, setPageUrls] = useState<{ pageNumber: number; url: string }[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [activePage, setActivePage] = useState(0);

  const hasAnswerText =
    Boolean(result.extractedAnswerText?.trim()) ||
    Boolean(result.answers?.length) ||
    Boolean(result.questionText?.trim());
  const hasPages = storedPages.length > 0;

  useEffect(() => {
    if (hasPages && !hasAnswerText) setTab('pages');
  }, [hasPages, hasAnswerText]);

  useEffect(() => {
    if (!hasPages || tab !== 'pages') return;

    let cancelled = false;
    const objectUrls: string[] = [];

    const load = async () => {
      setLoadingPages(true);
      try {
        const loaded: { pageNumber: number; url: string }[] = [];
        for (const p of storedPages) {
          const res = await api.get(
            `/api/copy-evaluation/${evaluationId}/pages/${p.pageNumber}`,
            { responseType: 'blob' }
          );
          if (cancelled) return;
          const url = URL.createObjectURL(res.data);
          objectUrls.push(url);
          loaded.push({ pageNumber: p.pageNumber, url });
        }
        if (!cancelled) setPageUrls(loaded);
      } catch (e) {
        console.error('Failed to load page images', e);
      } finally {
        if (!cancelled) setLoadingPages(false);
      }
    };

    load();

    return () => {
      cancelled = true;
      objectUrls.forEach(URL.revokeObjectURL);
      setPageUrls([]);
    };
  }, [evaluationId, storedPages, tab, hasPages]);

  const sectionClass = isDark
    ? 'rounded-xl border border-slate-700/50 bg-slate-800/40'
    : 'rounded-xl border border-slate-200 bg-slate-50/80';

  const tabBtn = (id: Tab, label: string, Icon: React.ElementType) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        tab === id
          ? isDark
            ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40'
            : 'bg-purple-100 text-purple-800 border border-purple-200'
          : isDark
            ? 'text-slate-400 hover:text-slate-200'
            : 'text-slate-600 hover:text-slate-800'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  return (
    <div className={`${sectionClass} overflow-hidden`}>
      <div
        className={`flex flex-wrap gap-2 p-3 border-b ${
          isDark ? 'border-slate-700/50' : 'border-slate-200'
        }`}
      >
        {hasAnswerText && tabBtn('answer', 'Answer Text', AlignLeft)}
        {hasPages && tabBtn('pages', 'Uploaded Pages', FileImage)}
      </div>

      <div className="p-4 xs:p-5">
        {tab === 'answer' && (
          <div className="space-y-4">
            {result.questionText && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-4 h-4 text-purple-500" />
                  <h3
                    className={`text-sm font-semibold ${
                      isDark ? 'text-slate-200' : 'text-slate-800'
                    }`}
                  >
                    Question
                  </h3>
                </div>
                <p
                  className={`text-sm leading-relaxed whitespace-pre-wrap ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  {result.questionText}
                </p>
              </div>
            )}

            {result.answers && result.answers.length > 1 ? (
              result.answers.map((a, i) => (
                <div key={i}>
                  {a.questionText && (
                    <p
                      className={`text-xs font-medium mb-1 ${
                        isDark ? 'text-slate-500' : 'text-slate-500'
                      }`}
                    >
                      Q{a.questionNumber}: {a.questionText}
                    </p>
                  )}
                  <div
                    className={`text-sm leading-relaxed whitespace-pre-wrap p-3 rounded-lg ${
                      isDark ? 'bg-slate-900/50 text-slate-300' : 'bg-white text-slate-700 border border-slate-100'
                    }`}
                  >
                    {a.answerText || '—'}
                  </div>
                </div>
              ))
            ) : (
              <div>
                <h3
                  className={`text-sm font-semibold mb-2 ${
                    isDark ? 'text-slate-200' : 'text-slate-800'
                  }`}
                >
                  Your Answer (read from handwriting)
                </h3>
                <div
                  className={`text-sm leading-relaxed whitespace-pre-wrap p-4 rounded-lg max-h-[400px] overflow-y-auto custom-scrollbar ${
                    isDark
                      ? 'bg-slate-900/50 text-slate-300 border border-slate-700/30'
                      : 'bg-white text-slate-700 border border-slate-200'
                  }`}
                >
                  {result.extractedAnswerText ||
                    'Answer text could not be transcribed. View uploaded pages tab.'}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'pages' && (
          <div>
            {loadingPages ? (
              <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>
                Loading pages...
              </p>
            ) : pageUrls.length > 0 ? (
              <div className="space-y-3">
                <div
                  className={`rounded-lg overflow-hidden border ${
                    isDark ? 'border-slate-700' : 'border-slate-200'
                  }`}
                >
                  <img
                    src={pageUrls[activePage]?.url}
                    alt={`Page ${pageUrls[activePage]?.pageNumber}`}
                    className="w-full h-auto max-h-[500px] object-contain bg-white"
                  />
                </div>
                {pageUrls.length > 1 && (
                  <div className="flex flex-wrap gap-2 justify-center">
                    {pageUrls.map((p, i) => (
                      <button
                        key={p.pageNumber}
                        type="button"
                        onClick={() => setActivePage(i)}
                        className={`px-3 py-1 text-xs rounded-full ${
                          activePage === i
                            ? 'bg-fuchsia-500 text-white'
                            : isDark
                              ? 'bg-slate-700 text-slate-300'
                              : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        Page {p.pageNumber}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className={isDark ? 'text-slate-500' : 'text-slate-500'}>
                Page previews not available for this evaluation.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CopyEvaluationAnswerPanel;
