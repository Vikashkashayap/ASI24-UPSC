import React, { useEffect, useState } from 'react';
import { BookOpen, FileImage, AlignLeft } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { api } from '../../services/api';
import { VisionEvaluationResult } from '../../types/copyEvaluation';

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
    if (!hasPages) return;

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
  }, [evaluationId, storedPages, hasPages]);

  if (!hasAnswerText && !hasPages) return null;

  const tabBtn = (id: Tab, label: string, Icon: React.ElementType) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-full transition-all ${
        tab === id
          ? isDark
            ? 'bg-gradient-to-r from-fuchsia-600/30 to-purple-600/30 text-fuchsia-200 border border-fuchsia-500/40 shadow-lg shadow-fuchsia-900/20'
            : 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white border-0 shadow-md shadow-purple-200/50'
          : isDark
            ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
            : 'text-slate-600 hover:text-slate-800 hover:bg-white border border-slate-200/80'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  const answerContent = (
    <div className="space-y-4 h-full">
      {result.questionText && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-4 h-4 text-purple-500" />
            <h3 className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
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
              <p className={`text-xs font-medium mb-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                Q{a.questionNumber}: {a.questionText}
              </p>
            )}
            <div
              className={`text-sm leading-relaxed whitespace-pre-wrap p-3 rounded-lg paper-texture-light ${
                isDark
                  ? 'bg-[#1c1917]/80 text-slate-300 border border-stone-600/50 paper-texture-dark'
                  : 'bg-[#faf8f5] text-slate-700 border border-stone-200/80'
              }`}
            >
              {a.answerText || '—'}
            </div>
          </div>
        ))
      ) : (
        <div>
          <h3 className={`text-sm font-semibold mb-2 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            Your Answer (read from handwriting)
          </h3>
          <div
            className={`text-sm leading-relaxed whitespace-pre-wrap p-4 rounded-lg max-h-[420px] overflow-y-auto custom-scrollbar font-serif paper-texture-light ${
              isDark
                ? 'bg-[#1c1917]/80 text-slate-300 border border-stone-600/50 paper-texture-dark'
                : 'bg-[#faf8f5] text-slate-700 border border-stone-200/80'
            }`}
          >
            {result.extractedAnswerText ||
              'Answer text could not be transcribed. Check uploaded pages.'}
          </div>
        </div>
      )}
    </div>
  );

  const pagesContent = (
    <div className="h-full min-h-[200px]">
      {loadingPages ? (
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Loading pages...</p>
      ) : pageUrls.length > 0 ? (
        <div className="space-y-3">
            <div
              className={`rounded-xl overflow-hidden border shadow-lg ${
                isDark
                  ? 'border-slate-600/50 ring-1 ring-slate-700/50'
                  : 'border-slate-200 ring-1 ring-slate-100'
              }`}
            >
              <img
                src={pageUrls[activePage]?.url}
                alt={`Page ${pageUrls[activePage]?.pageNumber}`}
                className="w-full h-auto max-h-[420px] object-contain bg-white"
              />
            </div>
            {pageUrls.length > 1 && (
              <div className="flex flex-wrap gap-2 justify-center">
                {pageUrls.map((p, i) => (
                  <button
                    key={p.pageNumber}
                    type="button"
                    onClick={() => setActivePage(i)}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all ${
                      activePage === i
                        ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-md'
                        : isDark
                          ? 'bg-slate-700/80 text-slate-300 hover:bg-slate-600'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Page {p.pageNumber}
                  </button>
                ))}
              </div>
            )}
        </div>
      ) : (
        <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
          Page previews not available.
        </p>
      )}
    </div>
  );

  return (
    <div
      className={`border-b ${
        isDark
          ? 'border-slate-700/50 bg-slate-900/20'
          : 'border-slate-100 bg-gradient-to-b from-slate-50/50 to-transparent'
      }`}
    >
      {/* Mobile: tabs at top */}
      <div
        className={`lg:hidden flex flex-wrap gap-2 px-4 pt-4 pb-3 border-b ${
          isDark ? 'border-slate-700/50' : 'border-slate-200'
        }`}
      >
        {hasAnswerText && tabBtn('answer', 'Answer Text', AlignLeft)}
        {hasPages && tabBtn('pages', 'Uploaded Pages', FileImage)}
      </div>

      {/* Desktop: side-by-side — Answer Text | Uploaded Pages */}
      <div
        className={`hidden lg:grid lg:divide-x divide-slate-200 dark:divide-slate-700/60 ${
          hasAnswerText && hasPages ? 'lg:grid-cols-2' : 'lg:grid-cols-1'
        }`}
      >
        {hasAnswerText && (
          <div className="p-4 xs:p-5">
            <div
              className={`flex items-center gap-2 mb-4 pb-3 border-b ${
                isDark ? 'border-slate-700/50' : 'border-slate-200'
              }`}
            >
              <AlignLeft className="w-4 h-4 text-purple-600" />
              <span
                className={`text-sm font-semibold ${
                  isDark ? 'text-purple-300' : 'text-purple-800'
                }`}
              >
                Answer Text
              </span>
            </div>
            {answerContent}
          </div>
        )}
        {hasPages && (
          <div className="p-4 xs:p-5">
            <div
              className={`flex items-center gap-2 mb-4 pb-3 border-b ${
                isDark ? 'border-slate-700/50' : 'border-slate-200'
              }`}
            >
              <FileImage className="w-4 h-4 text-purple-600" />
              <span
                className={`text-sm font-semibold ${
                  isDark ? 'text-purple-300' : 'text-purple-800'
                }`}
              >
                Uploaded Pages
              </span>
            </div>
            {pagesContent}
          </div>
        )}
      </div>

      {/* Mobile: tab content */}
      <div className="lg:hidden p-4 xs:p-5">
        {tab === 'answer' && hasAnswerText && answerContent}
        {tab === 'pages' && hasPages && pagesContent}
      </div>
    </div>
  );
};

export default CopyEvaluationAnswerPanel;
