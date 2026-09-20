import Link from "next/link";

/** Application wide 404 for any unmatched URL. */
export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center">
      <span className="text-sm font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
        404
      </span>
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        The page you are looking for does not exist.
      </p>
      <Link
        className="mt-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
        href="/products"
      >
        Go to the catalogue
      </Link>
    </div>
  );
}
