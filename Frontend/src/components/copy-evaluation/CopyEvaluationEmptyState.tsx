import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Upload,
  FileText,
  Image as ImageIcon,
  Check,
  Sparkles,
  Brain,
  AlignLeft,
  Award,
  BookOpen,
  TrendingUp,
  Download,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { useNavigate } from 'react-router-dom';
import { copyEvaluationAPI } from '../../services/api';

const ACCEPTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

const MAX_SIZE = 20 * 1024 * 1024;

const FEATURES = [
  { icon: Brain, label: 'AI Examiner' },
  { icon: AlignLeft, label: 'Section Feedback' },
  { icon: Award, label: 'UPSC Style Marks' },
  { icon: BookOpen, label: 'Model Answer' },
  { icon: TrendingUp, label: 'Improvement Suggestions' },
  { icon: Download, label: 'Download Evaluation Report' },
];

interface RecentItem {
  _id: string;
  subject: string;
  paper: string;
  fileName?: string;
  overallMarks?: number;
  maxMarks?: number;
  status: string;
  createdAt: string;
}

interface CopyEvaluationEmptyStateProps {
  onFileReady: (file: File) => void;
  onOpenModal?: () => void;
}

export const CopyEvaluationEmptyState: React.FC<CopyEvaluationEmptyStateProps> = ({
  onFileReady,
  onOpenModal,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await copyEvaluationAPI.getHistory(1, 5);
        if (!cancelled && res.data.success) {
          setRecent(res.data.data.evaluations || []);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoadingRecent(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const validateAndAccept = (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setLocalError('Please upload a PDF or image (JPG, PNG)');
      return;
    }
    if (file.size > MAX_SIZE) {
      setLocalError('File size must be less than 20 MB');
      return;
    }
    setLocalError(null);
    onFileReady(file);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndAccept(file);
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndAccept(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className={`relative overflow-hidden rounded-2xl border ${
          isDark
            ? 'bg-slate-900/80 border-slate-700/60'
            : 'bg-white border-slate-200/80 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)]'
        }`}
      >
        {/* Soft atmosphere */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className={`absolute -top-24 right-0 w-80 h-80 rounded-full blur-3xl ${
              isDark ? 'bg-blue-600/15' : 'bg-blue-400/20'
            }`}
          />
          <div
            className={`absolute bottom-0 -left-16 w-64 h-64 rounded-full blur-3xl ${
              isDark ? 'bg-sky-500/10' : 'bg-sky-300/25'
            }`}
          />
        </div>

        <div className="relative px-5 xs:px-8 sm:px-10 pt-10 pb-8 text-center">
          {/* Upload illustration */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="mx-auto mb-6 relative w-28 h-28"
          >
            <div
              className={`absolute inset-0 rounded-3xl rotate-6 ${
                isDark ? 'bg-blue-500/10' : 'bg-blue-100/80'
              }`}
            />
            <div
              className={`absolute inset-0 rounded-3xl -rotate-3 ${
                isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200 shadow-md'
              } flex items-center justify-center`}
            >
              <div className="relative">
                <FileText
                  className={`w-12 h-12 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                  strokeWidth={1.5}
                />
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                  className={`absolute -bottom-1 -right-2 p-1.5 rounded-lg ${
                    isDark ? 'bg-blue-500/30' : 'bg-blue-600'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5 text-white" />
                </motion.div>
              </div>
            </div>
          </motion.div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-3 bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            Powered by AI Examiner
          </div>

          <h2
            className={`text-2xl xs:text-3xl font-bold tracking-tight mb-3 ${
              isDark ? 'text-slate-50' : 'text-slate-900'
            }`}
          >
            AI UPSC Mains Copy Evaluation
          </h2>
          <p
            className={`text-sm xs:text-[15px] leading-relaxed max-w-xl mx-auto mb-8 ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            Upload your handwritten UPSC answer sheet (PDF or Images) and receive
            examiner-style evaluation grounded in MentorsDaily Knowledge Base —
            marks, section feedback, missing points and an improved model answer.
          </p>

          {/* Features */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-w-2xl mx-auto mb-8">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.05 }}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-xs sm:text-sm font-medium ${
                  isDark
                    ? 'bg-slate-800/60 border border-slate-700/50 text-slate-300'
                    : 'bg-slate-50 border border-slate-100 text-slate-700'
                }`}
              >
                <span
                  className={`flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center ${
                    isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
                  }`}
                >
                  <Check className="w-3 h-3" strokeWidth={3} />
                </span>
                <span className="truncate">{f.label}</span>
              </motion.div>
            ))}
          </div>

          {/* Drag & drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-8 sm:p-12 transition-all duration-300 ${
              dragOver
                ? isDark
                  ? 'border-blue-400 bg-blue-500/15 scale-[1.01]'
                  : 'border-blue-500 bg-blue-50 scale-[1.01]'
                : isDark
                  ? 'border-slate-600 bg-slate-800/40 hover:border-blue-500/50 hover:bg-slate-800/70'
                  : 'border-slate-300 bg-slate-50/80 hover:border-blue-400 hover:bg-blue-50/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              onChange={onFileChange}
            />
            <div className="flex flex-col items-center gap-3">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                  isDark ? 'bg-blue-500/20' : 'bg-blue-100'
                }`}
              >
                <Upload className={`w-7 h-7 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
              </div>
              <div>
                <p
                  className={`text-base font-semibold ${
                    isDark ? 'text-slate-200' : 'text-slate-800'
                  }`}
                >
                  Drag & Drop your answer copy here
                </p>
                <p className={`text-sm mt-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                  or click to browse files
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                {[
                  { icon: FileText, label: 'PDF' },
                  { icon: ImageIcon, label: 'JPG' },
                  { icon: ImageIcon, label: 'PNG' },
                ].map((t) => (
                  <span
                    key={t.label}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold tracking-wide ${
                      isDark
                        ? 'bg-slate-700/80 text-slate-300'
                        : 'bg-white border border-slate-200 text-slate-600'
                    }`}
                  >
                    <t.icon className="w-3 h-3" />
                    {t.label}
                  </span>
                ))}
                <span
                  className={`text-[11px] font-medium ${
                    isDark ? 'text-slate-500' : 'text-slate-500'
                  }`}
                >
                  Max 20 MB
                </span>
              </div>
            </div>
          </div>

          {localError && (
            <p className="mt-3 text-sm text-red-500 font-medium">{localError}</p>
          )}

          {onOpenModal && (
            <button
              type="button"
              className={`mt-4 text-sm font-medium ${
                isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onOpenModal();
              }}
            >
              Or set subject / paper before upload →
            </button>
          )}
        </div>
      </motion.div>

      {/* Recent Evaluations */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        className={`rounded-2xl border ${
          isDark
            ? 'bg-slate-900/60 border-slate-700/50'
            : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/60 dark:border-slate-700/50">
          <div className="flex items-center gap-2">
            <Clock className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
            <h3
              className={`text-sm font-semibold ${
                isDark ? 'text-slate-200' : 'text-slate-800'
              }`}
            >
              Recent Evaluations
            </h3>
          </div>
          {recent.length > 0 && (
            <button
              type="button"
              onClick={() => navigate('/evaluation-history')}
              className={`text-xs font-medium flex items-center gap-0.5 ${
                isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
              }`}
            >
              View all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="p-4">
          {loadingRecent ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className={`h-14 rounded-xl animate-pulse ${
                    isDark ? 'bg-slate-800' : 'bg-slate-100'
                  }`}
                />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <div className="py-8 text-center">
              <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                No evaluations yet — upload your first answer copy above.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {recent.map((item) => (
                <li key={item._id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/copy-evaluation?id=${item._id}`)}
                    className={`w-full flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl text-left transition-colors ${
                      isDark
                        ? 'hover:bg-slate-800/80 border border-transparent hover:border-slate-700'
                        : 'hover:bg-slate-50 border border-transparent hover:border-slate-200'
                    }`}
                  >
                    <div className="min-w-0 flex items-center gap-3">
                      <div
                        className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                          isDark ? 'bg-blue-500/15' : 'bg-blue-50'
                        }`}
                      >
                        <FileText
                          className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                        />
                      </div>
                      <div className="min-w-0">
                        <p
                          className={`text-sm font-medium truncate ${
                            isDark ? 'text-slate-200' : 'text-slate-800'
                          }`}
                        >
                          {item.subject}
                          {item.paper ? ` · ${item.paper}` : ''}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {new Date(item.createdAt).toLocaleDateString(undefined, {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                          {item.fileName ? ` · ${item.fileName}` : ''}
                        </p>
                      </div>
                    </div>
                    {item.overallMarks != null && item.maxMarks != null && (
                      <span
                        className={`flex-shrink-0 text-sm font-bold tabular-nums ${
                          isDark ? 'text-blue-300' : 'text-blue-700'
                        }`}
                      >
                        {item.overallMarks}/{item.maxMarks}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default CopyEvaluationEmptyState;
