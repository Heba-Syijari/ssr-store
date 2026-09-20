import Link from "next/link";

/**
 * Static by design: the header reads no cookies and no headers, so the root
 * layout stays outside the dynamic render path and each route decides its own
 * caching behaviour.
 */
export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link className="text-lg font-semibold tracking-tight" href="/products">
          SSR<span className="text-indigo-600 dark:text-indigo-400">Store</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium">
          <Link
            className="rounded-md px-3 py-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            href="/products"
          >
            Products
          </Link>
          <Link
            className="rounded-md px-3 py-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            href="/admin"
          >
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
