import React from "react";
import upscLogo from "../../LOGO/UPSCRH-LOGO.png";

interface UpscExamPaperShellProps {
  questionNumber: number;
  examType?: "GS" | "CSAT";
  topic?: string;
  totalMarks?: number;
  durationMinutes?: number;
  children: React.ReactNode;
}

function paperTitle(examType?: "GS" | "CSAT"): { hi: string; en: string } {
  if (examType === "CSAT") {
    return {
      hi: "सामान्य अध्ययन (CSAT) — पेपर-II",
      en: "GENERAL STUDIES (CSAT) — Paper-II",
    };
  }
  return {
    hi: "सामान्य अध्ययन — पेपर-I",
    en: "GENERAL STUDIES — Paper-I",
  };
}

export const UpscExamPaperShell: React.FC<UpscExamPaperShellProps> = ({
  questionNumber,
  examType,
  topic,
  totalMarks,
  durationMinutes,
  children,
}) => {
  const titles = paperTitle(examType);
  const year = new Date().getFullYear();

  return (
    <div className="upsc-exam-paper relative flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Watermark */}
      <div className="upsc-exam-watermark pointer-events-none" aria-hidden>
        <img src={upscLogo} alt="" className="upsc-exam-watermark-img" />
        <span className="upsc-exam-watermark-text">UPSC</span>
      </div>

      {/* Booklet header */}
      <div className="relative z-[1] flex-shrink-0 px-3 sm:px-5 pt-3 sm:pt-4 pb-2 border-b border-black/20">
        <div className="text-center space-y-0.5">
          <p className="upsc-exam-serif text-[10px] sm:text-[11px] font-bold tracking-wide text-black/90">
            संघ लोक सेवा आयोग
          </p>
          <p className="upsc-exam-serif text-[9px] sm:text-[10px] font-bold tracking-[0.12em] uppercase text-black/80">
            Union Public Service Commission
          </p>
          <div className="mx-auto my-1.5 w-16 sm:w-20 border-t border-black/30" />
          <p className="upsc-exam-serif text-[8px] sm:text-[9px] font-semibold uppercase tracking-wide text-black/70">
            Civil Services (Preliminary) Examination, {year}
          </p>
          <p className="upsc-exam-serif text-[9px] sm:text-[10px] font-bold text-black/85">
            {titles.hi}
          </p>
          <p className="upsc-exam-serif text-[8px] sm:text-[9px] font-semibold uppercase tracking-wide text-black/70">
            {titles.en}
          </p>
          {topic ? (
            <p className="upsc-exam-serif text-[8px] sm:text-[9px] italic text-black/60 mt-0.5 truncate px-2">
              {topic}
            </p>
          ) : null}
        </div>

        <div className="mt-2 flex items-center justify-between text-[8px] sm:text-[9px] upsc-exam-serif text-black/65 border-t border-dashed border-black/15 pt-1.5">
          <span>
            Time Allowed: <strong>{durationMinutes ?? 120} Minutes</strong>
          </span>
          <span>
            Maximum Marks: <strong>{totalMarks ?? "—"}</strong>
          </span>
          <span className="hidden sm:inline tabular-nums">
            Space for Rough Work
          </span>
        </div>
      </div>

      {/* Question number strip */}
      <div className="relative z-[1] flex-shrink-0 flex items-center gap-2 px-3 sm:px-5 py-1.5 sm:py-2 bg-black/[0.03] border-b border-black/15">
        <span className="upsc-exam-serif text-sm sm:text-base font-bold text-black tabular-nums">
          {questionNumber}.
        </span>
        <span className="upsc-exam-serif text-[10px] sm:text-xs text-black/55 uppercase tracking-wide">
          Question {questionNumber}
        </span>
        <span className="ml-auto upsc-exam-serif text-[8px] sm:text-[9px] text-black/40 tabular-nums hidden sm:inline">
          Booklet Series A
        </span>
      </div>

      {/* Scrollable paper body */}
      <div className="relative z-[1] flex-1 min-h-0 overflow-y-auto upsc-exam-paper-body">
        {children}
      </div>
    </div>
  );
};
