/**
 * Streamed instantly while the Server Component awaits FakeStoreAPI.
 * Try it with /products?slow=1.
 */
export default function ProductsLoading() {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <div className="h-9 w-48 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
        <div className="h-4 w-72 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      </header>

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
            key={index}
          >
            <div className="aspect-square animate-pulse bg-slate-100 dark:bg-slate-800" />
            <div className="flex flex-col gap-3 border-t border-slate-100 p-4 dark:border-slate-800">
              <div className="h-3 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-5 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        ))}
      </section>

      <span className="sr-only">Loading products…</span>
    </div>
  );
}
