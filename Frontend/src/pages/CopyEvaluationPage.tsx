import React, { useState, useEffect } from 'react';
import {
  Upload,
  FileText,
  History,
  Download,
} from 'lucide-react';
import { downloadCopyEvaluationReport } from '../utils/downloadCopyEvaluation';
import { copyEvaluationAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { useTheme } from '../hooks/useTheme';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CopyEvaluationLoading } from '../components/copy-evaluation/CopyEvaluationLoading';
import { CopyEvaluationResultView } from '../components/copy-evaluation/CopyEvaluationResultView';
import { CopyEvaluationUploadModal } from '../components/copy-evaluation/CopyEvaluationUploadModal';
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
    meta: { subject: string; paper: string; year: number }
  ) => {
    setIsUploading(true);
    setUploadProgress(10);
    setUploadFileName(file.name);
    setError(null);
    setVisionResult(null);
    setFullEvaluation(null);
    setShowUploadModal(false);

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
      } else {
        throw new Error('No evaluation result returned from server');
      }
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { message?: string; error?: string } };
        message?: string;
      };
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

  const hasResult = Boolean(visionResult || (fullEvaluation?.evaluations?.length ?? 0) > 0);
  const isLegacyResult =
    fullEvaluation?.evaluations &&
    fullEvaluation.evaluations.length > 0 &&
    !visionResult;

  return (
    <div className="max-w-7xl mx-auto space-y-4 xs:space-y-5 md:space-y-6 pb-8 px-2 xs:px-3 sm:px-4">
      <div
        className={`relative overflow-hidden rounded-2xl p-4 xs:p-6 md:p-8 mb-6 border-2 transition-all duration-300 ${
          theme === 'dark'
            ? 'bg-gradient-to-br from-slate-800/90 via-blue-900/20 to-slate-900/90 border-blue-500/20 shadow-xl shadow-blue-500/10'
            : 'bg-gradient-to-br from-white via-blue-50/30 to-white border-blue-200/50 shadow-xl shadow-blue-100/30'
        }`}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col gap-2">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-100'}`}
              >
                <FileText
                  className={`w-6 h-6 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}
                />
              </div>
              <div>
                <h1
                  className={`text-xl xs:text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r ${
                    theme === 'dark'
                      ? 'from-blue-200 via-blue-300 to-blue-400 bg-clip-text text-transparent'
                      : 'from-blue-600 via-blue-700 to-blue-800 bg-clip-text text-transparent'
                  }`}
                >
                  Copy Evaluation
                </h1>
                <p
                  className={`text-xs md:text-sm mt-0.5 ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                  }`}
                >
                  Premium examiner-style AI evaluation — vision reads your handwriting directly
                </p>
              </div>
            </div>
            {!hasResult && !isUploading && (
              <Button
                onClick={() => navigate('/evaluation-history')}
                className="bg-gradient-to-r from-indigo-500 to-emerald-400 hover:from-indigo-400 hover:to-emerald-300 text-white"
              >
                <History className="w-4 h-4 mr-2" />
                History
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="min-h-[calc(100vh-14rem)]">
        {isUploading ? (
          <CopyEvaluationLoading fileName={uploadFileName} progress={uploadProgress} />
        ) : !hasResult ? (
          <Card
            className={`h-full min-h-[400px] ${
              theme === 'dark'
                ? 'bg-gradient-to-br from-slate-950/90 via-slate-900/90 to-slate-950/90 border-blue-900/50'
                : 'bg-white border-slate-200'
            } shadow-xl`}
          >
            <CardContent className="p-8 text-center flex items-center justify-center h-full min-h-[400px]">
              <div className="max-w-md">
                <div
                  className={`p-6 rounded-full mx-auto mb-6 w-fit ${
                    theme === 'dark' ? 'bg-indigo-500/10' : 'bg-blue-100'
                  }`}
                >
                  <FileText
                    className={`w-16 h-16 mx-auto ${
                      theme === 'dark' ? 'text-indigo-400' : 'text-blue-600'
                    }`}
                  />
                </div>
                <h2
                  className={`text-xl font-bold mb-2 ${
                    theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
                  }`}
                >
                  No Answer Copy Evaluated Yet
                </h2>
                <p
                  className={`text-sm mb-8 ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                  }`}
                >
                  Upload handwritten UPSC mains answers for section-wise examiner feedback, scores, and model answer guidance
                </p>
                <Button
                  onClick={() => setShowUploadModal(true)}
                  className="bg-gradient-to-r from-indigo-500 to-emerald-400 hover:from-indigo-400 hover:to-emerald-300 text-white"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Answer Copy
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card
            className={`shadow-xl ${
              theme === 'dark'
                ? 'bg-gradient-to-br from-slate-950/90 via-slate-900/90 to-slate-950/90 border-blue-900/50'
                : 'bg-white border-slate-200'
            }`}
          >
            <CardHeader className="border-b flex-shrink-0 py-3">
              <div className="flex items-center justify-end flex-wrap gap-2">
                  <Button onClick={() => navigate('/evaluation-history')} variant="outline" size="sm">
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
                          fileName: fullEvaluation?.fileName || fullEvaluation?.pdfFileName,
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
                  <Button onClick={() => setShowUploadModal(true)} variant="outline" size="sm">
                    <Upload className="w-4 h-4 mr-1.5" />
                    New Upload
                  </Button>
              </div>
            </CardHeader>
            <CardContent className="p-3 xs:p-5 overflow-y-auto max-h-[calc(100vh-14rem)] custom-scrollbar bg-transparent">
              {visionResult ? (
                <CopyEvaluationResultView
                  result={visionResult}
                  evaluationId={fullEvaluation?._id || selectedEvaluationId || undefined}
                  storedPages={fullEvaluation?.storedPages}
                  subject={fullEvaluation?.subject}
                  paper={fullEvaluation?.paper}
                  fileName={
                    fullEvaluation?.fileName || fullEvaluation?.pdfFileName
                  }
                  onDownload={() =>
                    downloadCopyEvaluationReport({
                      result: visionResult,
                      fileName: fullEvaluation?.fileName || fullEvaluation?.pdfFileName,
                      subject: fullEvaluation?.subject,
                      paper: fullEvaluation?.paper,
                      createdAt: fullEvaluation?.createdAt,
                    })
                  }
                />
              ) : isLegacyResult && fullEvaluation?.evaluations ? (
                <QuestionEvaluationView
                  question={
                    (fullEvaluation.evaluations as Record<string, unknown>[])[
                      selectedQuestionIndex
                    ]
                  }
                  paper={fullEvaluation.paper || 'GS'}
                />
              ) : (
                <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
                  No evaluation data available
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <CopyEvaluationUploadModal
        open={showUploadModal}
        onClose={() => {
          if (!isUploading) {
            setShowUploadModal(false);
            setError(null);
          }
        }}
        onUpload={handleUpload}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
        error={error}
      />
    </div>
  );
};

export default CopyEvaluationPage;
