import type { Metadata } from "next";

import { Pagination } from "@/components/pagination";
import { ProductCard } from "@/components/product-card";
import { getProductPage, parsePageParam } from "@/lib/api";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Rendering strategy: SSR on every request.
 *
 * `force-dynamic` is redundant in practice (reading `searchParams` and the
 * `no-store` fetch already opt this route out of static rendering) but it is
 * stated explicitly so the intent survives future refactors.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const page = parsePageParam((await searchParams).page);

  return {
    title: page > 1 ? `Products — page ${page}` : "Products",
    description: "Browse the catalogue. Every page is rendered on the server at request time.",
  };
}

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  const simulateFailure = params.fail === "1";
  const delayMs = params.slow === "1" ? 2500 : 0;

  const { items, page, totalPages, totalItems, pageSize } = await getProductPage(
    parsePageParam(params.page),
    { simulateFailure, delayMs },
  );

  const preservedQuery: Record<string, string> = {};
  if (simulateFailure) preservedQuery.fail = "1";
  if (delayMs) preservedQuery.slow = "1";

  const firstItem = (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Products</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Showing {firstItem}–{lastItem} of {totalItems} products · page {page} of {totalPages}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-500">
          Rendered on the server at{" "}
          <time dateTime={new Date().toISOString()}>
            {new Date().toISOString().replace("T", " ").slice(0, 19)} UTC
          </time>{" "}
          — reload the page and this timestamp changes, which is the proof that nothing here is
          cached.
        </p>
      </header>

      <section
        aria-label="Product list"
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        {items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </section>

      <Pagination page={page} preservedQuery={preservedQuery} totalPages={totalPages} />
    </div>
  );
}
