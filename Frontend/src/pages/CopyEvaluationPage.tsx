import React, { useState, useEffect } from 'react';
import {
  Upload,
  History,
  Download,
} from 'lucide-react';
import { downloadCopyEvaluationReport } from '../utils/downloadCopyEvaluation';
import { copyEvaluationAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { useTheme } from '../hooks/useTheme';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CopyEvaluationLoading } from '../components/copy-evaluation/CopyEvaluationLoading';
import { CopyEvaluationResultView } from '../components/copy-evaluation/CopyEvaluationResultView';
import { CopyEvaluationUploadModal } from '../components/copy-evaluation/CopyEvaluationUploadModal';
import { CopyEvaluationEmptyState } from '../components/copy-evaluation/CopyEvaluationEmptyState';
import { QuestionEvaluationView } from '../components/QuestionEvaluationView';
import { VisionEvaluationResult } from '../types/copyEvaluation';

interface FullEvaluation {
  _id: string;
  subject: string;
  paper: string;
  year: number;
  pdfFileName: string;
  fileName?: string;
  fileType?: string;
  evaluationMode?: string;
  visionResult?: VisionEvaluationResult;
  storedPages?: { pageNumber: number; fileName: string }[];
  evaluations?: unknown[];
  finalSummary?: unknown;
  status: string;
  createdAt: string;
}

