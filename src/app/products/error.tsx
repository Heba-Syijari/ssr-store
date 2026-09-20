"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Error boundary for the catalogue. Try it with /products?fail=1 — the fetcher
 * throws exactly the way it would during a real FakeStoreAPI outage.
 */
export default function ProductsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In a real project this is where the error goes to Sentry/Datadog.
    console.error("Failed to render the product list:", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center dark:border-red-900/60 dark:bg-red-950/40">
      <span aria-hidden className="text-4xl">
        ⚠️
      </span>
      <h1 className="text-xl font-semibold text-red-900 dark:text-red-200">
        We couldn&apos;t load the products
      </h1>
      <p className="text-sm text-red-800/80 dark:text-red-200/70">
        The product API did not answer as expected. Nothing is broken on your side — try again in a
        moment.
      </p>
      {error.digest ? (
        <p className="font-mono text-xs text-red-700/70 dark:text-red-300/60">
          Reference: {error.digest}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
          onClick={reset}
          type="button"
        >
          Try again
        </button>
        <Link
          className="rounded-md border border-red-300 px-4 py-2 text-sm font-semibold text-red-800 transition hover:bg-red-100 dark:border-red-800 dark:text-red-200 dark:hover:bg-red-900/40"
          href="/products"
        >
          Back to page 1
        </Link>
      </div>
    </div>
  );
}
