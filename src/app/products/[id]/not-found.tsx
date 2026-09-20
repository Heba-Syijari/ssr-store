import Link from "next/link";

/**
 * Route level 404. Rendered by `notFound()` in the detail page and served with
 * a real HTTP 404 status straight from the server.
 */
export default function ProductNotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center">
      <span className="text-sm font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
        404
      </span>
      <h1 className="text-2xl font-bold">This product does not exist</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        The id in the URL is not in the catalogue. It may have been removed, or the link was
        mistyped.
      </p>
      <Link
        className="mt-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
        href="/products"
      >
        Browse all products
      </Link>
    </div>
  );
}
