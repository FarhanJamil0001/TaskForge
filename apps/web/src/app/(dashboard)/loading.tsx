export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      {/* Page header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="h-7 w-44 rounded bg-gray-200 dark:bg-zinc-700" />
          <div className="mt-2 h-4 w-72 rounded bg-gray-100 dark:bg-zinc-800" />
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex items-center gap-3">
        <div className="h-9 w-60 rounded-md bg-gray-100 dark:bg-zinc-800" />
        <div className="h-9 w-24 rounded-md bg-gray-100 dark:bg-zinc-800" />
        <div className="h-9 w-24 rounded-md bg-gray-100 dark:bg-zinc-800" />
      </div>

      {/* Table skeleton */}
      <div className="overflow-hidden rounded-lg border border-monday-border dark:border-zinc-700">
        <div className="flex h-9 items-center border-b border-monday-border bg-gray-50 px-4 dark:border-zinc-700 dark:bg-zinc-800/80">
          <div className="h-3 w-20 rounded bg-gray-200 dark:bg-zinc-600" />
        </div>
        {[56, 72, 48, 64, 40, 58].map((w, i) => (
          <div
            key={i}
            className="flex h-9 items-center gap-3 border-b border-monday-border px-4 last:border-b-0 dark:border-zinc-700"
          >
            <div className="h-3.5 w-3.5 rounded bg-gray-200 dark:bg-zinc-700" />
            <div
              className="h-3 rounded bg-gray-200 dark:bg-zinc-700"
              style={{ width: `${w}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
