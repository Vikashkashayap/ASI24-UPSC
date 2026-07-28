import React from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { UpscFormattedQuestionStem } from "../UpscFormattedQuestionStem";
import {
  BilingualQuestionFields,
  ExamLang,
  OptionKey,
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
    assertionReason_hi?: { assertion: string; reason: string } | null;
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
  hideLabel,
}: {
  label: string;
  text: string;
  compact?: boolean;
  accent?: "blue" | "slate";
  paperMode?: boolean;
  hideLabel?: boolean;
}) {
  return (
    <div className="min-w-0">
      {!hideLabel ? (
        <div
          className={`text-[10px] sm:text-[11px] font-bold uppercase mb-1.5 tracking-wide ${
            paperMode
              ? "upsc-paper-lang-label"
              : accent === "blue"
                ? "text-blue-600"
                : "text-slate-400"
          }`}
        >
          {label}
        </div>
      ) : null}
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
  const textSize = compact ? "exam-question-text" : "text-sm";
  const introClass = paperMode
    ? `${textSize} font-semibold text-black upsc-exam-serif`
    : `${textSize} font-semibold text-slate-900`;
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
            {data.columnA.map((item, i) => {
              const label =
                typeof item === "string"
                  ? item.trim()
                  : typeof item === "object" && item
                    ? String(
                        (item as { text?: string; hi?: string; en?: string }).text ||
                          (item as { text?: string; hi?: string; en?: string }).hi ||
                          (item as { text?: string; hi?: string; en?: string }).en ||
                          ""
                      ).trim()
                    : String(item || "").trim();
              const safe = label && label !== "[object Object]" && !/^([—–\-−…]|\.\.\.)$/.test(label) ? label : "";
              if (!safe) return null;
              return (
                <li key={i} className="flex gap-2 break-words leading-relaxed">
                  <span className={numClass}>{String.fromCharCode(65 + i)}.</span>
                  <span className={itemTextClass}>{safe}</span>
                </li>
              );
            })}
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
            {data.columnB.map((raw, i) => {
              const label =
                typeof raw === "string"
                  ? raw.trim()
                  : typeof raw === "object" && raw
                    ? String(
                        (raw as { text?: string; hi?: string; en?: string }).text ||
                          (raw as { text?: string; hi?: string; en?: string }).hi ||
                          (raw as { text?: string; hi?: string; en?: string }).en ||
                          ""
                      ).trim()
                    : String(raw || "").trim();
              const item = label && label !== "[object Object]" && !/^([—–\-−…]|\.\.\.)$/.test(label) ? label : "";
              if (!item) return null;
              return (
                <li key={i} className="flex gap-2 break-words leading-relaxed">
                  <span className={numClassII}>{i + 1}.</span>
                  <span className={itemTextClass}>{item}</span>
                </li>
              );
            })}
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
  hideLabel,
}: {
  label: string;
  data: ParsedMatchFollowing;
  tableLang: "en" | "hi";
  compact?: boolean;
  accent: "blue" | "slate";
  paperMode?: boolean;
  hideLabel?: boolean;
}) {
  return (
    <div className="min-w-0">
      {!hideLabel ? (
        <div
          className={`text-[10px] sm:text-[11px] font-bold uppercase mb-1.5 tracking-wide ${
            paperMode
              ? "upsc-paper-lang-label"
              : accent === "blue"
                ? "text-blue-600"
                : "text-slate-400"
          }`}
        >
          {label}
        </div>
      ) : null}
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

  const showBoth = !lang || lang === "both";
  const showLabels = showBoth;

  if (showBoth) {
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
          hideLabel={!showLabels}
        />
      );
    } else if (!enData) {
      // Only plain-text Hindi fallback when this is NOT a match question
      const hiText = getQuestionHindi(question, { strict: true });
      if (hiText) {
        blocks.push(
          <LangPanel key="hi-fallback" label="हिंदी" text={hiText} compact={compact} accent="blue" paperMode={paperMode} />
        );
      }
    }
    // If EN is match but HI missing/broken: hiData already falls back to EN columns via resolveMatchColumns
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
          hideLabel={!showLabels}
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
    if (blocks.length === 0) return null;
    return <div className="space-y-4">{blocks}</div>;
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
          hideLabel
        />
      );
    } else if (!enData) {
      const hiText = getQuestionHindi(question, { strict: true });
      if (hiText) {
        blocks.push(
          <LangPanel key="hi-fallback" label="हिंदी" text={hiText} compact={compact} accent="blue" paperMode={paperMode} hideLabel />
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
          hideLabel
        />
      );
    } else {
      const enText = getQuestionEnglish(question);
      if (enText) {
        blocks.push(
          <LangPanel key="en-fallback" label="English" text={enText} compact={compact} accent="slate" paperMode={paperMode} hideLabel />
        );
      }
    }
  };

  if (hiFirst) {
    pushHi();
    if (blocks.length === 0) pushEn();
  } else {
    pushEn();
    if (blocks.length === 0) pushHi();
  }

  if (blocks.length === 0) {
    const fallback = getQuestionEnglish(question) || getQuestionHindi(question, { strict: false });
    if (fallback) {
      return (
        <LangPanel
          key="fallback"
          label={lang === "hi" ? "हिंदी" : "English"}
          text={fallback}
          compact={compact}
          accent={lang === "hi" ? "blue" : "slate"}
          paperMode={paperMode}
          hideLabel
        />
      );
    }
    return null;
  }

  return <div className="space-y-3">{blocks}</div>;
}

