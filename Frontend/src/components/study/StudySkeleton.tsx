import React, { memo } from "react";

export const StudySkeleton = memo(function StudySkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-[20px] border border-slate-100 bg-white p-4 shadow-soft"
        >
          <div className="flex gap-3">
            <div className="h-10 w-10 rounded-2xl bg-slate-100" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3.5 w-2/3 rounded-full bg-slate-100" />
              <div className="h-2.5 w-1/2 rounded-full bg-slate-50" />
              <div className="mt-3 h-1.5 w-full rounded-full bg-slate-50" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});
