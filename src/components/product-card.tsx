import Image from "next/image";
import Link from "next/link";

import { formatCategory, formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500"
      href={`/products/${product.id}`}
    >
      <div className="relative aspect-square bg-white p-6">
        <Image
          alt={product.title}
          className="object-contain transition group-hover:scale-105"
          fill
          sizes="(min-width: 1024px) 20rem, (min-width: 640px) 45vw, 90vw"
          src={product.image}
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 border-t border-slate-100 p-4 dark:border-slate-800">
        <span className="text-xs font-medium uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
          {formatCategory(product.category)}
        </span>
        <h2 className="line-clamp-2 text-sm font-semibold leading-snug">{product.title}</h2>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-base font-bold">{formatPrice(product.price)}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            ★ {product.rating.rate.toFixed(1)} ({product.rating.count})
          </span>
        </div>
      </div>
    </Link>
  );
}
