import React, { useState } from 'react';
import { Pencil, ChevronDown, ChevronUp } from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';

const COLLAPSE_LEN = 320;

interface Props {
  text: string;
}

export const WhatYouWroteBox: React.FC<Props> = ({ text }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [expanded, setExpanded] = useState(false);
  const long = text.length > COLLAPSE_LEN;
  const display = long && !expanded ? `${text.slice(0, COLLAPSE_LEN)}…` : text;

  if (!text?.trim()) return null;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2.5">
        <div
          className={`p-1.5 rounded-lg ${
            isDark ? 'bg-amber-500/15' : 'bg-amber-100'
          }`}
        >
          <Pencil
            className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}
          />
        </div>
        <span
          className={`text-sm font-semibold ${
            isDark ? 'text-slate-100' : 'text-slate-800'
          }`}
        >
          What you wrote
        </span>
      </div>
      <div
        className={`relative rounded-xl border p-4 xs:p-5 text-sm leading-relaxed whitespace-pre-wrap font-serif shadow-inner ${
          isDark
            ? 'bg-[#1c1917]/90 border-stone-600/40 text-stone-200 paper-texture-dark ring-1 ring-stone-700/30'
            : 'bg-[#faf8f5] border-stone-200/90 text-stone-800 paper-texture-light shadow-sm ring-1 ring-stone-200/50'
        }`}
      >
        <div
          className={`absolute left-0 top-3 bottom-3 w-0.5 rounded-full ${
            isDark ? 'bg-amber-500/40' : 'bg-amber-400/60'
          }`}
        />
        <div className="pl-3">{display}</div>
      </div>
      {long && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className={`inline-flex items-center gap-1 text-sm font-medium transition-colors ${
            isDark
              ? 'text-blue-400 hover:text-blue-300'
              : 'text-blue-600 hover:text-blue-700'
          }`}
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4" /> Read less
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" /> Read more
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default WhatYouWroteBox;
