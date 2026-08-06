import { memo } from "react";
import { AlertTriangle, Home, RefreshCw, FileQuestion } from "lucide-react";
import { Link } from "react-router-dom";

type Props = {
  variant?: "404" | "500" | "generic" | "empty";
  title?: string;
  description?: string;
  onRetry?: () => void;
  homeHref?: string;
};

const COPY = {
  "404": {
    title: "Page not found",
    description: "This screen doesn’t exist or was moved.",
    Icon: FileQuestion,
  },
  "500": {
    title: "Something went wrong",
    description: "We hit an unexpected error. Please try again.",
    Icon: AlertTriangle,
  },
  generic: {
    title: "Unable to load",
    description: "Please retry in a moment.",
    Icon: AlertTriangle,
  },
  empty: {
    title: "Nothing here yet",
    description: "When there’s content, it will show up in this space.",
    Icon: FileQuestion,
  },
} as const;

export const ErrorState = memo(function ErrorState({
  variant = "generic",
  title,
  description,
  onRetry,
  homeHref = "/home",
}: Props) {
  const c = COPY[variant];
  const Icon = c.Icon;

  return (
    <div
      className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6 text-center"
      role="alert"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
        <Icon className="h-7 w-7" aria-hidden />
      </div>
      <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        {title || c.title}
      </h1>
      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
        {description || c.description}
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Retry
          </button>
        )}
        <Link
          to={homeHref}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          <Home className="h-4 w-4" aria-hidden />
          Go home
        </Link>
      </div>
    </div>
  );
});

export const SkeletonBlock = memo(function SkeletonBlock({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-slate-200/70 dark:bg-slate-800/70 ${className}`}
      aria-hidden
    />
  );
});

export const PageSkeleton = memo(function PageSkeleton() {
  return (
    <div className="space-y-3 p-2" aria-busy="true" aria-label="Loading">
      <SkeletonBlock className="h-8 w-2/3" />
      <SkeletonBlock className="h-24 w-full" />
      <SkeletonBlock className="h-24 w-full" />
      <SkeletonBlock className="h-40 w-full" />
    </div>
  );
});
