import { NextResponse } from "next/server";

/**
 * Upstream connectivity probe.
 *
 * When the catalogue fails in production, the browser only ever sees an error
 * digest — React never ships a server error message to the client. This route
 * performs the exact same call the pages perform and reports what actually came
 * back, so a deployment can be diagnosed without digging through logs.
 *
 * It exposes nothing private: the upstream is a public, key-less API.
 */

const API_BASE_URL = process.env.API_BASE_URL ?? "https://fakestoreapi.com";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = `${API_BASE_URL}/products/1`;
  const startedAt = Date.now();

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; ssr-store/1.0; +https://github.com/)",
      },
      signal: AbortSignal.timeout(8_000),
    });

    const body = await response.text();

    return NextResponse.json({
      ok: response.ok,
      url,
      status: response.status,
      statusText: response.statusText,
      durationMs: Date.now() - startedAt,
      contentType: response.headers.get("content-type"),
      cfRay: response.headers.get("cf-ray"),
      server: response.headers.get("server"),
      bodyPreview: body.slice(0, 300),
      region: process.env.VERCEL_REGION ?? "local",
    });
  } catch (error) {
    const cause = error instanceof Error && error.cause instanceof Error ? error.cause : null;

    return NextResponse.json(
      {
        ok: false,
        url,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
        code: (error as NodeJS.ErrnoException)?.code ?? null,
        cause: cause ? `${cause.name}: ${cause.message}` : null,
        region: process.env.VERCEL_REGION ?? "local",
      },
      { status: 503 },
    );
  }
}
