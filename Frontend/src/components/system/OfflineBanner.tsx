import { memo } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { useNetworkStatus } from "../../offline/NetworkProvider";

export const OfflineBanner = memo(function OfflineBanner() {
  const { online } = useNetworkStatus();
  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 bg-slate-900 px-3 py-2 text-center text-[12px] font-medium text-white pt-[max(0.5rem,env(safe-area-inset-top))]"
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0 text-sky-300" aria-hidden />
      <span>You&apos;re offline — showing cached data when available</span>
    </div>
  );
});

export const OfflineEmptyState = memo(function OfflineEmptyState({
  onRetry,
  title = "No internet connection",
  description = "Check your network and try again. Some pages may still work from cache.",
}: {
  onRetry?: () => void;
  title?: string;
  description?: string;
}) {
  return (
    <div
      className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-6 text-center"
      role="status"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-slate-800 dark:text-sky-300">
        <WifiOff className="h-7 w-7" aria-hidden />
      </div>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          Retry
        </button>
      )}
    </div>
  );
});
