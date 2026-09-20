import { CATALOGUE_SNAPSHOT } from "@/lib/catalogue-snapshot";
import type { DataSource, FetchDemoOptions, Product, ProductPage } from "@/lib/types";

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

/** How long a single upstream attempt may take before it is abandoned. */
const REQUEST_TIMEOUT_MS = 8_000;

/** Total attempts per request, including the first one. */
const MAX_ATTEMPTS = 3;

const DEFAULT_HEADERS: Record<string, string> = {
  Accept: "application/json",
  // Identifies the caller instead of leaving the runtime's default user agent.
  // Measured, not assumed: it does not get past the Cloudflare challenge that
  // this API returns to datacenter IPs — see README.md § "Deployment note" —
  // it is simply the polite thing to send.
  "User-Agent": "ssr-store/1.0 (+https://ssr-store-eight.vercel.app)",
};

function describeCause(cause: unknown): string {
  if (cause instanceof Error) {
    const code = (cause as NodeJS.ErrnoException).code;
    const inner = cause.cause instanceof Error ? ` <- ${cause.cause.message}` : "";

    return `${cause.name}: ${cause.message}${code ? ` (${code})` : ""}${inner}`;
  }

  return String(cause);
}

/**
 * Single entry point for every upstream call: default headers, a per-attempt
 * timeout, a short retry for transient failures, and one normalised error type.
 *
 * Retrying matters here because the upstream is a free, shared, Cloudflare
 * fronted API: a 429 or a 5xx usually means "ask again in a moment", not
 * "this product does not exist".
 */
async function apiFetch(path: string, init: RequestInit): Promise<Response> {
  const url = `${API_BASE_URL}${path}`;

  // A timeout is only attached to uncached requests. `AbortSignal` and the Data
  // Cache do not mix: a per-request signal on a fetch that is meant to be
  // reused would tie the cached entry to one request's lifetime.
  const isCacheable = Boolean(init.next && "revalidate" in init.next);

  let lastError: ApiError = new ApiError(`Request to ${url} was never attempted.`);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        headers: { ...DEFAULT_HEADERS, ...init.headers },
        signal: isCacheable ? undefined : AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (response.status === 429 || response.status >= 500) {
        lastError = new ApiError(
          `FakeStoreAPI responded with ${response.status} ${response.statusText}.`,
          response.status,
        );
      } else {
        return response;
      }
    } catch (cause) {
      // A DNS/TLS/timeout problem never produces a Response, so it is normalised
      // here into the same ApiError the rest of the app (and error.tsx) expects.
      lastError = new ApiError(
        `Network request to ${url} failed — ${describeCause(cause)}`,
        undefined,
        { cause },
      );
    }

    if (attempt < MAX_ATTEMPTS) {
      await sleep(attempt * 300);
    }
  }

  // Ends up in the Vercel runtime logs, where the digest shown to the user can
  // be matched to the actual reason.
  console.error(`[api] ${url} failed after ${MAX_ATTEMPTS} attempts:`, lastError.message);

  throw lastError;
}

/**
 * Reads the full catalogue from the API. Throws if the upstream cannot be read.
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
 * The catalogue, with a name for where it came from.
 *
 * FakeStoreAPI sits behind Cloudflare, which answers requests from datacenter
 * IP ranges — every serverless platform, this deployment included — with a
 * "Just a moment..." challenge instead of JSON. Rather than show a broken page
 * to anyone opening the deployed link, the read falls back to the committed
 * snapshot of the same catalogue and *says so in the UI*.
 *
 * Locally, and anywhere the API is reachable, `source` is always "live".
 * A simulated failure (?fail=1) is deliberately not caught here: that switch
 * exists to demonstrate the error boundary.
 */
export async function getCatalogue(
  options?: FetchDemoOptions,
): Promise<{ items: Product[]; source: DataSource }> {
  try {
    return { items: await getAllProducts(options), source: "live" };
  } catch (error) {
    if (options?.simulateFailure || !(error instanceof ApiError)) {
      throw error;
    }

    console.error("[api] falling back to the bundled catalogue snapshot:", error.message);

    return { items: CATALOGUE_SNAPSHOT, source: "snapshot" };
  }
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
  const { items: products, source } = await getCatalogue(options);

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
    source,
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

/**
 * A single product, with a name for where it came from — the detail-page
 * counterpart of `getCatalogue`. "Not found" stays `null` either way, so
 * `notFound()` behaves the same whether the data is live or from the snapshot.
 */
export async function getProduct(id: string): Promise<{ product: Product | null; source: DataSource }> {
  try {
    return { product: await getProductById(id), source: "live" };
  } catch (error) {
    if (!(error instanceof ApiError)) {
      throw error;
    }

    console.error("[api] falling back to the bundled catalogue snapshot:", error.message);

    return {
      product: CATALOGUE_SNAPSHOT.find((product) => String(product.id) === id) ?? null,
      source: "snapshot",
    };
  }
}

/** Normalises the `?page=` query param into a usable 1-based page number. */
export function parsePageParam(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number.parseInt(value ?? "1", 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}
