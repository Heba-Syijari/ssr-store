import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  signSession,
  verifySession,
  type SessionPayload,
} from "@/lib/session";

/** Demo credentials — overridable through env vars, documented in README.md. */
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@example.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123";

export function isValidCredentials(email: string, password: string): boolean {
  return email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase() && password === ADMIN_PASSWORD;
}

/** Reads and cryptographically verifies the session cookie on the server. */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();

  return verifySession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}

/**
 * Server-side guard. The middleware already redirects unauthenticated traffic,
 * but protected Server Components call this too: the middleware is an
 * optimisation, the page itself stays the source of truth.
 */
export async function requireSession(returnTo: string): Promise<SessionPayload> {
  const session = await getSession();

  if (!session) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }

  return session;
}

export async function createSessionCookie(email: string): Promise<void> {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const token = await signSession({
    sub: email.trim().toLowerCase(),
    name: "Store Administrator",
    role: "admin",
    exp: expiresAt,
  });

  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.delete(SESSION_COOKIE_NAME);
}
