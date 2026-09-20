import Link from "next/link";

interface PaginationProps {
  page: number;
  totalPages: number;
  /** Extra query params (e.g. the `?slow=1` demo switch) kept across page links. */
  preservedQuery?: Record<string, string>;
}

function buildHref(page: number, preservedQuery: Record<string, string>): string {
  const params = new URLSearchParams(preservedQuery);
  params.set("page", String(page));

  return `/products?${params.toString()}`;
}

const linkClasses =
  "inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-500 dark:hover:text-indigo-400";

const disabledClasses =
  "inline-flex h-9 min-w-9 cursor-not-allowed items-center justify-center rounded-md border border-slate-200 bg-slate-100 px-3 text-sm font-medium text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-600";

/**
 * Pagination is plain `<Link>` navigation over a `?page=` query param, so the
 * server re-renders the list for every page — no client-side state involved.
 */
export function Pagination({ page, totalPages, preservedQuery = {} }: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-center gap-2">
      {page > 1 ? (
        <Link className={linkClasses} href={buildHref(page - 1, preservedQuery)} rel="prev">
          Previous
        </Link>
      ) : (
        <span className={disabledClasses}>Previous</span>
      )}

      {pages.map((pageNumber) =>
        pageNumber === page ? (
          <span
            aria-current="page"
            className="inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-indigo-600 bg-indigo-600 px-3 text-sm font-semibold text-white"
            key={pageNumber}
          >
            {pageNumber}
          </span>
        ) : (
          <Link className={linkClasses} href={buildHref(pageNumber, preservedQuery)} key={pageNumber}>
            {pageNumber}
          </Link>
        ),
      )}

      {page < totalPages ? (
        <Link className={linkClasses} href={buildHref(page + 1, preservedQuery)} rel="next">
          Next
        </Link>
      ) : (
        <span className={disabledClasses}>Next</span>
      )}
    </nav>
  );
}
