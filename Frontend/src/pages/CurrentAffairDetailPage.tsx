import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTheme } from "../hooks/useTheme";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { currentAffairsAPI, type CurrentAffairType } from "../services/api";
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  Target,
  ListChecks,
  Sparkles,
} from "lucide-react";

export default function CurrentAffairDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { theme } = useTheme();
  const [item, setItem] = useState<CurrentAffairType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mcqs, setMcqs] = useState<Array<{ question: string; options: Record<string, string>; correctAnswer: string; explanation: string }> | null>(null);
  const [mcqsLoading, setMcqsLoading] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await currentAffairsAPI.getBySlug(slug);
        if (res.data.success && res.data.data) setItem(res.data.data);
        else setError("Article not found");
      } catch {
        setError("Failed to load article");
        setItem(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const handleGenerateMcqs = async () => {
    if (!item?._id) return;
    setMcqsLoading(true);
    setMcqs(null);
    try {
      const res = await currentAffairsAPI.generateMcqs(item._id);
      if (res.data.success && res.data.data?.mcqs) setMcqs(res.data.data.mcqs);
    } catch {
      setMcqs([]);
    } finally {
      setMcqsLoading(false);
    }
  };

  const isDark = theme === "dark";

  const sectionClass = `min-h-[60vh] border-b py-12 md:py-20 transition-colors ${
    theme === "dark" ? "border-slate-800/50 bg-[#030712]" : "border-slate-200 bg-slate-50"
  }`;

  if (loading) {
    return (
      <section className={sectionClass}>
        <div className="w-full max-w-3xl mx-auto px-3 py-8 flex justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500" />
        </div>
      </section>
    );
  }

  if (error || !item) {
    return (
      <section className={sectionClass}>
        <div className="w-full max-w-3xl mx-auto px-3 py-8">
          <Card className={isDark ? "border-slate-800 bg-slate-950/60" : "border-slate-200 bg-white"}>
            <CardContent className="py-8 text-center">
              <p className={isDark ? "text-red-300" : "text-red-600"}>{error || "Not found"}</p>
              <Link to=".." relative="path">
                <Button variant="outline" className="mt-4">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to list
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section className={sectionClass}>
    <div className="w-full max-w-3xl mx-auto space-y-6 px-3 md:px-4 pb-8">
      <Link
        to=".."
        relative="path"
        className={`inline-flex items-center gap-2 text-sm font-medium ${
          isDark ? "text-slate-300 hover:text-purple-400" : "text-slate-600 hover:text-purple-600"
        }`}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Current Affairs
      </Link>

      <Card
        className={`relative overflow-hidden border-2 ${
          isDark
            ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-purple-500/20"
            : "bg-gradient-to-br from-white to-purple-50/30 border-purple-200/50"
        }`}
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-3xl" />
        <CardHeader className="relative z-10">
          <div className="flex flex-wrap gap-2 mb-2">
            <span
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                isDark ? "bg-blue-500/20 text-blue-300" : "bg-blue-100 text-blue-700"
              }`}
            >
              {item.gsPaper}
            </span>
            <span
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                item.difficulty === "Easy"
                  ? isDark ? "bg-green-500/20 text-green-300" : "bg-green-100 text-green-700"
                  : item.difficulty === "Hard"
                  ? isDark ? "bg-amber-500/20 text-amber-300" : "bg-amber-100 text-amber-700"
                  : isDark ? "bg-slate-500/20 text-slate-300" : "bg-slate-100 text-slate-700"
              }`}
            >
              {item.difficulty}
            </span>
          </div>
          <CardTitle className="text-xl md:text-2xl font-bold">{item.title}</CardTitle>
          {item.date && (
            <CardDescription>
              {new Date(item.date).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="relative z-10 space-y-6">
          <p className={`text-sm leading-relaxed ${isDark ? "text-slate-200" : "text-slate-700"}`}>
            {item.summary}
          </p>

          {(item.keyPoints?.length ?? 0) > 0 && (
            <div>
              <h3 className={`text-sm font-semibold mb-2 flex items-center gap-2 ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                <ListChecks className="w-4 h-4" />
                Key points
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-600 dark:text-slate-300">
                {item.keyPoints.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          )}

          {item.prelimsFocus && (
            <div>
              <h3 className={`text-sm font-semibold mb-2 flex items-center gap-2 ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                <Target className="w-4 h-4" />
                Prelims focus
              </h3>
              <p className={`text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                {item.prelimsFocus}
              </p>
            </div>
          )}

          {item.mainsAngle && (
            <div>
              <h3 className={`text-sm font-semibold mb-2 flex items-center gap-2 ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                <FileText className="w-4 h-4" />
                Mains angle
              </h3>
              <p className={`text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                {item.mainsAngle}
              </p>
            </div>
          )}

          {(item.keywords?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-2">
              {(item.keywords || []).map((kw, i) => (
                <span
                  key={i}
                  className={`px-2 py-1 rounded-md text-xs ${
                    isDark ? "bg-slate-700/50 text-slate-300" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {kw}
                </span>
              ))}
            </div>
          )}

          {item.sourceUrl && (
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 text-sm font-medium ${
                isDark ? "text-purple-400 hover:text-purple-300" : "text-purple-600 hover:text-purple-700"
              }`}
            >
              <ExternalLink className="w-4 h-4" />
              Read source article
            </a>
          )}

          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button
              variant="outline"
              onClick={handleGenerateMcqs}
              disabled={mcqsLoading}
              className="flex items-center gap-2"
            >
              {mcqsLoading ? (
                <>Generating…</>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate 2 Prelims MCQs
                </>
              )}
            </Button>
            {mcqs && mcqs.length > 0 && (
              <div className="mt-4 space-y-4">
                <h3 className={`text-sm font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                  Sample MCQs
                </h3>
                {mcqs.map((mq, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border ${
                      isDark ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <p className={`text-sm font-medium mb-2 ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                      {mq.question}
                    </p>
                    <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                      {Object.entries(mq.options || {}).map(([k, v]) => (
                        <li key={k}>
                          {k}. {v}
                          {mq.correctAnswer === k && (
                            <span className="ml-2 font-semibold text-green-600 dark:text-green-400">(Correct)</span>
                          )}
                        </li>
                      ))}
                    </ul>
                    {mq.explanation && (
                      <p className={`mt-2 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        {mq.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
    </section>
  );
}
