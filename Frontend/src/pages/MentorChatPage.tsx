import { FormEvent, useState, useEffect, useRef } from "react";
import { api } from "../services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useTheme } from "../hooks/useTheme";
import { FormattedText } from "../components/FormattedText";
import { Trash2, MessageCircle, Send, Sparkles, Loader2 } from "lucide-react";

export const MentorChatPage = () => {
  const { theme } = useTheme();
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<{ role: "user" | "mentor"; text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

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

  // Auto scroll (smooth) - with slight delay for better UX
  useEffect(() => {
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
    return () => clearTimeout(timer);
  }, [history, loading]);

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
    if (!message.trim() || loading) return;

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
    <div className="w-full max-w-5xl mx-auto flex flex-col h-[calc(100vh-7rem)] min-h-[320px] xs:h-[calc(100vh-7.5rem)] sm:h-[calc(100vh-8rem)] md:h-[calc(100vh-9rem)] overflow-x-hidden px-2 xs:px-3 sm:px-4 md:px-6">
      {/* Enhanced Header Section */}
      <div className="flex flex-col gap-1.5 xs:gap-2 sm:gap-2.5 md:gap-3 pb-2 xs:pb-2.5 sm:pb-3 md:pb-4 flex-shrink-0 pt-1 xs:pt-2">
        <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-2.5 md:gap-3">
          <div className={`p-1.5 xs:p-2 sm:p-2 md:p-2.5 rounded-lg xs:rounded-xl sm:rounded-xl md:rounded-2xl bg-gradient-to-br from-fuchsia-500/20 to-emerald-400/20 border ${
            theme === "dark" ? "border-fuchsia-500/30" : "border-purple-300/50"
          }`}>
            <MessageCircle className={`w-3.5 h-3.5 xs:w-4 xs:h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 ${
              theme === "dark" ? "text-fuchsia-300" : "text-fuchsia-600"
            }`} />
          </div>
          <div className="flex-1 min-w-0">
            <h1
              className={`text-lg xs:text-xl sm:text-xl md:text-2xl lg:text-3xl font-bold tracking-tight truncate ${
                theme === "dark" 
                  ? "bg-gradient-to-r from-slate-50 to-slate-200 bg-clip-text text-transparent" 
                  : "text-slate-900"
              }`}
            >
              AI Mentor
            </h1>
          </div>
        </div>
        <p
          className={`text-[11px] xs:text-xs sm:text-xs md:text-sm leading-relaxed ml-0 xs:ml-0 sm:ml-12 md:ml-14 ${
            theme === "dark" ? "text-slate-400" : "text-slate-600"
          }`}
        >
          Ask doubts, next steps, or strategy questions like you would with a senior mentor.
        </p>
      </div>

      {/* Enhanced Chat Card */}
      <Card className={`flex-1 flex flex-col min-h-0 shadow-xl overflow-hidden ${
        theme === "dark"
          ? "bg-gradient-to-br from-slate-950/90 via-slate-900/90 to-slate-950/90 border-purple-900/50"
          : "bg-white border-slate-200"
      }`}>
        <CardHeader className="pb-2 xs:pb-2.5 sm:pb-3 md:pb-4 border-b flex-shrink-0 px-3 xs:px-4 sm:px-5 pt-3 xs:pt-3 sm:pt-4 md:pt-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 xs:gap-2 mb-0.5 xs:mb-1">
                <CardTitle className="text-sm xs:text-sm sm:text-base md:text-lg font-semibold truncate">
                  Mentor chat
                </CardTitle>
                {history.length > 0 && (
                  <span className={`text-[10px] xs:text-xs px-1.5 xs:px-2 py-0.5 rounded-full flex-shrink-0 ${
                    theme === "dark" 
                      ? "bg-fuchsia-500/20 text-fuchsia-300" 
                      : "bg-purple-100 text-purple-700"
                  }`}>
                    {history.length}
                  </span>
                )}
              </div>
              <CardDescription className={`text-[10px] xs:text-xs sm:text-xs md:text-sm flex items-center gap-1 xs:gap-1.5 mt-0.5 ${
                theme === "dark" ? "text-slate-400" : "text-slate-600"
              }`}>
                <Sparkles className="w-2.5 h-2.5 xs:w-3 xs:h-3 flex-shrink-0" />
                <span className="truncate">Grounded in your recent evaluations and weak areas.</span>
              </CardDescription>
            </div>

            {history.length > 0 && (
              <Button
                variant="ghost"
                onClick={clearChatHistory}
                className="h-8 w-8 xs:h-9 xs:w-9 sm:h-9 sm:w-9 md:h-10 md:w-10 p-0 rounded-lg hover:bg-red-500/10 hover:text-red-500 dark:hover:bg-red-500/20 transition-colors flex-shrink-0"
                title="Clear chat history"
              >
                <Trash2 className="h-3.5 w-3.5 xs:h-4 xs:w-4 sm:h-4 sm:w-4 md:h-5 md:w-5" />
              </Button>
            )}
          </div>
        </CardHeader>

        {/* Enhanced Chat Messages Area */}
        <CardContent className="flex-1 flex flex-col gap-2 xs:gap-2.5 sm:gap-3 md:gap-4 overflow-hidden px-2 xs:px-3 sm:px-4 md:px-6 pb-3 xs:pb-3 sm:pb-4 md:pb-6 pt-2 xs:pt-2.5 sm:pt-3 min-h-0">
          <div className="flex-1 overflow-y-auto overscroll-contain space-y-2 xs:space-y-2.5 sm:space-y-3 md:space-y-4 pr-1 xs:pr-1.5 sm:pr-2 md:pr-3 custom-scrollbar pb-2">
            {history.map((m, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-1.5 xs:gap-2 sm:gap-2.5 md:gap-3 animate-[fadeIn_0.3s_ease-in-out] ${
                  m.role === "user" ? "flex-row-reverse" : ""
                }`}
              >
                {/* Avatar/Icon */}
                <div className={`flex-shrink-0 w-6 h-6 xs:w-7 xs:h-7 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center ${
                  m.role === "user"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : theme === "dark"
                    ? "bg-fuchsia-500/20 text-fuchsia-300"
                    : "bg-purple-100 text-purple-600"
                }`}>
                  {m.role === "user" ? (
                    <MessageCircle className="w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                  ) : (
                    <Sparkles className="w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[90%] xs:max-w-[88%] sm:max-w-[85%] md:max-w-[80%] lg:max-w-[75%] break-words whitespace-pre-wrap rounded-xl xs:rounded-2xl md:rounded-3xl px-2.5 xs:px-3 sm:px-3 md:px-4 py-1.5 xs:py-2 sm:py-2 md:py-3 leading-relaxed shadow-lg transition-all hover:shadow-xl ${
                    m.role === "user"
                      ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-tr-md"
                      : theme === "dark"
                      ? "bg-slate-800/80 text-slate-100 border border-slate-700/50 rounded-tl-md backdrop-blur-sm"
                      : "bg-slate-50 text-slate-900 border border-slate-200 rounded-tl-md"
                  }`}
                >
                  {m.role === "user" ? (
                    <div className="text-xs xs:text-sm sm:text-sm md:text-base font-medium">{m.text}</div>
                  ) : (
                    <FormattedText text={m.text} />
                  )}
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {loading && (
              <div className="flex items-start gap-1.5 xs:gap-2 sm:gap-2.5 md:gap-3 animate-[fadeIn_0.3s_ease-in-out]">
                <div className="flex-shrink-0 w-6 h-6 xs:w-7 xs:h-7 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-fuchsia-500/20 text-fuchsia-300 flex items-center justify-center">
                  <Sparkles className="w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                </div>
                <div className={`rounded-xl xs:rounded-2xl md:rounded-3xl rounded-tl-md px-2.5 xs:px-3 sm:px-3 md:px-4 py-1.5 xs:py-2 sm:py-2 md:py-3 ${
                  theme === "dark"
                    ? "bg-slate-800/80 border border-slate-700/50"
                    : "bg-slate-50 border border-slate-200"
                }`}>
                  <div className="flex items-center gap-1.5 xs:gap-2">
                    <Loader2 className="w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4 md:w-4 md:h-4 animate-spin" />
                    <span className={`text-xs xs:text-sm md:text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                      Thinking...
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Empty State */}
            {history.length === 0 && !loading && (
              <div className={`flex flex-col items-center justify-center h-full min-h-[150px] xs:min-h-[180px] sm:min-h-[200px] md:min-h-[300px] text-center px-3 xs:px-4 sm:px-4 md:px-4 py-6 xs:py-7 sm:py-8 md:py-8 ${
                theme === "dark" ? "text-slate-400" : "text-slate-500"
              }`}>
                <div className={`p-3 xs:p-3.5 sm:p-4 md:p-6 rounded-full mb-3 xs:mb-3 sm:mb-4 ${
                  theme === "dark" 
                    ? "bg-fuchsia-500/10" 
                    : "bg-purple-100"
                }`}>
                  <MessageCircle className={`w-6 h-6 xs:w-8 xs:h-8 sm:w-8 sm:h-8 md:w-12 md:h-12 ${
                    theme === "dark" ? "text-fuchsia-400" : "text-purple-600"
                  }`} />
                </div>
                <p className="text-xs xs:text-sm sm:text-sm md:text-base font-medium mb-1.5 xs:mb-2 px-2">
                  Start a conversation with your AI mentor
                </p>
                <p className="text-[10px] xs:text-xs sm:text-xs md:text-sm max-w-xs xs:max-w-sm sm:max-w-md px-2">
                  Try asking: <span className={`font-medium ${
                    theme === "dark" ? "text-slate-300" : "text-slate-700"
                  }`}>
                    "How should I structure a 10-marker GS2 answer this week?"
                  </span>
                </p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Enhanced Input Area */}
          <form 
            ref={formRef}
            onSubmit={handleSubmit} 
            className={`flex gap-1.5 xs:gap-2 sm:gap-2 md:gap-3 items-end pt-2 xs:pt-2.5 sm:pt-3 md:pt-4 border-t ${
              theme === "dark" ? "border-slate-700/50" : "border-slate-200"
            } flex-shrink-0`}
          >
            <div className="flex-1 relative min-w-0">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your doubt or next-step question here..."
                disabled={loading}
                className={`w-full rounded-xl xs:rounded-2xl md:rounded-3xl border px-3 xs:px-3.5 sm:px-4 md:px-5 py-2 xs:py-2.5 sm:py-3 md:py-3.5 text-xs xs:text-sm sm:text-sm md:text-base shadow-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 resize-none overflow-hidden min-h-[44px] xs:min-h-[46px] sm:min-h-[48px] md:min-h-[52px] max-h-[120px] transition-all ${
                  theme === "dark"
                    ? "border-fuchsia-500/30 bg-slate-950/80 text-slate-100 placeholder-slate-500 focus:border-fuchsia-500/50"
                    : "border-purple-300 bg-white text-slate-900 placeholder-slate-400 focus:border-purple-400"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    formRef.current?.requestSubmit();
                  }
                }}
              />
            </div>
            <Button 
              type="submit" 
              disabled={loading || !message.trim()} 
              className="min-h-[44px] xs:min-h-[46px] sm:min-h-[48px] md:min-h-[52px] px-3 xs:px-3.5 sm:px-4 md:px-6 rounded-xl xs:rounded-2xl md:rounded-3xl font-medium text-xs xs:text-sm md:text-base shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 touch-manipulation"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 xs:w-4 xs:h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 animate-spin" />
              ) : (
                <>
                  <span className="hidden xs:inline sm:inline mr-1 xs:mr-1.5 sm:mr-2">Send</span>
                  <Send className="w-3.5 h-3.5 xs:w-4 xs:h-4 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

