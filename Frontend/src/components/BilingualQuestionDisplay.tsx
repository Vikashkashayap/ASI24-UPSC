import React from "react";
import { SafeQuestionHtml } from "./SafeQuestionHtml";
import { UpscFormattedQuestionStem } from "./UpscFormattedQuestionStem";
import {
  BilingualQuestionFields,
  getOptionEnglish,
  getOptionHindi,
  getQuestionEnglish,
  getQuestionHindi,
  hasDistinctHindiQuestion,
  isBilingualQuestion,
} from "../utils/bilingualQuestion";

type Lang = "hi" | "en";
type OptionKey = "A" | "B" | "C" | "D";

const OPTION_KEYS: OptionKey[] = ["A", "B", "C", "D"];

function getOptionByLang(q: BilingualQuestionFields, key: OptionKey, lang: Lang): string {
  return lang === "hi" ? getOptionHindi(q, key) : getOptionEnglish(q, key);
}

function renderQuestionBody(
  text: string,
  className: string,
  theme: "dark" | "light",
  allowHtml: boolean
) {
  if (!text) return null;
  if (allowHtml && text.includes("<table")) {
    return (
      <SafeQuestionHtml
        html={text}
        className={`${className} ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}
      />
    );
  }
  return <UpscFormattedQuestionStem text={text} theme={theme} className={className} />;
}

interface BilingualQuestionTextProps {
  question: BilingualQuestionFields;
  theme?: "dark" | "light";
  primaryClassName?: string;
  secondaryClassName?: string;
  englishOverride?: string;
  hindiOverride?: string;
  allowHtml?: boolean;
  lang?: Lang;
}

export const BilingualQuestionText: React.FC<BilingualQuestionTextProps> = ({
  question,
  theme = "light",
  primaryClassName = "text-base sm:text-lg font-semibold leading-relaxed break-words",
  secondaryClassName = "text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed break-words",
  englishOverride,
  hindiOverride,
  allowHtml = false,
  lang,
}) => {
  const en = (englishOverride ?? getQuestionEnglish(question)).trim();
  const hi = (hindiOverride ?? getQuestionHindi(question)).trim();
  const showBilingual = Boolean(
    hindiOverride !== undefined || englishOverride !== undefined
      ? hi && en && hi !== en
      : hasDistinctHindiQuestion(question)
  );

  if (lang) {
    const text = lang === "hi" ? hi : en;
    if (!text) return null;
    return (
      <>
        {renderQuestionBody(
          text,
          `${primaryClassName} ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`,
          theme,
          allowHtml
        )}
      </>
    );
  }

  const primary = showBilingual ? hi : en;
  const secondary = en;

  if (!primary) return null;

  return (
    <div className="space-y-1">
      {renderQuestionBody(
        primary,
        `${primaryClassName} ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`,
        theme,
        allowHtml
      )}
      {showBilingual && secondary
        ? renderQuestionBody(secondary, secondaryClassName, theme, allowHtml)
        : null}
    </div>
  );
};

interface BilingualOptionTextProps {
  question: BilingualQuestionFields;
  optionKey: OptionKey;
  theme?: "dark" | "light";
  lang?: Lang;
}

export const BilingualOptionText: React.FC<BilingualOptionTextProps> = ({
  question,
  optionKey,
  theme = "light",
  lang,
}) => {
  const en = getOptionEnglish(question, optionKey);
  const hi = getOptionHindi(question, optionKey);
  const showBilingual = Boolean(hi && en && hi !== en);

  if (lang) {
    const text = getOptionByLang(question, optionKey, lang);
    if (!text) return null;
    return (
      <span
        className={`text-sm sm:text-base font-medium break-words ${
          theme === "dark" ? "text-slate-100" : "text-slate-800"
        }`}
      >
        {text}
      </span>
    );
  }

  const primary = showBilingual ? hi : en;
  if (!primary) return null;

  return (
    <span className="flex flex-col gap-0.5 min-w-0">
      <span
        className={`text-sm sm:text-base font-medium break-words ${
          theme === "dark" ? "text-slate-100" : "text-slate-800"
        }`}
      >
        {primary}
      </span>
      {showBilingual ? (
        <span className={`text-xs sm:text-sm break-words ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
          {en}
        </span>
      ) : null}
    </span>
  );
};

