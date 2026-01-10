import { FormEvent, useState } from "react";
import { api } from "../services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useTheme } from "../hooks/useTheme";

export const MentorChatPage = () => {
  const { theme } = useTheme();
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<{ role: "user" | "mentor"; text: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    const current = message.trim();
    setHistory((h) => [...h, { role: "user", text: current }]);
    setMessage("");
    setLoading(true);
    try {
      const res = await api.post("/api/mentor/chat", { message: current });
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
        <h1 className={`text-xl md:text-2xl font-semibold tracking-tight ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>AI mentor</h1>
        <p className={`text-xs md:text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
          Ask doubts, next steps, or strategy questions like you would with a senior mentor.
        </p>
      </div>

      <Card className="h-[420px] md:h-[480px] flex flex-col">
        <CardHeader className="pb-2 md:pb-3">
          <CardTitle className="text-sm md:text-base">Mentor chat</CardTitle>
          <CardDescription className="text-xs md:text-sm">Grounded in your recent evaluations and weak areas.</CardDescription>
        </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-3 md:gap-4">
            <div className="flex-1 overflow-y-auto space-y-2 md:space-y-3 pr-1 text-xs md:text-sm">
            {history.map((m, idx) => (
              <div
                key={idx}
                className={`max-w-[85%] md:max-w-[80%] rounded-xl md:rounded-2xl px-2 md:px-3 py-2 text-[10px] md:text-xs leading-relaxed ${
                  m.role === "user"
                    ? "ml-auto bg-emerald-600 text-white rounded-br-sm"
                    : theme === "dark"
                    ? "mr-auto bg-slate-900 text-slate-100 border border-slate-700 rounded-bl-sm"
                    : "mr-auto bg-slate-100 text-slate-900 border border-slate-200 rounded-bl-sm"
                }`}
              >
                {m.text}
              </div>
            ))}
            {history.length === 0 && (
              <p className={`text-[10px] md:text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                Start with something simple, like "How should I structure a 10-marker GS2 answer this week?"
              </p>
            )}
          </div>
          <form onSubmit={handleSubmit} className="flex gap-2 items-end">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              placeholder="Type your doubt or next-step question here..."
              className={`flex-1 rounded-xl md:rounded-2xl border px-3 md:px-4 py-2 md:py-3 text-[10px] md:text-xs shadow-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-500/70 ${
                theme === "dark"
                  ? "border-fuchsia-500/30 bg-slate-950 text-slate-100 placeholder-slate-500"
                  : "border-purple-300 bg-white text-slate-900 placeholder-slate-400"
              }`}
            />
            <Button type="submit" disabled={loading} size="sm" className="text-xs md:text-sm">
              {loading ? "..." : "Send"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
