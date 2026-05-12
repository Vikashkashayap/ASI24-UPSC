import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../hooks/useTheme";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { currentAffairsAPI, type CurrentAffairType } from "../services/api";
import {
  Newspaper,
  Search,
  Filter,
  ExternalLink,
  BookOpen,
  FileText,
  Sparkles,
  ChevronRight,
} from "lucide-react";

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
      const msg = e && typeof e === "object" && "response" in e
        ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
        : "Failed to load current affairs";
      setError(String(msg));
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
    <section
      className={`min-h-[60vh] border-b py-12 md:py-20 transition-colors ${
        theme === "dark" ? "border-slate-800/50 bg-[#030712]" : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="w-full max-w-7xl mx-auto space-y-4 md:space-y-6 px-3 md:px-4 overflow-x-hidden pb-4">
      {/* Header */}
      <div
        className={`relative overflow-hidden rounded-xl md:rounded-2xl p-4 md:p-6 border-2 transition-all duration-300 ${
          isDark
            ? "bg-slate-800/90 border-[#2563eb]/20"
            : "bg-white border-slate-200/80"
        }`}
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-[#2563eb]/10 to-transparent rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col gap-2 md:gap-3">
          <div className="flex items-center gap-2 md:gap-3">
            <div
              className={`p-2 md:p-2.5 rounded-lg shrink-0 ${
                isDark ? "bg-[#2563eb]/20" : "bg-[#2563eb]/10"
              }`}
            >
              <Newspaper
                className={`w-5 h-5 md:w-6 md:h-6 ${
                  isDark ? "text-blue-400" : "text-[#2563eb]"
                }`}
              />
            </div>
            <h1
              className={`text-xl md:text-3xl font-bold tracking-tight ${
                isDark
                  ? "text-slate-50"
                  : "text-slate-900"
              }`}
            >
              Daily UPSC Current Affairs
            </h1>
          </div>
          <p
            className={`text-xs md:text-base ml-0 md:ml-12 ${
              isDark ? "text-slate-300" : "text-slate-600"
            }`}
          >
            AI-curated news analysis for Prelims & Mains. Filter by GS Paper or difficulty.
          </p>
        </div>
      </div>

      {/* Filters + Search */}
      {/* <Card
        className={
          isDark
            ? "border-slate-800 bg-slate-950/60"
            : "border-slate-200 bg-white"
        }
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search
                className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                  isDark ? "text-slate-400" : "text-slate-500"
                }`}
              />
              <Input
                type="text"
                placeholder="Search by keyword..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className={`pl-9 ${
                  isDark
                    ? "bg-slate-800 border-slate-600 text-slate-200"
                    : "bg-white border-slate-300 text-slate-900"
                }`}
              />
            </div>
            <Button type="submit" variant="primary">
              Search
            </Button>
          </form>
          <div className="flex flex-wrap gap-2">
            <span className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              GS Paper:
            </span>
            {GS_OPTIONS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGsPaper(gsPaper === g ? "" : g)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  gsPaper === g
                    ? "bg-blue-600 text-white"
                    : isDark
                    ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {g}
              </button>
            ))}
            <span className={`text-xs font-medium ml-2 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              Difficulty:
            </span>
            {DIFFICULTY_OPTIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDifficulty(difficulty === d ? "" : d)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  difficulty === d
                    ? "bg-[#2563eb] text-white"
                    : isDark
                    ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </CardContent>
      </Card> */}

      {error && (
        <div
          className={`p-4 rounded-xl border ${
            isDark ? "bg-red-500/10 border-red-500/30 text-red-300" : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2563eb]" />
        </div>
      ) : items.length === 0 ? (
        <Card className={isDark ? "border-slate-800 bg-slate-950/60" : "border-slate-200 bg-white"}>
          <CardContent className="py-12 text-center">
            <Newspaper className={`w-12 h-12 mx-auto mb-3 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
            <p className={isDark ? "text-slate-400" : "text-slate-600"}>
              No current affairs for today. Check back after the daily 6 AM update or try different filters.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div ref={listRef} className="space-y-4">
          <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            {total} article{total !== 1 ? "s" : ""} found
            {totalPages > 1 && ` · Showing ${(page - 1) * 12 + 1}–${Math.min(page * 12, total)} of ${total}`}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {items.map((item) => (
              <Card
                key={item._id}
                className={`relative overflow-hidden group transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border-2 ${
                  isDark
                    ? "bg-slate-800/90 border-slate-700/60"
                    : "bg-white border-slate-200"
                }`}
              >
                <Link to={item.slug} className="block" relative="path">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#2563eb]/10 to-transparent rounded-full blur-2xl group-hover:blur-3xl transition-all" />
                  <CardHeader className="relative z-10 pb-2">
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                          isDark ? "bg-blue-500/20 text-blue-300" : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {item.gsPaper}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                          item.difficulty === "Easy"
                            ? isDark
                              ? "bg-green-500/20 text-green-300"
                              : "bg-green-100 text-green-700"
                            : item.difficulty === "Hard"
                            ? isDark
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-amber-100 text-amber-700"
                            : isDark
                            ? "bg-slate-500/20 text-slate-300"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {item.difficulty}
                      </span>
                    </div>
                    <CardTitle className="text-base font-bold line-clamp-2 mb-1">
                      {item.title}
                    </CardTitle>
                    <CardDescription className="text-xs line-clamp-2">
                      {item.summary}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="relative z-10 pt-0">
                    <div className="flex flex-wrap gap-1">
                      {(item.keywords || []).slice(0, 4).map((kw, i) => (
                        <span
                          key={i}
                          className={`px-1.5 py-0.5 rounded text-[10px] ${
                            isDark ? "bg-slate-700/50 text-slate-300" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                    <div className="mt-2 flex items-center gap-1 text-xs font-medium text-[#2563eb]">
                      <span>Read more</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-2 pt-6 pb-2" aria-label="Pagination">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              aria-label="Previous page"
            >
              Previous
            </Button>
            <span className={`flex items-center px-3 text-sm ${isDark ? "text-slate-300" : "text-slate-700"}`}>
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              aria-label="Next page"
            >
              Next
            </Button>
          </nav>
          </div>
        </>
      )}
      </div>
    </section>
  );
}