interface UpscPaperOptionsListProps {
  question: BilingualQuestionFields;
  lang: Lang;
  theme?: "dark" | "light";
}

export const UpscPaperOptionsList: React.FC<UpscPaperOptionsListProps> = ({
  question,
  lang,
  theme = "light",
}) => {
  const textClass =
    theme === "dark"
      ? "text-slate-200"
      : lang === "hi"
        ? "text-slate-900"
        : "text-slate-700";

  return (
    <ol className="list-none space-y-2 sm:space-y-2.5 mt-3 sm:mt-4">
      {OPTION_KEYS.map((key) => {
        const text = getOptionByLang(question, key, lang);
        if (!text) return null;
        return (
          <li key={key} className={`flex gap-2 sm:gap-3 text-sm sm:text-base leading-relaxed ${textClass}`}>
            <span className="font-semibold shrink-0">({key.toLowerCase()})</span>
            <span className="break-words min-w-0">{text}</span>
          </li>
        );
      })}
    </ol>
  );
};

interface UpscPaperQuestionBlockProps {
  question: BilingualQuestionFields;
  theme?: "dark" | "light";
  allowHtml?: boolean;
  showQuestion?: boolean;
  /** Only Hindi/English stems (no options) — for match-the-following headers */
  stemOnly?: boolean;
}

/** UPSC-style: full Hindi block (stem + options), then full English block */
export const UpscPaperQuestionBlock: React.FC<UpscPaperQuestionBlockProps> = ({
  question,
  theme = "light",
  allowHtml = false,
  showQuestion = true,
  stemOnly = false,
}) => {
  const bilingual = isBilingualQuestion(question);
  const hiQuestionClass =
    "text-base sm:text-lg font-semibold leading-relaxed break-words font-[inherit]";
  const enQuestionClass =
    "text-base sm:text-lg leading-relaxed break-words text-slate-700 dark:text-slate-300";

  if (stemOnly) {
    if (!bilingual) {
      return showQuestion ? (
        <BilingualQuestionText question={question} theme={theme} allowHtml={allowHtml} />
      ) : null;
    }
    return (
      <div className="space-y-5 sm:space-y-6">
        {showQuestion ? (
          <BilingualQuestionText
            question={question}
            theme={theme}
            allowHtml={allowHtml}
            lang="hi"
            primaryClassName={hiQuestionClass}
          />
        ) : null}
        <div
          className={`border-t border-dashed ${theme === "dark" ? "border-slate-600" : "border-slate-300"}`}
          aria-hidden
        />
        {showQuestion ? (
          <BilingualQuestionText
            question={question}
            theme={theme}
            allowHtml={allowHtml}
            lang="en"
            primaryClassName={enQuestionClass}
          />
        ) : null}
      </div>
    );
  }

  if (!bilingual) {
    return (
      <div className="space-y-1">
        {showQuestion ? (
          <BilingualQuestionText question={question} theme={theme} allowHtml={allowHtml} />
        ) : null}
        <UpscPaperOptionsList question={question} lang="en" theme={theme} />
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <section aria-label="Question in Hindi">
        {showQuestion ? (
          <BilingualQuestionText
            question={question}
            theme={theme}
            allowHtml={allowHtml}
            lang="hi"
            primaryClassName={hiQuestionClass}
          />
        ) : null}
        <UpscPaperOptionsList question={question} lang="hi" theme={theme} />
      </section>

      <div
        className={`border-t border-dashed pt-5 sm:pt-6 ${
          theme === "dark" ? "border-slate-600" : "border-slate-300"
        }`}
        aria-hidden
      />

      <section aria-label="Question in English">
        {showQuestion ? (
          <BilingualQuestionText
            question={question}
            theme={theme}
            allowHtml={allowHtml}
            lang="en"
            primaryClassName={enQuestionClass}
          />
        ) : null}
        <UpscPaperOptionsList question={question} lang="en" theme={theme} />
      </section>
    </div>
  );
};



