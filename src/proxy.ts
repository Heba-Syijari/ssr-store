import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE_NAME, verifySession } from "@/lib/session";

/**
 * Next.js 16 renamed the `middleware.ts` convention to `proxy.ts`; the
 * behaviour is identical — this still runs before the request is completed.
 *
 * It verifies the signed session cookie and redirects anonymous traffic to
 * /login **before any admin markup is produced**, so the protected page is
 * never rendered, let alone sent to the browser.
 */
export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySession(token);

  if (session) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);

  const response = NextResponse.redirect(loginUrl);

  // A tampered or expired cookie is worthless — drop it on the way out.
  if (token) {
    response.cookies.delete(SESSION_COOKIE_NAME);
  }

  return response;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
