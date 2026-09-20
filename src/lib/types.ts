/**
 * Domain types for the FakeStoreAPI payloads we consume.
 * Everything the app renders goes through these types — no `any` anywhere.
 */

export interface ProductRating {
  rate: number;
  count: number;
}

export interface Product {
  id: number;
  title: string;
  price: number;
  description: string;
  category: string;
  image: string;
  rating: ProductRating;
}

/** Result of a server-side paginated read of the product list. */
export interface ProductPage {
  items: Product[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/** Options used by the demo switches (`?fail=1`, `?slow=1`) on /products. */
export interface FetchDemoOptions {
  /** Force the fetcher to throw, so `error.tsx` can be demonstrated. */
  simulateFailure?: boolean;
  /** Delay the response, so `loading.tsx` can be demonstrated. */
  delayMs?: number;
}
