/** Lightweight fallback while route chunks load. */
export function PageLoader() {
  return (
    <div
      className="flex min-h-[40vh] items-center justify-center"
      role="status"
      aria-label="Loading page"
    >
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
    </div>
  );
}
