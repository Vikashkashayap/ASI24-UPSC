/**
 * PDF Viewer using react-pdf - renders PDF exactly as-is
 * Supports Hindi + English via cMapUrl
 */
import React, { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Polyfill URL.parse (react-pdf uses it; older browsers may not support it)
if (typeof URL !== "undefined" && !URL.parse) {
  (URL as URL & { parse?(u: string): URL | null }).parse = function (u: string) {
    try {
      return new URL(u);
    } catch {
      return null;
    }
  };
}

// Configure worker for PDF.js (required for react-pdf)
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Memoize options outside component to avoid unnecessary Document reloads
const PDF_OPTIONS = {
  cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
};

interface PdfViewerProps {
  url: string;
  className?: string;
  width?: number;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ url, className = "", width }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  const onDocumentLoadError = (err: Error) => {
    setError(err.message || "Failed to load PDF");
    setLoading(false);
  };

  if (!url) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] bg-slate-100 dark:bg-slate-800 rounded-lg ${className}`}>
        <p className="text-slate-500">No PDF available</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="overflow-auto flex-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-2 min-h-[500px]">
        {loading && (
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center min-h-[400px] text-red-600">
            {error}
          </div>
        )}
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={null}
          options={PDF_OPTIONS}
        >
          {!loading && !error && (
            <Page
              pageNumber={pageNumber}
              width={width ?? undefined}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              className="mx-auto"
            />
          )}
        </Document>
      </div>
      {numPages > 1 && !error && (
        <div className="flex items-center justify-center gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm">
            Page {pageNumber} of {numPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
            disabled={pageNumber >= numPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
