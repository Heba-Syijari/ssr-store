import type { Metadata } from "next";

import { logoutAction } from "@/app/login/actions";
import { getCatalogue } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { formatCategory, formatPrice } from "@/lib/format";

export const metadata: Metadata = {
  title: "Admin",
  description: "Internal catalogue overview.",
  robots: { index: false, follow: false },
};

/** Session-dependent and never cacheable. */
export const dynamic = "force-dynamic";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </dt>
      <dd className="mt-2 text-2xl font-bold">{value}</dd>
    </div>
  );
}

export default async function AdminPage() {
  // Second line of defence. The proxy (middleware) already redirected anonymous
  // traffic, but the page re-verifies the signed cookie itself: a protected
  // page must never depend on something outside it having done the check.
  const session = await requireSession("/admin");

  const { items: products } = await getCatalogue();
  const categories = [...new Set(products.map((product) => product.category))];
  const averagePrice =
    products.reduce((total, product) => total + product.price, 0) / (products.length || 1);
  const mostExpensive = products.reduce((best, product) =>
    product.price > best.price ? product : best,
  );

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Catalogue overview</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Signed in as <span className="font-medium">{session.sub}</span> ({session.role}) ·
            session expires{" "}
            {new Date(session.exp * 1000).toISOString().replace("T", " ").slice(0, 16)} UTC
          </p>
        </div>

        <form action={logoutAction}>
          <button
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            type="submit"
          >
            Sign out
          </button>
        </form>
      </header>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Products" value={String(products.length)} />
        <Stat label="Categories" value={String(categories.length)} />
        <Stat label="Average price" value={formatPrice(averagePrice)} />
      </dl>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Categories</h2>
        <ul className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <li
              className="rounded-full bg-slate-100 px-3 py-1 text-sm dark:bg-slate-800"
              key={category}
            >
              {formatCategory(category)}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Highest priced item</h2>
        <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="font-medium">{mostExpensive.title}</span> —{" "}
          {formatPrice(mostExpensive.price)}
        </p>
      </section>
    </div>
  );
}