function getAssertionStemText(
  question: ExamQuestionBodyProps["question"],
  lang: "en" | "hi"
): string | null {
  if (lang === "hi") {
    const arHi = question.assertionReason_hi;
    if (arHi?.assertion && arHi?.reason) {
      return buildAssertionReasonStem({
        assertion: arHi.assertion,
        reason: arHi.reason,
      });
    }
    const text = getQuestionHindi(question, { strict: true });
    if (text && isAssertionReasonText(text)) return text;
    // Soft accept: Hindi stem with अभिकथन/कारण even if getQuestionHindi strict cleared it
    const rawHi = String(question.question_hi || "").trim();
    if (rawHi && isAssertionReasonText(rawHi)) return rawHi;
    return null;
  }

  const text = getQuestionEnglish(question);
  if (text && isAssertionReasonText(text)) return text;

  if (question.assertionReason?.assertion) {
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

  if (!lang || lang === "both") {
    if (!lang && !hiStem) {
      return (
        <UpscFormattedQuestionStem
          text={enStem || hiStem!}
          theme="light"
          compact={compact}
        />
      );
    }
    const blocks: React.ReactNode[] = [];
    if (hiStem) {
      blocks.push(
        <LangPanel key="hi" label="हिंदी" text={hiStem} compact={compact} accent="blue" paperMode={paperMode} />
      );
    }
    if (enStem) {
      blocks.push(
        <LangPanel key="en" label="English" text={enStem} compact={compact} accent="slate" paperMode={paperMode} />
      );
    }
    return <div className="space-y-3">{blocks}</div>;
  }

  const only = lang === "hi" ? hiStem : enStem;
  if (!only) {
    return (
      <UpscFormattedQuestionStem
        text={enStem || hiStem!}
        theme="light"
        compact={compact}
      />
    );
  }
  return (
    <LangPanel
      key={lang}
      label={lang === "hi" ? "हिंदी" : "English"}
      text={only}
      compact={compact}
      accent={lang === "hi" ? "blue" : "slate"}
      paperMode={paperMode}
      hideLabel
    />
  );
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
  let en = getQuestionEnglish(question);
  let hi = getQuestionHindi(question, { strict: true });

  // Rebuild stem from structured match columns when text was stored empty
  if (!en && hasUsableMatchColumns((question as ExamQuestionBodyProps["question"]).matchColumns)) {
    const cols = (question as ExamQuestionBodyProps["question"]).matchColumns!;
    const lines = ["Match the following:", "List-I"];
    (cols.columnA || []).forEach((item, i) => {
      const t = coerceDisplayItem(item);
      if (t) lines.push(`${String.fromCharCode(65 + i)}. ${t}`);
    });
    lines.push("List-II");
    (cols.columnB || []).forEach((item, i) => {
      const t = coerceDisplayItem(item);
      if (t) lines.push(`${i + 1}. ${t}`);
    });
    lines.push("Select the correct answer using the code given below:");
    en = lines.join("\n");
  }
  if (!hi && hasUsableMatchColumns((question as ExamQuestionBodyProps["question"]).matchColumns_hi)) {
    const cols = (question as ExamQuestionBodyProps["question"]).matchColumns_hi!;
    const lines = ["निम्नलिखित का मिलान कीजिए:", "सूची-I"];
    (cols.columnA || []).forEach((item, i) => {
      const t = coerceDisplayItem(item);
      if (t) lines.push(`${String.fromCharCode(65 + i)}. ${t}`);
    });
    lines.push("सूची-II");
    (cols.columnB || []).forEach((item, i) => {
      const t = coerceDisplayItem(item);
      if (t) lines.push(`${i + 1}. ${t}`);
    });
    lines.push("नीचे दिए गए कूट का प्रयोग कर सही उत्तर चुनिए:");
    hi = lines.join("\n");
  }

  if (!en && !hi) return null;

  // Both languages — UPSC bilingual paper style
  if (lang === "both" || (!lang && hasDistinctHindiQuestion(question))) {
    return (
      <div className="space-y-3">
        {hi ? (
          <LangPanel label="हिंदी" text={hi} compact={compact} accent="blue" paperMode={paperMode} />
        ) : null}
        {en ? (
          <LangPanel label="English" text={en} compact={compact} accent="slate" paperMode={paperMode} />
        ) : null}
      </div>
    );
  }

  if (lang === "hi" || lang === "en") {
    const text = lang === "hi" ? hi || en : en || hi;
    return (
      <LangPanel
        label={lang === "hi" ? "हिंदी" : "English"}
        text={text}
        compact={compact}
        accent={lang === "hi" ? "blue" : "slate"}
        paperMode={paperMode}
        hideLabel
      />
    );
  }

  return <UpscFormattedQuestionStem text={en || hi} theme="light" compact={compact} />;
}

function hasUsableMatchColumns(cols?: { columnA?: string[]; columnB?: string[] } | null): boolean {
  const a = (cols?.columnA || []).filter((x) => coerceDisplayItem(x).length >= 1);
  const b = (cols?.columnB || []).filter((x) => coerceDisplayItem(x).length >= 1);
  return a.length >= 2 && b.length >= 2;
}

function coerceDisplayItem(x: unknown): string {
  if (x == null) return "";
  if (typeof x === "string" || typeof x === "number" || typeof x === "boolean") {
    const s = String(x).trim();
    return s === "[object Object]" ? "" : s;
  }
  if (typeof x === "object") {
    const o = x as Record<string, unknown>;
    for (const k of ["text", "hi", "en", "item", "content", "value", "label", "name"]) {
      if (typeof o[k] === "string" && String(o[k]).trim()) return String(o[k]).trim();
    }
  }
  return "";
}

function detectMatch(question: ExamQuestionBodyProps["question"]): boolean {
  if (hasUsableMatchColumns(question.matchColumns) || hasUsableMatchColumns(question.matchColumns_hi)) {
    return true;
  }
  const en = getQuestionEnglish(question);
  const hi = getQuestionHindi(question, { strict: true });
  const enParsed = parseMatchFollowingFromText(en);
  const hiParsed = hi ? parseMatchFollowingFromText(hi) : null;
  return Boolean(
    (enParsed && enParsed.columnA.length >= 2 && enParsed.columnB.length >= 2) ||
      (hiParsed && hiParsed.columnA.length >= 2 && hiParsed.columnB.length >= 2)
  );
}

function hasUsableAssertion(ar?: { assertion?: string; reason?: string } | null): boolean {
  return Boolean(
    String(ar?.assertion || "").trim().length >= 10 && String(ar?.reason || "").trim().length >= 10
  );
}

function detectAssertion(question: ExamQuestionBodyProps["question"]): boolean {
  if (hasUsableAssertion(question.assertionReason)) return true;
  const en = getQuestionEnglish(question);
  const hi = getQuestionHindi(question, { strict: true });
  return isAssertionReasonText(en) || isAssertionReasonText(hi);
}

function repairStemFromColumns(question: ExamQuestionBodyProps["question"]) {
  const q = { ...question };
  if (!getQuestionEnglish(q) && hasUsableMatchColumns(q.matchColumns)) {
    const cols = q.matchColumns!;
    const lines = ["Match the following:", "List-I"];
    (cols.columnA || []).forEach((item, i) => {
      if (String(item || "").trim()) lines.push(`${String.fromCharCode(65 + i)}. ${item}`);
    });
    lines.push("List-II");
    (cols.columnB || []).forEach((item, i) => {
      if (String(item || "").trim()) lines.push(`${i + 1}. ${item}`);
    });
    lines.push("Select the correct answer using the code given below:");
    q.question = lines.join("\n");
    q.question_en = q.question;
  }
  if (!getQuestionHindi(q, { strict: true }) && hasUsableMatchColumns(q.matchColumns_hi)) {
    const cols = q.matchColumns_hi!;
    const lines = ["निम्नलिखित का मिलान कीजिए:", "सूची-I"];
    (cols.columnA || []).forEach((item, i) => {
      if (String(item || "").trim()) lines.push(`${String.fromCharCode(65 + i)}. ${item}`);
    });
    lines.push("सूची-II");
    (cols.columnB || []).forEach((item, i) => {
      if (String(item || "").trim()) lines.push(`${i + 1}. ${item}`);
    });
    lines.push("नीचे दिए गए कूट का प्रयोग कर सही उत्तर चुनिए:");
    q.question_hi = lines.join("\n");
  }
  return q;
}

export const ExamQuestionBody: React.FC<ExamQuestionBodyProps> = ({
  question,
  compact = true,
  lang,
  paperMode,
}) => {
  const repaired = repairStemFromColumns(question);
  const isMatch = detectMatch(repaired);
  const isAssertion = detectAssertion(repaired);

  return (
    <div className={`space-y-2 sm:space-y-3 min-h-0 ${paperMode ? "upsc-exam-serif text-black" : ""}`}>
      {isMatch ? (
        <BilingualMatchView question={repaired} compact={compact} lang={lang} paperMode={paperMode} />
      ) : isAssertion ? (
        <BilingualAssertionView question={repaired} compact={compact} lang={lang} paperMode={paperMode} />
      ) : (
        <ExamBilingualStem question={repaired} compact={compact} lang={lang} paperMode={paperMode} />
      )}

      {repaired.tableData?.headers?.length ? (
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
                {repaired.tableData.headers.map((h, i) => (
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
              {(repaired.tableData.rows || []).map((row, ri) => (
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
  const showBoth = (lang === "both" || !lang) && Boolean(hi && en && hi !== en);
  const singleLang = lang === "hi" || lang === "en";
  const displayText = singleLang
    ? lang === "hi"
      ? hi || en
      : en || hi
    : en || hi;
  const missingHi = lang === "hi" && !hi;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left transition-all touch-manipulation min-h-[48px] flex items-center ${
        paperMode ? "upsc-paper-option upsc-exam-serif" : "rounded-xl"
      } ${
        compact ? "px-3 sm:px-4 py-2.5 sm:py-3" : "px-4 py-3 text-sm"
      } ${
        selected
          ? paperMode
            ? "upsc-paper-option-selected border"
            : "border-blue-500 bg-blue-50/80 ring-2 ring-blue-100 shadow-sm"
          : paperMode
            ? "border"
            : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50/80 active:bg-slate-100"
      }`}
    >
      <div className="flex gap-3 items-start w-full">
        <span
          className={`exam-option-radio ${selected ? "exam-option-radio-selected" : ""}`}
          aria-hidden
        >
          {selected ? <span className="exam-option-radio-dot" /> : null}
        </span>
        <div className="min-w-0 flex-1 exam-option-text py-0.5">
          {missingHi ? (
            <p className="break-words">{en}</p>
          ) : showBoth ? (
            <div className="space-y-1">
              <p className="break-words font-medium text-slate-900">{hi}</p>
              <p className="break-words text-slate-500 text-[12px] sm:text-[13px] leading-relaxed">{en}</p>
            </div>
          ) : (
            <p className="break-words">{displayText}</p>
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
  const showBoth = (lang === "both" || !lang) && Boolean(hi && en && hi !== en);
  const singleLang = lang === "hi" || lang === "en";
  const displayText = singleLang
    ? lang === "hi"
      ? hi || en
      : en || hi
    : en || hi;
  const missingHi = lang === "hi" && !hi;

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
      className={`w-full text-left min-h-[48px] flex items-center rounded-xl ${
        paperMode ? `upsc-paper-option upsc-exam-serif ${stateClass}` : `border-2 ${stateClass}`
      } ${
        compact ? "px-3 sm:px-4 py-2.5 sm:py-3" : "px-4 py-3 text-sm"
      } ${
        !paperMode && !isCorrect && !isUserWrong
          ? "border-slate-200 bg-white"
          : ""
      }`}
    >
      <div className="flex gap-3 items-start w-full">
        <span
          className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 text-[10px] font-bold ${
            isCorrect
              ? "bg-green-600 text-white"
              : isUserWrong
                ? "bg-red-500 text-white"
                : "bg-slate-100 text-slate-500 border border-slate-200"
          }`}
        >
          {optionKey}
        </span>
        <div className="min-w-0 flex-1 exam-option-text py-0.5">
          {missingHi ? (
            <p className="break-words leading-relaxed">{en}</p>
          ) : showBoth ? (
            <div className="space-y-0.5">
              <p className="break-words leading-relaxed font-medium text-slate-900">{hi}</p>
              <p className="break-words leading-relaxed text-slate-500 text-[10px] sm:text-[11px]">{en}</p>
            </div>
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

const GENERIC_WRONG_EXPLAIN_RE =
  /see the correct option explanation above|common distractor for this topic|does not match the notes on this point|does not match the notes and is a common/i;

function isGenericWrongExplanation(text: string): boolean {
  const t = String(text || "").trim();
  if (!t) return true;
  if (GENERIC_WRONG_EXPLAIN_RE.test(t)) return true;
  // Too short to be a real teaching explanation
  if (t.split(/\s+/).filter(Boolean).length < 18) return true;
  return false;
}

function isUselessSource(text?: string | null): boolean {
  const t = String(text || "").trim();
  if (!t) return true;
  if (/^(generated|ai|llm|n\/?a|none|null|undefined|source)$/i.test(t)) return true;
  if (t.length < 12) return true;
  return false;
}

function hasPerOptionExplanations(
  question: ExplanationFields,
  optionKeys: OptionKey[],
  correctKey?: OptionKey
): boolean {
  const raw = question.explanation_en ?? question.explanation;
  if (!raw || typeof raw === "string") return false;

  const realWrong = optionKeys.filter((opt) => {
    if (opt === correctKey) return false;
    const en = getExplanationByLang(question, "en", opt);
    const hi = getExplanationByLang(question, "hi", opt);
    if (en && !isGenericWrongExplanation(en)) return true;
    if (hi && !isGenericWrongExplanation(hi)) return true;
    return false;
  });
  return realWrong.length >= 2;
}

function getFullTeachingExplanation(question: ExplanationFields, correctKey?: OptionKey): string {
  const raw = question.explanation_en ?? question.explanation;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (raw && typeof raw === "object" && correctKey) {
    const correct = String(raw[correctKey] || "").trim();
    if (correct && !isGenericWrongExplanation(correct)) {
      // Prefer full combined teaching if correct alone is short but others exist as stubs
      const parts = (["A", "B", "C", "D"] as OptionKey[])
        .map((k) => String(raw[k] || "").trim())
        .filter((t) => t && !isGenericWrongExplanation(t));
      if (parts.length >= 2) return parts.join(" ");
      return correct;
    }
    const joined = (["A", "B", "C", "D"] as OptionKey[])
      .map((k) => String(raw[k] || "").trim())
      .filter(Boolean)
      .join(" ");
    return joined;
  }
  return getExplanationByLang(question, "en", correctKey) || "";
}

export const ExamReviewExplanation: React.FC<{
  question: ExplanationFields;
  userAnswer: string | null;
  paperMode?: boolean;
}> = ({ question, userAnswer, paperMode }) => {
  const correctKey = question.correctAnswer as OptionKey | undefined;
  const optionKeys: OptionKey[] = ["A", "B", "C", "D"];

  const hasPerOption = hasPerOptionExplanations(question, optionKeys, correctKey);
  const teachingText = getFullTeachingExplanation(question, correctKey);
  const teachingHi = correctKey ? getExplanationByLang(question, "hi", correctKey) : "";

  const headerClass = paperMode
    ? "upsc-exam-serif text-[10px] sm:text-[11px] font-bold uppercase tracking-wide text-black/70"
    : "text-xs font-bold uppercase tracking-wide text-slate-500";

  const showSource = !isUselessSource(question.conceptualSource);
  const showElimination =
    Boolean(question.eliminationLogic?.trim()) &&
    !isGenericWrongExplanation(question.eliminationLogic || "");

  return (
    <div
      className={
        paperMode
          ? "upsc-paper-explanation upsc-exam-serif"
          : "rounded-xl border-2 border-blue-200 bg-gradient-to-b from-blue-50 to-white p-3 sm:p-4 shadow-sm"
      }
    >
      <div className={`${headerClass} mb-3 flex flex-wrap items-center gap-x-2 gap-y-0.5`}>
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

      <div className="space-y-2.5">
        {/* Correct — always first, high visual emphasis */}
        {correctKey ? (
          <div
            className={
              paperMode
                ? "upsc-paper-explanation-item upsc-paper-explanation-correct"
                : "p-3 sm:p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200/80 shadow-sm"
            }
          >
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 text-white text-[11px] font-bold">
                {correctKey}
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wide text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded-md">
                Correct answer / सही उत्तर — क्यों सही
              </span>
              {userAnswer === correctKey ? (
                <span className="text-[10px] font-semibold text-emerald-700">आपका जवाब सही ✓</span>
              ) : null}
            </div>
            {teachingHi && !isGenericWrongExplanation(teachingHi) ? (
              <p className="break-words text-[12px] sm:text-sm leading-relaxed mb-2 text-emerald-950 font-medium">
                <span className="font-bold text-[9px] uppercase text-emerald-700/70 mr-1.5">हिंदी</span>
                {teachingHi}
              </p>
            ) : null}
            {teachingText ? (
              <p className="break-words text-[12px] sm:text-sm leading-relaxed text-emerald-950/90">
                {!teachingHi || isGenericWrongExplanation(teachingHi) ? null : (
                  <span className="font-bold text-[9px] uppercase text-emerald-700/60 mr-1.5">English</span>
                )}
                {hasPerOption
                  ? getExplanationByLang(question, "en", correctKey) || teachingText
                  : teachingText}
              </p>
            ) : (
              <p className="text-xs text-emerald-800/70 italic">Explanation unavailable for this question.</p>
            )}
          </div>
        ) : null}

        {/* Wrong options — only real teaching text, never generic stubs */}
        {hasPerOption
          ? optionKeys
              .filter((opt) => opt !== correctKey)
              .map((opt) => {
                const hiText = getExplanationByLang(question, "hi", opt);
                const enText = getExplanationByLang(question, "en", opt);
                const hiOk = hiText && !isGenericWrongExplanation(hiText);
                const enOk = enText && !isGenericWrongExplanation(enText);
                if (!hiOk && !enOk) return null;
                const isUserWrong = opt === userAnswer;
                return (
                  <div
                    key={opt}
                    className={
                      paperMode
                        ? `upsc-paper-explanation-item ${isUserWrong ? "upsc-paper-explanation-wrong" : ""}`
                        : `p-2.5 sm:p-3 rounded-lg border text-xs sm:text-sm ${
                            isUserWrong
                              ? "border-red-400 bg-red-50"
                              : "border-slate-200 bg-white/90"
                          }`
                    }
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span
                        className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                          isUserWrong ? "bg-red-500 text-white" : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {opt}
                      </span>
                      <span
                        className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          isUserWrong ? "text-red-700 bg-red-100" : "text-slate-600 bg-slate-100"
                        }`}
                      >
                        Wrong / गलत — क्यों गलत
                      </span>
                      {isUserWrong ? (
                        <span className="text-[9px] font-semibold text-red-600">आपका जवाब / Your answer</span>
                      ) : null}
                    </div>
                    {hiOk ? (
                      <p className="break-words text-[11px] sm:text-xs leading-relaxed mb-1 text-black/85">
                        <span className="font-bold text-[9px] uppercase text-black/50 mr-1.5">हिंदी</span>
                        {hiText}
                      </p>
                    ) : null}
                    {enOk ? (
                      <p className="break-words text-[11px] sm:text-xs leading-relaxed text-black/75">
                        {hiOk ? (
                          <span className="font-bold text-[9px] uppercase text-black/45 mr-1.5">English</span>
                        ) : null}
                        {enText}
                      </p>
                    ) : null}
                  </div>
                );
              })
          : null}
      </div>

      {(showElimination || showSource) && (
        <div className="mt-2.5 pt-2 border-t border-black/10 space-y-1 text-[10px] sm:text-[11px] text-black/65">
          {showElimination ? (
            <p>
              <span className="font-semibold">Elimination:</span> {question.eliminationLogic}
            </p>
          ) : null}
          {showSource ? (
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
