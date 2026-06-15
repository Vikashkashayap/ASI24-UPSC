import React, { useState } from "react";
import { UpscFormattedQuestionStem } from "../UpscFormattedQuestionStem";
import {
  BilingualQuestionFields,
  ExamLang,
  getOptionByLang,
  getQuestionEnglish,
  getQuestionHindi,
  getOptionEnglish,
  getOptionHindi,
  hasDistinctHindiQuestion,
} from "../../utils/bilingualQuestion";
import {
  buildAssertionReasonStem,
  isAssertionReasonText,
  ParsedMatchFollowing,
  parseMatchFollowingFromText,
  resolveMatchColumns,
} from "../../utils/upscQuestionFormat";

interface ExamQuestionBodyProps {
  question: BilingualQuestionFields & {
    questionType?: string;
    matchColumns?: { columnA: string[]; columnB: string[] } | null;
    assertionReason?: { assertion: string; reason: string } | null;
    tableData?: { headers: string[]; rows: string[][] } | null;
  };
  compact?: boolean;
  lang?: ExamLang;
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

function MatchFollowingTable({
  data,
  compact,
  lang,
}: {
  data: ParsedMatchFollowing;
  compact?: boolean;
  lang: "en" | "hi";
}) {
  const listILabel = lang === "hi" ? "सूची-I" : "List-I";
  const listIILabel = lang === "hi" ? "सूची-II" : "List-II";
  const textSize = compact ? "text-[11px] sm:text-xs" : "text-sm";

  return (
    <div className="space-y-2">
      {data.intro ? (
        <p className={`${textSize} font-semibold text-slate-900 leading-relaxed`}>{data.intro}</p>
      ) : null}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50/80 overflow-hidden">
          <div className="px-2.5 py-1.5 bg-blue-600 text-white text-[10px] sm:text-[11px] font-bold uppercase tracking-wide">
            {listILabel}
          </div>
          <ol className={`${textSize} p-2 sm:p-2.5 space-y-1.5 list-none`}>
            {data.columnA.map((item, i) => (
              <li key={i} className="flex gap-2 break-words leading-relaxed">
                <span className="shrink-0 font-bold text-blue-700 w-5">
                  {String.fromCharCode(65 + i)}.
                </span>
                <span className="text-slate-800">{item}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50/80 overflow-hidden">
          <div className="px-2.5 py-1.5 bg-indigo-600 text-white text-[10px] sm:text-[11px] font-bold uppercase tracking-wide">
            {listIILabel}
          </div>
          <ol className={`${textSize} p-2 sm:p-2.5 space-y-1.5 list-none`}>
            {(data.columnB.length ? data.columnB : data.columnA.map((_, i) => "")).map(
              (item, i) =>
                item ? (
                  <li key={i} className="flex gap-2 break-words leading-relaxed">
                    <span className="shrink-0 font-bold text-indigo-700 w-5">{i + 1}.</span>
                    <span className="text-slate-800">{item}</span>
                  </li>
                ) : null
            )}
          </ol>
        </div>
      </div>
      {data.prompt ? (
        <p className={`${textSize} font-semibold text-slate-700 pt-0.5`}>{data.prompt}</p>
      ) : null}
    </div>
  );
}

function MatchBlock({
  label,
  data,
  tableLang,
  compact,
  accent,
}: {
  label: string;
  data: ParsedMatchFollowing;
  tableLang: "en" | "hi";
  compact?: boolean;
  accent: "blue" | "slate";
}) {
  return (
    <div className="min-w-0">
      <div
        className={`text-[10px] sm:text-[11px] font-bold uppercase mb-1.5 ${
          accent === "blue" ? "text-blue-600" : "text-slate-400"
        }`}
      >
        {label}
      </div>
      <MatchFollowingTable data={data} compact={compact} lang={tableLang} />
    </div>
  );
}

function BilingualMatchView({
  question,
  compact,
  lang,
}: {
  question: ExamQuestionBodyProps["question"];
  compact?: boolean;
  lang?: ExamLang;
}) {
  const enData = resolveMatchColumns(question, "en");
  const hiData = resolveMatchColumns(question, "hi");

  if (!enData && !hiData) return null;

  if (!lang) {
    const data = enData || hiData!;
    return (
      <MatchFollowingTable
        data={data}
        compact={compact}
        lang={enData ? "en" : "hi"}
      />
    );
  }

  const hiFirst = lang === "hi";
  const blocks: React.ReactNode[] = [];

  const pushHi = () => {
    if (hiData) {
      blocks.push(
        <MatchBlock
          key="hi"
          label="हिंदी"
          data={hiData}
          tableLang="hi"
          compact={compact}
          accent="blue"
        />
      );
    }
  };
  const pushEn = () => {
    if (enData) {
      blocks.push(
        <MatchBlock
          key="en"
          label="English"
          data={enData}
          tableLang="en"
          compact={compact}
          accent="slate"
        />
      );
    } else {
      const enText = getQuestionEnglish(question);
      if (enText) {
        blocks.push(
          <LangPanel key="en-fallback" label="English" text={enText} compact={compact} accent="slate" />
        );
      }
    }
  };

  if (hiFirst) {
    pushHi();
    pushEn();
  } else {
    pushEn();
    pushHi();
  }

  return <div className="space-y-3">{blocks}</div>;
}

function getAssertionStemText(
  question: ExamQuestionBodyProps["question"],
  lang: "en" | "hi"
): string | null {
  const text =
    lang === "hi"
      ? getQuestionHindi(question, { strict: true })
      : getQuestionEnglish(question);

  if (text && isAssertionReasonText(text)) return text;

  if (lang === "en" && question.assertionReason?.assertion) {
    return buildAssertionReasonStem({
      assertion: question.assertionReason.assertion,
      reason: question.assertionReason.reason || "",
    });
  }
  return null;
}

function BilingualAssertionView({
  question,
  compact,
  lang,
}: {
  question: ExamQuestionBodyProps["question"];
  compact?: boolean;
  lang?: ExamLang;
}) {
  const enStem = getAssertionStemText(question, "en");
  const hiStem = getAssertionStemText(question, "hi");

  if (!enStem && !hiStem) return null;

  if (!lang) {
    return (
      <UpscFormattedQuestionStem
        text={enStem || hiStem!}
        theme="light"
        compact={compact}
      />
    );
  }

  const hiFirst = lang === "hi";
  const blocks: React.ReactNode[] = [];

  const pushHi = () => {
    if (hiStem) {
      blocks.push(
        <LangPanel key="hi" label="हिंदी" text={hiStem} compact={compact} accent="blue" />
      );
    }
  };
  const pushEn = () => {
    if (enStem) {
      blocks.push(
        <LangPanel key="en" label="English" text={enStem} compact={compact} accent="slate" />
      );
    }
  };

  if (hiFirst) {
    pushHi();
    pushEn();
  } else {
    pushEn();
    pushHi();
  }

  return <div className="space-y-3">{blocks}</div>;
}

/** Responsive stem — statement / chronology / plain text */
export function ExamBilingualStem({
  question,
  compact = true,
  lang,
}: {
  question: BilingualQuestionFields;
  compact?: boolean;
  lang?: ExamLang;
}) {
  const [tab, setTab] = useState<"hi" | "en">("hi");
  const en = getQuestionEnglish(question);
  const hi = getQuestionHindi(question, { strict: true });
  const showBoth = !lang && hasDistinctHindiQuestion(question);

  if (!en && !hi) return null;

  if (lang && (hi || en)) {
    const hiFirst = lang === "hi";
    const primary = hiFirst ? hi || en : en || hi;
    const secondary = hiFirst ? en : hi;
    const primaryLabel = hiFirst ? "हिंदी" : "English";
    const secondaryLabel = hiFirst ? "English" : "हिंदी";
    const showSecondary = Boolean(secondary && secondary !== primary);

    return (
      <div className="space-y-2">
        <LangPanel
          label={primaryLabel}
          text={primary}
          compact={compact}
          accent={hiFirst ? "blue" : "slate"}
        />
        {showSecondary ? (
          <LangPanel
            label={secondaryLabel}
            text={secondary}
            compact={compact}
            accent={hiFirst ? "slate" : "blue"}
          />
        ) : null}
      </div>
    );
  }

  if (!showBoth) {
    return <UpscFormattedQuestionStem text={en || hi} theme="light" compact={compact} />;
  }

  return (
    <>
      <div className="md:hidden">
        <div className="flex gap-2 mb-3">
          {(["hi", "en"] as const).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setTab(code)}
              className={`flex-1 py-2 rounded-lg text-[11px] font-semibold transition-colors touch-manipulation ${
                tab === code
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 border border-slate-200"
              }`}
            >
              {code === "hi" ? "हिंदी" : "English"}
            </button>
          ))}
        </div>
        <LangPanel
          label={tab === "hi" ? "हिंदी" : "English"}
          text={tab === "hi" ? hi : en}
          compact={compact}
          accent={tab === "hi" ? "blue" : "slate"}
        />
      </div>

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

function detectMatch(question: ExamQuestionBodyProps["question"]): boolean {
  if ((question.matchColumns?.columnA?.length ?? 0) > 0) return true;
  const en = getQuestionEnglish(question);
  const hi = getQuestionHindi(question, { strict: true });
  return Boolean(parseMatchFollowingFromText(en) || (hi && parseMatchFollowingFromText(hi)));
}

function detectAssertion(question: ExamQuestionBodyProps["question"]): boolean {
  if (question.assertionReason?.assertion) return true;
  const en = getQuestionEnglish(question);
  const hi = getQuestionHindi(question, { strict: true });
  return isAssertionReasonText(en) || isAssertionReasonText(hi);
}

export const ExamQuestionBody: React.FC<ExamQuestionBodyProps> = ({
  question,
  compact = true,
  lang,
}) => {
  const isMatch = detectMatch(question);
  const isAssertion = detectAssertion(question);

  return (
    <div className="space-y-2 sm:space-y-3 min-h-0">
      {isMatch ? (
        <BilingualMatchView question={question} compact={compact} lang={lang} />
      ) : isAssertion ? (
        <BilingualAssertionView question={question} compact={compact} lang={lang} />
      ) : (
        <ExamBilingualStem question={question} compact={compact} lang={lang} />
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
    </div>
  );
};

interface ExamOptionRowProps {
  optionKey: "A" | "B" | "C" | "D";
  question: BilingualQuestionFields;
  selected: boolean;
  onSelect: () => void;
  compact?: boolean;
  lang?: ExamLang;
}

export const ExamOptionRow: React.FC<ExamOptionRowProps> = ({
  optionKey,
  question,
  selected,
  onSelect,
  compact = true,
  lang,
}) => {
  const en = getOptionEnglish(question, optionKey);
  const hi = getOptionHindi(question, optionKey, { strict: true });
  const showBoth = !lang && Boolean(hi && en && hi !== en);
  const dualLang = Boolean(lang && hi && en && hi !== en);
  const displayText = lang ? getOptionByLang(question, optionKey, lang) : en || hi;
  const missingHi = lang === "hi" && !hi;
  const primaryOpt = lang === "hi" ? hi || en : en || hi;
  const secondaryOpt = lang === "hi" ? en : hi;

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
          {missingHi ? (
            <p className="break-words leading-relaxed">{en}</p>
          ) : dualLang ? (
            <div className="space-y-0.5">
              <p className="break-words leading-relaxed font-medium text-slate-900">{primaryOpt}</p>
              <p className="break-words leading-relaxed text-slate-500 text-[10px] sm:text-[11px]">
                {secondaryOpt}
              </p>
            </div>
          ) : showBoth ? (
            <>
              <p className="break-words font-medium text-slate-900 leading-relaxed sm:hidden">{hi}</p>
              <p className="break-words leading-relaxed hidden sm:block">
                <span className="font-medium text-slate-900">{hi}</span>
                <span className="text-slate-300 mx-1.5">/</span>
                <span className="text-slate-600">{en}</span>
              </p>
            </>
          ) : (
            <p className="break-words leading-relaxed">{displayText}</p>
          )}
        </div>
      </div>
    </button>
  );
};

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

// Re-export for TestPage
export { getQuestionOptionKeys } from "../../utils/upscQuestionFormat";
