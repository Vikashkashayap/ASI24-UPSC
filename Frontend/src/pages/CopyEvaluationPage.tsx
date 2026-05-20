import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  FileText,
  X,
  Sparkles,
  History,
  Image as ImageIcon,
  Download,
} from 'lucide-react';
import { downloadCopyEvaluationReport } from '../utils/downloadCopyEvaluation';
import { copyEvaluationAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useTheme } from '../hooks/useTheme';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CopyEvaluationLoading } from '../components/copy-evaluation/CopyEvaluationLoading';
import {
  CopyEvaluationResultView,
  VisionEvaluationResult,
} from '../components/copy-evaluation/CopyEvaluationResultView';
import { QuestionEvaluationView } from '../components/QuestionEvaluationView';

const ACCEPTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [subject, setSubject] = useState('General Studies');
  const [paper, setPaper] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [isUploading, setIsUploading] = useState(false);
  const [fullEvaluation, setFullEvaluation] = useState<FullEvaluation | null>(null);
  const [visionResult, setVisionResult] = useState<VisionEvaluationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvaluationId, setSelectedEvaluationId] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const evaluationId = searchParams.get('id');
    if (evaluationId) {
      setSelectedEvaluationId(evaluationId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedEvaluationId) {
      loadEvaluation(selectedEvaluationId);
    }
  }, [selectedEvaluationId]);

  const loadEvaluation = async (id: string) => {
    try {
      const response = await copyEvaluationAPI.getEvaluationById(id);
      if (response.data.success) {
        const data = response.data.data as FullEvaluation;
        setFullEvaluation(data);
        if (data.visionResult) {
          setVisionResult(data.visionResult);
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError('Please select a PDF or image file (JPEG, PNG, WebP)');
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        setError('File size must be less than 15MB');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    setIsUploading(true);
    setError(null);
    setVisionResult(null);
    setFullEvaluation(null);

    try {
      const response = await copyEvaluationAPI.uploadAndEvaluate(selectedFile, {
        subject,
        paper,
        year,
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Upload failed');
      }

      const { evaluationId, visionResult: result } = response.data.data;

      if (result) {
        setVisionResult(result);
        setSelectedEvaluationId(evaluationId);
        setFullEvaluation({
          _id: evaluationId,
          subject,
          paper,
          year,
          pdfFileName: selectedFile.name,
          fileName: selectedFile.name,
          fileType: selectedFile.type.startsWith('image/') ? 'image' : 'pdf',
          evaluationMode: 'vision',
          visionResult: result,
          storedPages: response.data.data.storedPages,
          status: 'completed',
          createdAt: new Date().toISOString(),
        });
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setShowUploadModal(false);
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
    } finally {
      setIsUploading(false);
    }
  };

  const hasResult = Boolean(visionResult || (fullEvaluation?.evaluations?.length ?? 0) > 0);
  const isLegacyResult =
    fullEvaluation?.evaluations &&
    fullEvaluation.evaluations.length > 0 &&
    !visionResult;

  return (
    <div className="max-w-7xl mx-auto space-y-4 xs:space-y-5 md:space-y-6 pb-8 px-2 xs:px-3 sm:px-4">
      {/* Header */}
      <div
        className={`relative overflow-hidden rounded-2xl p-4 xs:p-6 md:p-8 mb-6 border-2 transition-all duration-300 ${
          theme === 'dark'
            ? 'bg-gradient-to-br from-slate-800/90 via-purple-900/20 to-slate-900/90 border-purple-500/20 shadow-xl shadow-purple-500/10'
            : 'bg-gradient-to-br from-white via-purple-50/30 to-white border-purple-200/50 shadow-xl shadow-purple-100/30'
        }`}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col gap-2">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl ${
                  theme === 'dark' ? 'bg-purple-500/20' : 'bg-purple-100'
                }`}
              >
                <FileText
                  className={`w-6 h-6 ${
                    theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                  }`}
                />
              </div>
              <div>
                <h1
                  className={`text-xl xs:text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r ${
                    theme === 'dark'
                      ? 'from-purple-200 via-purple-300 to-purple-400 bg-clip-text text-transparent'
                      : 'from-purple-600 via-purple-700 to-purple-800 bg-clip-text text-transparent'
                  }`}
                >
                  Copy Evaluation
                </h1>
                <p
                  className={`text-xs md:text-sm mt-0.5 ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                  }`}
                >
                  Upload handwritten answer copy (PDF or image) for AI vision evaluation
                </p>
              </div>
            </div>
            {!hasResult && (
              <Button
                onClick={() => navigate('/evaluation-history')}
                className="bg-gradient-to-r from-fuchsia-500 to-emerald-400 hover:from-fuchsia-400 hover:to-emerald-300 text-white"
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
          <CopyEvaluationLoading fileName={selectedFile?.name} />
        ) : !hasResult ? (
          <Card
            className={`h-full min-h-[400px] ${
              theme === 'dark'
                ? 'bg-gradient-to-br from-slate-950/90 via-slate-900/90 to-slate-950/90 border-purple-900/50'
                : 'bg-white border-slate-200'
            } shadow-xl`}
          >
            <CardContent className="p-8 text-center flex items-center justify-center h-full min-h-[400px]">
              <div className="max-w-md">
                <div
                  className={`p-6 rounded-full mx-auto mb-6 w-fit ${
                    theme === 'dark' ? 'bg-fuchsia-500/10' : 'bg-purple-100'
                  }`}
                >
                  <FileText
                    className={`w-16 h-16 mx-auto ${
                      theme === 'dark' ? 'text-fuchsia-400' : 'text-purple-600'
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
                  Upload your handwritten UPSC answer copy as PDF or photo for examiner-style AI feedback
                </p>
                <Button
                  onClick={() => setShowUploadModal(true)}
                  className="bg-gradient-to-r from-fuchsia-500 to-emerald-400 hover:from-fuchsia-400 hover:to-emerald-300 text-white"
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
                ? 'bg-gradient-to-br from-slate-950/90 via-slate-900/90 to-slate-950/90 border-purple-900/50'
                : 'bg-white border-slate-200'
            }`}
          >
            <CardHeader className="border-b flex-shrink-0">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle
                  className={theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}
                >
                  Your Evaluation Result
                </CardTitle>
                <div className="flex flex-wrap gap-2">
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
                  <Button
                    onClick={() => setShowUploadModal(true)}
                    variant="outline"
                    size="sm"
                  >
                    <Upload className="w-4 h-4 mr-1.5" />
                    New Upload
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 xs:p-6 overflow-y-auto max-h-[calc(100vh-16rem)] custom-scrollbar">
              {visionResult ? (
                <CopyEvaluationResultView
                  result={visionResult}
                  evaluationId={fullEvaluation?._id || selectedEvaluationId || undefined}
                  storedPages={fullEvaluation?.storedPages}
                  subject={fullEvaluation?.subject}
                  paper={fullEvaluation?.paper}
                  fileName={fullEvaluation?.fileName || fullEvaluation?.pdfFileName}
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

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card
            className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl ${
              theme === 'dark'
                ? 'bg-gradient-to-br from-slate-950/95 to-slate-900/95 border-purple-900/50'
                : 'bg-white border-slate-200'
            }`}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2
                  className={`text-xl font-bold ${
                    theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
                  }`}
                >
                  Upload Answer Copy
                </h2>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setError(null);
                  }}
                  className={`p-2 rounded-lg ${
                    theme === 'dark' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label
                    className={`block font-medium mb-2 ${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    Answer Copy (PDF or Image)
                  </label>
                  {selectedFile ? (
                    <div
                      className={`p-4 rounded-xl border flex items-center justify-between ${
                        theme === 'dark'
                          ? 'bg-slate-800/80 border-slate-700/50'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {selectedFile.type.startsWith('image/') ? (
                          <ImageIcon className="w-6 h-6 text-fuchsia-400 flex-shrink-0" />
                        ) : (
                          <FileText className="w-6 h-6 text-purple-600 flex-shrink-0" />
                        )}
                        <span
                          className={`text-sm truncate ${
                            theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                          }`}
                        >
                          {selectedFile.name}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="p-2 rounded-lg hover:bg-slate-700/50"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      className={`border-2 border-dashed rounded-xl p-8 text-center ${
                        theme === 'dark'
                          ? 'border-slate-700/50 bg-slate-800/30 hover:border-fuchsia-500/50'
                          : 'border-slate-300 bg-slate-50/50 hover:border-purple-400'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf,image/jpeg,image/png,image/webp"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="copy-upload-input"
                      />
                      <label htmlFor="copy-upload-input" className="cursor-pointer block">
                        <Upload
                          className={`w-8 h-8 mx-auto mb-3 ${
                            theme === 'dark' ? 'text-fuchsia-400' : 'text-purple-600'
                          }`}
                        />
                        <p
                          className={`text-sm font-medium ${
                            theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                          }`}
                        >
                          PDF or photo of handwritten answer
                        </p>
                        <p className="text-xs text-slate-500 mt-1">Max 15MB · JPEG, PNG, WebP, PDF</p>
                      </label>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-medium mb-2 text-sm">Subject</label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        theme === 'dark'
                          ? 'bg-slate-800 border-slate-700 text-slate-200'
                          : 'bg-white border-slate-300'
                      }`}
                    >
                      <option>General Studies</option>
                      <option>Essay</option>
                      <option>Optional Subject</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium mb-2 text-sm">Paper</label>
                    <input
                      type="text"
                      value={paper}
                      onChange={(e) => setPaper(e.target.value)}
                      placeholder="e.g., GS Paper 2"
                      className={`w-full px-4 py-2 rounded-lg border ${
                        theme === 'dark'
                          ? 'bg-slate-800 border-slate-700 text-slate-200'
                          : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-2 text-sm">Year</label>
                    <input
                      type="number"
                      value={year}
                      onChange={(e) => setYear(parseInt(e.target.value, 10))}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        theme === 'dark'
                          ? 'bg-slate-800 border-slate-700 text-slate-200'
                          : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>
                </div>

                {error && (
                  <div
                    className={`p-3 rounded-xl border text-sm ${
                      theme === 'dark'
                        ? 'bg-red-900/20 border-red-700/50 text-red-300'
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}
                  >
                    {error}
                  </div>
                )}

                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || isUploading}
                  className="w-full bg-gradient-to-r from-fuchsia-500 to-emerald-400 text-white disabled:opacity-50"
                >
                  {isUploading ? (
                    <>Evaluating...</>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Start AI Evaluation
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CopyEvaluationPage;
