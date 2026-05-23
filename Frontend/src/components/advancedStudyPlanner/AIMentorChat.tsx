import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { useTheme } from "../../hooks/useTheme";
import { cn } from "../../utils/cn";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "What should I study today?",
  "Why is my score low?",
  "Which subject is weak?",
  "How to improve CSAT?",
];

interface Props {
  onSend: (message: string) => Promise<string>;
}

export function AIMentorChat({ onSend }: Props) {
  const { theme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! I'm your AI study mentor. Ask me anything about your preparation — I know your streak, weak subjects, and progress." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg = text.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: userMsg }]);
    setLoading(true);
    try {
      const reply = await onSend(userMsg);
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Sorry, I couldn't respond right now. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "rounded-2xl border flex flex-col h-[420px]",
        theme === "dark" ? "bg-slate-900/90 border-blue-500/20" : "bg-white border-slate-200 shadow-lg"
      )}
    >
      <div className={cn("px-4 py-3 border-b flex items-center gap-2", theme === "dark" ? "border-slate-700" : "border-slate-100")}>
        <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-sm">AI Mentor</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn("flex gap-2", msg.role === "user" ? "flex-row-reverse" : "")}
            >
              <motion.div
                className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0", msg.role === "user" ? "bg-blue-600" : "bg-slate-200")}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
              >
                {msg.role === "user" ? <User className="w-3.5 h-3.5 text-white" /> : <Bot className="w-3.5 h-3.5 text-blue-600" />}
              </motion.div>
              <motion.div
                className={cn(
                  "rounded-2xl px-3 py-2 text-sm max-w-[85%]",
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : theme === "dark"
                      ? "bg-slate-800 text-slate-200"
                      : "bg-slate-100 text-slate-800"
                )}
                initial={{ opacity: 0, x: msg.role === "user" ? 10 : -10 }}
                animate={{ opacity: 1, x: 0 }}
              >
                {msg.content}
              </motion.div>
            </motion.div>
          ))}
        </AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 items-center text-sm opacity-60">
            <Loader2 className="w-4 h-4 animate-spin" /> Thinking…
          </motion.div>
        )}
        <motion.div ref={bottomRef} />
      </div>

      <div className="p-3 border-t space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              disabled={loading}
              className={cn("text-xs px-2 py-1 rounded-full border transition-colors", theme === "dark" ? "border-slate-600 hover:bg-slate-800" : "border-slate-200 hover:bg-slate-50")}
            >
              {s}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your mentor…"
            className={cn("flex-1 rounded-xl px-3 py-2 text-sm border", theme === "dark" ? "bg-slate-800 border-slate-600" : "bg-white border-slate-300")}
          />
          <Button type="submit" disabled={loading || !input.trim()} className="shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </motion.div>
  );
}
