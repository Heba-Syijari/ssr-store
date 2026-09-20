import { NextResponse } from "next/server";

/**
 * Upstream connectivity probe.
 *
 * When the catalogue fails in production the browser only ever sees an error
 * digest — React never ships a server error message to the client. This route
 * performs the same call the pages perform and reports what actually came back.
 *
 * It exposes nothing private: the upstream is a public, key-less API, and the
 * targets are a fixed allow-list rather than anything the caller supplies.
 *
 *   /api/health                      the headers the app really sends
 *   /api/health?variant=browser      a full browser header set
 *   /api/health?variant=none         the runtime's own defaults
 *   /api/health?target=dummyjson     is *any* outbound call working?
 */

const API_BASE_URL = process.env.API_BASE_URL ?? "https://fakestoreapi.com";

const TARGETS: Record<string, string> = {
  fakestore: `${API_BASE_URL}/products/1`,
  fakestoreList: `${API_BASE_URL}/products`,
  dummyjson: "https://dummyjson.com/products/1",
};

const VARIANTS: Record<string, Record<string, string>> = {
  // What src/lib/api.ts sends today.
  app: {
    Accept: "application/json",
    "User-Agent": "Mozilla/5.0 (compatible; ssr-store/1.0; +https://github.com/)",
  },
  // A complete, ordinary browser header set.
  browser: {
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
    "sec-ch-ua": '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    Referer: "https://fakestoreapi.com/",
  },
  // Whatever the runtime sends on its own.
  none: {},
};

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const variant = params.get("variant") ?? "app";
  const target = params.get("target") ?? "fakestore";

  const url = TARGETS[target] ?? TARGETS.fakestore;
  const headers = VARIANTS[variant] ?? VARIANTS.app;
  const startedAt = Date.now();

  const context = {
    url,
    variant: variant in VARIANTS ? variant : "app",
    target: target in TARGETS ? target : "fakestore",
    region: process.env.VERCEL_REGION ?? "local",
  };

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers,
      signal: AbortSignal.timeout(8_000),
    });

    const body = await response.text();

    return NextResponse.json({
      ok: response.ok,
      ...context,
      status: response.status,
      statusText: response.statusText,
      durationMs: Date.now() - startedAt,
      contentType: response.headers.get("content-type"),
      cfRay: response.headers.get("cf-ray"),
      server: response.headers.get("server"),
      bodyPreview: body.slice(0, 160),
    });
  } catch (error) {
    const cause = error instanceof Error && error.cause instanceof Error ? error.cause : null;

    return NextResponse.json(
      {
        ok: false,
        ...context,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
        code: (error as NodeJS.ErrnoException)?.code ?? null,
        cause: cause ? `${cause.name}: ${cause.message}` : null,
      },
      { status: 503 },
    );
  }
}
