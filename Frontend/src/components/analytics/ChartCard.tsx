import React, { memo } from "react";

interface ChartCardProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const ChartCard = memo(function ChartCard({
  title,
  description,
  action,
  children,
  className = "",
}: ChartCardProps) {
  return (
    <section
      className={`overflow-hidden rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-soft sm:p-5 ${className}`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[15px] font-bold text-slate-900">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-[12px] font-medium text-slate-500">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
});
