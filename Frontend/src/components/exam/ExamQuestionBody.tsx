import React, { useState } from "react";
import { UpscFormattedQuestionStem } from "../UpscFormattedQuestionStem";
import {
  BilingualQuestionFields,
  getOptionEnglish,
  getOptionHindi,
  getQuestionEnglish,
  getQuestionHindi,
  hasDistinctHindiOption,
  hasDistinctHindiQuestion,
} from "../../utils/bilingualQuestion";
import { normalizeAssertionReasonPair } from "../../utils/upscQuestionFormat";

interface ExamQuestionBodyProps {
  question: BilingualQuestionFields & {
    matchColumns?: {
      columnA: string[];
      columnB: string[];
      columnA_hi?: string[];
      columnB_hi?: string[];
    } | null;
    assertionReason?: {
      assertion: string;
      reason: string;
      assertion_hi?: string;
      reason_hi?: string;
    } | null;
    tableData?: { headers: string[]; rows: string[][] } | null;
  };
  compact?: boolean;
}

function LangPanel({
  label,
  children,
  accent = "slate",
}: {
  label: string;
  children: React.ReactNode;
  accent?: "blue" | "slate";
}) {
  return (
    <div className="min-w-0">
      <div
        className={`text-[10px] sm:text-[11px] font-bold uppercase mb-1.5 ${
          accent === "blue" ? "text-blue-600" : "text-slate-500"
        }`}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

/** Hindi | English tabs (mobile) + side-by-side columns (desktop). */
export function BilingualDualPanel({
  hi,
  en,
  compact = true,
  showBoth = true,
}: {
  hi: React.ReactNode;
  en: React.ReactNode;
  compact?: boolean;
  showBoth?: boolean;
}) {
  const [tab, setTab] = useState<"hi" | "en">("hi");

  if (!showBoth) {
    return <div className="min-w-0">{en || hi}</div>;
  }

  return (
    <>
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
        <LangPanel label={tab === "hi" ? "हिंदी" : "English"} accent={tab === "hi" ? "blue" : "slate"}>
          {tab === "hi" ? hi : en}
        </LangPanel>
      </div>

      <div className={`hidden md:grid md:grid-cols-2 md:gap-4 min-h-0 ${compact ? "" : "md:gap-6"}`}>
        <div className="min-w-0 md:border-r md:border-slate-200 md:pr-4">
          <LangPanel label="हिंदी" accent="blue">
            {hi}
          </LangPanel>
        </div>
        <div className="min-w-0 md:pl-0.5">
          <LangPanel label="English" accent="slate">
            {en}
          </LangPanel>
        </div>
      </div>
    </>
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
  const en = getQuestionEnglish(question);
  const hi = getQuestionHindi(question);
  const showBoth = hasDistinctHindiQuestion(question);

  if (!en && !hi) return null;

  return (
    <BilingualDualPanel
      compact={compact}
      showBoth={showBoth}
      hi={<UpscFormattedQuestionStem text={hi} theme="light" compact={compact} />}
      en={<UpscFormattedQuestionStem text={en} theme="light" compact={compact} />}
    />
  );
}

function MatchListColumn({
  label,
  items,
  marker = "decimal",
  compact,
}: {
  label: string;
  items: string[];
  marker?: "decimal" | "alpha";
  compact?: boolean;
}) {
  const textSize = compact ? "text-[11px] sm:text-xs" : "text-sm";
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-bold uppercase text-blue-700 mb-1">{label}</div>
      <ol className={`space-y-1 ${textSize} leading-relaxed list-none`}>
        {items.map((item, i) => (
          <li key={i} className="flex gap-1.5 break-words">
            <span className="shrink-0 font-semibold tabular-nums text-slate-600">
              {marker === "alpha" ? `${String.fromCharCode(97 + i)}.` : `${i + 1}.`}
            </span>
            <span className="flex-1 min-w-0">{item}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function MatchPanelContent({
  intro,
  columnA,
  columnB,
  listOneLabel,
  listTwoLabel,
  codeHint,
  compact,
}: {
  intro: string;
  columnA: string[];
  columnB: string[];
  listOneLabel: string;
  listTwoLabel: string;
  codeHint: string;
  compact?: boolean;
}) {
  return (
    <div className="space-y-2 min-w-0">
      {intro.trim() ? (
        <UpscFormattedQuestionStem text={intro} theme="light" compact={compact} />
      ) : null}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-1">
        <MatchListColumn label={listOneLabel} items={columnA} marker="decimal" compact={compact} />
        <MatchListColumn label={listTwoLabel} items={columnB} marker="alpha" compact={compact} />
      </div>
      <p className={`text-[10px] sm:text-[11px] font-semibold text-slate-600 pt-0.5 ${compact ? "" : "text-xs"}`}>
        {codeHint}
      </p>
    </div>
  );
}

function MatchBilingualBlock({
  question,
  matchColumns,
  compact,
}: {
  question: BilingualQuestionFields;
  matchColumns: NonNullable<ExamQuestionBodyProps["question"]["matchColumns"]>;
  compact?: boolean;
}) {
  const enIntro = getQuestionEnglish(question);
  const hiIntro = getQuestionHindi(question);
  const colAEn = matchColumns.columnA || [];
  const colBEn = matchColumns.columnB || [];
  const colAHi =
    matchColumns.columnA_hi?.length &&
    matchColumns.columnA_hi.some((s) => String(s).trim() && /[\u0900-\u097F]/.test(String(s)))
      ? matchColumns.columnA_hi
      : colAEn;
  const colBHi =
    matchColumns.columnB_hi?.length &&
    matchColumns.columnB_hi.some((s) => String(s).trim() && /[\u0900-\u097F]/.test(String(s)))
      ? matchColumns.columnB_hi
      : colBEn;

  const showBoth =
    hasDistinctHindiQuestion(question) ||
    Boolean(matchColumns.columnA_hi?.some((s) => s.trim()) || matchColumns.columnB_hi?.some((s) => s.trim()));

  return (
    <BilingualDualPanel
      compact={compact}
      showBoth={showBoth}
      hi={
        <MatchPanelContent
          intro={hiIntro}
          columnA={colAHi}
          columnB={colBHi}
          listOneLabel="सूची-I"
          listTwoLabel="सूची-II"
          codeHint="नीचे दिए गए कूट का प्रयोग कर सही उत्तर चुनें।"
          compact={compact}
        />
      }
      en={
        <MatchPanelContent
          intro={enIntro}
          columnA={colAEn}
          columnB={colBEn}
          listOneLabel="List-I"
          listTwoLabel="List-II"
          codeHint="Select the correct answer using the codes given below."
          compact={compact}
        />
      }
    />
  );
}

function AssertionReasonCard({
  role,
  text,
  compact,
  hindi = false,
}: {
  role: "A" | "R";
  text: string;
  compact?: boolean;
  hindi?: boolean;
}) {
  const label = hindi ? (role === "A" ? "अभिकथन (A)" : "कारण (R)") : role === "A" ? "Assertion (A)" : "Reason (R)";
  const size = compact ? "text-[12px] sm:text-[13px] leading-relaxed" : "text-base leading-relaxed";
  if (!text.trim()) return null;
  return (
    <div className="rounded-lg border border-slate-300 bg-slate-50 p-3 sm:p-4">
      <div className="text-xs font-bold uppercase tracking-wide mb-1.5 text-blue-700">{label}</div>
      <p className={`${size} text-slate-800 break-words`}>{text}</p>
    </div>
  );
}

function AssertionReasonPanel({
  pair,
  compact,
  hindi = false,
}: {
  pair: { assertion: string; reason: string };
  compact?: boolean;
  hindi?: boolean;
}) {
  return (
    <div className="space-y-2">
      <AssertionReasonCard role="A" text={pair.assertion} compact={compact} hindi={hindi} />
      <AssertionReasonCard role="R" text={pair.reason} compact={compact} hindi={hindi} />
    </div>
  );
}

function AssertionReasonBilingualBlock({
  ar,
  compact,
}: {
  ar: NonNullable<ExamQuestionBodyProps["question"]["assertionReason"]>;
  compact?: boolean;
}) {
  const enPair = normalizeAssertionReasonPair(ar.assertion, ar.reason);
  const hiPair = normalizeAssertionReasonPair(
    ar.assertion_hi?.trim() || ar.assertion,
    ar.reason_hi?.trim() || ar.reason
  );
  const showBoth = Boolean(
    (hiPair.assertion && hiPair.assertion !== enPair.assertion) ||
      (hiPair.reason && hiPair.reason !== enPair.reason) ||
      /[\u0900-\u097F]/.test(`${hiPair.assertion} ${hiPair.reason}`)
  );

  return (
    <BilingualDualPanel
      compact={compact}
      showBoth={showBoth}
      hi={<AssertionReasonPanel pair={hiPair} compact={compact} hindi />}
      en={<AssertionReasonPanel pair={enPair} compact={compact} />}
    />
  );
}

export const ExamQuestionBody: React.FC<ExamQuestionBodyProps> = ({ question, compact = true }) => {
  const hasMatch = (question.matchColumns?.columnA?.length ?? 0) > 0;
  const hasAssertion =
    question.assertionReason?.assertion != null &&
    Boolean(question.assertionReason.assertion || question.assertionReason.reason);

  const introEn = getQuestionEnglish(question).trim();
  const showIntroAboveStructured =
    hasAssertion &&
    !hasMatch &&
    introEn &&
    !/^consider the following assertion/i.test(introEn);

  return (
    <div className="space-y-2 sm:space-y-3 min-h-0">
      {showIntroAboveStructured && <ExamBilingualStem question={question} compact={compact} />}
      {hasMatch && (
        <MatchBilingualBlock question={question} matchColumns={question.matchColumns!} compact={compact} />
      )}
      {hasAssertion && <AssertionReasonBilingualBlock ar={question.assertionReason!} compact={compact} />}
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
  const showBoth = hasDistinctHindiOption(question, optionKey);

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
            <div className="space-y-1">
              <p className="break-words font-medium text-slate-900 leading-relaxed">{hi}</p>
              <p className="break-words text-slate-600 leading-relaxed">{en}</p>
            </div>
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
