import { FormEvent, useState, useEffect, useRef } from "react";
import { api } from "../services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useTheme } from "../hooks/useTheme";
import { FormattedText } from "../components/FormattedText";
import { Trash2 } from "lucide-react";

export const MentorChatPage = () => {
  const { theme } = useTheme();
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<{ role: "user" | "mentor"; text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const res = await api.get("/api/mentor/chat-history");
        if (res.data.sessionId) {
          setSessionId(res.data.sessionId);
          setHistory(res.data.messages);
        }
      } catch (error) {
        console.error("Failed to load chat history:", error);
      }
    };

    loadChatHistory();
  }, []);

  // Auto scroll (stable)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, [history]);

  // Auto resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
    }
  }, [message]);

  const clearChatHistory = async () => {
    try {
      await api.delete("/api/mentor/chat-history", {
        data: { sessionId },
      });
      setHistory([]);
      setSessionId(null);
    } catch (error) {
      console.error("Failed to clear chat history:", error);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const current = message.trim();
    setHistory((h) => [...h, { role: "user", text: current }]);
    setMessage("");
    setLoading(true);

    try {
      const res = await api.post("/api/mentor/chat", {
        message: current,
        sessionId,
      });
      setSessionId(res.data.sessionId);
      setHistory((h) => [...h, { role: "mentor", text: res.data.mentorMessage }]);
    } catch {
      setHistory((h) => [
        ...h,
        {
          role: "mentor",
          text: "I could not fetch a response right now. Try again in a bit.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
      <div className="flex flex-col gap-1 md:gap-2">
        <h1
          className={`text-xl md:text-2xl font-semibold tracking-tight ${
            theme === "dark" ? "text-slate-50" : "text-slate-900"
          }`}
        >
          AI mentor
        </h1>
        <p
          className={`text-xs md:text-sm ${
            theme === "dark" ? "text-slate-400" : "text-slate-600"
          }`}
        >
          Ask doubts, next steps, or strategy questions like you would with a senior mentor.
        </p>
      </div>

      <Card className="h-[420px] md:h-[480px] flex flex-col">
        <CardHeader className="pb-2 md:pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm md:text-base">Mentor chat</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Grounded in your recent evaluations and weak areas.
              </CardDescription>
            </div>

            {history.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearChatHistory}
                className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900 dark:hover:text-red-400"
                title="Clear chat history"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>

        {/* 🔧 IMPORTANT FIXES HERE */}
        <CardContent className="flex-1 flex flex-col gap-3 md:gap-4 overflow-hidden">
          <div className="flex-1 overflow-y-auto overscroll-contain space-y-2 md:space-y-3 pr-2 text-xs md:text-sm">
            {history.map((m, idx) => (
              <div
                key={idx}
                className={`max-w-[85%] md:max-w-[80%] break-words whitespace-pre-wrap rounded-xl md:rounded-2xl px-2 md:px-3 py-2 leading-relaxed ${
                  m.role === "user"
                    ? "ml-auto bg-emerald-600 text-white rounded-br-sm"
                    : theme === "dark"
                    ? "mr-auto bg-slate-900 text-slate-100 border border-slate-700 rounded-bl-sm"
                    : "mr-auto bg-slate-100 text-slate-900 border border-slate-200 rounded-bl-sm"
                }`}
              >
                {m.role === "user" ? (
                  <div className="text-[10px] md:text-xs">{m.text}</div>
                ) : (
                  <FormattedText text={m.text} />
                )}
              </div>
            ))}

            {history.length === 0 && (
              <p
                className={`text-[10px] md:text-xs ${
                  theme === "dark" ? "text-slate-400" : "text-slate-500"
                }`}
              >
                Start with something simple, like "How should I structure a 10-marker GS2 answer this week?"
              </p>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your doubt or next-step question here..."
              className={`flex-1 rounded-xl md:rounded-2xl border px-3 md:px-4 py-2 md:py-3 text-[10px] md:text-xs shadow-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-500/70 resize-none overflow-hidden min-h-[40px] max-h-[120px] ${
                theme === "dark"
                  ? "border-fuchsia-500/30 bg-slate-950 text-slate-100 placeholder-slate-500"
                  : "border-purple-300 bg-white text-slate-900 placeholder-slate-400"
              }`}
              style={{ height: "40px" }}
            />
            <Button type="submit" disabled={loading} size="sm" className="text-xs md:text-sm self-end">
              {loading ? "..." : "Send"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
