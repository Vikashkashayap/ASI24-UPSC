import { useMemo, useState } from "react";
import { dartAPI } from "../../services/api";
import { CalendarRange, Download, FileBarChart, Loader2, Lock } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import { cn } from "../../utils/cn";

export type DartReportRange = 7 | 15 | 30 | "custom";

export interface DartReportAnalytics {
  entriesCount?: number;
  daysSinceFirstDart?: number;
  canDownload7DayReport?: boolean;
  canDownload15DayReport?: boolean;
  canDownload30DayReport?: boolean;
  entriesCountLast7?: number;
  entriesCountLast15?: number;
  entriesCountLast30?: number;
}

interface DartReportCardProps {
  analytics: DartReportAnalytics | null;
  studentName?: string;
  className?: string;
}

const PRESETS: { id: DartReportRange; label: string }[] = [
  { id: 7, label: "7D" },
  { id: 15, label: "15D" },
  { id: 30, label: "30D" },
  { id: "custom", label: "Custom" },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoISO(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function countForPreset(analytics: DartReportAnalytics, days: 7 | 15 | 30) {
  if (days === 7) return analytics.entriesCountLast7 ?? 0;
  if (days === 15) return analytics.entriesCountLast15 ?? analytics.daysSinceFirstDart ?? 0;
  return analytics.entriesCountLast30 ?? 0;
}

function isPresetUnlocked(analytics: DartReportAnalytics, days: 7 | 15 | 30) {
  return countForPreset(analytics, days) >= days;
}

export const DartReportCard: React.FC<DartReportCardProps> = ({
  analytics,
  studentName = "Student",
  className = "",
}) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [range, setRange] = useState<DartReportRange>(7);
  const [customFrom, setCustomFrom] = useState(daysAgoISO(6));
  const [customTo, setCustomTo] = useState(todayISO());
  const [downloading, setDownloading] = useState(false);

  const entryCountForRange = useMemo(() => {
    if (!analytics || range === "custom") return 0;
    return countForPreset(analytics, range);
  }, [analytics, range]);

  const canDownload = useMemo(() => {
    if (!analytics) return false;
    if (range === "custom") {
      return Boolean(customFrom && customTo && customFrom <= customTo);
    }
    return isPresetUnlocked(analytics, range);
  }, [analytics, range, customFrom, customTo]);

  const progressPct = useMemo(() => {
    if (range === "custom" || !analytics) return 0;
    return Math.min(100, Math.round((entryCountForRange / range) * 100));
  }, [analytics, range, entryCountForRange]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const params =
        range === "custom"
          ? { from: customFrom, to: customTo }
          : { days: range };
      const res = await dartAPI.downloadReport(params);
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `DART-${range === "custom" ? "Custom" : `${range}-Day`}-Report-${studentName}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Could not generate report. Complete the required DART days first.";
      window.alert(message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 rounded-[20px] border p-3.5 shadow-soft",
        isDark
          ? "border-amber-500/25 bg-amber-950/20"
          : "border-amber-200/80 bg-gradient-to-br from-amber-50/90 to-orange-50/50",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "shrink-0 rounded-xl p-2",
              isDark ? "bg-amber-500/20" : "bg-amber-200/70"
            )}
          >
            <FileBarChart className="h-4 w-4 text-amber-600" />
          </span>
          <div className="min-w-0">
            <p className={cn("truncate text-xs font-bold", isDark ? "text-amber-100" : "text-amber-950")}>
              DART Reports
            </p>
            <p className={cn("truncate text-[10px]", isDark ? "text-slate-500" : "text-amber-800/55")}>
              Weekly · Monthly · AI PDF summary
            </p>
          </div>
        </div>
        <div
          className={cn(
            "flex shrink-0 rounded-xl p-0.5",
            isDark ? "bg-slate-800/80" : "bg-amber-100/80"
          )}
        >
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setRange(p.id)}
              className={cn(
                "app-chrome-btn rounded-lg px-2 py-1 text-[10px] font-bold transition-all",
                range === p.id
                  ? "bg-amber-500 text-white shadow-sm"
                  : isDark
                  ? "text-slate-500 hover:text-slate-300"
                  : "text-amber-700/60 hover:text-amber-900"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {range === "custom" && (
        <div className="grid grid-cols-2 gap-1.5">
          <input
            type="date"
            value={customFrom}
            max={customTo || todayISO()}
            onChange={(e) => setCustomFrom(e.target.value)}
            className={cn(
              "w-full text-[10px] rounded-md px-2 py-1 border",
              isDark ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-white border-amber-200"
            )}
          />
          <input
            type="date"
            value={customTo}
            min={customFrom}
            max={todayISO()}
            onChange={(e) => setCustomTo(e.target.value)}
            className={cn(
              "w-full text-[10px] rounded-md px-2 py-1 border",
              isDark ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-white border-amber-200"
            )}
          />
        </div>
      )}

      {range !== "custom" && analytics && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-medium">
            <span className={isDark ? "text-slate-500" : "text-amber-800/60"}>Progress</span>
            <span className={isDark ? "text-amber-400" : "text-amber-700"}>
              {entryCountForRange}/{range} days
            </span>
          </div>
          <div
            className={cn(
              "h-1.5 rounded-full overflow-hidden",
              isDark ? "bg-slate-800" : "bg-amber-100"
            )}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading || !canDownload}
        className={cn(
          "app-chrome-btn flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl px-3 text-xs font-bold transition-all",
          canDownload && !downloading
            ? "bg-amber-500 text-white shadow-sm hover:bg-amber-600"
            : isDark
            ? "bg-slate-800/80 text-slate-500 cursor-not-allowed"
            : "bg-amber-100 text-amber-400 cursor-not-allowed"
        )}
      >
        {downloading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Generating…
          </>
        ) : canDownload ? (
          <>
            <Download className="w-3.5 h-3.5" />
            Download {range === "custom" ? "Report" : `${range}-Day`}
          </>
        ) : (
          <>
            <Lock className="w-3 h-3" />
            {range === "custom" ? "Select dates" : `${entryCountForRange}/${range} days`}
          </>
        )}
      </button>
    </div>
  );
};
