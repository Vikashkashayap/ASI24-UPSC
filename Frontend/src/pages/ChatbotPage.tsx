import { FormEvent, useState, useEffect, useRef } from "react";
import { api } from "../services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useTheme } from "../hooks/useTheme";
import { Menu, X } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface Conversation {
  _id: string;
  title: string;
  updatedAt: string;
}

export const ChatbotPage = () => {
  const { theme } = useTheme();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    setLoadingConversations(true);
    try {
      const res = await api.get("/api/chatbot/conversations");
      if (res.data.success) {
        setConversations(res.data.data);
      }
    } catch (error) {
      console.error("Failed to load conversations:", error);
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadConversation = async (conversationId: string) => {
    try {
      const res = await api.get(`/api/chatbot/conversations/${conversationId}`);
      if (res.data.success) {
        const conv = res.data.data;
        setMessages(conv.messages);
        setCurrentConversationId(conv._id);
      }
    } catch (error) {
      console.error("Failed to load conversation:", error);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setCurrentConversationId(null);
    setMessage("");
    setSidebarOpen(false);
  };

  const deleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Delete this conversation?")) return;
    
    try {
      await api.delete(`/api/chatbot/conversations/${conversationId}`);
      if (currentConversationId === conversationId) {
        startNewChat();
      }
      await loadConversations();
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim() || loading) return;

    const userMessage = message.trim();
    setMessage("");

    // Add user message to UI immediately
    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage, timestamp: new Date() },
    ]);

    setLoading(true);

    try {
      const res = await api.post("/api/chatbot/chat", {
        message: userMessage,
        conversationId: currentConversationId,
      });

      if (res.data.success) {
        const { reply, conversationId } = res.data.data;

        // Add assistant reply to UI
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: reply, timestamp: new Date() },
        ]);

        // Update current conversation ID if it's a new conversation
        if (!currentConversationId) {
          setCurrentConversationId(conversationId);
        }

        // Reload conversations list
        await loadConversations();
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I couldn't process your message. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-0 md:gap-4 h-[calc(100vh-8rem)] relative">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Conversations History */}
      <div className={`w-64 md:w-64 flex-shrink-0 fixed md:relative inset-y-0 left-0 z-50 transition-transform duration-300 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      } md:translate-x-0`}>
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs md:text-sm">Conversations</CardTitle>
              <button
                onClick={() => setSidebarOpen(false)}
                className="md:hidden p-1 hover:bg-slate-800 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <Button
              onClick={startNewChat}
              className="w-full mt-2"
              variant="outline"
              size="sm"
            >
              + New Chat
            </Button>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-2 px-3">
            {loadingConversations ? (
              <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>Loading...</p>
            ) : conversations.length === 0 ? (
              <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>No conversations yet</p>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv._id}
                  onClick={() => {
                    loadConversation(conv._id);
                    setSidebarOpen(false);
                  }}
                  className={`group relative cursor-pointer rounded-lg p-2 text-xs transition-colors ${
                    theme === "dark"
                      ? `hover:bg-slate-800 ${
                          currentConversationId === conv._id
                            ? "bg-slate-800 border border-emerald-500/30"
                            : "border border-slate-700"
                        }`
                      : `hover:bg-slate-100 ${
                          currentConversationId === conv._id
                            ? "bg-purple-50 border border-purple-300"
                            : "border border-slate-200"
                        }`
                  }`}
                >
                  <div className={`pr-6 truncate ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>{conv.title}</div>
                  <div className={`text-[10px] mt-1 ${theme === "dark" ? "text-slate-500" : "text-slate-500"}`}>
                    {new Date(conv.updatedAt).toLocaleDateString()}
                  </div>
                  <button
                    onClick={(e) => deleteConversation(conv._id, e)}
                    className={`absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity ${
                      theme === "dark" ? "text-red-400 hover:text-red-300" : "text-red-500 hover:text-red-600"
                    }`}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 w-full">
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-3 md:pb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSidebarOpen(true)}
                className={`md:hidden p-2 rounded-lg ${
                  theme === "dark" ? "hover:bg-slate-800" : "hover:bg-slate-100"
                }`}
              >
                <Menu className="w-4 h-4" />
              </button>
              <div className="flex-1">
                <CardTitle className="text-sm md:text-base">AI Chatbot</CardTitle>
                <CardDescription className="text-xs md:text-sm mt-0.5 md:mt-1">
                  Ask me anything! I can help with questions, explanations, and conversations in English or Hindi.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto space-y-3 md:space-y-4 pr-1 md:pr-2">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full space-y-3 md:space-y-4 text-center px-3 md:px-4">
                  <div className="text-3xl md:text-4xl">💬</div>
                  <div className="space-y-1.5 md:space-y-2">
                    <p className={`text-xs md:text-sm font-medium ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>
                      Start a conversation!
                    </p>
                    <p className={`text-[10px] md:text-xs max-w-md ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                      Ask me questions, get explanations, solve problems, or just chat. 
                      I can understand and respond in both English and Hindi.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 mt-3 md:mt-4 max-w-lg w-full">
                    <button
                      onClick={() => setMessage("Explain quantum computing in simple terms")}
                      className={`text-left text-[10px] md:text-xs p-2 md:p-3 rounded-lg border transition-colors ${
                        theme === "dark"
                          ? "bg-slate-800 hover:bg-slate-700 border-slate-600"
                          : "bg-white hover:bg-slate-50 border-slate-200"
                      }`}
                    >
                      💡 Explain quantum computing
                    </button>
                    <button
                      onClick={() => setMessage("What is the capital of France?")}
                      className={`text-left text-[10px] md:text-xs p-2 md:p-3 rounded-lg border transition-colors ${
                        theme === "dark"
                          ? "bg-slate-800 hover:bg-slate-700 border-slate-600"
                          : "bg-white hover:bg-slate-50 border-slate-200"
                      }`}
                    >
                      🌍 Geography question
                    </button>
                    <button
                      onClick={() => setMessage("Write a poem about coding")}
                      className={`text-left text-[10px] md:text-xs p-2 md:p-3 rounded-lg border transition-colors ${
                        theme === "dark"
                          ? "bg-slate-800 hover:bg-slate-700 border-slate-600"
                          : "bg-white hover:bg-slate-50 border-slate-200"
                      }`}
                    >
                      ✍️ Creative writing
                    </button>
                    <button
                      onClick={() => setMessage("Mujhe programming sikhao")}
                      className={`text-left text-[10px] md:text-xs p-2 md:p-3 rounded-lg border transition-colors ${
                        theme === "dark"
                          ? "bg-slate-800 hover:bg-slate-700 border-slate-600"
                          : "bg-white hover:bg-slate-50 border-slate-200"
                      }`}
                    >
                      🇮🇳 Hindi mein baat karo
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${
                        msg.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-3 py-2 md:px-4 md:py-3 text-xs md:text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "bg-emerald-600 text-white rounded-br-sm"
                            : theme === "dark"
                            ? "bg-slate-900 text-slate-100 border border-slate-700 rounded-bl-sm"
                            : "bg-slate-100 text-slate-900 border border-slate-200 rounded-bl-sm"
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                        <div
                          className={`text-[9px] md:text-[10px] mt-1.5 md:mt-2 ${
                            msg.role === "user"
                              ? "text-emerald-200"
                              : theme === "dark"
                              ? "text-slate-500"
                              : "text-slate-500"
                          }`}
                        >
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSubmit} className={`flex gap-2 md:gap-3 items-end border-t pt-3 md:pt-4 ${
              theme === "dark" ? "border-slate-800" : "border-slate-200"
            }`}>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e as any);
                  }
                }}
                rows={2}
                placeholder="Type your message here... (Shift+Enter for new line)"
                className={`flex-1 rounded-xl md:rounded-2xl border px-3 py-2 md:px-4 md:py-3 text-xs md:text-sm shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/70 resize-none ${
                  theme === "dark"
                    ? "border-emerald-500/30 bg-slate-950 text-slate-100 placeholder-slate-500"
                    : "border-slate-300 bg-white text-slate-900 placeholder-slate-400"
                }`}
                disabled={loading}
              />
              <Button 
                type="submit" 
                disabled={loading || !message.trim()}
                className="px-4 md:px-6 text-xs md:text-sm"
                size="sm"
              >
                {loading ? "..." : "Send"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
