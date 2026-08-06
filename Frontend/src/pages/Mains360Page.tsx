import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Video,
  FileText,
  Presentation,
  IdCard,
  Loader2,
  ExternalLink,
  PenLine,
} from "lucide-react";
import { Pagination } from "../components/ui/pagination";
import {
  mainsMaterialsAPI,
  openMainsMaterialPdf,
  type MainsMaterialSession,
  type MainsMaterialFileType,
} from "../services/api";
import {
  AnswerWritingCard,
  AnalyticsCard,
  FilterChips,
  StudySkeleton,
} from "../components/study";

const ITEMS_PER_PAGE = 10;

export const Mains360Page: React.FC = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<MainsMaterialSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [materialFilter, setMaterialFilter] = useState("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await mainsMaterialsAPI.listPublished();
        if (!cancelled && res.data.success) {
          setSessions(res.data.data || []);
          setCurrentPage(1);
        }
      } catch (err: unknown) {
        if (cancelled) return;
        const ax = err as { response?: { data?: { message?: string } } };
        setError(ax.response?.data?.message || "Failed to load Mains 360 materials");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredSessions = useMemo(() => {
    if (materialFilter === "all") return sessions;
    return sessions.filter((s) => {
      if (materialFilter === "video") return Boolean(s.videoUrl?.trim());
      if (materialFilter === "ppt") return Boolean(s.ppt?.hasFile);
      if (materialFilter === "workbook") return Boolean(s.workbook?.hasFile);
      if (materialFilter === "cards") return Boolean(s.referenceCards?.hasFile);
      return true;
    });
  }, [sessions, materialFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredSessions.length / ITEMS_PER_PAGE));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [materialFilter]);

  const pageSessions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSessions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredSessions, currentPage]);

  const openPdf = async (id: string, type: MainsMaterialFileType) => {
    const key = `${id}:${type}`;
    setBusyKey(key);
    setError(null);
    try {
      await openMainsMaterialPdf(id, type, false);
    } catch {
      setError("Could not open the PDF. Please try again.");
    } finally {
      setBusyKey(null);
    }
  };

  const withVideo = sessions.filter((s) => s.videoUrl?.trim()).length;
  const withDocs = sessions.filter(
    (s) => s.ppt?.hasFile || s.workbook?.hasFile || s.referenceCards?.hasFile
  ).length;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Mains 360</h1>
        <p className="text-sm text-slate-500">
          Session-wise videos, PPTs, workbooks, and reference cards for UPSC Mains.
        </p>
      </header>

      <AnswerWritingCard
        question="“The basic structure doctrine is a judicial invention that has strengthened Indian democracy.” Discuss."
        onAttempt={() => navigate("/copy-evaluation")}
        onHistory={() => navigate("/evaluation-history")}
      />

      <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4" aria-label="Mains analytics">
        <AnalyticsCard label="Sessions" value={String(sessions.length)} hint="Published" />
        <AnalyticsCard
          label="With Video"
          value={String(withVideo)}
          tone="from-violet-50 to-fuchsia-50 text-violet-800"
        />
        <AnalyticsCard
          label="Documents"
          value={String(withDocs)}
          tone="from-emerald-50 to-teal-50 text-emerald-800"
        />
        <AnalyticsCard
          label="Answer Hub"
          value="Open"
          hint="Copy evaluation"
          tone="from-amber-50 to-orange-50 text-amber-800"
        />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">Learning Sessions</h2>
            <p className="text-[12px] text-slate-500">Videos, PPTs, workbooks & reference cards</p>
          </div>
          {!loading && (
            <p className="text-[11px] font-semibold tabular-nums text-slate-400">
              {filteredSessions.length} session{filteredSessions.length === 1 ? "" : "s"}
            </p>
          )}
        </div>

        <FilterChips
          chips={[
            { id: "all", label: "All" },
            { id: "video", label: "Video" },
            { id: "ppt", label: "PPT" },
            { id: "workbook", label: "Workbook" },
            { id: "cards", label: "Cards" },
          ]}
          activeId={materialFilter}
          onChange={setMaterialFilter}
        />

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <StudySkeleton rows={4} />
        ) : filteredSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[20px] border border-dashed border-slate-200 bg-white py-16 px-4 text-center shadow-soft">
            <BookOpen className="mb-3 h-12 w-12 text-slate-300" />
            <p className="font-semibold text-slate-700">No sessions in this filter</p>
            <p className="mt-1 text-sm text-slate-500">Try another filter or check back soon.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {pageSessions.map((session) => {
                const hasVideo = Boolean(session.videoUrl?.trim());
                const hasPpt = Boolean(session.ppt?.hasFile);
                const hasWorkbook = Boolean(session.workbook?.hasFile);
                const hasCards = Boolean(session.referenceCards?.hasFile);
                const hasAny = hasVideo || hasPpt || hasWorkbook || hasCards;

                return (
                  <article
                    key={session._id}
                    className="rounded-[20px] border border-slate-200/80 bg-white p-3.5 shadow-soft sm:p-4"
                  >
                    <div className="flex items-start gap-2.5 sm:gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[12px] font-extrabold tabular-nums text-blue-700 sm:h-11 sm:w-11 sm:rounded-2xl sm:text-sm">
                        {session.sessionNumber}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-[13px] font-bold leading-snug text-slate-900 line-clamp-2 sm:text-[14px]">
                          {session.title}
                        </h3>
                        {session.description ? (
                          <p className="mt-0.5 text-[11px] leading-snug text-slate-500 line-clamp-2 sm:mt-1 sm:text-[12px]">
                            {session.description}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:gap-2">
                      {!hasAny && (
                        <span className="col-span-2 text-[12px] font-medium text-slate-400">Coming soon</span>
                      )}
                      {hasVideo && (
                        <a
                          href={session.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="app-chrome-btn inline-flex h-9 min-h-[36px] w-full items-center justify-center gap-1 rounded-xl bg-blue-600 px-2 text-[11px] font-bold text-white sm:h-10 sm:w-auto sm:justify-start sm:px-3"
                        >
                          <Video className="h-3.5 w-3.5 shrink-0" />
                          <span>Video</span>
                          <ExternalLink className="hidden h-3 w-3 opacity-70 sm:inline" />
                        </a>
                      )}
                      {hasPpt && (
                        <button
                          type="button"
                          disabled={busyKey === `${session._id}:ppt`}
                          onClick={() => openPdf(session._id, "ppt")}
                          className="app-chrome-btn inline-flex h-9 min-h-[36px] w-full items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2 text-[11px] font-bold text-slate-700 disabled:opacity-60 sm:h-10 sm:w-auto sm:bg-white sm:px-3"
                        >
                          {busyKey === `${session._id}:ppt` ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Presentation className="h-3.5 w-3.5 shrink-0" />
                          )}
                          PPT
                        </button>
                      )}
                      {hasWorkbook && (
                        <button
                          type="button"
                          disabled={busyKey === `${session._id}:workbook`}
                          onClick={() => openPdf(session._id, "workbook")}
                          className="app-chrome-btn inline-flex h-9 min-h-[36px] w-full items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2 text-[11px] font-bold text-slate-700 disabled:opacity-60 sm:h-10 sm:w-auto sm:bg-white sm:px-3"
                        >
                          {busyKey === `${session._id}:workbook` ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <FileText className="h-3.5 w-3.5 shrink-0" />
                          )}
                          Workbook
                        </button>
                      )}
                      {hasCards && (
                        <button
                          type="button"
                          disabled={busyKey === `${session._id}:referenceCards`}
                          onClick={() => openPdf(session._id, "referenceCards")}
                          className="app-chrome-btn inline-flex h-9 min-h-[36px] w-full items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2 text-[11px] font-bold text-slate-700 disabled:opacity-60 sm:h-10 sm:w-auto sm:bg-white sm:px-3"
                        >
                          {busyKey === `${session._id}:referenceCards` ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <IdCard className="h-3.5 w-3.5 shrink-0" />
                          )}
                          Cards
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredSessions.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </section>

      <button
        type="button"
        onClick={() => navigate("/copy-evaluation")}
        className="app-chrome-btn flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 text-sm font-bold text-violet-700 active:scale-[0.99]"
      >
        <PenLine className="h-4 w-4" /> Open Answer Writing Studio
      </button>
    </div>
  );
};
