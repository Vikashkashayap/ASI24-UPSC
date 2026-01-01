import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useTheme } from '../hooks/useTheme';

// Set up PDF.js worker - use jsdelivr CDN (most reliable)
if (typeof window !== 'undefined') {
  const workerVersion = pdfjs.version;
  // Use .js extension (works for most versions)
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${workerVersion}/build/pdf.worker.min.js`;
}

interface Annotation {
  page: number;
  issue_type: 'content' | 'structure' | 'language';
  severity: 'high' | 'medium' | 'low';
  highlight_text: string;
  comment: string;
  suggestion: string;
}

interface PDFViewerProps {
  pdfUrl: string;
  annotations: Annotation[];
  onAnnotationClick?: (annotation: Annotation) => void;
  selectedAnnotation?: Annotation | null;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  pdfUrl,
  annotations,
  onAnnotationClick,
  selectedAnnotation
}) => {
  const { theme } = useTheme();
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [textLayers, setTextLayers] = useState<Map<number, HTMLElement>>(new Map());
  const [pdfFile, setPdfFile] = useState<string | ArrayBuffer | null>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Fetch PDF as blob to avoid URL.parse issue
  useEffect(() => {
    if (!pdfUrl) return;

    const fetchPdf = async () => {
      try {
        // Get auth token from localStorage (same as API service)
        const stored = localStorage.getItem("upsc_mentor_auth");
        let authToken = '';
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as { token: string };
            if (parsed.token) {
              authToken = parsed.token;
            }
          } catch (e) {
            console.warn('Failed to parse auth token:', e);
          }
        }

        // Fetch PDF with authentication header
        const headers: HeadersInit = {};
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch(pdfUrl, {
          headers,
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Unauthorized: Please log in again');
          }
          throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        setPdfFile(arrayBuffer);
      } catch (error) {
        console.error('Error loading PDF:', error);
        setPdfFile(null);
      }
    };

    fetchPdf();
  }, [pdfUrl]);

  useEffect(() => {
    // Highlight text when annotations or selectedAnnotation changes
    highlightAnnotations();
  }, [annotations, selectedAnnotation, textLayers, pageNumber]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const highlightAnnotations = () => {
    // Clear previous highlights
    textLayers.forEach((layer) => {
      if (layer) {
        const highlights = layer.querySelectorAll('.pdf-highlight');
        highlights.forEach((el) => el.remove());
      }
    });

    // Get annotations for current page
    const pageAnnotations = annotations.filter((ann) => ann.page === pageNumber);

    pageAnnotations.forEach((annotation) => {
      const textLayer = textLayers.get(pageNumber);
      if (!textLayer) return;

      const searchText = annotation.highlight_text.trim();
      if (!searchText) return;

      // Find text spans in the PDF text layer
      const textSpans = textLayer.querySelectorAll('span[role="presentation"]');
      
      let foundText = '';
      let startSpan: Element | null = null;
      let endSpan: Element | null = null;

      // Try to find the text in spans
      for (let i = 0; i < textSpans.length; i++) {
        const span = textSpans[i];
        const spanText = span.textContent || '';
        foundText += spanText;

        if (!startSpan && foundText.includes(searchText.substring(0, Math.min(10, searchText.length)))) {
          startSpan = span;
        }

        if (foundText.includes(searchText)) {
          endSpan = span;
          break;
        }

        // Reset if text gets too long
        if (foundText.length > searchText.length * 2) {
          foundText = spanText;
        }
      }

      // If exact match not found, try fuzzy matching
      if (!startSpan || !endSpan) {
        const allText = Array.from(textSpans).map(s => s.textContent || '').join('');
        const searchLower = searchText.toLowerCase();
        const allTextLower = allText.toLowerCase();
        const index = allTextLower.indexOf(searchLower);

        if (index !== -1) {
          let charCount = 0;
          for (let i = 0; i < textSpans.length; i++) {
            const span = textSpans[i];
            const spanText = span.textContent || '';
            const spanLength = spanText.length;

            if (charCount <= index && charCount + spanLength > index) {
              startSpan = span;
            }
            if (charCount <= index + searchText.length && charCount + spanLength > index + searchText.length) {
              endSpan = span;
              break;
            }
            charCount += spanLength;
          }
        }
      }

      // Create highlight overlay
      if (startSpan && endSpan) {
        const highlight = document.createElement('div');
        highlight.className = `pdf-highlight pdf-highlight-${annotation.severity}`;
        highlight.style.cssText = `
          position: absolute;
          background-color: ${
            annotation.severity === 'high' 
              ? 'rgba(239, 68, 68, 0.3)' 
              : annotation.severity === 'medium'
              ? 'rgba(251, 191, 36, 0.3)'
              : 'rgba(34, 197, 94, 0.3)'
          };
          border-bottom: 2px solid ${
            annotation.severity === 'high'
              ? 'rgb(239, 68, 68)'
              : annotation.severity === 'medium'
              ? 'rgb(251, 191, 36)'
              : 'rgb(34, 197, 94)'
          };
          cursor: pointer;
          z-index: 10;
        `;

        // Get bounding boxes
        const startRect = startSpan.getBoundingClientRect();
        const endRect = endSpan.getBoundingClientRect();
        const pageRect = textLayer.getBoundingClientRect();

        highlight.style.left = `${startRect.left - pageRect.left}px`;
        highlight.style.top = `${startRect.top - pageRect.top}px`;
        highlight.style.width = `${endRect.right - startRect.left}px`;
        highlight.style.height = `${startRect.height}px`;

        highlight.onclick = () => {
          if (onAnnotationClick) {
            onAnnotationClick(annotation);
          }
        };

        // Add hover effect
        highlight.onmouseenter = () => {
          highlight.style.backgroundColor = annotation.severity === 'high'
            ? 'rgba(239, 68, 68, 0.5)'
            : annotation.severity === 'medium'
            ? 'rgba(251, 191, 36, 0.5)'
            : 'rgba(34, 197, 94, 0.5)';
        };
        highlight.onmouseleave = () => {
          highlight.style.backgroundColor = annotation.severity === 'high'
            ? 'rgba(239, 68, 68, 0.3)'
            : annotation.severity === 'medium'
            ? 'rgba(251, 191, 36, 0.3)'
            : 'rgba(34, 197, 94, 0.3)';
        };

        textLayer.appendChild(highlight);
      }
    });
  };

  const onPageLoadSuccess = (page: any) => {
    // Wait for text layer to render
    setTimeout(() => {
      const pageElement = pageRefs.current.get(pageNumber);
      if (pageElement) {
        const textLayer = pageElement.querySelector('.react-pdf__Page__textContent');
        if (textLayer) {
          setTextLayers((prev) => {
            const newMap = new Map(prev);
            newMap.set(pageNumber, textLayer as HTMLElement);
            return newMap;
          });
        }
      }
    }, 500);
  };

  return (
    <div className={`flex flex-col h-full ${theme === "dark" ? "bg-slate-900" : "bg-slate-50"}`}>
      {/* PDF Controls */}
      <div className={`flex items-center justify-between p-3 border-b ${theme === "dark" ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white"}`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPageNumber((prev) => Math.max(1, prev - 1))}
            disabled={pageNumber <= 1}
            className={`px-3 py-1 rounded text-sm ${
              theme === "dark"
                ? "bg-slate-700 text-slate-200 disabled:opacity-50"
                : "bg-slate-100 text-slate-700 disabled:opacity-50"
            }`}
          >
            Previous
          </button>
          <span className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
            Page {pageNumber} of {numPages}
          </span>
          <button
            onClick={() => setPageNumber((prev) => Math.min(numPages, prev + 1))}
            disabled={pageNumber >= numPages}
            className={`px-3 py-1 rounded text-sm ${
              theme === "dark"
                ? "bg-slate-700 text-slate-200 disabled:opacity-50"
                : "bg-slate-100 text-slate-700 disabled:opacity-50"
            }`}
          >
            Next
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScale((prev) => Math.max(0.5, prev - 0.2))}
            className={`px-2 py-1 rounded text-sm ${theme === "dark" ? "bg-slate-700 text-slate-200" : "bg-slate-100 text-slate-700"}`}
          >
            −
          </button>
          <span className={`text-sm w-16 text-center ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale((prev) => Math.min(2, prev + 0.2))}
            className={`px-2 py-1 rounded text-sm ${theme === "dark" ? "bg-slate-700 text-slate-200" : "bg-slate-100 text-slate-700"}`}
          >
            +
          </button>
        </div>
      </div>

      {/* PDF Document */}
      <div className="flex-1 overflow-auto p-4">
        <div className="flex justify-center">
          {!pdfFile ? (
            <div className={`text-center p-8 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
              Loading PDF...
            </div>
          ) : (
            <Document
              file={pdfFile}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className={`text-center p-8 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                  Loading PDF...
                </div>
              }
              error={
                <div className={`text-center p-8 ${theme === "dark" ? "text-red-400" : "text-red-600"}`}>
                  Failed to load PDF
                </div>
              }
            >
            <div
              ref={(el) => {
                if (el) pageRefs.current.set(pageNumber, el);
              }}
              className="relative"
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                onLoadSuccess={onPageLoadSuccess}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="shadow-lg"
              />
            </div>
          </Document>
          )}
        </div>
      </div>
    </div>
  );
};

export default PDFViewer;

