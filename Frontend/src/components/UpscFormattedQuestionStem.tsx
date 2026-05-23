import React from "react";
import { isStructuredUpscStem, parseUpscQuestionStem, type UpscStemPart } from "../utils/upscQuestionFormat";

type Theme = "dark" | "light";

interface Props {
  text: string;
  theme?: Theme;
  className?: string;
}

function partLabel(role: "A" | "R", theme: Theme): string {
  return role === "A"
    ? theme === "dark"
      ? "Assertion (A)"
      : "Assertion (A)"
    : theme === "dark"
      ? "Reason (R)"
      : "Reason (R)";
}

function renderParts(parts: UpscStemPart[], theme: Theme, className: string) {
  const introClass =
    theme === "dark" ? "text-slate-100 font-semibold" : "text-slate-900 font-semibold";
  const stmtClass = theme === "dark" ? "text-slate-200" : "text-slate-800";
  const promptClass =
    theme === "dark" ? "text-slate-300 font-medium italic" : "text-slate-700 font-medium italic";

  return (
    <div className={`space-y-3 ${className}`}>
      {parts.map((part, index) => {
        if (part.type === "intro") {
          return (
            <p key={`intro-${index}`} className={`${introClass} text-base sm:text-lg leading-relaxed`}>
              {part.text}
            </p>
          );
        }
        if (part.type === "statement") {
          return (
            <div key={`stmt-${part.number}-${index}`} className="flex gap-2 sm:gap-3 pl-0 sm:pl-1">
              <span className={`shrink-0 font-semibold tabular-nums ${stmtClass}`}>{part.number}.</span>
              <p className={`${stmtClass} text-base sm:text-lg leading-relaxed flex-1 min-w-0`}>{part.text}</p>
            </div>
          );
        }
        if (part.type === "prompt") {
          return (
            <p key={`prompt-${index}`} className={`${promptClass} text-base sm:text-lg leading-relaxed pt-1`}>
              {part.text}
            </p>
          );
        }
        if (part.type === "assertion") {
          return (
            <div
              key={`ar-${part.role}-${index}`}
              className={`rounded-lg border p-3 sm:p-4 ${
                theme === "dark" ? "border-slate-600 bg-slate-800/50" : "border-slate-300 bg-slate-50"
              }`}
            >
              <div
                className={`text-xs font-bold uppercase tracking-wide mb-1.5 ${
                  theme === "dark" ? "text-blue-400" : "text-blue-700"
                }`}
              >
                {partLabel(part.role, theme)}
              </div>
              <p className={`${stmtClass} text-base sm:text-lg leading-relaxed`}>{part.text}</p>
            </div>
          );
        }
        return (
          <p key={`plain-${index}`} className={`${stmtClass} text-base sm:text-lg leading-relaxed`}>
            {part.text}
          </p>
        );
      })}
    </div>
  );
}

export const UpscFormattedQuestionStem: React.FC<Props> = ({ text, theme = "light", className = "" }) => {
  const parts = parseUpscQuestionStem(text);
  if (!isStructuredUpscStem(parts)) {
    return (
      <p
        className={`${className} text-base sm:text-lg leading-relaxed break-words ${
          theme === "dark" ? "text-slate-100" : "text-slate-900"
        }`}
      >
        {text}
      </p>
    );
  }
  return renderParts(parts, theme, className);
};
