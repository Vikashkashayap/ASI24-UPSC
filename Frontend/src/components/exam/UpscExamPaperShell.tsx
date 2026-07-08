import React from "react";

interface UpscExamPaperShellProps {
  children: React.ReactNode;
}

export const UpscExamPaperShell: React.FC<UpscExamPaperShellProps> = ({ children }) => {
  return (
    <div className="exam-paper-shell relative">
      <div className="exam-paper-watermark" aria-hidden>
        <span className="exam-paper-watermark-text">MentorsDaily</span>
      </div>

      <div className="relative z-[1] exam-paper-body">{children}</div>
    </div>
  );
};
