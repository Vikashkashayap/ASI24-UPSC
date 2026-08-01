import React, { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Video,
  FileText,
  Presentation,
  IdCard,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Pagination } from "../components/ui/pagination";
import { useTheme } from "../hooks/useTheme";
import {
  mainsMaterialsAPI,
  openMainsMaterialPdf,
  type MainsMaterialSession,
  type MainsMaterialFileType,
} from "../services/api";

const ITEMS_PER_PAGE = 10;

export const Mains360Page: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [sessions, setSessions] = useState<MainsMaterialSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

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

  const totalPages = Math.max(1, Math.ceil(sessions.length / ITEMS_PER_PAGE));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const pageSessions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sessions.slice(start, start + ITEMS_PER_PAGE);
  }, [sessions, currentPage]);

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

  const actionBtn = (opts: {
    label: string;
    icon: React.ReactNode;
    busy?: boolean;
    disabled?: boolean;
    href?: string;
    onClick?: () => void;
    primary?: boolean;
  }) => {
    const className = `min-h-0 h-8 px-2.5 py-0 text-xs gap-1.5 shrink-0 ${
      opts.primary ? "" : isDark ? "border-slate-600" : ""
    }`;

    if (opts.href) {
      return (
        <Button asChild variant={opts.primary ? "default" : "outline"} className={className}>
          <a href={opts.href} target="_blank" rel="noopener noreferrer" title={opts.label}>
            {opts.icon}
            <span className="hidden sm:inline">{opts.label}</span>
            <ExternalLink className="w-3 h-3 opacity-60 hidden md:inline" />
          </a>
        </Button>
      );
    }

    return (
      <Button
        variant={opts.primary ? "default" : "outline"}
        className={className}
        disabled={opts.disabled || opts.busy}
        onClick={opts.onClick}
        title={opts.label}
      >
        {opts.busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : opts.icon}
        <span className="hidden sm:inline">{opts.label}</span>
      </Button>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? "text-blue-400" : "text-blue-700"}`}>
            Mains 360
          </h1>
          <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Session-wise videos, PPTs, workbooks, and reference cards for UPSC Mains.
          </p>
        </div>
        {!loading && sessions.length > 0 && (
          <p className={`text-xs tabular-nums ${isDark ? "text-slate-500" : "text-slate-400"}`}>
            {sessions.length} session{sessions.length === 1 ? "" : "s"}
          </p>
        )}
      </div>

      {error && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            isDark ? "bg-red-500/10 border-red-500/40 text-red-200" : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : sessions.length === 0 ? (
        <Card className={`rounded-2xl ${isDark ? "border-slate-700 bg-slate-900/50" : ""}`}>
          <CardContent className="flex flex-col items-center justify-center py-16 px-4">
            <BookOpen className={`w-12 h-12 mb-4 opacity-50 ${isDark ? "text-slate-400" : "text-slate-400"}`} />
            <p className={`font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
              No published sessions yet
            </p>
            <p className={`text-sm mt-1 text-center ${isDark ? "text-slate-500" : "text-slate-500"}`}>
              Check back soon — new Mains 360 sessions will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div
            className={`rounded-xl border overflow-hidden divide-y ${
              isDark
                ? "border-slate-700 divide-slate-700/80 bg-slate-900/40"
                : "border-slate-200 divide-slate-100 bg-white"
            }`}
          >
            <div
              className={`hidden md:grid grid-cols-[3rem_minmax(0,1fr)_auto] gap-3 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide ${
                isDark ? "bg-slate-800/60 text-slate-400" : "bg-slate-50 text-slate-500"
              }`}
            >
              <span>#</span>
              <span>Session</span>
              <span className="text-right pr-1">Materials</span>
            </div>

            {pageSessions.map((session) => {
              const hasVideo = Boolean(session.videoUrl?.trim());
              const hasPpt = Boolean(session.ppt?.hasFile);
              const hasWorkbook = Boolean(session.workbook?.hasFile);
              const hasCards = Boolean(session.referenceCards?.hasFile);
              const hasAny = hasVideo || hasPpt || hasWorkbook || hasCards;

              return (
                <div
                  key={session._id}
                  className={`grid grid-cols-[2.75rem_minmax(0,1fr)] md:grid-cols-[3rem_minmax(0,1fr)_auto] gap-x-3 gap-y-2.5 items-center px-3 sm:px-4 py-3 transition-colors ${
                    isDark ? "hover:bg-slate-800/50" : "hover:bg-slate-50/80"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold tabular-nums ${
                      isDark ? "bg-blue-500/15 text-blue-300" : "bg-blue-50 text-blue-700"
                    }`}
                  >
                    {session.sessionNumber}
                  </div>

                  <div className="min-w-0">
                    <h2
                      className={`text-sm font-semibold leading-snug truncate ${
                        isDark ? "text-slate-100" : "text-slate-900"
                      }`}
                      title={session.title}
                    >
                      {session.title}
                    </h2>
                    {session.description ? (
                      <p
                        className={`text-xs mt-0.5 line-clamp-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}
                        title={session.description}
                      >
                        {session.description}
                      </p>
                    ) : null}
                  </div>

                  <div className="col-span-2 md:col-span-1 flex flex-wrap items-center gap-1.5 md:justify-end">
                    {!hasAny && (
                      <span className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                        Coming soon
                      </span>
                    )}
                    {hasVideo &&
                      actionBtn({
                        label: "Video",
                        primary: true,
                        icon: <Video className="w-3.5 h-3.5" />,
                        href: session.videoUrl,
                      })}
                    {hasPpt &&
                      actionBtn({
                        label: "PPT",
                        icon: <Presentation className="w-3.5 h-3.5" />,
                        busy: busyKey === `${session._id}:ppt`,
                        onClick: () => openPdf(session._id, "ppt"),
                      })}
                    {hasWorkbook &&
                      actionBtn({
                        label: "Workbook",
                        icon: <FileText className="w-3.5 h-3.5" />,
                        busy: busyKey === `${session._id}:workbook`,
                        onClick: () => openPdf(session._id, "workbook"),
                      })}
                    {hasCards &&
                      actionBtn({
                        label: "Cards",
                        icon: <IdCard className="w-3.5 h-3.5" />,
                        busy: busyKey === `${session._id}:referenceCards`,
                        onClick: () => openPdf(session._id, "referenceCards"),
                      })}
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={sessions.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  );
};
