import React, { useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { UpscFormattedQuestionStem } from "../UpscFormattedQuestionStem";
import {
  BilingualQuestionFields,
  ExamLang,
  OptionKey,
  getOptionByLang,
  getQuestionEnglish,
  getQuestionHindi,
  getOptionEnglish,
  getOptionHindi,
  getExplanationByLang,
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
  matchColumns_hi?: { columnA: string[]; columnB: string[] } | null;
    assertionReason?: { assertion: string; reason: string } | null;
    tableData?: { headers: string[]; rows: string[][] } | null;
  };
  compact?: boolean;
  lang?: ExamLang;
  paperMode?: boolean;
}

function LangPanel({
  label,
  text,
  compact,
  accent = "slate",
  paperMode,
}: {
  label: string;
  text: string;
  compact?: boolean;
  accent?: "blue" | "slate";
  paperMode?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div
        className={`text-[10px] sm:text-[11px] font-bold uppercase mb-1 ${
          paperMode
            ? "upsc-paper-lang-label"
            : accent === "blue"
              ? "text-blue-600"
              : "text-slate-400"
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
  paperMode,
}: {
  data: ParsedMatchFollowing;
  compact?: boolean;
  lang: "en" | "hi";
  paperMode?: boolean;
}) {
  const listILabel = lang === "hi" ? "सूची-I" : "List-I";
  const listIILabel = lang === "hi" ? "सूची-II" : "List-II";
  const textSize = compact ? "text-[11px] sm:text-xs" : "text-sm";
  const introClass = paperMode
    ? `${textSize} font-semibold text-black leading-relaxed upsc-exam-serif`
    : `${textSize} font-semibold text-slate-900 leading-relaxed`;
  const itemTextClass = paperMode ? "text-black" : "text-slate-800";
  const numClass = paperMode ? "shrink-0 font-bold text-black w-5" : "shrink-0 font-bold text-blue-700 w-5";
  const numClassII = paperMode ? "shrink-0 font-bold text-black w-5" : "shrink-0 font-bold text-indigo-700 w-5";
  const promptClass = paperMode
    ? `${textSize} font-semibold text-black pt-0.5 upsc-exam-serif`
    : `${textSize} font-semibold text-slate-700 pt-0.5`;

  return (
    <div className={`space-y-2 ${paperMode ? "upsc-exam-serif" : ""}`}>
      {data.intro ? <p className={introClass}>{data.intro}</p> : null}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
        <div
          className={
            paperMode
              ? "upsc-paper-match-col overflow-hidden"
              : "rounded-lg border border-slate-200 bg-slate-50/80 overflow-hidden"
          }
        >
          <div
            className={
              paperMode
                ? "upsc-paper-match-header"
                : "px-2.5 py-1.5 bg-blue-600 text-white text-[10px] sm:text-[11px] font-bold uppercase tracking-wide"
            }
          >
            {listILabel}
          </div>
          <ol className={`${textSize} p-2 sm:p-2.5 space-y-1.5 list-none`}>
            {data.columnA.map((item, i) => (
              <li key={i} className="flex gap-2 break-words leading-relaxed">
                <span className={numClass}>{String.fromCharCode(65 + i)}.</span>
                <span className={itemTextClass}>{item}</span>
              </li>
            ))}
          </ol>
        </div>
        <div
          className={
            paperMode
              ? "upsc-paper-match-col overflow-hidden"
              : "rounded-lg border border-slate-200 bg-slate-50/80 overflow-hidden"
          }
        >
          <div
            className={
              paperMode
                ? "upsc-paper-match-header"
                : "px-2.5 py-1.5 bg-indigo-600 text-white text-[10px] sm:text-[11px] font-bold uppercase tracking-wide"
            }
          >
            {listIILabel}
          </div>
          <ol className={`${textSize} p-2 sm:p-2.5 space-y-1.5 list-none`}>
            {(data.columnB.length ? data.columnB : data.columnA.map((_, i) => "")).map(
              (item, i) =>
                item ? (
                  <li key={i} className="flex gap-2 break-words leading-relaxed">
                    <span className={numClassII}>{i + 1}.</span>
                    <span className={itemTextClass}>{item}</span>
                  </li>
                ) : null
            )}
          </ol>
        </div>
      </div>
      {data.prompt ? <p className={promptClass}>{data.prompt}</p> : null}
    </div>
  );
}

function MatchBlock({
  label,
  data,
  tableLang,
  compact,
  accent,
  paperMode,
}: {
  label: string;
  data: ParsedMatchFollowing;
  tableLang: "en" | "hi";
  compact?: boolean;
  accent: "blue" | "slate";
  paperMode?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div
        className={`text-[10px] sm:text-[11px] font-bold uppercase mb-1.5 ${
          paperMode
            ? "upsc-paper-lang-label"
            : accent === "blue"
              ? "text-blue-600"
              : "text-slate-400"
        }`}
      >
        {label}
      </div>
      <MatchFollowingTable data={data} compact={compact} lang={tableLang} paperMode={paperMode} />
    </div>
  );
}

function BilingualMatchView({
  question,
  compact,
  lang,
  paperMode,
}: {
  question: ExamQuestionBodyProps["question"];
  compact?: boolean;
  lang?: ExamLang;
  paperMode?: boolean;
}) {
  const enData = resolveMatchColumns(question, "en");
  const hiData = resolveMatchColumns(question, "hi");

  if (!enData && !hiData) return null;

  if (!lang) {
    const blocks: React.ReactNode[] = [];
    if (hiData) {
      blocks.push(
        <MatchBlock
          key="hi"
          label="हिंदी"
          data={hiData}
          tableLang="hi"
          compact={compact}
          accent="blue"
          paperMode={paperMode}
        />
      );
    }
    if (enData) {
      blocks.push(
        <MatchBlock
          key="en"
          label="English"
          data={enData}
          tableLang="en"
          compact={compact}
          accent="slate"
          paperMode={paperMode}
        />
      );
    }
    if (blocks.length === 0) return null;
    return <div className="space-y-3">{blocks}</div>;
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
          paperMode={paperMode}
        />
      );
    } else {
      const hiText = getQuestionHindi(question, { strict: true });
      if (hiText) {
        blocks.push(
          <LangPanel key="hi-fallback" label="हिंदी" text={hiText} compact={compact} accent="blue" paperMode={paperMode} />
        );
      }
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
          paperMode={paperMode}
        />
      );
    } else {
      const enText = getQuestionEnglish(question);
      if (enText) {
        blocks.push(
          <LangPanel key="en-fallback" label="English" text={enText} compact={compact} accent="slate" paperMode={paperMode} />
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
  paperMode,
}: {
  question: ExamQuestionBodyProps["question"];
  compact?: boolean;
  lang?: ExamLang;
  paperMode?: boolean;
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
        <LangPanel key="hi" label="हिंदी" text={hiStem} compact={compact} accent="blue" paperMode={paperMode} />
      );
    }
  };
  const pushEn = () => {
    if (enStem) {
      blocks.push(
        <LangPanel key="en" label="English" text={enStem} compact={compact} accent="slate" paperMode={paperMode} />
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
  paperMode,
}: {
  question: BilingualQuestionFields;
  compact?: boolean;
  lang?: ExamLang;
  paperMode?: boolean;
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
          paperMode={paperMode}
        />
        {showSecondary ? (
          <LangPanel
            label={secondaryLabel}
            text={secondary}
            compact={compact}
            accent={hiFirst ? "slate" : "blue"}
            paperMode={paperMode}
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
              className={`flex-1 py-2 text-[11px] font-semibold transition-colors touch-manipulation ${
                tab === code
                  ? paperMode
                    ? "bg-black/10 text-black border border-black/30 shadow-none"
                    : "bg-blue-600 text-white shadow-sm"
                  : paperMode
                    ? "bg-white/50 text-black/70 border border-black/15"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
              } ${paperMode ? "rounded-sm upsc-exam-serif" : "rounded-lg"}`}
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
          paperMode={paperMode}
        />
      </div>

      <div className="hidden md:grid md:grid-cols-2 md:gap-4 min-h-0">
        <div className={`min-w-0 md:pr-3 ${paperMode ? "md:border-r md:border-black/15" : "md:border-r md:border-slate-100"}`}>
          <LangPanel label="हिंदी" text={hi} compact={compact} accent="blue" paperMode={paperMode} />
        </div>
        <div className="min-w-0 md:pl-0.5">
          <LangPanel label="English" text={en} compact={compact} accent="slate" paperMode={paperMode} />
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
  paperMode,
}) => {
  const isMatch = detectMatch(question);
  const isAssertion = detectAssertion(question);

  return (
    <div className={`space-y-2 sm:space-y-3 min-h-0 ${paperMode ? "upsc-exam-serif text-black" : ""}`}>
      {isMatch ? (
        <BilingualMatchView question={question} compact={compact} lang={lang} paperMode={paperMode} />
      ) : isAssertion ? (
        <BilingualAssertionView question={question} compact={compact} lang={lang} paperMode={paperMode} />
      ) : (
        <ExamBilingualStem question={question} compact={compact} lang={lang} paperMode={paperMode} />
      )}

      {question.tableData?.headers?.length ? (
        <div className="overflow-x-auto -mx-1 sm:mx-0">
          <table
            className={`w-full min-w-[280px] border-collapse text-[11px] sm:text-xs ${
              paperMode
                ? "upsc-paper-table border border-black/35"
                : "border border-slate-300"
            }`}
          >
            <thead>
              <tr className={paperMode ? "bg-black/[0.06]" : "bg-slate-100"}>
                {question.tableData.headers.map((h, i) => (
                  <th
                    key={i}
                    className={`px-2 py-1.5 text-left font-semibold ${
                      paperMode ? "border border-black/30 text-black upsc-exam-serif" : "border border-slate-300"
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(question.tableData.rows || []).map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className={`px-2 py-1.5 ${
                        paperMode ? "border border-black/25 text-black upsc-exam-serif" : "border border-slate-300"
                      }`}
                    >
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
  paperMode?: boolean;
}

export const ExamOptionRow: React.FC<ExamOptionRowProps> = ({
  optionKey,
  question,
  selected,
  onSelect,
  compact = true,
  lang,
  paperMode,
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
      className={`w-full text-left transition-all touch-manipulation min-h-[44px] flex items-center ${
        paperMode ? "upsc-paper-option upsc-exam-serif" : "rounded-lg"
      } ${
        compact ? "px-2.5 sm:px-3 py-2 sm:py-2.5 text-[11px] sm:text-xs leading-relaxed" : "px-3 py-2 text-sm"
      } ${
        selected
          ? paperMode
            ? "upsc-paper-option-selected border"
            : "border-blue-600 bg-blue-50 ring-1 ring-blue-200 shadow-sm"
          : paperMode
            ? "border"
            : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50 active:bg-slate-100"
      }`}
    >
      <div className="flex gap-2 sm:gap-2.5 items-start w-full">
        <span
          className={`shrink-0 font-bold text-[11px] sm:text-xs mt-0.5 ${
            selected ? (paperMode ? "text-black" : "text-blue-700") : "text-slate-500"
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

interface ExamReviewOptionRowProps {
  optionKey: OptionKey;
  question: BilingualQuestionFields;
  correctAnswer: string;
  userAnswer: string | null;
  compact?: boolean;
  lang?: ExamLang;
  paperMode?: boolean;
}

export const ExamReviewOptionRow: React.FC<ExamReviewOptionRowProps> = ({
  optionKey,
  question,
  correctAnswer,
  userAnswer,
  compact = true,
  lang,
  paperMode,
}) => {
  const en = getOptionEnglish(question, optionKey);
  const hi = getOptionHindi(question, optionKey, { strict: true });
  const showBoth = !lang && Boolean(hi && en && hi !== en);
  const dualLang = Boolean(lang && hi && en && hi !== en);
  const displayText = lang ? getOptionByLang(question, optionKey, lang) : en || hi;
  const missingHi = lang === "hi" && !hi;
  const primaryOpt = lang === "hi" ? hi || en : en || hi;
  const secondaryOpt = lang === "hi" ? en : hi;

  const isCorrect = optionKey === correctAnswer;
  const isUserWrong = optionKey === userAnswer && userAnswer !== correctAnswer;
  const isUserCorrect = optionKey === userAnswer && userAnswer === correctAnswer;

  const stateClass = isCorrect
    ? "upsc-paper-option-correct"
    : isUserWrong
      ? "upsc-paper-option-wrong"
      : paperMode
        ? ""
        : isUserCorrect
          ? "border-green-500 bg-green-50"
          : "";

  return (
    <div
      className={`w-full text-left min-h-[44px] flex items-center ${
        paperMode ? `upsc-paper-option upsc-exam-serif ${stateClass}` : `rounded-lg border-2 ${stateClass}`
      } ${
        compact ? "px-2.5 sm:px-3 py-2 sm:py-2.5 text-[11px] sm:text-xs leading-relaxed" : "px-3 py-2 text-sm"
      } ${
        !paperMode && !isCorrect && !isUserWrong
          ? "border-slate-200 bg-white"
          : ""
      }`}
    >
      <div className="flex gap-2 sm:gap-2.5 items-start w-full">
        <span
          className={`shrink-0 font-bold text-[11px] sm:text-xs mt-0.5 ${
            isCorrect ? "text-green-700" : isUserWrong ? "text-red-700" : "text-slate-500"
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
        <div className="shrink-0 mt-0.5">
          {isCorrect ? (
            <CheckCircle className="w-4 h-4 text-green-600" aria-label="Correct answer" />
          ) : isUserWrong ? (
            <XCircle className="w-4 h-4 text-red-600" aria-label="Your wrong answer" />
          ) : null}
        </div>
      </div>
    </div>
  );
};

type ExplanationFields = {
  explanation?: string | { A?: string; B?: string; C?: string; D?: string };
  explanation_en?: string | { A?: string; B?: string; C?: string; D?: string };
  explanation_hi?: { A?: string; B?: string; C?: string; D?: string };
  correctAnswer?: string;
  eliminationLogic?: string;
  conceptualSource?: string;
};

function hasPerOptionExplanations(
  question: ExplanationFields,
  optionKeys: OptionKey[],
  correctKey?: OptionKey
): boolean {
  const raw = question.explanation_en ?? question.explanation;
  if (!raw || typeof raw === "string") return false;

  const incorrectWithText = optionKeys.filter(
    (opt) =>
      opt !== correctKey &&
      (getExplanationByLang(question, "en", opt) || getExplanationByLang(question, "hi", opt))
  );
  if (incorrectWithText.length > 0) return true;

  const enTexts = optionKeys.map((opt) => getExplanationByLang(question, "en", opt)).filter(Boolean);
  return enTexts.length >= 2 && new Set(enTexts).size > 1;
}

export const ExamReviewExplanation: React.FC<{
  question: ExplanationFields;
  userAnswer: string | null;
  paperMode?: boolean;
}> = ({ question, userAnswer, paperMode }) => {
  const correctKey = question.correctAnswer as OptionKey | undefined;
  const optionKeys: OptionKey[] = ["A", "B", "C", "D"];

  const hasPerOption = hasPerOptionExplanations(question, optionKeys, correctKey);

  const headerClass = paperMode
    ? "upsc-exam-serif text-[10px] sm:text-[11px] font-bold uppercase tracking-wide text-black/70"
    : "text-xs font-bold uppercase tracking-wide text-slate-500";

  return (
    <div
      className={
        paperMode
          ? "upsc-paper-explanation upsc-exam-serif"
          : "rounded-lg border border-blue-200 bg-blue-50/80 p-3"
      }
    >
      <div className={`${headerClass} mb-2 flex flex-wrap items-center gap-x-2 gap-y-0.5`}>
        <span>Explanation / व्याख्या</span>
        <span className="font-normal normal-case text-[10px] text-black/50">
          सही: ({question.correctAnswer?.toLowerCase()})
          {userAnswer ? (
            <>
              {" "}
              · आपका: ({userAnswer.toLowerCase()})
              {userAnswer === question.correctAnswer ? " ✓" : " ✗"}
            </>
          ) : (
            " · Not attempted / प्रयास नहीं"
          )}
        </span>
      </div>

      <div className="space-y-2">
        {hasPerOption ? (
          optionKeys.map((opt) => {
            const hiText = getExplanationByLang(question, "hi", opt);
            const enText = getExplanationByLang(question, "en", opt);
            if (!hiText && !enText) return null;
            const isCorrect = opt === question.correctAnswer;
            const isUserWrong = opt === userAnswer && !isCorrect;
            return (
              <div
                key={opt}
                className={
                  paperMode
                    ? `upsc-paper-explanation-item ${isCorrect ? "upsc-paper-explanation-correct" : isUserWrong ? "upsc-paper-explanation-wrong" : ""}`
                    : `p-2 rounded-lg border text-xs sm:text-sm ${
                        isCorrect
                          ? "border-green-500 bg-green-50"
                          : isUserWrong
                            ? "border-red-400 bg-red-50"
                            : "border-slate-200 bg-white/80"
                      }`
                }
              >
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className={`font-semibold text-[11px] ${isCorrect ? "text-green-700" : isUserWrong ? "text-red-700" : "text-slate-600"}`}>
                    ({opt.toLowerCase()})
                  </span>
                  {isCorrect ? (
                    <span className="text-[9px] font-bold uppercase text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
                      Correct / सही — क्यों सही
                    </span>
                  ) : (
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      isUserWrong ? "text-red-700 bg-red-100" : "text-slate-600 bg-slate-100"
                    }`}>
                      Wrong / गलत — क्यों गलत
                    </span>
                  )}
                  {isUserWrong ? (
                    <span className="text-[9px] font-semibold text-red-600">
                      आपका जवाब / Your answer
                    </span>
                  ) : null}
                </div>
                {hiText ? (
                  <p className="break-words text-[11px] sm:text-xs leading-relaxed mb-1 text-black/85">
                    <span className="font-bold text-[9px] uppercase text-black/50 mr-1.5">हिंदी</span>
                    {hiText}
                  </p>
                ) : null}
                {enText ? (
                  <p className="break-words text-[11px] sm:text-xs leading-relaxed text-black/70">
                    <span className="font-bold text-[9px] uppercase text-black/45 mr-1.5">English</span>
                    {enText}
                  </p>
                ) : null}
              </div>
            );
          })
        ) : correctKey ? (
          <div className={paperMode ? "upsc-paper-explanation-item upsc-paper-explanation-correct" : "p-2 rounded-lg border border-green-500 bg-green-50"}>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-semibold text-[11px] text-green-700">({correctKey.toLowerCase()})</span>
              <span className="text-[9px] font-bold uppercase text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
                Correct / सही — क्यों सही
              </span>
            </div>
            {getExplanationByLang(question, "hi", correctKey) ? (
              <p className="break-words text-[11px] sm:text-xs leading-relaxed mb-1 text-black/85">
                <span className="font-bold text-[9px] uppercase text-black/50 mr-1.5">हिंदी</span>
                {getExplanationByLang(question, "hi", correctKey)}
              </p>
            ) : null}
            {getExplanationByLang(question, "en", correctKey) ? (
              <p className="break-words text-[11px] sm:text-xs leading-relaxed text-black/70">
                <span className="font-bold text-[9px] uppercase text-black/45 mr-1.5">English</span>
                {getExplanationByLang(question, "en", correctKey)}
              </p>
            ) : null}
            {userAnswer && userAnswer !== correctKey ? (
              <p className="mt-2 text-[10px] sm:text-[11px] text-red-700 border-t border-red-200 pt-2">
                आपने ({userAnswer.toLowerCase()}) चुना — गलत। / You chose ({userAnswer.toLowerCase()}) — incorrect.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {(question.eliminationLogic || question.conceptualSource) && (
        <div className="mt-2 pt-2 border-t border-black/10 space-y-1 text-[10px] sm:text-[11px] text-black/65">
          {question.eliminationLogic ? (
            <p>
              <span className="font-semibold">Elimination:</span> {question.eliminationLogic}
            </p>
          ) : null}
          {question.conceptualSource ? (
            <p>
              <span className="font-semibold">Source:</span> {question.conceptualSource}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
};

// Re-export for TestPage
export { getQuestionOptionKeys } from "../../utils/upscQuestionFormat";
