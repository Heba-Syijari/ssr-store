/**
 * Session token helpers.
 *
 * This module is deliberately runtime-agnostic: it uses only Web Crypto and
 * `TextEncoder`, so the *same* verification code runs in the Edge middleware
 * (proxy.ts) and in Node.js Server Components. No Node-only API, no `Buffer`.
 */

export const SESSION_COOKIE_NAME = "session";

/** 8 hours — long enough for a shift, short enough to expire on its own. */
export const SESSION_TTL_SECONDS = 60 * 60 * 8;

export interface SessionPayload {
  /** Subject — the signed-in user's email. */
  sub: string;
  name: string;
  role: "admin";
  /** Expiry, seconds since epoch. */
  exp: number;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET is not set. Refusing to sign sessions with a known key.");
    }
    return "dev-only-insecure-secret";
  }

  return secret;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    value.length + ((4 - (value.length % 4)) % 4),
    "=",
  );
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/** Produces `<base64url(payload)>.<base64url(hmac)>`. */
export async function signSession(payload: SessionPayload): Promise<string> {
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", await getKey(), encoder.encode(body));

  return `${body}.${toBase64Url(new Uint8Array(signature))}`;
}

/**
 * Verifies signature *and* expiry. Returns `null` for anything suspicious, so
 * callers only ever deal with a valid session or no session at all.
 */
export async function verifySession(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) {
    return null;
  }

  const [body, signature] = token.split(".");

  if (!body || !signature) {
    return null;
  }

  let isValid: boolean;
  try {
    isValid = await crypto.subtle.verify(
      "HMAC",
      await getKey(),
      fromBase64Url(signature) as unknown as ArrayBuffer,
      encoder.encode(body),
    );
  } catch {
    return null;
  }

  if (!isValid) {
    return null;
  }

  try {
    const payload = JSON.parse(decoder.decode(fromBase64Url(body))) as SessionPayload;

    if (typeof payload.exp !== "number" || payload.exp * 1000 <= Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
