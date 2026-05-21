import React, { useCallback, useRef, useState } from 'react';
import { Upload, FileText, Image as ImageIcon, X, Sparkles } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';

const ACCEPTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

const MAX_SIZE = 15 * 1024 * 1024;

interface CopyEvaluationUploadModalProps {
  open: boolean;
  onClose: () => void;
  onUpload: (file: File, meta: { subject: string; paper: string; year: number }) => void;
  isUploading: boolean;
  uploadProgress?: number;
  error: string | null;
}

export const CopyEvaluationUploadModal: React.FC<CopyEvaluationUploadModalProps> = ({
  open,
  onClose,
  onUpload,
  isUploading,
  uploadProgress = 0,
  error,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [subject, setSubject] = useState('General Studies');
  const [paper, setPaper] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndSetFile = (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setLocalError('Please select a PDF or image (JPEG, PNG, WebP)');
      return;
    }
    if (file.size > MAX_SIZE) {
      setLocalError('File size must be less than 15MB');
      return;
    }
    setSelectedFile(file);
    setLocalError(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSetFile(file);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndSetFile(file);
  }, []);

  const handleSubmit = () => {
    if (!selectedFile) {
      setLocalError('Please select a file first');
      return;
    }
    onUpload(selectedFile, { subject, paper, year });
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!open) return null;

  const displayError = localError || error;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card
        className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl ${
          isDark
            ? 'bg-gradient-to-br from-slate-950/95 to-slate-900/95 border-purple-900/50'
            : 'bg-white border-slate-200'
        }`}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-xl font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              Upload Answer Copy
            </h2>
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100'}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className={`block font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Handwritten Answer (PDF or Image)
              </label>

              {selectedFile ? (
                <div
                  className={`p-4 rounded-xl border flex items-center justify-between ${
                    isDark ? 'bg-slate-800/80 border-slate-700/50' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {selectedFile.type.startsWith('image/') ? (
                      <ImageIcon className="w-6 h-6 text-fuchsia-400 flex-shrink-0" />
                    ) : (
                      <FileText className="w-6 h-6 text-purple-600 flex-shrink-0" />
                    )}
                    <span className={`text-sm truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      {selectedFile.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={clearFile}
                    disabled={isUploading}
                    className="p-2 rounded-lg hover:bg-slate-700/50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                    dragOver
                      ? isDark
                        ? 'border-fuchsia-500 bg-fuchsia-500/10'
                        : 'border-purple-500 bg-purple-50'
                      : isDark
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
                      className={`w-10 h-10 mx-auto mb-3 ${
                        isDark ? 'text-fuchsia-400' : 'text-purple-600'
                      }`}
                    />
                    <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Drag & drop or click to upload
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      PDF or photo · Multi-page PDF supported · Max 15MB
                    </p>
                  </label>
                </div>
              )}
            </div>

            {isUploading && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Uploading & evaluating</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                  <div
                    className="h-full bg-gradient-to-r from-fuchsia-500 to-emerald-400 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-medium mb-2 text-sm">Subject</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={isUploading}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300'
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
                  disabled={isUploading}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300'
                  }`}
                />
              </div>
              <div>
                <label className="block font-medium mb-2 text-sm">Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value, 10))}
                  disabled={isUploading}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300'
                  }`}
                />
              </div>
            </div>

            {displayError && (
              <div
                className={`p-3 rounded-xl border text-sm ${
                  isDark
                    ? 'bg-red-900/20 border-red-700/50 text-red-300'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                {displayError}
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={!selectedFile || isUploading}
              className="w-full bg-gradient-to-r from-fuchsia-500 to-emerald-400 text-white disabled:opacity-50"
            >
              {isUploading ? (
                'Evaluating with Vision AI...'
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Start Premium Evaluation
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CopyEvaluationUploadModal;
