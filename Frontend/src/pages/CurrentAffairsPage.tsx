import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useTheme } from "../hooks/useTheme";
import { Button } from "../components/ui/button";
import { currentAffairsAPI, type CurrentAffairType } from "../services/api";
import { CurrentAffairCard } from "../components/aiExperience";
import { Newspaper, Search, Sparkles } from "lucide-react";

const GS_OPTIONS = ["GS1", "GS2", "GS3", "GS4"];
const DIFFICULTY_OPTIONS = ["Easy", "Moderate", "Hard"];

export default function CurrentAffairsPage() {
  const { theme } = useTheme();
  const [items, setItems] = useState<CurrentAffairType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [gsPaper, setGsPaper] = useState<string>("");
  const [difficulty, setDifficulty] = useState<string>("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const fetchList = async (pageNum = 1) => {
    try {
      setLoading(true);
      setError("");
      const params: Record<string, string | number> = { page: pageNum, limit: 12 };
      if (gsPaper) params.gsPaper = gsPaper;
      if (difficulty) params.difficulty = difficulty;
      if (search.trim()) params.search = search.trim();
      const res = await currentAffairsAPI.list(params);
      if (res.data.success && res.data.data) {
        setItems(res.data.data.items);
        setTotalPages(res.data.data.totalPages || 1);
        setTotal(res.data.data.total || 0);
        setPage(res.data.data.page || 1);
      }
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(typeof msg === "string" && msg.trim() ? msg : "Failed to load current affairs");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchList(1);
  }, [gsPaper, difficulty, search]);

  const goToPage = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages) return;
    fetchList(nextPage);
    setTimeout(() => listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  const isDark = theme === "dark";

  return (
    <section className="min-h-[60vh] border-b border-slate-200 bg-gradient-to-b from-slate-50 via-white to-slate-50 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:py-10">
      <div className="mx-auto w-full max-w-7xl space-y-5 overflow-x-hidden px-3 pb-4 md:space-y-6 md:px-4">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-soft md:p-6"
        >
          <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/20">
                <Newspaper className="h-6 w-6" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-extrabold tracking-tight text-slate-900 md:text-2xl">
                    Current Affairs
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                    <Sparkles className="h-3 w-3" /> AI curated
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Prelims & Mains ready news — filter by GS paper or difficulty.
                </p>
              </div>
            </div>
          </div>

          {/* Search + filters */}
          <form onSubmit={handleSearchSubmit} className="relative mt-4 flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Search headlines, keywords…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                aria-label="Search current affairs"
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
              />
            </div>
            <Button type="submit" className="h-11 rounded-2xl bg-blue-600 px-4 text-white hover:bg-blue-500">
              Search
            </Button>
          </form>

          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="GS paper filters">
            {GS_OPTIONS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGsPaper(gsPaper === g ? "" : g)}
                className={`app-chrome-btn min-h-[36px] rounded-2xl px-3 text-xs font-bold transition-colors ${
                  gsPaper === g
                    ? "bg-blue-600 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {g}
              </button>
            ))}
            <span className="mx-1 hidden h-8 w-px bg-slate-200 sm:inline-block" aria-hidden />
            {DIFFICULTY_OPTIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDifficulty(difficulty === d ? "" : d)}
                className={`app-chrome-btn min-h-[36px] rounded-2xl px-3 text-xs font-bold transition-colors ${
                  difficulty === d
                    ? "bg-indigo-600 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </motion.div>

        {error ? (
          <div className="rounded-[20px] border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-44 animate-pulse rounded-[20px] bg-slate-200/60" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-slate-200 bg-white py-14 text-center shadow-soft">
            <Newspaper className="mx-auto mb-3 h-12 w-12 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">
              No current affairs for today. Check back after the daily update or try different filters.
            </p>
          </div>
        ) : (
          <div ref={listRef} className="space-y-4">
            <p className={`text-sm font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {total} article{total !== 1 ? "s" : ""}
              {totalPages > 1
                ? ` · ${(page - 1) * 12 + 1}–${Math.min(page * 12, total)} of ${total}`
                : null}
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <CurrentAffairCard
                  key={item._id}
                  to={item.slug}
                  title={item.title}
                  summary={item.summary}
                  gsPaper={item.gsPaper}
                  difficulty={item.difficulty}
                  keywords={item.keywords || []}
                  readTime="3 min"
                />
              ))}
            </div>

            <nav className="flex flex-wrap items-center justify-center gap-2 pt-4" aria-label="Pagination">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                aria-label="Previous page"
                className="min-h-[44px] rounded-2xl"
              >
                Previous
              </Button>
              <span className="px-3 text-sm font-medium text-slate-600">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                aria-label="Next page"
                className="min-h-[44px] rounded-2xl"
              >
                Next
              </Button>
            </nav>
          </div>
        )}
      </div>
    </section>
  );
}
