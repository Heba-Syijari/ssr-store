import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getProductById } from "@/lib/api";
import { formatCategory, formatPrice } from "@/lib/format";

type RouteParams = Promise<{ id: string }>;

/**
 * Dynamic metadata built from the *actual* product payload. The fetch is
 * deduplicated with the one in the page component during the same request, so
 * this does not cost a second round-trip.
 */
export async function generateMetadata({ params }: { params: RouteParams }): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    return {
      title: "Product not found",
      description: "This product does not exist in the catalogue.",
      robots: { index: false, follow: false },
    };
  }

  const description = product.description.slice(0, 155).trim();

  return {
    title: product.title,
    description,
    openGraph: {
      title: product.title,
      description,
      type: "website",
      images: [{ url: product.image, alt: product.title }],
    },
  };
}

export default async function ProductDetailPage({ params }: { params: RouteParams }) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    // Handled entirely on the server: rendering of this segment stops here and
    // the custom not-found.tsx below is what the browser receives. No client
    // side redirect, no flash of an empty layout.
    //
    // Note on the status code: because this route streams (it has a
    // loading.tsx boundary and streamed metadata), Next.js has already
    // committed to 200 before `notFound()` fires, and injects
    // `<meta name="robots" content="noindex">` instead. See README.md
    // "Why the 404 page answers with 200".
    notFound();
  }

  return (
    <article className="flex flex-col gap-8">
      <nav aria-label="Breadcrumb" className="text-sm text-slate-500 dark:text-slate-400">
        <Link className="transition hover:text-slate-900 dark:hover:text-slate-100" href="/products">
          Products
        </Link>
        <span aria-hidden className="px-2">
          /
        </span>
        <span className="text-slate-700 dark:text-slate-300">
          {formatCategory(product.category)}
        </span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-white p-8 dark:border-slate-800">
          <Image
            alt={product.title}
            className="object-contain"
            fill
            priority
            sizes="(min-width: 1024px) 32rem, 90vw"
            src={product.image}
          />
        </div>

        <div className="flex flex-col gap-5">
          <span className="w-fit rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium uppercase tracking-wide text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            {formatCategory(product.category)}
          </span>

          <h1 className="text-3xl font-bold leading-tight tracking-tight">{product.title}</h1>

          <div className="flex items-center gap-4">
            <span className="text-3xl font-bold">{formatPrice(product.price)}</span>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {product.rating.rate.toFixed(1)} / 5 &middot; {product.rating.count} reviews
            </span>
          </div>

          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            {product.description}
          </p>

          <dl className="mt-2 grid grid-cols-2 gap-4 border-t border-slate-200 pt-5 text-sm dark:border-slate-800">
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Product ID</dt>
              <dd className="font-medium">#{product.id}</dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Category</dt>
              <dd className="font-medium">{formatCategory(product.category)}</dd>
            </div>
          </dl>

          <Link
            className="w-fit rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold transition hover:border-slate-400 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            href="/products"
          >
            &larr; Back to catalogue
          </Link>
        </div>
      </div>
    </article>
  );
}
