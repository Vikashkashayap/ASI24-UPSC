import { FormEvent, useState, useEffect, useRef } from "react";
import { mentorAPI } from "../services/api";
import { Button } from "../components/ui/button";
import { useTheme } from "../hooks/useTheme";
import { FormattedText } from "../components/FormattedText";
import {
  MessageCircle,
  Send,
  Sparkles,
  Loader2,
  Plus,
  Search,
  FolderOpen,
  MoreVertical,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

export interface ChatItem {
  sessionId: string;
  title: string;
  project: string | null;
  lastActivity: string;
}

export const MentorChatPage = () => {
  const { theme } = useTheme();
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [projects, setProjects] = useState<string[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentTitle, setCurrentTitle] = useState<string>("");
  const [messages, setMessages] = useState<{ role: "user" | "mentor"; text: string }[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [projectFilter, setProjectFilter] = useState<string | null>(null);

  // On mobile, start with sidebar closed so user sees chat area first
  useEffect(() => {
    const m = window.matchMedia("(max-width: 767px)");
    if (m.matches) setSidebarOpen(false);
  }, []);
  const [menuSessionId, setMenuSessionId] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [createProjectName, setCreateProjectName] = useState("");
  const [showCreateProject, setShowCreateProject] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isDark = theme === "dark";

  // Load chat list and projects
  const loadChats = async () => {
    try {
      const res = await mentorAPI.listChats(projectFilter || undefined);
      setChats(res.data?.chats || []);
    } catch (e) {
      console.error("Failed to load chats:", e);
    }
  };

  const loadProjects = async () => {
    try {
      const res = await mentorAPI.listProjects();
      setProjects(res.data?.projects || []);
    } catch (e) {
      console.error("Failed to load projects:", e);
    }
  };

  useEffect(() => {
    loadChats();
    loadProjects();
  }, [projectFilter]);

  const isMobile = () => typeof window !== "undefined" && window.innerWidth < 768;

  // Load a specific chat
  const selectChat = async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setLoadingChat(true);
    setMenuSessionId(null);
    if (isMobile()) setSidebarOpen(false);
    try {
      const res = await mentorAPI.getChat(sessionId);
      setMessages(res.data?.messages || []);
      setCurrentTitle(res.data?.title || "New chat");
    } catch (e) {
      console.error("Failed to load chat:", e);
      setMessages([]);
    } finally {
      setLoadingChat(false);
    }
  };

  // New chat (optional: use project filter or typed project name)
  const startNewChat = async () => {
    setMenuSessionId(null);
    if (isMobile()) setSidebarOpen(false);
    const project = newProjectName.trim() || projectFilter || undefined;
    if (newProjectName.trim()) setNewProjectName("");
    try {
      const res = await mentorAPI.createChat({
        title: "New chat",
        project,
      });
      const sessionId = res.data?.sessionId;
      if (sessionId) {
        setCurrentSessionId(sessionId);
        setCurrentTitle("New chat");
        setMessages([]);
        await loadChats();
        await loadProjects();
      }
    } catch (e) {
      console.error("Failed to create chat:", e);
    }
  };

  // Create project = new chat in that project so project appears in list
  const createProject = async () => {
    const name = createProjectName.trim();
    if (!name) return;
    setShowCreateProject(false);
    setCreateProjectName("");
    try {
      const res = await mentorAPI.createChat({ title: "New chat", project: name });
      const sessionId = res.data?.sessionId;
      if (sessionId) {
        setProjectFilter(name);
        setCurrentSessionId(sessionId);
        setCurrentTitle("New chat");
        setMessages([]);
        await loadChats();
        await loadProjects();
      }
    } catch (e) {
      console.error("Failed to create project:", e);
    }
  };

  // Send message
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim() || loading) return;

    const text = message.trim();
    setMessage("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setLoading(true);

    try {
      const res = await mentorAPI.sendMessage({
        message: text,
        sessionId: currentSessionId || undefined,
        project: projectFilter || undefined,
      });
      const sessionId = res.data?.sessionId;
      const mentorMessage = res.data?.mentorMessage;

      if (!currentSessionId) {
        setCurrentSessionId(sessionId);
        setCurrentTitle(text.slice(0, 50) || "New chat");
      }
      setMessages((prev) => [...prev, { role: "mentor", text: mentorMessage }]);
      await loadChats();
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "mentor",
          text: "I could not fetch a response right now. Try again in a bit.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Delete chat
  const deleteChat = async (sessionId: string) => {
    setMenuSessionId(null);
    try {
      await mentorAPI.deleteChat(sessionId);
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setCurrentTitle("");
        setMessages([]);
      }
      await loadChats();
    } catch (e) {
      console.error("Failed to delete chat:", e);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
    return () => clearTimeout(t);
  }, [messages, loading]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
    }
  }, [message]);

  const filteredChats = searchQuery.trim()
    ? chats.filter(
        (c) =>
          c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (c.project && c.project.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : chats;

  const sidebarBg = isDark
    ? "bg-gradient-to-b from-[#0a0618] to-[#06021a] border-r border-slate-800"
    : "bg-slate-50 border-r border-slate-200";

  return (
    <div className="flex flex-1 h-full min-h-0 overflow-hidden relative">
      {/* Mobile backdrop when sidebar open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar: overlay on mobile, in-flow on md+ */}
      <aside
        className={`fixed md:relative inset-y-0 left-0 z-40 md:z-auto flex flex-col min-h-0 h-full overflow-hidden border-r transition-all duration-300 ${sidebarBg} flex-shrink-0 ${
          sidebarOpen
            ? "translate-x-0 w-[280px] max-w-[85vw] md:w-64 md:max-w-none lg:w-72"
            : "-translate-x-full md:translate-x-0 w-0 md:w-0 overflow-hidden"
        }`}
      >
        {/* Fixed top: New chat, Search, Project input, Create project */}
        <div className="flex-shrink-0 p-3 space-y-2">
          <Button
            onClick={startNewChat}
            className={`w-full justify-start gap-2 rounded-xl ${isDark ? "bg-gradient-to-r from-purple-600 to-emerald-600 hover:from-purple-500 hover:to-emerald-500 text-white" : "bg-white hover:bg-slate-100 text-slate-800 border border-slate-200"}`}
          >
            <Plus className="w-4 h-4" />
            New chat
          </Button>

          <div className={`relative rounded-xl overflow-hidden ${isDark ? "bg-slate-800/80" : "bg-white border border-slate-200"}`}>
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
            <input
              type="text"
              placeholder="Search chats"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-3 py-2.5 text-sm bg-transparent border-0 focus:outline-none focus:ring-0 ${isDark ? "text-slate-200 placeholder-slate-500" : "text-slate-800 placeholder-slate-400"}`}
            />
          </div>

          <input
            type="text"
            placeholder="New chat in project (optional)"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            className={`w-full rounded-xl px-3 py-2 text-sm border ${isDark ? "bg-slate-800/80 border-slate-700 text-slate-200 placeholder-slate-500" : "bg-white border-slate-200 text-slate-800 placeholder-slate-400"}`}
          />

          {/* Create project */}
          {!showCreateProject ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreateProject(true)}
              className={`w-full justify-start gap-2 rounded-xl ${isDark ? "border-slate-600 text-slate-300 hover:bg-slate-800" : "border-slate-200 text-slate-700 hover:bg-slate-100"}`}
            >
              <FolderOpen className="w-4 h-4" />
              Create project
            </Button>
          ) : (
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="Project name (e.g. Polity)"
                value={createProjectName}
                onChange={(e) => setCreateProjectName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createProject()}
                className={`flex-1 rounded-xl px-3 py-2 text-sm border ${isDark ? "bg-slate-800/80 border-slate-700 text-slate-200 placeholder-slate-500" : "bg-white border-slate-200 text-slate-800 placeholder-slate-400"}`}
                autoFocus
              />
              <Button type="button" onClick={createProject} className="rounded-xl px-3 bg-purple-600 hover:bg-purple-500 text-white shrink-0">
                Add
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => { setShowCreateProject(false); setCreateProjectName(""); }} className="shrink-0 rounded-xl">
                <span className="text-sm">✕</span>
              </Button>
            </div>
          )}

          {/* Projects list - fixed height block */}
          {projects.length > 0 && (
            <div className="pt-1 flex-shrink-0">
              <p className={`text-[10px] font-semibold uppercase tracking-wider px-2 mb-1.5 ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                Projects
              </p>
              <div className="space-y-0.5">
                <button
                  onClick={() => setProjectFilter(null)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm ${!projectFilter ? (isDark ? "bg-purple-500/20 text-purple-300" : "bg-purple-100 text-purple-800") : isDark ? "text-slate-400 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}
                >
                  <FolderOpen className="w-4 h-4 shrink-0" />
                  All chats
                </button>
                {projects.map((p) => (
                  <button
                    key={p}
                    onClick={() => setProjectFilter(p)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm ${projectFilter === p ? (isDark ? "bg-purple-500/20 text-purple-300" : "bg-purple-100 text-purple-800") : isDark ? "text-slate-400 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}
                  >
                    <FolderOpen className="w-4 h-4 shrink-0" />
                    <span className="truncate">{p}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className={`text-[10px] font-semibold uppercase tracking-wider px-2 pt-2 mb-1.5 flex-shrink-0 ${isDark ? "text-slate-500" : "text-slate-500"}`}>
            Your chats
          </p>
        </div>

        {/* Scrollable chat history only - sidebar does not move; only this list scrolls */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 pb-3">
          <div className="space-y-0.5">
            {filteredChats.map((chat) => (
              <div
                key={chat.sessionId}
                className={`group relative rounded-lg ${currentSessionId === chat.sessionId ? (isDark ? "bg-slate-800" : "bg-slate-200/80") : ""}`}
              >
                <button
                  type="button"
                  onClick={() => selectChat(chat.sessionId)}
                  className={`w-full text-left px-3 py-2.5 pr-8 rounded-lg text-sm truncate ${currentSessionId === chat.sessionId ? (isDark ? "text-slate-100" : "text-slate-900") : isDark ? "text-slate-300 hover:bg-slate-800/80" : "text-slate-700 hover:bg-slate-100"}`}
                >
                  {chat.title || "New chat"}
                </button>
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuSessionId(menuSessionId === chat.sessionId ? null : chat.sessionId);
                    }}
                    className={`p-1.5 rounded-lg ${isDark ? "hover:bg-slate-700" : "hover:bg-slate-300"}`}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
                {menuSessionId === chat.sessionId && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setMenuSessionId(null)}
                      aria-hidden
                    />
                    <div
                      className={`absolute right-2 top-full mt-1 z-20 py-1 rounded-lg shadow-xl border min-w-[120px] ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}
                    >
                      <button
                        type="button"
                        onClick={() => deleteChat(chat.sessionId)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md ${isDark ? "text-red-400 hover:bg-slate-700" : "text-red-600 hover:bg-slate-100"}`}
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Main content: header (fixed) + scrollable messages + input (fixed bottom) */}
      <main className={`relative flex-1 flex flex-col min-w-0 min-h-0 ${isDark ? "bg-[#020012]" : "bg-slate-50"}`}>
        {/* Toggle sidebar - touch-friendly on mobile */}
        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`absolute left-2 top-3 z-20 p-2.5 min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center touch-manipulation md:left-4 md:top-4 md:min-h-0 md:min-w-0 md:p-2 ${isDark ? "bg-slate-800 hover:bg-slate-700 text-slate-300" : "bg-slate-200 hover:bg-slate-300 text-slate-700"}`}
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
        </button>

        {/* Header - fixed; responsive padding and text */}
        <header className={`flex-shrink-0 flex items-center justify-between gap-2 sm:gap-4 px-3 pl-14 sm:pl-14 md:px-6 md:pl-14 py-3 sm:py-3.5 border-b ${isDark ? "border-slate-800 bg-[#020012]/95" : "border-slate-200 bg-slate-50/95"}`}>
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl shrink-0 ${isDark ? "bg-purple-500/20" : "bg-purple-100"}`}>
              <MessageCircle className={`w-4 h-4 sm:w-5 sm:h-5 ${isDark ? "text-purple-400" : "text-purple-600"}`} />
            </div>
            <div className="min-w-0">
              <h1 className={`font-bold text-base sm:text-lg truncate ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                {currentTitle || "AI Mentor"}
              </h1>
              <p className={`text-[11px] sm:text-xs truncate ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                {currentSessionId ? "Ask follow-ups or open sidebar for more chats" : "Ask doubts, strategy, or next steps"}
              </p>
            </div>
            {currentSessionId && (
              <span className={`text-[10px] sm:text-xs px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full shrink-0 font-medium hidden sm:inline-flex ${isDark ? "bg-purple-500/20 text-purple-300" : "bg-purple-100 text-purple-700"}`}>
                {messages.length} msgs
              </span>
            )}
          </div>
        </header>

        {/* Scrollable area only - messages or empty state */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          {loadingChat ? (
            <div className="flex items-center justify-center h-full min-h-[200px]">
              <Loader2 className={`w-8 h-8 animate-spin ${isDark ? "text-purple-400" : "text-purple-600"}`} />
            </div>
          ) : !currentSessionId && messages.length === 0 ? (
            /* Empty state - responsive spacing and copy */
            <div className={`flex flex-col items-center justify-center min-h-[240px] sm:min-h-[280px] px-4 sm:px-6 py-8 sm:py-12 text-center ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl mb-3 sm:mb-4 ${isDark ? "bg-purple-500/10" : "bg-purple-100"}`}>
                <MessageCircle className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 ${isDark ? "text-purple-400" : "text-purple-600"}`} />
              </div>
              <h2 className={`text-lg sm:text-xl md:text-2xl font-bold mb-1.5 sm:mb-2 px-2 ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                Where should we begin?
              </h2>
              <p className="text-sm sm:text-base max-w-md mb-4 sm:mb-6 px-1">
                Ask doubts, next steps, or strategy questions like you would with a senior mentor.
              </p>
              <p className="text-xs sm:text-sm max-w-sm px-1">
                Open the menu to create a project or pick a chat. Or type below to begin.
              </p>
            </div>
          ) : (
            /* Message list - scrollable, responsive padding */
            <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4 pb-4">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      m.role === "user"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : isDark
                        ? "bg-purple-500/20 text-purple-300"
                        : "bg-purple-100 text-purple-600"
                    }`}
                  >
                    {m.role === "user" ? (
                      <MessageCircle className="w-4 h-4" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                  </div>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      m.role === "user"
                        ? "bg-emerald-600 text-white rounded-tr-md"
                        : isDark
                        ? "bg-slate-800/80 text-slate-100 border border-slate-700 rounded-tl-md"
                        : "bg-white border border-slate-200 text-slate-900 rounded-tl-md"
                    }`}
                  >
                    {m.role === "user" ? (
                      <p className="text-sm md:text-base whitespace-pre-wrap">{m.text}</p>
                    ) : (
                      <FormattedText text={m.text} />
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className={`rounded-2xl rounded-tl-md px-4 py-3 ${isDark ? "bg-slate-800/80 border border-slate-700" : "bg-white border border-slate-200"}`}>
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className={isDark ? "text-slate-400" : "text-slate-500"}>Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area - fixed at bottom, responsive padding */}
        <div className={`flex-shrink-0 p-3 sm:p-4 md:p-6 border-t ${isDark ? "border-slate-800 bg-[#020012]" : "border-slate-200 bg-slate-50"}`}>
            <form ref={formRef} onSubmit={handleSubmit} className="max-w-3xl mx-auto">
              <div
                className={`flex gap-2 rounded-2xl border-2 overflow-hidden transition-colors ${
                  isDark
                    ? "bg-slate-900/80 border-slate-700 focus-within:border-purple-500/50"
                    : "bg-white border-slate-200 focus-within:border-purple-400"
                }`}
              >
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ask anything..."
                  disabled={loading}
                  rows={1}
                  className={`flex-1 min-h-[52px] max-h-[160px] px-4 py-3 bg-transparent resize-none text-sm md:text-base focus:outline-none ${isDark ? "text-slate-100 placeholder-slate-500" : "text-slate-900 placeholder-slate-400"}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      formRef.current?.requestSubmit();
                    }
                  }}
                />
                <Button
                  type="submit"
                  disabled={loading || !message.trim()}
                  className={`self-end m-2 rounded-xl px-4 bg-gradient-to-r from-purple-600 to-emerald-600 hover:from-purple-500 hover:to-emerald-500 text-white shrink-0`}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </form>
        </div>
      </main>
    </div>
  );
};
