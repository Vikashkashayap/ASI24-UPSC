import React, { useState, useEffect, useRef } from 'react';
import { X, FileText, Download, Eye, EyeOff } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { useTheme } from '../hooks/useTheme';

interface StreamingTextViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  evaluationId: string;
  pdfFileName: string;
  rawText?: string;
  confidenceScore?: number;
}

const StreamingTextViewModal: React.FC<StreamingTextViewModalProps> = ({
  isOpen,
  onClose,
  evaluationId,
  pdfFileName,
  rawText,
  confidenceScore = 1.0
}) => {
  const { theme } = useTheme();
  const [displayedText, setDisplayedText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [streamSpeed, setStreamSpeed] = useState(30); // Characters per interval
  const [showHighlights, setShowHighlights] = useState(true);
  const textContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (rawText) {
        startStreaming(rawText);
      } else {
        // Fetch text if not provided
        fetchText();
      }
    } else {
      // Reset when modal closes
      setDisplayedText('');
      setIsStreaming(false);
      setIsComplete(false);
    }
  }, [isOpen]);

  const fetchText = async () => {
    try {
      const { copyEvaluationAPI } = await import('../services/api');
      const response = await copyEvaluationAPI.getEvaluationById(evaluationId, true); // Include raw text
      
      if (response.data.success && response.data.data.rawText) {
        startStreaming(response.data.data.rawText);
      } else {
        // Fallback: try to get text from extracted answers
        const response2 = await copyEvaluationAPI.getEvaluationById(evaluationId);
        if (response2.data.success && response2.data.data.extractedAnswers) {
          const allText = response2.data.data.extractedAnswers
            .map((ans: any) => ans.answerText || '')
            .join('\n\n---\n\n');
          if (allText) {
            startStreaming(allText);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch text:', error);
    }
  };

  const startStreaming = (text: string) => {
    setDisplayedText('');
    setIsStreaming(true);
    setIsComplete(false);

    let currentIndex = 0;
    const textLength = text.length;

    const streamInterval = setInterval(() => {
      if (currentIndex < textLength) {
        const nextChunk = text.substring(0, currentIndex + streamSpeed);
        setDisplayedText(nextChunk);
        currentIndex += streamSpeed;

        // Auto-scroll to bottom
        if (textContainerRef.current) {
          textContainerRef.current.scrollTop = textContainerRef.current.scrollHeight;
        }
      } else {
        setDisplayedText(text);
        setIsStreaming(false);
        setIsComplete(true);
        clearInterval(streamInterval);
      }
    }, 50); // Update every 50ms for smooth streaming

    return () => clearInterval(streamInterval);
  };

  const handleSpeedChange = (speed: number) => {
    setStreamSpeed(speed);
    if (isStreaming && rawText) {
      // Restart streaming with new speed
      startStreaming(rawText);
    }
  };

  const handleDownload = () => {
    if (displayedText) {
      const blob = new Blob([displayedText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${pdfFileName.replace('.pdf', '')}_extracted_text.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`relative w-full h-full md:w-[90%] md:h-[90%] md:max-w-6xl md:max-h-[90vh] flex flex-col ${
        theme === "dark" ? "bg-slate-900" : "bg-white"
      } rounded-lg shadow-2xl overflow-hidden`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${
          theme === "dark" ? "border-slate-700" : "border-slate-200"
        }`}>
          <div className="flex items-center gap-3">
            <FileText className={`w-5 h-5 ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`} />
            <div>
              <h2 className={`text-lg font-semibold ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>
                {pdfFileName}
              </h2>
              <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                Extracted Text {isComplete ? '(Complete)' : isStreaming ? '(Streaming...)' : '(Ready)'}
                {confidenceScore < 1.0 && (
                  <span className={`ml-2 ${confidenceScore < 0.7 ? "text-red-600" : "text-yellow-600"}`}>
                    • Confidence: {(confidenceScore * 100).toFixed(1)}%
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Speed Control */}
            {isStreaming && (
              <div className="flex items-center gap-2 mr-4">
                <span className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>Speed:</span>
                <select
                  value={streamSpeed}
                  onChange={(e) => handleSpeedChange(Number(e.target.value))}
                  className={`text-xs px-2 py-1 rounded border ${
                    theme === "dark" ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-white border-slate-300"
                  }`}
                >
                  <option value={10}>Slow</option>
                  <option value={30}>Normal</option>
                  <option value={50}>Fast</option>
                  <option value={100}>Very Fast</option>
                </select>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={!displayedText}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="gap-2"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Text Display */}
          <div
            ref={textContainerRef}
            className={`flex-1 overflow-y-auto p-6 ${
              theme === "dark" ? "bg-slate-950" : "bg-slate-50"
            }`}
          >
            <Card className="h-full">
              <CardContent className="p-6 h-full">
                <div className={`font-mono text-sm leading-relaxed whitespace-pre-wrap ${
                  theme === "dark" ? "text-slate-200" : "text-slate-900"
                }`}>
                  {displayedText || (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className={`animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4 ${
                          theme === "dark" ? "border-purple-600" : "border-purple-600"
                        }`}></div>
                        <p className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>
                          Preparing text extraction...
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Streaming cursor */}
                  {isStreaming && (
                    <span className={`inline-block w-2 h-5 ml-1 animate-pulse ${
                      theme === "dark" ? "bg-purple-500" : "bg-purple-600"
                    }`}></span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Footer Stats */}
          <div className={`p-4 border-t flex items-center justify-between ${
            theme === "dark" ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-slate-100"
          }`}>
            <div className="flex items-center gap-4 text-xs">
              <span className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>
                Characters: {displayedText.length.toLocaleString()}
              </span>
              <span className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>
                Words: {displayedText.split(/\s+/).filter(Boolean).length.toLocaleString()}
              </span>
              {isStreaming && (
                <span className={`font-semibold ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`}>
                  Streaming... {((displayedText.length / (rawText?.length || 1)) * 100).toFixed(1)}%
                </span>
              )}
            </div>

            {isComplete && (
              <Button
                onClick={onClose}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              >
                Continue to Evaluation
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StreamingTextViewModal;

