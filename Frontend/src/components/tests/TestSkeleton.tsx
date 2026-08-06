import React, { memo } from "react";

export const TestSkeleton = memo(function TestSkeleton({ cards = 8 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-busy aria-label="Loading tests">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-[20px] border border-slate-100 bg-white p-4 shadow-soft">
          <div className="flex justify-between">
            <div className="h-10 w-10 rounded-2xl bg-slate-100" />
            <div className="h-5 w-16 rounded-full bg-slate-50" />
          </div>
          <div className="mt-4 h-4 w-4/5 rounded-full bg-slate-100" />
          <div className="mt-2 h-3 w-1/2 rounded-full bg-slate-50" />
          <div className="mt-6 h-11 w-full rounded-2xl bg-slate-50" />
        </div>
      ))}
    </div>
  );
});
