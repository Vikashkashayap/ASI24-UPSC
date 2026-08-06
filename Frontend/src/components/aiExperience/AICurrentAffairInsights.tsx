import React, { memo } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface InsightBlock {
  label: string;
  value: string;
}

interface AICurrentAffairInsightsProps {
  summary: string;
  prelimsFocus?: string;
  mainsAngle?: string;
  keywords?: string[];
  keyPoints?: string[];
  difficulty?: string;
  gsPaper?: string;
}

export const AICurrentAffairInsights = memo(function AICurrentAffairInsights({
  summary,
  prelimsFocus,
  mainsAngle,
  keywords = [],
  keyPoints = [],
  difficulty,
  gsPaper,
}: AICurrentAffairInsightsProps) {
  const blocks: InsightBlock[] = [
    { label: "AI Summary", value: summary },
    ...(prelimsFocus ? [{ label: "Prelims relevance", value: prelimsFocus }] : []),
    ...(mainsAngle ? [{ label: "Mains relevance", value: mainsAngle }] : []),
    ...(difficulty ? [{ label: "Exam importance", value: `${gsPaper || "GS"} · ${difficulty}` }] : []),
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <div className="relative overflow-hidden rounded-[20px] border border-indigo-100 bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-500 p-4 text-white shadow-[0_14px_36px_rgba(37,99,235,0.2)]">
        <div className="pointer-events-none absolute inset-0 bg-white/5" />
        <div className="relative flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-100">AI Current Affairs</p>
            <p className="text-sm font-bold">Exam-ready insights</p>
          </div>
        </div>
      </div>

      {blocks.map((b) => (
        <div key={b.label} className="rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-soft">
          <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600">{b.label}</p>
          <p className="mt-1 text-[13px] font-medium leading-relaxed text-slate-700">{b.value}</p>
        </div>
      ))}

      {keyPoints.length > 0 ? (
        <div className="rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-soft">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Revision notes</p>
          <ul className="mt-2 space-y-1.5">
            {keyPoints.map((p) => (
              <li key={p} className="rounded-xl bg-slate-50 px-3 py-2 text-[12px] font-medium text-slate-700">
                {p}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {keywords.length > 0 ? (
        <div className="rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-soft">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Keywords</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {keywords.map((kw) => (
              <span key={kw} className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                {kw}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {keywords.length > 0 ? (
        <div className="rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-soft">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Mindmap seeds</p>
          <p className="mt-1 text-[12px] font-medium text-slate-600">
            Connect these themes while revising: {keywords.slice(0, 6).join(" → ")}
          </p>
        </div>
      ) : null}

      <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50 p-4">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Possible questions</p>
        <p className="mt-1 text-[12px] font-medium text-slate-600">
          Use Generate MCQs below for Prelims practice grounded in this article.
        </p>
      </div>
    </motion.section>
  );
});
