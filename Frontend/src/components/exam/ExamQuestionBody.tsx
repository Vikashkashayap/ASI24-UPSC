import React, { useState } from "react";
import { UpscFormattedQuestionStem } from "../UpscFormattedQuestionStem";
import {
  BilingualQuestionFields,
  getOptionEnglish,
  getOptionHindi,
  getQuestionEnglish,
  getQuestionHindi,
  hasDistinctHindiQuestion,
} from "../../utils/bilingualQuestion";

interface ExamQuestionBodyProps {
  question: BilingualQuestionFields & {
    matchColumns?: { columnA: string[]; columnB: string[] } | null;
    assertionReason?: { assertion: string; reason: string } | null;
    tableData?: { headers: string[]; rows: string[][] } | null;
  };
  compact?: boolean;
}

function LangPanel({
  label,
  text,
  compact,
  accent = "slate",
}: {
  label: string;
  text: string;
  compact?: boolean;
  accent?: "blue" | "slate";
}) {
  return (
    <div className="min-w-0">
      <div
        className={`text-[10px] sm:text-[11px] font-bold uppercase mb-1 ${
          accent === "blue" ? "text-blue-600" : "text-slate-400"
        }`}
      >
        {label}
      </div>
      <UpscFormattedQuestionStem text={text} theme="light" compact={compact} />
    </div>
  );
}

/** Responsive: tabs on mobile, side-by-side on md+ */
export function ExamBilingualStem({
  question,
  compact = true,
}: {
  question: BilingualQuestionFields;
  compact?: boolean;
}) {
  const [tab, setTab] = useState<"hi" | "en">("hi");
  const en = getQuestionEnglish(question);
  const hi = getQuestionHindi(question);
  const showBoth = hasDistinctHindiQuestion(question);

  if (!en && !hi) return null;

  if (!showBoth) {
    return <UpscFormattedQuestionStem text={en || hi} theme="light" compact={compact} />;
  }

  return (
    <>
      {/* Mobile / small tablet: language tabs */}
      <div className="md:hidden">
        <div className="flex gap-2 mb-3">
          {(["hi", "en"] as const).map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setTab(lang)}
              className={`flex-1 py-2 rounded-lg text-[11px] font-semibold transition-colors touch-manipulation ${
                tab === lang
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 border border-slate-200"
              }`}
            >
              {lang === "hi" ? "हिंदी" : "English"}
            </button>
          ))}
        </div>
        <LangPanel label={tab === "hi" ? "हिंदी" : "English"} text={tab === "hi" ? hi : en} compact={compact} accent={tab === "hi" ? "blue" : "slate"} />
      </div>

      {/* Desktop: side-by-side */}
      <div className="hidden md:grid md:grid-cols-2 md:gap-4 min-h-0">
        <div className="min-w-0 md:border-r md:border-slate-100 md:pr-3">
          <LangPanel label="हिंदी" text={hi} compact={compact} accent="blue" />
        </div>
        <div className="min-w-0 md:pl-0.5">
          <LangPanel label="English" text={en} compact={compact} accent="slate" />
        </div>
      </div>
    </>
  );
}

export const ExamQuestionBody: React.FC<ExamQuestionBodyProps> = ({ question, compact = true }) => {
  const hasMatch = (question.matchColumns?.columnA?.length ?? 0) > 0;
  const hasAssertion =
    question.assertionReason?.assertion != null &&
    Boolean(question.assertionReason.assertion || question.assertionReason.reason);

  return (
    <div className="space-y-2 sm:space-y-3 min-h-0">
      {hasMatch && question.question?.trim() && <ExamBilingualStem question={question} compact={compact} />}
      {hasAssertion && (
        <UpscFormattedQuestionStem
          text={`Assertion (A): ${question.assertionReason!.assertion}\nReason (R): ${question.assertionReason!.reason}`}
          theme="light"
          compact={compact}
        />
      )}
      {hasMatch && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] sm:text-xs leading-relaxed">
          <div>
            <div className="text-[10px] font-bold uppercase text-blue-700 mb-1">List-I</div>
            <ol className="list-decimal list-inside space-y-1">
              {question.matchColumns!.columnA.map((item, i) => (
                <li key={i} className="break-words">{item}</li>
              ))}
            </ol>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase text-blue-700 mb-1">List-II</div>
            <ol className="list-decimal list-inside space-y-1">
              {(question.matchColumns!.columnB || []).map((item, i) => (
                <li key={i} className="break-words">{item}</li>
              ))}
            </ol>
          </div>
        </div>
      )}
      {question.tableData?.headers?.length ? (
        <div className="overflow-x-auto -mx-1 sm:mx-0">
          <table className="w-full min-w-[280px] border-collapse border border-slate-300 text-[11px] sm:text-xs">
            <thead>
              <tr className="bg-slate-100">
                {question.tableData.headers.map((h, i) => (
                  <th key={i} className="border border-slate-300 px-2 py-1.5 text-left font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(question.tableData.rows || []).map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="border border-slate-300 px-2 py-1.5">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {!hasAssertion && !hasMatch && <ExamBilingualStem question={question} compact={compact} />}
    </div>
  );
};


interface ExamOptionRowProps {
  optionKey: "A" | "B" | "C" | "D";
  question: BilingualQuestionFields;
  selected: boolean;
  onSelect: () => void;
  compact?: boolean;
}

export const ExamOptionRow: React.FC<ExamOptionRowProps> = ({
  optionKey,
  question,
  selected,
  onSelect,
  compact = true,
}) => {
  const en = getOptionEnglish(question, optionKey);
  const hi = getOptionHindi(question, optionKey);
  const showBoth = Boolean(hi && en && hi !== en);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-lg border transition-all touch-manipulation min-h-[44px] flex items-center ${
        compact ? "px-2.5 sm:px-3 py-2 sm:py-2.5 text-[11px] sm:text-xs leading-relaxed" : "px-3 py-2 text-sm"
      } ${
        selected
          ? "border-blue-600 bg-blue-50 ring-1 ring-blue-200 shadow-sm"
          : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50 active:bg-slate-100"
      }`}
    >
      <div className="flex gap-2 sm:gap-2.5 items-start w-full">
        <span
          className={`shrink-0 font-bold text-[11px] sm:text-xs mt-0.5 ${
            selected ? "text-blue-700" : "text-slate-500"
          }`}
        >
          ({optionKey.toLowerCase()})
        </span>
        <div className="min-w-0 flex-1 text-slate-800 py-0.5">
          {showBoth ? (
            <>
              <p className="break-words font-medium text-slate-900 leading-relaxed sm:hidden">{hi}</p>
              <p className="break-words leading-relaxed hidden sm:block">
                <span className="font-medium text-slate-900">{hi}</span>
                <span className="text-slate-300 mx-1.5">/</span>
                <span className="text-slate-600">{en}</span>
              </p>
            </>
          ) : (
            <p className="break-words leading-relaxed">{en || hi}</p>
          )}
        </div>
      </div>
    </button>
  );
};

/** Grid columns for palette — fewer cols on narrow sidebars */
export function examPaletteCols(total: number, narrow = false): number {
  if (narrow) {
    if (total <= 20) return 5;
    if (total <= 50) return 8;
    return 10;
  }
  if (total <= 20) return 5;
  if (total <= 50) return 10;
  if (total <= 100) return 12;
  return 12;
}
