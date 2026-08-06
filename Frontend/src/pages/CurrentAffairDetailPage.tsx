import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTheme } from "../hooks/useTheme";
import { Button } from "../components/ui/button";
import { currentAffairsAPI, type CurrentAffairType } from "../services/api";
import { AICurrentAffairInsights } from "../components/aiExperience";
import { ArrowLeft, ExternalLink, Sparkles } from "lucide-react";

export default function CurrentAffairDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { theme } = useTheme();
  const [item, setItem] = useState<CurrentAffairType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mcqs, setMcqs] = useState<
    Array<{ question: string; options: Record<string, string>; correctAnswer: string; explanation: string }> | null
  >(null);
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
  const sectionClass =
    "min-h-[60vh] border-b border-slate-200 bg-gradient-to-b from-slate-50 via-white to-slate-50 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:py-10";

  if (loading) {
    return (
      <section className={sectionClass}>
        <div className="mx-auto flex w-full max-w-3xl justify-center px-3 py-12">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      </section>
    );
  }

  if (error || !item) {
    return (
      <section className={sectionClass}>
        <div className="mx-auto w-full max-w-3xl px-3 py-8 text-center">
          <p className="font-medium text-red-600">{error || "Not found"}</p>
          <Link to=".." relative="path">
            <Button variant="outline" className="mt-4 min-h-[44px] rounded-2xl">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to list
            </Button>
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className={sectionClass}>
      <div className="mx-auto w-full max-w-3xl space-y-5 px-3 pb-8 md:px-4">
        <Link
          to=".."
          relative="path"
          className="app-chrome-btn inline-flex min-h-[44px] items-center gap-2 rounded-2xl px-2 text-sm font-semibold text-slate-600 hover:text-blue-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Current Affairs
        </Link>

        <motion.article
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[20px] border border-slate-200/80 bg-white p-5 shadow-soft md:p-6"
        >
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
              {item.gsPaper}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                item.difficulty === "Easy"
                  ? "bg-emerald-50 text-emerald-700"
                  : item.difficulty === "Hard"
                    ? "bg-amber-50 text-amber-700"
                    : "bg-slate-100 text-slate-600"
              }`}
            >
              {item.difficulty}
            </span>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 md:text-2xl">{item.title}</h1>
          {item.date ? (
            <p className="mt-1 text-sm font-medium text-slate-500">
              {new Date(item.date).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          ) : null}
          {item.sourceUrl ? (
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex min-h-[40px] items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700"
            >
              <ExternalLink className="h-4 w-4" />
              Read source article
            </a>
          ) : null}
        </motion.article>

        <AICurrentAffairInsights
          summary={item.summary}
          prelimsFocus={item.prelimsFocus}
          mainsAngle={item.mainsAngle}
          keywords={item.keywords || []}
          keyPoints={item.keyPoints || []}
          difficulty={item.difficulty}
          gsPaper={item.gsPaper}
        />

        <div className="rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-soft md:p-5">
          <Button
            variant="outline"
            onClick={handleGenerateMcqs}
            disabled={mcqsLoading}
            className="flex min-h-[44px] items-center gap-2 rounded-2xl"
          >
            {mcqsLoading ? (
              <>Generating…</>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate 2 Prelims MCQs
              </>
            )}
          </Button>

          {mcqs && mcqs.length > 0 ? (
            <div className="mt-4 space-y-3">
              <h3 className={`text-sm font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                Sample MCQs
              </h3>
              {mcqs.map((mq, idx) => (
                <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-2 text-sm font-semibold text-slate-800">{mq.question}</p>
                  <ul className="space-y-1 text-xs text-slate-600">
                    {Object.entries(mq.options || {}).map(([k, v]) => (
                      <li key={k}>
                        {k}. {v}
                        {mq.correctAnswer === k ? (
                          <span className="ml-2 font-bold text-emerald-600">(Correct)</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  {mq.explanation ? (
                    <p className="mt-2 text-xs text-slate-500">{mq.explanation}</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {mcqs && mcqs.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Could not generate MCQs right now. Try again.</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
