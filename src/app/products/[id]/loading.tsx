export default function ProductDetailLoading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="h-4 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="aspect-square animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div className="flex flex-col gap-5">
          <div className="h-6 w-28 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
          <div className="h-9 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-9 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-8 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-24 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
      <span className="sr-only">Loading product…</span>
    </div>
  );
}
