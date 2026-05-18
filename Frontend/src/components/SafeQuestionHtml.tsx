import React from "react";

const ALLOWED_TAGS = /^(table|thead|tbody|tr|td|th|p|br|strong|b|em|i|ul|ol|li|div|span)$/i;

/**
 * Strip dangerous tags for safe rendering of question HTML (e.g. tables).
 * Allows only table, tr, td, th, p, br, strong, em, ul, ol, li, div, span. Removes all attributes.
 */
function sanitize(html: string): string {
  if (!html || typeof html !== "string") return "";
  return html.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/gi, (full, tagName) => {
    if (!ALLOWED_TAGS.test(tagName)) return "";
    const isClose = full.startsWith("</");
    return isClose ? `</${tagName}>` : `<${tagName}>`;
  });
}

interface SafeQuestionHtmlProps {
  html: string;
  className?: string;
}

/**
 * Renders question text with optional HTML (e.g. tables). Use when question may contain <table>.
 */
export const SafeQuestionHtml: React.FC<SafeQuestionHtmlProps> = ({ html, className = "" }) => {
  const hasTable = /<table[\s>]/i.test(html);
  if (!hasTable) {
    return <span className={className}>{html}</span>;
  }
  const cleaned = sanitize(html);
  return (
    <div
      className={`question-html ${className} [&_table]:border [&_table]:border-slate-400 [&_table]:border-collapse [&_td]:border [&_td]:border-slate-400 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-slate-400 [&_th]:px-2 [&_th]:py-1 [&_th]:bg-slate-100 dark:[&_th]:bg-slate-700`}
      dangerouslySetInnerHTML={{ __html: cleaned }}
    />
  );
};
