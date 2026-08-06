import React, { memo } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Sparkles } from "lucide-react";
import { FormattedText } from "../FormattedText";

interface ChatBubbleProps {
  role: "user" | "mentor";
  text: string;
}

export const ChatBubble = memo(function ChatBubble({ role, text }: ChatBubbleProps) {
  const isUser = role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`flex items-start gap-2.5 sm:gap-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${
          isUser ? "bg-blue-600 text-white" : "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100"
        }`}
      >
        {isUser ? <MessageCircle className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      </span>
      <div
        className={`max-w-[85%] rounded-[20px] px-4 py-3 shadow-soft ${
          isUser
            ? "rounded-tr-md bg-gradient-to-br from-blue-600 to-indigo-600 text-white"
            : "rounded-tl-md border border-slate-200/80 bg-white text-slate-900"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed sm:text-[15px]">{text}</p>
        ) : (
          <FormattedText text={text} />
        )}
      </div>
    </motion.div>
  );
});

export const TypingIndicator = memo(function TypingIndicator() {
  return (
    <div className="flex items-start gap-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
        <Sparkles className="h-4 w-4" />
      </span>
      <div className="rounded-[20px] rounded-tl-md border border-slate-200/80 bg-white px-4 py-3 shadow-soft">
        <div className="flex items-center gap-1.5" aria-label="Mentor is typing">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-2 w-2 rounded-full bg-slate-400"
              animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
});
