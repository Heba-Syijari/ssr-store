import type { FetchDemoOptions, Product, ProductPage } from "@/lib/types";

const API_BASE_URL = process.env.API_BASE_URL ?? "https://fakestoreapi.com";

/** How many products a single page of /products shows. */
export const PAGE_SIZE = 6;

/** Seconds the product *detail* payload may be served from the Data Cache. */
const PRODUCT_DETAIL_REVALIDATE = 300;

export class ApiError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number, options?: ErrorOptions) {
    super(message, options);
    this.name = "ApiError";
    this.status = status;
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function applyDemoOptions({ simulateFailure, delayMs }: FetchDemoOptions = {}) {
  if (delayMs && delayMs > 0) {
    await sleep(delayMs);
  }
  if (simulateFailure) {
    throw new ApiError(
      "Simulated upstream failure (?fail=1) — this is what a real FakeStoreAPI outage looks like.",
      503,
    );
  }
}

async function apiFetch(path: string, init: RequestInit): Promise<Response> {
  const url = `${API_BASE_URL}${path}`;

  try {
    return await fetch(url, {
      ...init,
      headers: { Accept: "application/json", ...init.headers },
    });
  } catch (cause) {
    // A DNS/TLS/timeout problem never produces a Response, so it is normalised here
    // into the same ApiError shape the rest of the app (and error.tsx) understands.
    throw new ApiError(`Network request to ${url} failed.`, undefined, { cause });
  }
}

/**
 * Reads the full catalogue.
 *
 * CACHING DECISION (the one explicit decision required by the task):
 * `cache: "no-store"` — the list page must reflect the catalogue *at request time*,
 * so the fetch opts out of the Data Cache entirely and the route renders dynamically.
 * See README.md § "Caching decision" for the full rationale.
 */
export async function getAllProducts(options?: FetchDemoOptions): Promise<Product[]> {
  await applyDemoOptions(options);

  const response = await apiFetch("/products", { cache: "no-store" });

  if (!response.ok) {
    throw new ApiError(
      `FakeStoreAPI responded with ${response.status} while loading the product list.`,
      response.status,
    );
  }

  const payload: unknown = await response.json();

  if (!Array.isArray(payload)) {
    throw new ApiError("FakeStoreAPI returned an unexpected payload for the product list.");
  }

  return payload as Product[];
}

/**
 * FakeStoreAPI has no offset/page parameter (only `?limit=`), so pagination is
 * computed on the server after the catalogue is read. The browser never sees
 * the items it is not supposed to render.
 */
export async function getProductPage(
  requestedPage: number,
  options?: FetchDemoOptions,
): Promise<ProductPage> {
  const products = await getAllProducts(options);

  const totalItems = products.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const start = (page - 1) * PAGE_SIZE;

  return {
    items: products.slice(start, start + PAGE_SIZE),
    page,
    pageSize: PAGE_SIZE,
    totalItems,
    totalPages,
  };
}

/**
 * Reads a single product. Returns `null` — never throws — when the id does not
 * exist, so the page can hand control to `notFound()`.
 *
 * The detail payload is allowed to sit in the Data Cache for a few minutes:
 * the page itself is still rendered per request, only the upstream round-trip
 * is amortised. See README.md § "Caching decision".
 */
export async function getProductById(id: string): Promise<Product | null> {
  if (!/^\d+$/.test(id)) {
    return null;
  }

  const response = await apiFetch(`/products/${id}`, {
    next: { revalidate: PRODUCT_DETAIL_REVALIDATE },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new ApiError(
      `FakeStoreAPI responded with ${response.status} while loading product ${id}.`,
      response.status,
    );
  }

  // Quirk: for an unknown id FakeStoreAPI answers 200 with an empty body (or `null`)
  // instead of 404, which makes `response.json()` throw. Parse defensively.
  const body = (await response.text()).trim();

  if (!body || body === "null") {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object" || typeof (parsed as Product).id !== "number") {
    return null;
  }

  return parsed as Product;
}

/** Normalises the `?page=` query param into a usable 1-based page number. */
export function parsePageParam(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number.parseInt(value ?? "1", 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}
