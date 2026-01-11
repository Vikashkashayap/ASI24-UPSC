import React from 'react';
import { useTheme } from '../hooks/useTheme';

interface FormattedTextProps {
  text: string;
  className?: string;
}

export const FormattedText: React.FC<FormattedTextProps> = ({ text, className = '' }) => {
  const { theme } = useTheme();

  // Parse and format the text with basic markdown support
  const formatText = (inputText: string) => {
    const lines = inputText.split('\n');
    const formattedElements: React.ReactNode[] = [];
    let currentListItems: string[] = [];
    let listType: 'bullet' | 'numbered' | null = null;

    const flushList = () => {
      if (currentListItems.length > 0) {
        const listElement = listType === 'bullet' ? (
          <ul className="ml-4 space-y-1 my-2" key={`list-${formattedElements.length}`}>
            {currentListItems.map((item, idx) => (
              <li key={idx} className="flex items-start">
                <span className="mr-2 mt-1.5 text-xs">•</span>
                <span className="flex-1">{formatInlineText(item)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <ol className="ml-4 space-y-1 my-2" key={`list-${formattedElements.length}`}>
            {currentListItems.map((item, idx) => (
              <li key={idx} className="flex items-start">
                <span className="mr-2 mt-1.5 text-xs font-medium">{idx + 1}.</span>
                <span className="flex-1">{formatInlineText(item)}</span>
              </li>
            ))}
          </ol>
        );
        formattedElements.push(listElement);
        currentListItems = [];
        listType = null;
      }
    };

    const formatInlineText = (text: string) => {
      // Handle bold text (**text** or __text__)
      let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      formatted = formatted.replace(/__(.*?)__/g, '<strong>$1</strong>');

      // Handle italic text (*text* or _text_)
      formatted = formatted.replace(/(?<!\*)\*(?!\*)([^*]+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
      formatted = formatted.replace(/(?<!_)_(?!_)([^_]+?)(?<!_)_(?!_)/g, '<em>$1</em>');

      // Convert HTML to React elements
      const parts = formatted.split(/(<strong>.*?<\/strong>|<em>.*?<\/em>)/g);
      return parts.map((part, idx) => {
        if (part.startsWith('<strong>')) {
          const content = part.replace(/<\/?strong>/g, '');
          return <strong key={idx} className="font-semibold">{content}</strong>;
        } else if (part.startsWith('<em>')) {
          const content = part.replace(/<\/?em>/g, '');
          return <em key={idx} className="italic">{content}</em>;
        }
        return part;
      });
    };

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      // Check for bullet points
      if (trimmedLine.match(/^[-*]\s+/)) {
        if (listType !== 'bullet') {
          flushList();
          listType = 'bullet';
        }
        currentListItems.push(trimmedLine.replace(/^[-*]\s+/, ''));
        return;
      }

      // Check for numbered lists
      if (trimmedLine.match(/^\d+\.\s+/)) {
        if (listType !== 'numbered') {
          flushList();
          listType = 'numbered';
        }
        currentListItems.push(trimmedLine.replace(/^\d+\.\s+/, ''));
        return;
      }

      // If we have a list going and this line doesn't continue it, flush the list
      if (listType && trimmedLine !== '') {
        flushList();
      }

      // Handle headers
      if (trimmedLine.match(/^#{1,3}\s+/)) {
        const level = trimmedLine.match(/^#+/)?.[0].length || 1;
        const headerText = trimmedLine.replace(/^#+\s+/, '');
        const headerSize = level === 1 ? 'text-sm font-bold' : level === 2 ? 'text-xs font-semibold' : 'text-xs font-medium';
        formattedElements.push(
          <div key={index} className={`${headerSize} my-2 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
            {formatInlineText(headerText)}
          </div>
        );
        return;
      }

      // Handle empty lines
      if (trimmedLine === '') {
        formattedElements.push(<br key={index} />);
        return;
      }

      // Regular paragraph text
      formattedElements.push(
        <div key={index} className="my-1 leading-relaxed">
          {formatInlineText(trimmedLine)}
        </div>
      );
    });

    // Flush any remaining list items
    flushList();

    return formattedElements;
  };

  return (
    <div className={`text-xs md:text-sm leading-relaxed ${className}`}>
      {formatText(text)}
    </div>
  );
};