const CopyEvaluationPage: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFileName, setUploadFileName] = useState<string | undefined>();
  const [fullEvaluation, setFullEvaluation] = useState<FullEvaluation | null>(null);
  const [visionResult, setVisionResult] = useState<VisionEvaluationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvaluationId, setSelectedEvaluationId] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [dailyQuota, setDailyQuota] = useState<{
    limit: number;
    used: number;
    remaining: number;
    locked: boolean;
    unlimited?: boolean;
  } | null>(null);

  const refreshDailyQuota = async () => {
    try {
      const res = await copyEvaluationAPI.getDailyStatus();
      if (res.data.success) setDailyQuota(res.data.data);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    refreshDailyQuota();
  }, []);

  useEffect(() => {
    const evaluationId = searchParams.get('id');
    if (evaluationId) setSelectedEvaluationId(evaluationId);
  }, [searchParams]);

  useEffect(() => {
    if (selectedEvaluationId) loadEvaluation(selectedEvaluationId);
  }, [selectedEvaluationId]);

  const loadEvaluation = async (id: string) => {
    try {
      const response = await copyEvaluationAPI.getEvaluationById(id);
      if (response.data.success) {
        const data = response.data.data as FullEvaluation;
        setFullEvaluation(data);
        if (data.visionResult) {
          const vr = data.visionResult;
          if (vr.marks == null && vr.overallMarks != null) {
            vr.marks = vr.overallMarks;
          }
          setVisionResult(vr);
        } else {
          setVisionResult(null);
        }
        setError(null);
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'Failed to load evaluation');
    }
  };

  const handleUpload = async (
    file: File,
    meta: { subject: string; paper: string; year: number; language?: string }
  ) => {
    if (dailyQuota?.locked && !dailyQuota?.unlimited) {
      setError(
        `Daily limit reached (${dailyQuota.used}/${dailyQuota.limit}). Try again tomorrow.`
      );
      setShowUploadModal(true);
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    setUploadFileName(file.name);
    setError(null);
    setVisionResult(null);
    setFullEvaluation(null);
    setShowUploadModal(false);
    setPendingFile(null);

    const progressTimer = setInterval(() => {
      setUploadProgress((p) => Math.min(p + 4, 90));
    }, 2000);

    try {
      const response = await copyEvaluationAPI.uploadAndEvaluate(file, meta);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Upload failed');
      }

      const { evaluationId, visionResult: result } = response.data.data;

      if (result) {
        const normalized = result as VisionEvaluationResult;
        if (normalized.marks == null && normalized.overallMarks != null) {
          normalized.marks = normalized.overallMarks;
        }
        setUploadProgress(100);
        setVisionResult(normalized);
        setSelectedEvaluationId(evaluationId);
        setFullEvaluation({
          _id: evaluationId,
          subject: meta.subject,
          paper: meta.paper,
          year: meta.year,
          pdfFileName: file.name,
          fileName: file.name,
          fileType: file.type.startsWith('image/') ? 'image' : 'pdf',
          evaluationMode: 'vision',
          visionResult: normalized,
          storedPages: response.data.data.storedPages,
          status: 'completed',
          createdAt: new Date().toISOString(),
        });
        navigate(`/copy-evaluation?id=${evaluationId}`, { replace: true });
        window.dispatchEvent(new Event('evaluation-complete'));
        refreshDailyQuota();
      } else {
        throw new Error('No evaluation result returned from server');
      }
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { message?: string; error?: string; code?: string } };
        message?: string;
      };
      if (axiosErr.response?.data?.code === 'COPY_EVAL_DAILY_LIMIT') {
        refreshDailyQuota();
      }
      setError(
        axiosErr.response?.data?.error ||
          axiosErr.response?.data?.message ||
          axiosErr.message ||
          'Failed to evaluate copy'
      );
      setShowUploadModal(true);
    } finally {
      clearInterval(progressTimer);
      setIsUploading(false);
      setUploadProgress(0);
      setUploadFileName(undefined);
    }
  };

  /** Quick upload from empty-state dropzone — opens modal with file preselected via pending */
  const handleFileFromEmptyState = (file: File) => {
    setPendingFile(file);
    setShowUploadModal(true);
  };

  const hasResult = Boolean(visionResult || (fullEvaluation?.evaluations?.length ?? 0) > 0);
  const isLegacyResult =
    fullEvaluation?.evaluations &&
    fullEvaluation.evaluations.length > 0 &&
    !visionResult;

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-8 px-2 xs:px-3 sm:px-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1
            className={`text-xl xs:text-2xl font-bold tracking-tight ${
              theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
            }`}
          >
            Copy Evaluation
          </h1>
          <p
            className={`text-sm mt-0.5 ${
              theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            AI-powered UPSC Mains examiner — marks, feedback & model answers
            {dailyQuota && !dailyQuota.unlimited
              ? ` · Today ${dailyQuota.used}/${dailyQuota.limit}`
              : ''}
          </p>
        </div>
        {!hasResult && !isUploading && (
          <div className="flex items-center gap-2">
            {dailyQuota && !dailyQuota.unlimited && (
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                  dailyQuota.locked
                    ? theme === 'dark'
                      ? 'border-amber-500/40 text-amber-300'
                      : 'border-amber-300 text-amber-800 bg-amber-50'
                    : theme === 'dark'
                      ? 'border-emerald-500/40 text-emerald-300'
                      : 'border-emerald-300 text-emerald-800 bg-emerald-50'
                }`}
              >
                {dailyQuota.remaining} / {dailyQuota.limit} left today
              </span>
            )}
            <Button
              onClick={() => navigate('/evaluation-history')}
              variant="outline"
              size="sm"
            >
              <History className="w-4 h-4 mr-2" />
              History
            </Button>
          </div>
        )}
      </div>

      <div className="min-h-[calc(100vh-14rem)]">
        {isUploading ? (
          <CopyEvaluationLoading fileName={uploadFileName} progress={uploadProgress} />
        ) : !hasResult ? (
          <CopyEvaluationEmptyState
            onFileReady={handleFileFromEmptyState}
            onOpenModal={() => {
              if (dailyQuota?.locked && !dailyQuota?.unlimited) {
                setError(
                  `Daily limit reached (${dailyQuota.used}/${dailyQuota.limit}). Try again tomorrow.`
                );
                return;
              }
              setShowUploadModal(true);
            }}
            dailyQuota={dailyQuota}
          />
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-end flex-wrap gap-2">
              <Button
                onClick={() => navigate('/evaluation-history')}
                variant="outline"
                size="sm"
              >
                <History className="w-4 h-4 mr-1.5" />
                History
              </Button>
              {visionResult && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    downloadCopyEvaluationReport({
                      result: visionResult,
                      fileName:
                        fullEvaluation?.fileName || fullEvaluation?.pdfFileName,
                      subject: fullEvaluation?.subject,
                      paper: fullEvaluation?.paper,
                      createdAt: fullEvaluation?.createdAt,
                    })
                  }
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  Download
                </Button>
              )}
              <Button
                onClick={() => {
                  if (dailyQuota?.locked && !dailyQuota?.unlimited) {
                    setError(
                      `Daily limit reached (${dailyQuota.used}/${dailyQuota.limit}). Try again tomorrow.`
                    );
                    return;
                  }
                  setShowUploadModal(true);
                }}
                variant="outline"
                size="sm"
                disabled={Boolean(dailyQuota?.locked && !dailyQuota?.unlimited)}
              >
                <Upload className="w-4 h-4 mr-1.5" />
                New Upload
                {dailyQuota && !dailyQuota.unlimited
                  ? ` (${dailyQuota.remaining}/${dailyQuota.limit})`
                  : ''}
              </Button>
            </div>

            {error && (
              <p className="text-sm text-red-500 font-medium">{error}</p>
            )}

            {visionResult ? (
              <CopyEvaluationResultView
                result={visionResult}
                evaluationId={
                  fullEvaluation?._id || selectedEvaluationId || undefined
                }
                storedPages={fullEvaluation?.storedPages}
                subject={fullEvaluation?.subject}
                paper={fullEvaluation?.paper}
                fileName={
                  fullEvaluation?.fileName || fullEvaluation?.pdfFileName
                }
                createdAt={fullEvaluation?.createdAt}
              />
            ) : isLegacyResult && fullEvaluation?.evaluations ? (
              <Card
                className={
                  theme === 'dark'
                    ? 'bg-slate-900/80 border-slate-700'
                    : 'bg-white border-slate-200'
                }
              >
                <CardContent className="p-4">
                  <QuestionEvaluationView
                    question={
                      (fullEvaluation.evaluations as Record<string, unknown>[])[
                        selectedQuestionIndex
                      ]
                    }
                    paper={fullEvaluation.paper || 'GS'}
                  />
                </CardContent>
              </Card>
            ) : (
              <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
                No evaluation data available
              </p>
            )}
          </div>
        )}
      </div>

      <CopyEvaluationUploadModal
        open={showUploadModal}
        onClose={() => {
          if (!isUploading) {
            setShowUploadModal(false);
            setError(null);
            setPendingFile(null);
          }
        }}
        onUpload={handleUpload}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
        error={error}
        initialFile={pendingFile}
      />
    </div>
  );
};

export default CopyEvaluationPage;
