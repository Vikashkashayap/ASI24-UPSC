import React from 'react';
import { useTheme } from '../hooks/useTheme';

interface FormattedTextProps {
  text: string;
  className?: string;
}

export const FormattedText: React.FC<FormattedTextProps> = ({ text, className = '' }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const formatText = (inputText: string) => {
    const lines = inputText.split('\n');
    const formattedElements: React.ReactNode[] = [];
    let currentListItems: string[] = [];
    let listType: 'bullet' | 'numbered' | null = null;

    const formatInlineText = (raw: string) => {
      let formatted = raw.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      formatted = formatted.replace(/__(.*?)__/g, '<strong>$1</strong>');
      formatted = formatted.replace(/(?<!\*)\*(?!\*)([^*]+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
      formatted = formatted.replace(/(?<!_)_(?!_)([^_]+?)(?<!_)_(?!_)/g, '<em>$1</em>');

      const parts = formatted.split(/(<strong>.*?<\/strong>|<em>.*?<\/em>)/g);
      return parts.map((part, idx) => {
        if (part.startsWith('<strong>')) {
          const content = part.replace(/<\/?strong>/g, '');
          return (
            <strong
              key={idx}
              className={`font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}
            >
              {content}
            </strong>
          );
        }
        if (part.startsWith('<em>')) {
          const content = part.replace(/<\/?em>/g, '');
          return (
            <em key={idx} className="italic">
              {content}
            </em>
          );
        }
        return <React.Fragment key={idx}>{part}</React.Fragment>;
      });
    };

    const flushList = () => {
      if (currentListItems.length === 0) return;
      const listElement =
        listType === 'bullet' ? (
          <ul
            className="my-3 ml-1 space-y-2 list-none"
            key={`list-${formattedElements.length}`}
          >
            {currentListItems.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span
                  className={`mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    isDark ? 'bg-blue-400' : 'bg-blue-600'
                  }`}
                />
                <span className="flex-1 leading-relaxed">{formatInlineText(item)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <ol
            className="my-3 ml-1 space-y-2 list-none"
            key={`list-${formattedElements.length}`}
          >
            {currentListItems.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span
                  className={`text-xs font-bold tabular-nums mt-0.5 w-5 flex-shrink-0 ${
                    isDark ? 'text-blue-400' : 'text-blue-600'
                  }`}
                >
                  {idx + 1}.
                </span>
                <span className="flex-1 leading-relaxed">{formatInlineText(item)}</span>
              </li>
            ))}
          </ol>
        );
      formattedElements.push(listElement);
      currentListItems = [];
      listType = null;
    };

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      if (trimmedLine.match(/^[-*•]\s+/)) {
        if (listType !== 'bullet') {
          flushList();
          listType = 'bullet';
        }
        currentListItems.push(trimmedLine.replace(/^[-*•]\s+/, ''));
        return;
      }

      if (trimmedLine.match(/^\d+\.\s+/)) {
        if (listType !== 'numbered') {
          flushList();
          listType = 'numbered';
        }
        currentListItems.push(trimmedLine.replace(/^\d+\.\s+/, ''));
        return;
      }

      if (listType && trimmedLine !== '') {
        flushList();
      }

      if (trimmedLine.match(/^#{1,3}\s+/)) {
        const level = trimmedLine.match(/^#+/)?.[0].length || 1;
        const headerText = trimmedLine.replace(/^#+\s+/, '');
        const size =
          level === 1
            ? 'text-base font-bold'
            : level === 2
              ? 'text-[15px] font-bold'
              : 'text-sm font-semibold';
        formattedElements.push(
          <div
            key={index}
            className={`${size} mt-4 mb-2 first:mt-0 ${
              isDark ? 'text-slate-50' : 'text-slate-900'
            }`}
          >
            {formatInlineText(headerText)}
          </div>
        );
        return;
      }

      // Bold-only line as section heading: **Title:** or **Title**
      if (trimmedLine.match(/^\*\*[^*]+\*\*:?\s*$/)) {
        const headerText = trimmedLine
          .replace(/^\*\*/, '')
          .replace(/\*\*:?\s*$/, '')
          .replace(/:$/, '');
        formattedElements.push(
          <div
            key={index}
            className={`text-[15px] font-bold mt-4 mb-2 first:mt-0 tracking-tight ${
              isDark ? 'text-slate-50' : 'text-slate-900'
            }`}
          >
            {headerText}
          </div>
        );
        return;
      }

      if (trimmedLine === '') {
        formattedElements.push(<div key={index} className="h-2" />);
        return;
      }

      formattedElements.push(
        <p key={index} className="my-1.5 leading-relaxed">
          {formatInlineText(trimmedLine)}
        </p>
      );
    });

    flushList();
    return formattedElements;
  };

  return <div className={`leading-relaxed ${className}`}>{formatText(text)}</div>;
};
