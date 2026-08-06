import { FormEvent, useState, useEffect, useRef } from "react";
import { mentorAPI } from "../services/api";
import { Button } from "../components/ui/button";
import { useTheme } from "../hooks/useTheme";
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
  BookOpen,
  ClipboardList,
  FileText,
  CalendarDays,
  Brain,
  Newspaper,
} from "lucide-react";
import { ChatBubble, TypingIndicator, PromptCard, SUGGESTED_PROMPTS } from "../components/aiExperience";

export interface ChatItem {
  sessionId: string;
  title: string;
  project: string | null;
  lastActivity: string;
}

type MentorChatPageProps = {
  /** Narrower layout for home-page side drawer */
  embedded?: boolean;
};

export const MentorChatPage = ({ embedded = false }: MentorChatPageProps) => {
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
  const [sidebarOpen, setSidebarOpen] = useState(!embedded);
  const [projectFilter, setProjectFilter] = useState<string | null>(null);

  useEffect(() => {
    const m = window.matchMedia("(max-width: 767px)");
    const apply = () => setSidebarOpen(!m.matches);
    apply();
    m.addEventListener("change", apply);
    return () => m.removeEventListener("change", apply);
  }, [embedded]);
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
  const sendText = async (textRaw: string) => {
    if (!textRaw.trim() || loading) return;
    const text = textRaw.trim();
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await sendText(message);
  };

  const applyPrompt = (prompt: string) => {
    void sendText(prompt);
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
    ? "bg-gradient-to-b from-[#0f1e3d] to-[#0f172a] border-r border-slate-800"
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
            ? embedded
              ? "translate-x-0 w-[min(220px,42vw)] max-w-[85vw] md:w-[220px] md:max-w-[220px]"
              : "translate-x-0 w-[280px] max-w-[85vw] md:w-64 md:max-w-none lg:w-72"
            : "-translate-x-full md:translate-x-0 w-0 md:w-0 overflow-hidden"
        }`}
      >
        {/* Fixed top: New chat, Search, Project input, Create project */}
        <div className="flex-shrink-0 p-3 space-y-2">
          <Button
            onClick={startNewChat}
            className={`w-full justify-start gap-2 rounded-xl ${isDark ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white" : "bg-blue-600 hover:bg-blue-500 text-white border border-blue-600"}`}
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
              <Button type="button" onClick={createProject} className="rounded-xl px-3 bg-blue-600 hover:bg-blue-500 text-white shrink-0">
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
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm ${!projectFilter ? (isDark ? "bg-blue-500/20 text-blue-300" : "bg-blue-100 text-blue-800") : isDark ? "text-slate-400 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}
                >
                  <FolderOpen className="w-4 h-4 shrink-0" />
                  All chats
                </button>
                {projects.map((p) => (
                  <button
                    key={p}
                    onClick={() => setProjectFilter(p)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm ${projectFilter === p ? (isDark ? "bg-blue-500/20 text-blue-300" : "bg-blue-100 text-blue-800") : isDark ? "text-slate-400 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}
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
      <main className={`relative flex-1 flex flex-col min-w-0 min-h-0 ${isDark ? "bg-slate-950" : "bg-slate-50"}`}>
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
        {!embedded ? (
          <header className={`flex-shrink-0 flex items-center justify-between gap-2 sm:gap-4 px-3 pl-14 sm:pl-14 md:px-6 md:pl-14 py-3 sm:py-3.5 border-b ${isDark ? "border-slate-800 bg-slate-950/95" : "border-slate-200 bg-slate-50/95"}`}>
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl shrink-0 ${isDark ? "bg-blue-500/20" : "bg-blue-100"}`}>
                <MessageCircle className={`w-4 h-4 sm:w-5 sm:h-5 ${isDark ? "text-blue-400" : "text-blue-600"}`} />
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
                <span className={`text-[10px] sm:text-xs px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full shrink-0 font-medium hidden sm:inline-flex ${isDark ? "bg-blue-500/20 text-blue-300" : "bg-blue-100 text-blue-700"}`}>
                  {messages.length} msgs
                </span>
              )}
            </div>
          </header>
        ) : null}

        {/* Scrollable area only - messages or empty state */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          {loadingChat ? (
            <div className="flex items-center justify-center h-full min-h-[200px]">
              <Loader2 className={`w-8 h-8 animate-spin ${isDark ? "text-blue-400" : "text-blue-600"}`} />
            </div>
          ) : !currentSessionId && messages.length === 0 ? (
            <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-8 sm:px-6 sm:py-10">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[20px] bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/25">
                <Sparkles className="h-7 w-7" />
              </div>
              <h2 className="text-center text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
                Your UPSC AI Mentor
              </h2>
              <p className="mt-1 max-w-md text-center text-sm font-medium text-slate-500">
                Ask doubts, strategy, notes, MCQs, or revision plans — like ChatGPT, built for UPSC.
              </p>
              <div className="mt-6 grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {SUGGESTED_PROMPTS.map((p, i) => {
                  const icons = [
                    BookOpen,
                    FileText,
                    ClipboardList,
                    Brain,
                    FileText,
                    CalendarDays,
                    Newspaper,
                    BookOpen,
                    ClipboardList,
                  ];
                  const Icon = icons[i % icons.length];
                  const tones = [
                    "bg-blue-50 text-blue-600",
                    "bg-violet-50 text-violet-600",
                    "bg-emerald-50 text-emerald-600",
                    "bg-amber-50 text-amber-600",
                    "bg-sky-50 text-sky-600",
                    "bg-rose-50 text-rose-600",
                    "bg-cyan-50 text-cyan-600",
                    "bg-indigo-50 text-indigo-600",
                    "bg-teal-50 text-teal-600",
                  ];
                  return (
                    <PromptCard
                      key={p.title}
                      title={p.title}
                      description={p.description}
                      icon={Icon}
                      tone={tones[i % tones.length]}
                      onClick={() => applyPrompt(p.prompt)}
                    />
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-3 px-3 py-3 pb-4 sm:space-y-4 sm:px-4 sm:py-4 md:px-6">
              {messages.map((m, idx) => (
                <ChatBubble key={idx} role={m.role} text={m.text} />
              ))}
              {loading ? <TypingIndicator /> : null}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Composer — ChatGPT-style, safe-area for Android keyboard */}
        <div
          className={`flex-shrink-0 border-t px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-4 sm:pt-4 md:px-6 ${
            isDark ? "border-slate-800 bg-slate-950/95 backdrop-blur-md" : "border-slate-200/80 bg-white/90 backdrop-blur-md"
          }`}
        >
          <form ref={formRef} onSubmit={handleSubmit} className="mx-auto max-w-3xl">
            <div
              className={`flex items-end gap-1 rounded-[20px] border shadow-soft transition-colors focus-within:ring-2 focus-within:ring-blue-500/20 ${
                isDark
                  ? "border-slate-700 bg-slate-900/90 focus-within:border-blue-500/50"
                  : "border-slate-200 bg-white focus-within:border-blue-400"
              }`}
            >
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Message your AI Mentor…"
                disabled={loading}
                rows={1}
                aria-label="Message your AI Mentor"
                className={`max-h-[160px] min-h-[52px] flex-1 resize-none bg-transparent px-4 py-3.5 text-sm focus:outline-none md:text-base ${
                  isDark ? "text-slate-100 placeholder-slate-500" : "text-slate-900 placeholder-slate-400"
                }`}
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
                aria-label="Send message"
                className="m-2 h-11 w-11 shrink-0 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 p-0 text-white hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
            </div>
            <p className="mt-2 text-center text-[10px] font-medium text-slate-400">
              Enter to send · Shift+Enter for new line
            </p>
          </form>
        </div>
      </main>
    </div>
  );
};
