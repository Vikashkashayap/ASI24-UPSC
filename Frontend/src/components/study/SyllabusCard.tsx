import React, { memo } from "react";

interface SyllabusCardProps {
  children: React.ReactNode;
  className?: string;
}

export const SyllabusCard = memo(function SyllabusCard({ children, className = "" }: SyllabusCardProps) {
  return (
    <div className={`rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-soft ${className}`}>
      {children}
    </div>
  );
});
